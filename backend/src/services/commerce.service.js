import { ApiError } from '../utils/apiError.js';

export function createCommerceService(eventsRepository, domainRepository) {
  function ensureCanManageEvent(user, event) {
    if (!user) {
      throw new ApiError(401, 'Authentication required');
    }

    if (user.role === 'admin') {
      return;
    }

    if (user.role === 'organizer' && String(event.organizer_id) === String(user.id)) {
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

    if (!payload.type || payload.price === undefined || payload.quantity_available === undefined) {
      throw new ApiError(400, 'type, price, quantity_available are required');
    }

    const quantity_available = Number(payload.quantity_available);
    if (!Number.isFinite(quantity_available) || quantity_available < 0) {
      throw new ApiError(400, 'quantity_available must be zero or a positive number');
    }

    const price = Number(payload.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new ApiError(400, 'price must be zero or a positive number');
    }

    return domainRepository.createTicket({
      event_id: eventId,
      type: payload.type,
      price,
      quantity_available
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
    if (!ticket || ticket.event_id !== eventId) {
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

    if (payload.quantity_available !== undefined) {
      const quantity_available = Number(payload.quantity_available);
      if (!Number.isFinite(quantity_available) || quantity_available < 0) {
        throw new ApiError(400, 'quantity_available must be zero or a positive number');
      }
      updates.quantity_available = quantity_available;
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
    if (!ticket || ticket.event_id !== eventId) {
      throw new ApiError(404, 'Ticket not found for this event');
    }

    const orders = await domainRepository.listOrdersByEvent(eventId);
    const hasOrders = orders.some((order) => String(order.ticket_id) === String(ticketId));
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

    const ticket = await domainRepository.getTicketById(payload.ticket_id);
    if (!ticket || ticket.event_id !== eventId) {
      throw new ApiError(404, 'Ticket not found for this event');
    }

    const quantity = Number(payload.quantity || 1);
    if (Number.isNaN(quantity) || quantity < 1) {
      throw new ApiError(400, 'quantity must be a positive number');
    }

    if (ticket.quantity_available < quantity) {
      throw new ApiError(409, 'Not enough ticket quantity available');
    }

    const total_amount = Number(ticket.price) * quantity;
    const now = new Date().toISOString();

    await domainRepository.updateTicket(ticket.id, {
      quantity_available: Number(ticket.quantity_available) - quantity
    });

    const order = await domainRepository.createOrder({
      user_id: userId,
      event_id: eventId,
      ticket_id: ticket.id,
      quantity,
      total_amount: total_amount,
      status: 'pending',
      registration_date: now
    });

    return { order, payment: null };
  }

  async function payOrder(orderId, userId) {
    const order = await domainRepository.getOrderById(orderId);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (String(order.user_id) !== String(userId)) {
      throw new ApiError(403, 'You can only pay for your own orders');
    }

    if (order.status !== 'pending') {
      throw new ApiError(400, `Cannot pay for an order with status '${order.status}'`);
    }

    const updated = await domainRepository.updateOrder(orderId, { status: 'paid' });
    if (!updated) {
      throw new ApiError(404, 'Order not found');
    }

    const now = new Date().toISOString();
    const payment = await domainRepository.createPayment({
      order_id: order.id,
      amount: order.total_amount,
      payment_method: 'mock-gateway',
      payment_status: 'paid',
      payment_date: now
    });

    return { order: updated, payment };
  }

  async function cancelOrder(orderId, userId) {
    const order = await domainRepository.getOrderById(orderId);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (String(order.user_id) !== String(userId)) {
      throw new ApiError(403, 'You can only cancel your own orders');
    }

    if (order.status !== 'pending') {
      throw new ApiError(400, `Cannot cancel an order with status '${order.status}'`);
    }

    // Restore ticket quantity
    const ticket = await domainRepository.getTicketById(order.ticket_id);
    if (ticket) {
      await domainRepository.updateTicket(ticket.id, {
        quantity_available: Number(ticket.quantity_available) + Number(order.quantity)
      });
    }

    const updated = await domainRepository.updateOrder(orderId, { status: 'cancelled' });
    if (!updated) {
      throw new ApiError(404, 'Order not found');
    }

    return { order: updated };
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
    payOrder,
    cancelOrder,
    listOrdersByUser,
    listOrdersByEvent,
    listPaymentsByOrder
  };
}
