import { memoryStore } from './memoryStore.js';

function hydrateCategories(event) {
  const categoryIds = Array.isArray(event.categoryIds) ? event.categoryIds.map((id) => String(id)) : [];
  const categories = categoryIds
    .map((categoryId) => memoryStore.categories.find((category) => String(category.id) === categoryId))
    .filter(Boolean)
    .map((category) => ({ id: String(category.id), name: category.name }));

  return {
    ...event,
    categoryIds,
    categories
  };
}

export const eventsRepositoryMemory = {
  async listEvents(options = {}) {
    const search = String(options.search || '').trim().toLowerCase();
    const hasPagination = options.page !== undefined || options.limit !== undefined;
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.max(1, Number(options.limit || 0));
    const organizerId = options.organizerId ? String(options.organizerId) : null;
    const categoryId = options.categoryId ? String(options.categoryId) : null;

    let events = [...memoryStore.events].sort((a, b) => String(a.date).localeCompare(String(b.date)));

    if (organizerId) {
      events = events.filter((event) => String(event.organizerId) === organizerId);
    }

    if (categoryId) {
      events = events.filter(
        (event) => Array.isArray(event.categoryIds) && event.categoryIds.some((id) => String(id) === categoryId)
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
      organizerId: payload.organizerId,
      categoryIds: Array.isArray(payload.categoryIds) ? payload.categoryIds.map((id) => String(id)) : [],
      venueIds: Array.isArray(payload.venueIds) ? payload.venueIds.map((id) => String(id)) : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
      categoryIds: Array.isArray(updates.categoryIds)
        ? updates.categoryIds.map((categoryId) => String(categoryId))
        : memoryStore.events[idx].categoryIds,
      updatedAt: new Date().toISOString()
    };

    return hydrateCategories(memoryStore.events[idx]);
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

  async linkCategoryToEvent(eventId, categoryId) {
    const event = memoryStore.events.find((e) => e.id === eventId);
    if (!event) {
      return null;
    }

    const nextCategoryId = String(categoryId);
    const current = Array.isArray(event.categoryIds) ? event.categoryIds.map((id) => String(id)) : [];
    if (!current.includes(nextCategoryId)) {
      current.push(nextCategoryId);
    }

    event.categoryIds = current;
    event.updatedAt = new Date().toISOString();
    return { eventId: String(eventId), categoryId: nextCategoryId };
  },

  async unlinkCategoryFromEvent(eventId, categoryId) {
    const event = memoryStore.events.find((e) => e.id === eventId);
    if (!event) {
      return false;
    }

    const nextCategoryId = String(categoryId);
    const current = Array.isArray(event.categoryIds) ? event.categoryIds.map((id) => String(id)) : [];
    const filtered = current.filter((id) => id !== nextCategoryId);
    const changed = filtered.length !== current.length;
    event.categoryIds = filtered;
    if (changed) {
      event.updatedAt = new Date().toISOString();
    }
    return changed;
  },

  async unlinkAllCategoriesFromEvent(eventId) {
    const event = memoryStore.events.find((e) => e.id === eventId);
    if (!event) {
      return;
    }

    event.categoryIds = [];
    event.updatedAt = new Date().toISOString();
  },

  async migrateCategoriesToJunctionTable() {
    return 0;
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
