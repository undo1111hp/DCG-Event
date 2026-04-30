import { ApiError } from '../utils/apiError.js';

export function createEventsService(eventsRepository, domainRepository) {
  function getApprovalStatus(event) {
    return event.approvalStatus || 'approved';
  }

  function canViewUnapprovedEvent(user, event) {
    if (!user) {
      return false;
    }

    if (user.role === 'admin') {
      return true;
    }

    return user.role === 'organizer' && String(event.organizerId) === String(user.id);
  }

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

  async function listEvents(options = {}, viewer = null) {
    if (viewer?.role === 'admin') {
      return eventsRepository.listEvents(options);
    }

    if (viewer?.role === 'organizer' && String(options.manage || '') === 'true') {
      return eventsRepository.listEvents({ ...options, organizerId: viewer.id });
    }

    return eventsRepository.listEvents({ ...options, approvalStatus: 'approved' });
  }

  async function listPendingEvents(viewer, options = {}) {
    if (!viewer || viewer.role !== 'admin') {
      throw new ApiError(403, 'Admin access required');
    }

    return eventsRepository.listEvents({ ...options, approvalStatus: 'pending' });
  }

  async function createEvent(payload, viewer) {
    if (!payload.title || !payload.start_time || !payload.end_time) {
      throw new ApiError(400, 'title and date are required');
    }

    const isAdminCreator = viewer.role === 'admin';
    const approvedAt = isAdminCreator ? new Date().toISOString() : null;

    return eventsRepository.createEvent({
      title: payload.title,
      description: payload.description || '',
      location: payload.location || '',
      start_time: payload.start_time,
      end_time: payload.end_time,
      organizerId: payload.organizerId || viewer.id,
      categoryIds: Array.isArray(payload.categoryIds) ? payload.categoryIds : [],
      venueIds: Array.isArray(payload.venueIds) ? payload.venueIds : []
    });
  }

  async function getEventById(id, viewer = null) {
    const event = await eventsRepository.getEventById(id);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    if (getApprovalStatus(event) !== 'approved' && !canViewUnapprovedEvent(viewer, event)) {
      throw new ApiError(404, 'Event not found');
    }

    return hydrateEventVenues(event);
  }

  async function approveEvent(id, viewer) {
    if (!viewer || viewer.role !== 'admin') {
      throw new ApiError(403, 'Admin access required');
    }

    const event = await eventsRepository.getEventById(id);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    if (getApprovalStatus(event) === 'approved') {
      return event;
    }

    const approvedAt = new Date().toISOString();
    const updated = await eventsRepository.updateEvent(id, {
      approvalStatus: 'approved',
      approvedBy: viewer.id,
      approvedAt
    });

    if (!updated) {
      throw new ApiError(404, 'Event not found');
    }

    return updated;
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

  async function registerForEvent(eventId, userId) {
    const event = await eventsRepository.getEventById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    if (getApprovalStatus(event) !== 'approved') {
      throw new ApiError(409, 'This event is still pending admin approval');
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
    listPendingEvents,
    createEvent,
    getEventById,
    approveEvent,
    updateEvent,
    deleteEvent,
    registerForEvent,
    listRegistrationsForEvent,
    getEventStats
  };
}
