import { ApiError } from '../utils/apiError.js';

export function createCommerceService(eventsRepository, domainRepository) {
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

    throw new ApiError(403, 'You can only manage tickets for your own events');
  }

  async function createTicket(eventId, payload, viewer) {
    const event = await eventsRepository.getEventById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    ensureCanManageEvent(viewer, event);

    if (!payload.type || payload.price === undefined || payload.quantityAvailable === undefined) {
      throw new ApiError(400, 'type, price, quantityAvailable are required');
    }

    const quantityAvailable = Number(payload.quantityAvailable);
    if (!Number.isFinite(quantityAvailable) || quantityAvailable < 0) {
      throw new ApiError(400, 'quantityAvailable must be zero or a positive number');
    }

    const price = Number(payload.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new ApiError(400, 'price must be zero or a positive number');
    }

    return domainRepository.createTicket({
      eventId,
      type: payload.type,
      price,
      quantityAvailable
    });
  }

  async function listTicketsByEvent(eventId) {
    const event = await eventsRepository.getEventById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    return domainRepository.listTicketsByEvent(eventId);
  }

  async function updateTicket(eventId, ticketId, payload, viewer) {
    const event = await eventsRepository.getEventById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    ensureCanManageEvent(viewer, event);

    const ticket = await domainRepository.getTicketById(ticketId);
    if (!ticket || ticket.eventId !== eventId) {
      throw new ApiError(404, 'Ticket not found for this event');
    }

    const updates = {};
    if (payload.type !== undefined) {
      if (!String(payload.type).trim()) {
        throw new ApiError(400, 'type cannot be empty');
      }
      updates.type = String(payload.type).trim();
    }

    if (payload.price !== undefined) {
      const price = Number(payload.price);
      if (!Number.isFinite(price) || price < 0) {
        throw new ApiError(400, 'price must be zero or a positive number');
      }
      updates.price = price;
    }

    if (payload.quantityAvailable !== undefined) {
      const quantityAvailable = Number(payload.quantityAvailable);
      if (!Number.isFinite(quantityAvailable) || quantityAvailable < 0) {
        throw new ApiError(400, 'quantityAvailable must be zero or a positive number');
      }
      updates.quantityAvailable = quantityAvailable;
    }

    const updated = await domainRepository.updateTicket(ticketId, updates);
    if (!updated) {
      throw new ApiError(404, 'Ticket not found');
    }

    return updated;
  }

  async function deleteTicket(eventId, ticketId, viewer) {
    const event = await eventsRepository.getEventById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    ensureCanManageEvent(viewer, event);

    const ticket = await domainRepository.getTicketById(ticketId);
    if (!ticket || ticket.eventId !== eventId) {
      throw new ApiError(404, 'Ticket not found for this event');
    }

    const orders = await domainRepository.listOrdersByEvent(eventId);
    const hasOrders = orders.some((order) => String(order.ticketId) === String(ticketId));
    if (hasOrders) {
      throw new ApiError(409, 'Cannot delete a ticket tier that already has orders');
    }

    const deleted = await domainRepository.deleteTicket(ticketId);
    if (!deleted) {
      throw new ApiError(404, 'Ticket not found');
    }
  }

  async function createOrderAndPayment(userId, eventId, payload) {
    const event = await eventsRepository.getEventById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    const ticket = await domainRepository.getTicketById(payload.ticketId);
    if (!ticket || ticket.eventId !== eventId) {
      throw new ApiError(404, 'Ticket not found for this event');
    }

    const quantity = Number(payload.quantity || 1);
    if (Number.isNaN(quantity) || quantity < 1) {
      throw new ApiError(400, 'quantity must be a positive number');
    }

    if (ticket.quantityAvailable < quantity) {
      throw new ApiError(409, 'Not enough ticket quantity available');
    }

    const totalAmount = Number(ticket.price) * quantity;
    const now = new Date().toISOString();

    await domainRepository.updateTicket(ticket.id, {
      quantityAvailable: Number(ticket.quantityAvailable) - quantity
    });

    const order = await domainRepository.createOrder({
      userId,
      eventId,
      ticketId: ticket.id,
      quantity,
      totalAmount: totalAmount,
      status: 'paid',
      registrationDate: now
    });

    const payment = await domainRepository.createPayment({
      orderId: order.id,
      amount: totalAmount,
      paymentMethod: payload.paymentMethod || 'mock-gateway',
      paymentStatus: 'paid',
      paymentDate: now
    });

    return { order, payment };
  }

  async function listOrdersByUser(userId) {
    return domainRepository.listOrdersByUser(userId);
  }

  async function listOrdersByEvent(eventId) {
    return domainRepository.listOrdersByEvent(eventId);
  }

  async function listPaymentsByOrder(orderId) {
    return domainRepository.listPaymentsByOrder(orderId);
  }

  return {
    createTicket,
    listTicketsByEvent,
    updateTicket,
    deleteTicket,
    createOrderAndPayment,
    listOrdersByUser,
    listOrdersByEvent,
    listPaymentsByOrder
  };
}
