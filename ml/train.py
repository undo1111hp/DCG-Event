"""
Train a Logistic Regression model to predict event bookings.

Reads seed data from ../data/, engineers features, trains via scikit-learn,
and exports model weights to model_weights.json for Node.js inference.

Features:
  - categoryOverlap:  normalized sum of user's category affinity for event's categories
  - venueOverlap:     normalized sum of user's venue affinity for event's venues
  - priceSimilarity:  1 - |eventAvgPrice - userAvgPrice| / maxPrice
  - eventPopularity:  log(1 + totalRegistrations)
"""

import json
import math
import os
import random
from collections import Counter

import numpy as np
from sklearn.linear_model import LogisticRegression

# ── Paths ──────────────────────────────────────────────────────────────────────
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), 'model_weights.json')


def load_json(filename):
    with open(os.path.join(DATA_DIR, filename), 'r', encoding='utf-8') as f:
        return json.load(f)


# ── Load data ──────────────────────────────────────────────────────────────────
orders = load_json('orders.json')
events = load_json('events.json')
tickets = load_json('tickets.json')
categories = load_json('categories.json')
venues = load_json('venues.json')

# Index events by _id
event_by_id = {e['_id']: e for e in events}

# Index tickets by event_id → list of tickets
tickets_by_event = {}
for t in tickets:
    tickets_by_event.setdefault(t['event_id'], []).append(t)

# Count total registrations (all statuses) per event
registration_counts = Counter()
for o in orders:
    registration_counts[o['event_id']] += 1

# Compute event average ticket price
event_avg_price = {}
for eid, tlist in tickets_by_event.items():
    event_avg_price[eid] = sum(t['price'] for t in tlist) / len(tlist)

# Global max ticket price (for normalization)
max_price = max(t['price'] for t in tickets) if tickets else 1

# ── Filter paid orders ─────────────────────────────────────────────────────────
paid_orders = [o for o in orders if o['status'] == 'paid']
print(f"Total orders: {len(orders)}, Paid orders: {len(paid_orders)}")

# Build per-user profiles from paid orders
# user_cat_freq[uid] = Counter({catId: count})
# user_venue_freq[uid] = Counter({venueId: count})
# user_avg_price[uid] = mean total_amount
user_cat_freq = {}
user_venue_freq = {}
user_order_amounts = {}

for o in paid_orders:
    uid = o['user_id']
    eid = o['event_id']
    ev = event_by_id.get(eid)
    if not ev:
        continue

    # Category frequencies
    if uid not in user_cat_freq:
        user_cat_freq[uid] = Counter()
    for cid in ev.get('category_ids', []):
        user_cat_freq[uid][cid] += 1

    # Venue frequencies
    if uid not in user_venue_freq:
        user_venue_freq[uid] = Counter()
    for vid in ev.get('venue_ids', []):
        user_venue_freq[uid][vid] += 1

    # Order amounts
    if uid not in user_order_amounts:
        user_order_amounts[uid] = []
    user_order_amounts[uid].append(o['total_amount'])

# Compute user average order price
user_avg_price = {}
for uid, amounts in user_order_amounts.items():
    user_avg_price[uid] = sum(amounts) / len(amounts)


# ── Feature engineering ────────────────────────────────────────────────────────
def compute_features(user_id, event_id):
    """Compute feature vector for a (user, event) pair."""
    ev = event_by_id.get(event_id)
    if not ev:
        return [0.0, 0.0, 0.0, 0.0]

    # categoryOverlap
    cat_freq = user_cat_freq.get(user_id, Counter())
    total_cats = sum(cat_freq.values()) or 1
    cat_overlap = sum(cat_freq.get(c, 0) for c in ev.get('category_ids', [])) / total_cats

    # venueOverlap
    ven_freq = user_venue_freq.get(user_id, Counter())
    total_vens = sum(ven_freq.values()) or 1
    ven_overlap = sum(ven_freq.get(v, 0) for v in ev.get('venue_ids', [])) / total_vens

    # priceSimilarity
    u_avg = user_avg_price.get(user_id, 0)
    e_avg = event_avg_price.get(event_id, 0)
    price_sim = 1.0 - abs(e_avg - u_avg) / max_price if max_price > 0 else 0.0

    # eventPopularity
    reg_count = registration_counts.get(event_id, 0)
    popularity = math.log(1 + reg_count)

    return [cat_overlap, ven_overlap, price_sim, popularity]


# ── Generate balanced dataset ──────────────────────────────────────────────────
# Positive: (user, paid_event) pairs
# Negative: for each positive, pick one random event the user did NOT book

# Track which events each user has booked (any status)
user_booked_events = {}
for o in orders:
    user_booked_events.setdefault(o['user_id'], set()).add(o['event_id'])

all_event_ids = [e['_id'] for e in events]

X = []
y = []

for o in paid_orders:
    uid = o['user_id']
    eid = o['event_id']

    # Positive sample
    features = compute_features(uid, eid)
    X.append(features)
    y.append(1)

    # Negative sample: pick a random unbooked event
    booked = user_booked_events.get(uid, set())
    unbooked = [eid for eid in all_event_ids if eid not in booked]
    if not unbooked:
        continue
    neg_eid = random.choice(unbooked)
    neg_features = compute_features(uid, neg_eid)
    X.append(neg_features)
    y.append(0)

X = np.array(X)
y = np.array(y)

print(f"Dataset: {len(y)} samples ({sum(y)} positive, {len(y) - sum(y)} negative)")

# ── Train Logistic Regression ──────────────────────────────────────────────────
model = LogisticRegression(max_iter=1000, random_state=42)
model.fit(X, y)

accuracy = model.score(X, y)
print(f"Training accuracy: {accuracy:.4f}")

# ── Export weights ─────────────────────────────────────────────────────────────
feature_names = ['categoryOverlap', 'venueOverlap', 'priceSimilarity', 'eventPopularity']
weights = model.coef_[0].tolist()
intercept = model.intercept_[0]

output = {
    'weights': weights,
    'intercept': intercept,
    'features': feature_names,
    'trainingAccuracy': accuracy,
    'trainingSamples': len(y)
}

with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2)

print(f"\nModel exported to {OUTPUT_PATH}")
print(f"Weights: {dict(zip(feature_names, [round(w, 4) for w in weights]))}")
print(f"Intercept: {round(intercept, 4)}")
