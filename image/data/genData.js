const fs = require("fs");

const rand = (min, max) => Math.floor(Math.random() * (max - min) + min);
const pick = (arr) => arr[rand(0, arr.length)];
const sample = (arr, n) => [...arr].sort(() => 0.5 - Math.random()).slice(0, n);

// ===== USERS =====
const users = [];
for (let i = 1; i <= 20; i++) {
  users.push({
    _id: i,
    name: `User ${i}`,
    email: `user${i}@gmail.com`,
    password: "123",
    phone: "09" + rand(10000000, 99999999),
    role: i <= 3 ? "organizer" : i === 20 ? "admin" : "attendee",
    created_at: "2026-01-01"
  });
}

// ===== CATEGORIES =====
const categories = [];
for (let i = 1; i <= 10; i++) {
  categories.push({
    _id: i,
    name: `Category ${i}`
  });
}

// ===== VENUES =====
const venues = [];
for (let i = 1; i <= 15; i++) {
  venues.push({
    _id: i,
    name: `Venue ${i}`,
    address: `Street ${i}`,
    city: pick(["Hanoi", "HCM", "Da Nang"]),
    capacity: rand(250, 5000)
  });
}

// ===== EVENTS =====
const events = [];
for (let i = 1; i <= 50; i++) {
  events.push({
    _id: i,
    title: `Event ${i}`,
    description: "Some description",
    start_time: "2026-07-01",
    end_time: "2026-07-02",
    venueIds: sample(venues.map(v => v._id), rand(1, 4)),
    organizerId: rand(1, 4),
    rating_avg: 0,
    rating_count: 0,
    categoryIds: sample(categories.map(c => c._id), rand(1, 4))
  });
}

// ===== TICKETS =====
const tickets = [];
let ticketId = 1;
events.forEach(e => {
  ["VIP", "Standard", "Early"].forEach(type => {
    tickets.push({
      _id: ticketId++,
      eventId: e._id,
      type,
      price: rand(50, 500),
      quantity_available: rand(200, 500)
    });
  });
});

// ===== ORDERS =====
// ===== ORDERS =====
const orders = [];

for (let i = 1; i <= 100; i++) {
  const eventId = rand(1, 51);

  // find tickets belonging to that event
  const eventTickets = tickets.filter(t => t.eventId === eventId);

  // pick one matching ticket type
  const chosenTicket = pick(eventTickets);
  const randQuant = rand(1, 11)
  orders.push({
    _id: i,
    userId: rand(4, 20),
    eventId: eventId,
    ticketId: chosenTicket._id,
    quantity: randQuant, // 1 to 10
    totalAmount: randQuant*chosenTicket.price,
    status: pick(["pending", "confirmed", "cancelled"]),
    registration_date: "2026-06-01"
  });
}

// ===== PAYMENTS =====
const payments = orders.map(o => ({
  _id: o._id,
  orderId: o._id,
  amount: tickets[o.ticketId-1].price * o.quantity,
  payment_method: pick(["card", "momo", "paypal"]),
  payment_status: o.status === "confirmed" ? "success" : "pending",
  payment_date: "2026-06-01"
}));

// ===== REVIEWS =====
const reviews = [];
for (let i = 1; i <= 100; i++) {
  const eventId = rand(1, 51);
  const rating = rand(1, 6);

  reviews.push({
    _id: i,
    userId: rand(4, 20),
    eventId,
    rating,
    comment: `Review ${i}`
  });

  // update event rating
  const event = events.find(e => e._id === eventId);
  if (event) {
    event.rating_avg =
      (event.rating_avg * event.rating_count + rating) /
      (event.rating_count + 1);
    event.rating_count++;
  }
}

// ===== EXPORT =====
fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
fs.writeFileSync("categories.json", JSON.stringify(categories, null, 2));
fs.writeFileSync("venues.json", JSON.stringify(venues, null, 2));
fs.writeFileSync("events.json", JSON.stringify(events, null, 2));
fs.writeFileSync("tickets.json", JSON.stringify(tickets, null, 2));
fs.writeFileSync("orders.json", JSON.stringify(orders, null, 2));
fs.writeFileSync("payments.json", JSON.stringify(payments, null, 2));
fs.writeFileSync("reviews.json", JSON.stringify(reviews, null, 2));

console.log("🔥 Massive dataset generated.");