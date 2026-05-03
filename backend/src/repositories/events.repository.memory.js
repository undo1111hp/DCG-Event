import { memoryStore } from './memoryStore.js';

function hydrateCategories(event) {
  const category_ids = Array.isArray(event.category_ids) ? event.category_ids.map((id) => String(id)) : [];
  const categories = category_ids
    .map((cat_id) => memoryStore.categories.find((category) => String(category.id) === cat_id))
    .filter(Boolean)
    .map((category) => ({ id: String(category.id), name: category.name }));

  return {
    ...event,
    category_ids,
    categories
  };
}

export const eventsRepositoryMemory = {
  async listEvents(options = {}) {
    const search = String(options.search || '').trim().toLowerCase();
    const hasPagination = options.page !== undefined || options.limit !== undefined;
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.max(1, Number(options.limit || 0));
    const organizerId = options.organizer_id ? String(options.organizer_id) : null;
    const categoryId = options.category_id ? String(options.category_id) : null;

    let events = [...memoryStore.events].sort((a, b) => String(a.date).localeCompare(String(b.date)));

    if (organizerId) {
      events = events.filter((event) => String(event.organizer_id) === organizerId);
    }

    if (categoryId) {
      events = events.filter(
        (event) => Array.isArray(event.category_ids) && event.category_ids.some((id) => String(id) === categoryId)
      );
    }

    if (search) {
      events = events.filter((event) => {
        const haystack = [event.title, event.description, event.location, event.date]
          .join(' ')
          .toLowerCase();
        return haystack.includes(search);
      });
    }

    if (!hasPagination) {
      return events.map(hydrateCategories);
    }

    const totalItems = events.length;
    const effectiveLimit = limit || totalItems || 1;
    const totalPages = Math.max(1, Math.ceil(totalItems / effectiveLimit));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * effectiveLimit;
    const items = events.slice(start, start + effectiveLimit).map(hydrateCategories);

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
      ...payload,
      organizer_id: payload.organizer_id,
      category_ids: Array.isArray(payload.category_ids) ? payload.category_ids.map((id) => String(id)) : [],
      venue_ids: Array.isArray(payload.venue_ids) ? payload.venue_ids.map((id) => String(id)) : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memoryStore.events.push(event);
    return hydrateCategories(event);
  },

  async getEventById(id) {
    const event = memoryStore.events.find((e) => e.id === id) || null;
    return event ? hydrateCategories(event) : null;
  },

  async updateEvent(id, updates) {
    const idx = memoryStore.events.findIndex((e) => e.id === id);
    if (idx === -1) {
      return null;
    }

    memoryStore.events[idx] = {
      ...memoryStore.events[idx],
      ...updates,
      category_ids: Array.isArray(updates.category_ids)
        ? updates.category_ids.map((cat_id) => String(cat_id))
        : memoryStore.events[idx].category_ids,
      updated_at: new Date().toISOString()
    };

    return hydrateCategories(memoryStore.events[idx]);
  },

  async deleteEvent(id) {
    const idx = memoryStore.events.findIndex((e) => e.id === id);
    if (idx === -1) {
      return false;
    }

    memoryStore.events.splice(idx, 1);
    memoryStore.registrations = memoryStore.registrations.filter((r) => r.event_id !== id);
    return true;
  },

  async linkCategoryToEvent(eventId, categoryId) {
    const event = memoryStore.events.find((e) => e.id === eventId);
    if (!event) {
      return null;
    }

    const nextCategoryId = String(categoryId);
    const current = Array.isArray(event.category_ids) ? event.category_ids.map((id) => String(id)) : [];
    if (!current.includes(nextCategoryId)) {
      current.push(nextCategoryId);
    }

    event.category_ids = current;
    event.updated_at = new Date().toISOString();
    return { event_id: String(eventId), category_id: nextCategoryId };
  },

  async unlinkCategoryFromEvent(eventId, categoryId) {
    const event = memoryStore.events.find((e) => e.id === eventId);
    if (!event) {
      return false;
    }

    const nextCategoryId = String(categoryId);
    const current = Array.isArray(event.category_ids) ? event.category_ids.map((id) => String(id)) : [];
    const filtered = current.filter((id) => id !== nextCategoryId);
    const changed = filtered.length !== current.length;
    event.category_ids = filtered;
    if (changed) {
      event.updated_at = new Date().toISOString();
    }
    return changed;
  },

  async unlinkAllCategoriesFromEvent(eventId) {
    const event = memoryStore.events.find((e) => e.id === eventId);
    if (!event) {
      return;
    }

    event.category_ids = [];
    event.updated_at = new Date().toISOString();
  },

  async migrateCategoriesToJunctionTable() {
    return 0;
  },

  async registerForEvent(eventId, userId) {
    const duplicate = memoryStore.registrations.find(
      (r) => r.event_id === eventId && r.user_id === userId
    );

    if (duplicate) {
      return duplicate;
    }

    const reg = {
      id: memoryStore.makeId(),
      event_id: eventId,
      user_id: userId,
      created_at: new Date().toISOString()
    };

    memoryStore.registrations.push(reg);
    return reg;
  },

  async listRegistrationsForEvent(eventId) {
    return memoryStore.registrations.filter((r) => r.event_id === eventId);
  },

  async listRegistrationsForUser(userId) {
    return memoryStore.registrations.filter((r) => r.user_id === userId);
  }
};
