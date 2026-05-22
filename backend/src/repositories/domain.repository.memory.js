import { memoryStore } from './memoryStore.js';

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

export const domainRepositoryMemory = {
  async listCategories() {
    return memoryStore.categories;
  },

  async createCategory(payload) {
    const duplicate = memoryStore.categories.find((c) => normalizeText(c.name) === normalizeText(payload.name));
    if (duplicate) {
      return duplicate;
    }

    const category = {
      id: memoryStore.makeId(),
      name: payload.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    memoryStore.categories.push(category);
    return category;
  },

  async getCategoryById(id) {
    return memoryStore.categories.find((c) => c.id === id) || null;
  },

  async listVenues() {
    return memoryStore.venues;
  },

  async createVenue(payload) {
    const venue = {
      id: memoryStore.makeId(),
      name: payload.name,
      address: payload.address || '',
      city: payload.city,
      capacity: Number(payload.capacity),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    memoryStore.venues.push(venue);
    return venue;
  },

  async updateVenue(id, updates) {
    const idx = memoryStore.venues.findIndex((venue) => venue.id === id);
    if (idx === -1) {
      return null;
    }

    memoryStore.venues[idx] = {
      ...memoryStore.venues[idx],
      ...updates,
      capacity:
        updates.capacity !== undefined ? Number(updates.capacity) : memoryStore.venues[idx].capacity,
      updated_at: new Date().toISOString()
    };

    return memoryStore.venues[idx];
  },

  async getVenueById(id) {
    return memoryStore.venues.find((v) => v.id === id) || null;
  },

  async listTicketsByEvent(eventId) {
    return memoryStore.tickets.filter((ticket) => ticket.event_id === eventId);
  },

  async createTicket(payload) {
    const ticket = {
      id: memoryStore.makeId(),
      event_id: payload.event_id,
      type: payload.type,
      price: Number(payload.price),
      quantity_available: Number(payload.quantity_available),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    memoryStore.tickets.push(ticket);
    return ticket;
  },

  async updateTicket(id, updates) {
    const idx = memoryStore.tickets.findIndex((ticket) => ticket.id === id);
    if (idx === -1) {
      return null;
    }

    memoryStore.tickets[idx] = {
      ...memoryStore.tickets[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };

    return memoryStore.tickets[idx];
  },

  async getTicketById(id) {
    return memoryStore.tickets.find((ticket) => ticket.id === id) || null;
  },

  async deleteTicket(id) {
    const idx = memoryStore.tickets.findIndex((ticket) => ticket.id === id);
    if (idx === -1) {
      return false;
    }

    memoryStore.tickets.splice(idx, 1);
    return true;
  },

  async createOrder(payload) {
    const order = {
      id: memoryStore.makeId(),
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    memoryStore.orders.push(order);
    return order;
  },

  async listOrdersByUser(userId) {
    return memoryStore.orders.filter((order) => order.user_id === userId);
  },

  async listOrdersByEvent(eventId) {
    return memoryStore.orders.filter((order) => order.event_id === eventId);
  },

  async listAllOrders() {
    return [...memoryStore.orders];
  },

  async listAllTickets() {
    return [...memoryStore.tickets];
  },

  async createPayment(payload) {
    const payment = {
      id: memoryStore.makeId(),
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    memoryStore.payments.push(payment);
    return payment;
  },

  async listPaymentsByOrder(orderId) {
    return memoryStore.payments.filter((payment) => payment.order_id === orderId);
  },

  async createOrUpdateReview(payload) {
    const idx = memoryStore.reviews.findIndex(
      (review) => review.user_id === payload.user_id && review.event_id === payload.event_id
    );

    if (idx === -1) {
      const review = {
        id: memoryStore.makeId(),
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      memoryStore.reviews.push(review);
      return review;
    }

    memoryStore.reviews[idx] = {
      ...memoryStore.reviews[idx],
      ...payload,
      updated_at: new Date().toISOString()
    };

    return memoryStore.reviews[idx];
  },

  async listReviewsByEvent(eventId) {
    return memoryStore.reviews.filter((review) => review.event_id === eventId);
  },

  async updateOrder(id, updates) {
    const idx = memoryStore.orders.findIndex((order) => order.id === id);
    if (idx === -1) {
      return null;
    }

    memoryStore.orders[idx] = {
      ...memoryStore.orders[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };

    return memoryStore.orders[idx];
  },

  async getOrderById(id) {
    return memoryStore.orders.find((order) => order.id === id) || null;
  }
};
