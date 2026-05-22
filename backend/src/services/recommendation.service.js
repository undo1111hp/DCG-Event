import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Load model weights (once at import time) ─────────────────────────────────
const MODEL_PATH = path.resolve(__dirname, '..', '..', '..', 'ml', 'model_weights.json');

let model = null;

function loadModel() {
  if (model) return model;

  try {
    const raw = fs.readFileSync(MODEL_PATH, 'utf-8');
    model = JSON.parse(raw);
    console.log(`[Recommendation] Model loaded: ${model.features.join(', ')}`);
    return model;
  } catch (err) {
    console.warn('[Recommendation] model_weights.json not found — recommendations disabled.');
    model = { weights: [0, 0, 0, 0], intercept: 0, features: ['categoryOverlap', 'venueOverlap', 'priceSimilarity', 'eventPopularity'] };
    return model;
  }
}

// ── Sigmoid ───────────────────────────────────────────────────────────────────
function sigmoid(z) {
  return 1.0 / (1.0 + Math.exp(-z));
}

// ── Build lookups from raw data ──────────────────────────────────────────────
function buildLookups(orders, events, tickets, categories, venues) {
  // Event by id
  const eventById = new Map();
  for (const ev of events) {
    eventById.set(String(ev.id), ev);
  }

  // Tickets grouped by event_id
  const ticketsByEvent = new Map();
  for (const t of tickets) {
    const eid = String(t.event_id);
    if (!ticketsByEvent.has(eid)) ticketsByEvent.set(eid, []);
    ticketsByEvent.get(eid).push(t);
  }

  // Event average ticket price
  const eventAvgPrice = new Map();
  for (const [eid, tlist] of ticketsByEvent) {
    const avg = tlist.reduce((s, t) => s + t.price, 0) / tlist.length;
    eventAvgPrice.set(eid, avg);
  }

  // Global max ticket price
  const maxPrice = tickets.length > 0 ? Math.max(...tickets.map((t) => t.price)) : 1;

  // Registration counts per event (all statuses)
  const regCounts = new Map();
  for (const o of orders) {
    const eid = String(o.event_id);
    regCounts.set(eid, (regCounts.get(eid) || 0) + 1);
  }

  // Per-user profiles from paid orders
  const userCatFreq = new Map();   // uid → Map(catId → count)
  const userVenueFreq = new Map(); // uid → Map(venueId → count)
  const userAmounts = new Map();   // uid → [amount, ...]

  for (const o of orders) {
    if (o.status !== 'paid') continue;
    const uid = String(o.user_id);
    const eid = String(o.event_id);
    const ev = eventById.get(eid);
    if (!ev) continue;

    // Category frequencies
    if (!userCatFreq.has(uid)) userCatFreq.set(uid, new Map());
    const cf = userCatFreq.get(uid);
    for (const cid of ev.category_ids || []) {
      cf.set(String(cid), (cf.get(String(cid)) || 0) + 1);
    }

    // Venue frequencies
    if (!userVenueFreq.has(uid)) userVenueFreq.set(uid, new Map());
    const vf = userVenueFreq.get(uid);
    for (const vid of ev.venue_ids || []) {
      vf.set(String(vid), (vf.get(String(vid)) || 0) + 1);
    }

    // Order amounts
    if (!userAmounts.has(uid)) userAmounts.set(uid, []);
    userAmounts.get(uid).push(o.total_amount);
  }

  // User average price
  const userAvgPrice = new Map();
  for (const [uid, amounts] of userAmounts) {
    userAvgPrice.set(uid, amounts.reduce((s, a) => s + a, 0) / amounts.length);
  }

  // User booked events (any status)
  const userBooked = new Map();
  for (const o of orders) {
    const uid = String(o.user_id);
    if (!userBooked.has(uid)) userBooked.set(uid, new Set());
    userBooked.get(uid).add(String(o.event_id));
  }

  return {
    eventById,
    ticketsByEvent,
    eventAvgPrice,
    maxPrice,
    regCounts,
    userCatFreq,
    userVenueFreq,
    userAvgPrice,
    userBooked
  };
}

// ── Compute feature vector ───────────────────────────────────────────────────
function computeFeatures(userId, eventId, lookups) {
  const {
    eventById,
    eventAvgPrice,
    maxPrice,
    regCounts,
    userCatFreq,
    userVenueFreq,
    userAvgPrice
  } = lookups;

  const ev = eventById.get(String(eventId));
  if (!ev) return [0, 0, 0, 0];

  const uid = String(userId);
  const eid = String(eventId);

  // categoryOverlap
  const catFreq = userCatFreq.get(uid) || new Map();
  const totalCats = [...catFreq.values()].reduce((s, v) => s + v, 0) || 1;
  let catOverlap = 0;
  for (const cid of ev.category_ids || []) {
    catOverlap += catFreq.get(String(cid)) || 0;
  }
  catOverlap /= totalCats;

  // venueOverlap
  const venFreq = userVenueFreq.get(uid) || new Map();
  const totalVens = [...venFreq.values()].reduce((s, v) => s + v, 0) || 1;
  let venOverlap = 0;
  for (const vid of ev.venue_ids || []) {
    venOverlap += venFreq.get(String(vid)) || 0;
  }
  venOverlap /= totalVens;

  // priceSimilarity
  const uAvg = userAvgPrice.get(uid) || 0;
  const eAvg = eventAvgPrice.get(eid) || 0;
  const priceSim = maxPrice > 0 ? 1.0 - Math.abs(eAvg - uAvg) / maxPrice : 0;

  // eventPopularity
  const regCount = regCounts.get(eid) || 0;
  const popularity = Math.log(1 + regCount);

  return [catOverlap, venOverlap, priceSim, popularity];
}

// ── Predict probability ──────────────────────────────────────────────────────
function predict(features) {
  const m = loadModel();
  const z = features.reduce((sum, f, i) => sum + f * m.weights[i], 0) + m.intercept;
  return sigmoid(z);
}

// ── Main recommendation function ─────────────────────────────────────────────
export async function getRecommendations(userId, limit, eventsRepository, domainRepository) {
  loadModel();

  // Fetch all data needed for feature computation
  const allEvents = await eventsRepository.listEvents({});
  const allOrders = await domainRepository.listAllOrders();
  const allTickets = await domainRepository.listAllTickets();

  // Build lookups
  const lookups = buildLookups(allOrders, allEvents, allTickets, [], []);

  // Get events the user has already booked (any status)
  const booked = lookups.userBooked.get(String(userId)) || new Set();

  // Candidate events: not already booked
  const candidates = allEvents.filter((ev) => !booked.has(String(ev.id)));

  // If user has no paid orders, return empty (cold start)
  const hasPaidOrders = allOrders.some((o) => String(o.user_id) === String(userId) && o.status === 'paid');
  if (!hasPaidOrders) {
    return [];
  }

  // Score each candidate
  const scored = candidates.map((ev) => {
    const features = computeFeatures(userId, ev.id, lookups);
    const probability = predict(features);
    return { event: ev, probability };
  });

  // Sort by probability descending
  scored.sort((a, b) => b.probability - a.probability);

  // Return top N
  return scored.slice(0, limit).map((item) => ({
    ...item.event,
    recommendationScore: Math.round(item.probability * 100)
  }));
}
