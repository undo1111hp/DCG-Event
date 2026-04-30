import { memoryStore } from './memoryStore.js';

export const eventsRepositoryMemory = {
  async listEvents(options = {}) {
    const search = String(options.search || '').trim().toLowerCase();
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.max(1, Number(options.limit || 0));
    const approvalStatus = options.approvalStatus;
    const organizerId = options.organizerId ? String(options.organizerId) : null;

    let events = [...memoryStore.events].sort((a, b) => String(a.date).localeCompare(String(b.date)));

    if (approvalStatus) {
      events = events.filter((event) => {
        const status = event.approvalStatus || 'approved';
        return status === approvalStatus;
      });
    }

    if (organizerId) {
      events = events.filter((event) => String(event.organizerId) === organizerId);
    }

    if (search) {
      events = events.filter((event) => {
        const haystack = [event.title, event.description, event.location, event.date]
          .join(' ')
          .toLowerCase();
        return haystack.includes(search);
      });
    }

    if (!options.search && !options.page && !options.limit) {
      return events;
    }

    const totalItems = events.length;
    const effectiveLimit = limit || totalItems || 1;
    const totalPages = Math.max(1, Math.ceil(totalItems / effectiveLimit));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * effectiveLimit;
    const items = events.slice(start, start + effectiveLimit);

    return {
      items,
      page: currentPage,
      totalPages,
      totalItems,
      limit: effectiveLimit
    };
  },

  async createEvent(payload) {
    const event = {
      id: memoryStore.makeId(),
      organizerId: payload.organizerId,
      categoryIds: payload.categoryIds || [],
      venueIds: payload.venueIds || [],
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoryStore.events.push(event);
    return event;
  },

  async getEventById(id) {
    return memoryStore.events.find((e) => e.id === id) || null;
  },

  async updateEvent(id, updates) {
    const idx = memoryStore.events.findIndex((e) => e.id === id);
    if (idx === -1) {
      return null;
    }

    memoryStore.events[idx] = {
      ...memoryStore.events[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return memoryStore.events[idx];
  },

  async deleteEvent(id) {
    const idx = memoryStore.events.findIndex((e) => e.id === id);
    if (idx === -1) {
      return false;
    }

    memoryStore.events.splice(idx, 1);
    memoryStore.registrations = memoryStore.registrations.filter((r) => r.eventId !== id);
    return true;
  },

  async registerForEvent(eventId, userId) {
    const duplicate = memoryStore.registrations.find(
      (r) => r.eventId === eventId && r.userId === userId
    );

    if (duplicate) {
      return duplicate;
    }

    const reg = {
      id: memoryStore.makeId(),
      eventId,
      userId,
      createdAt: new Date().toISOString()
    };

    memoryStore.registrations.push(reg);
    return reg;
  },

  async listRegistrationsForEvent(eventId) {
    return memoryStore.registrations.filter((r) => r.eventId === eventId);
  },

  async listRegistrationsForUser(userId) {
    return memoryStore.registrations.filter((r) => r.userId === userId);
  }
};
