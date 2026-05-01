import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createCommerceRouter(commerceService, requireAuth, requireOrganizerOrAdmin) {
  const router = Router();

  router.post(
    '/events/:eventId/tickets',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      const ticket = await commerceService.createTicket(req.params.eventId, req.body, req.user);
      res.status(201).json(ticket);
    })
  );

  router.get(
    '/events/:eventId/tickets',
    asyncHandler(async (req, res) => {
      const tickets = await commerceService.listTicketsByEvent(req.params.eventId);
      res.json(tickets);
    })
  );

  router.put(
    '/events/:eventId/tickets/:ticketId',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      const ticket = await commerceService.updateTicket(
        req.params.eventId,
        req.params.ticketId,
        req.body,
        req.user
      );
      res.json(ticket);
    })
  );

  router.delete(
    '/events/:eventId/tickets/:ticketId',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      await commerceService.deleteTicket(req.params.eventId, req.params.ticketId, req.user);
      res.status(204).send();
    })
  );

  router.post(
    '/events/:eventId/orders',
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await commerceService.createOrderAndPayment(req.user.id, req.params.eventId, req.body);
      res.status(201).json(result);
    })
  );

  router.get(
    '/my-orders',
    requireAuth,
    asyncHandler(async (req, res) => {
      const orders = await commerceService.listOrdersByUser(req.user.id);
      res.json(orders);
    })
  );

  router.get(
    '/events/:eventId/orders',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      const orders = await commerceService.listOrdersByEvent(req.params.eventId);
      res.json(orders);
    })
  );

  router.get(
    '/orders/:orderId/payments',
    requireAuth,
    asyncHandler(async (req, res) => {
      const payments = await commerceService.listPaymentsByOrder(req.params.orderId);
      res.json(payments);
    })
  );

  router.put(
    '/orders/:orderId/pay',
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await commerceService.payOrder(req.params.orderId, req.user.id);
      res.json(result);
    })
  );

  router.put(
    '/orders/:orderId/cancel',
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await commerceService.cancelOrder(req.params.orderId, req.user.id);
      res.json(result);
    })
  );

  return router;
}
