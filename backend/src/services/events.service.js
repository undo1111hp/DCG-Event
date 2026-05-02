import { ApiError } from '../utils/apiError.js';

export function createEventsService(eventsRepository, domainRepository) {
  function ensureCanManageEvent(user, event) {
    if (!user) {
      throw new ApiError(401, 'Authentication required');
    }

    if (user.role === 'admin') {
      return;
    }

    if (user.role === 'organizer' && String(event.organizerId) === String(user.id)) {
      return;
    }

    throw new ApiError(403, 'You can only manage your own events');
  }

  async function hydrateEventVenues(event) {
    const venueIds = Array.isArray(event?.venueIds) ? event.venueIds : [];
    if (venueIds.length === 0) {
      return {
        ...event,
        venues: []
      };
    }

    const venues = await Promise.all(venueIds.map((venueId) => domainRepository.getVenueById(venueId)));

    return {
      ...event,
      venues: venues.filter(Boolean)
    };
  }

  async function hydrateEventCategories(event) {
    // Categories are already hydrated by the repository via the junction table
    // This method is a placeholder for any additional category enrichment
    return event;
  }

  async function listEvents(options = {}, viewer = null) {
    if (viewer?.role === 'admin') {
      return eventsRepository.listEvents(options);
    }

    if (viewer?.role === 'organizer' && String(options.manage || '') === 'true') {
      return eventsRepository.listEvents({ ...options, organizerId: viewer.id });
    }

    return eventsRepository.listEvents(options);
  }

  async function createEvent(payload, viewer) {
    if (!payload.title || !payload.start_time || !payload.end_time) {
      throw new ApiError(400, 'title and date are required');
    }

    // Categories are now required
    if (!Array.isArray(payload.categoryIds) || payload.categoryIds.length === 0) {
      throw new ApiError(400, 'At least one category is required');
    }

    // Validate that all categories exist
    const categories = await Promise.all(
      payload.categoryIds.map((catId) => domainRepository.getCategoryById(catId))
    );
    if (categories.some((cat) => !cat)) {
      throw new ApiError(400, 'One or more categories do not exist');
    }

    const event = await eventsRepository.createEvent({
      title: payload.title,
      description: payload.description || '',
      location: payload.location || '',
      start_time: payload.start_time,
      end_time: payload.end_time,
      organizerId: payload.organizerId || viewer.id,
      categoryIds: payload.categoryIds,
      venueIds: Array.isArray(payload.venueIds) ? payload.venueIds : []
    });

    return event;
  }

  async function getEventById(id, viewer = null) {
    const event = await eventsRepository.getEventById(id);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    return hydrateEventVenues(event);
  }

  async function updateEvent(id, updates, viewer) {
    const existing = await eventsRepository.getEventById(id);
    if (!existing) {
      throw new ApiError(404, 'Event not found');
    }

    ensureCanManageEvent(viewer, existing);

    if (updates.capacity !== undefined) {
      delete updates.capacity;
    }

    // If updating categories, validate them
    if (Array.isArray(updates.categoryIds)) {
      if (updates.categoryIds.length === 0) {
        throw new ApiError(400, 'At least one category is required');
      }

      const categories = await Promise.all(
        updates.categoryIds.map((catId) => domainRepository.getCategoryById(catId))
      );
      if (categories.some((cat) => !cat)) {
        throw new ApiError(400, 'One or more categories do not exist');
      }
    }

    const updated = await eventsRepository.updateEvent(id, updates);
    if (!updated) {
      throw new ApiError(404, 'Event not found');
    }

    return updated;
  }

  async function deleteEvent(id, viewer) {
    const existing = await eventsRepository.getEventById(id);
    if (!existing) {
      throw new ApiError(404, 'Event not found');
    }

    ensureCanManageEvent(viewer, existing);

    const deleted = await eventsRepository.deleteEvent(id);
    if (!deleted) {
      throw new ApiError(404, 'Event not found');
    }
  }

  async function linkCategoryToEvent(eventId, categoryId, viewer) {
    const event = await eventsRepository.getEventById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    ensureCanManageEvent(viewer, event);

    const category = await domainRepository.getCategoryById(categoryId);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    return eventsRepository.linkCategoryToEvent(eventId, categoryId);
  }

  async function unlinkCategoryFromEvent(eventId, categoryId, viewer) {
    const event = await eventsRepository.getEventById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    ensureCanManageEvent(viewer, event);

    const result = await eventsRepository.unlinkCategoryFromEvent(eventId, categoryId);
    if (!result) {
      throw new ApiError(404, 'Category link not found');
    }

    return result;
  }

  async function registerForEvent(eventId, userId) {
    const event = await eventsRepository.getEventById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    const registrations = await eventsRepository.listRegistrationsForEvent(eventId);
    const already = registrations.find((r) => r.userId === userId);
    if (already) {
      return already;
    }

    return eventsRepository.registerForEvent(eventId, userId);
  }

  async function listRegistrationsForEvent(eventId, viewer) {
    const event = await eventsRepository.getEventById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    ensureCanManageEvent(viewer, event);

    return eventsRepository.listRegistrationsForEvent(eventId);
  }

  async function getEventStats(eventId, viewer) {
    const event = await eventsRepository.getEventById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    ensureCanManageEvent(viewer, event);

    const [registrations, tickets, orders, reviews] = await Promise.all([
      eventsRepository.listRegistrationsForEvent(eventId),
      domainRepository.listTicketsByEvent(eventId),
      domainRepository.listOrdersByEvent(eventId),
      domainRepository.listReviewsByEvent(eventId)
    ]);

    const ticketsSold = orders.reduce((sum, order) => sum + Number(order.quantity || 0), 0);
    const revenue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const avgRating =
      reviews.length > 0
        ? Number((reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(2))
        : 0;
    const ticketsRemaining = tickets.reduce((sum, ticket) => sum + Number(ticket.quantityAvailable || 0), 0);
    const ticketInventory = ticketsSold + ticketsRemaining;
    const inventoryUsedPercent =
      ticketInventory > 0 ? Number(((ticketsSold / ticketInventory) * 100).toFixed(1)) : 0;

    return {
      event,
      totals: {
        registrations: registrations.length,
        orders: orders.length,
        ticketsSold,
        ticketsRemaining,
        ticketInventory,
        inventoryUsedPercent,
        revenue,
        reviews: reviews.length,
        averageRating: avgRating
      }
    };
  }

  return {
    listEvents,
    createEvent,
    getEventById,
    updateEvent,
    deleteEvent,
    registerForEvent,
    listRegistrationsForEvent,
    getEventStats,
    linkCategoryToEvent,
    unlinkCategoryFromEvent
  };
}
