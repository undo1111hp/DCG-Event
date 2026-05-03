import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createCommerceRouter(commerceService, requireAuth, requireOrganizerOrAdmin) {
  const router = Router();

  router.post(
    '/events/:event_id/tickets',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      const ticket = await commerceService.createTicket(req.params.event_id, req.body, req.user);
      res.status(201).json(ticket);
    })
  );

  router.get(
    '/events/:event_id/tickets',
    asyncHandler(async (req, res) => {
      const tickets = await commerceService.listTicketsByEvent(req.params.event_id);
      res.json(tickets);
    })
  );

  router.put(
    '/events/:event_id/tickets/:ticket_id',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      const ticket = await commerceService.updateTicket(
        req.params.event_id,
        req.params.ticket_id,
        req.body,
        req.user
      );
      res.json(ticket);
    })
  );

  router.delete(
    '/events/:event_id/tickets/:ticket_id',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      await commerceService.deleteTicket(req.params.event_id, req.params.ticket_id, req.user);
      res.status(204).send();
    })
  );

  router.post(
    '/events/:event_id/orders',
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await commerceService.createOrderAndPayment(req.user.id, req.params.event_id, req.body);
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
    '/events/:event_id/orders',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      const orders = await commerceService.listOrdersByEvent(req.params.event_id);
      res.json(orders);
    })
  );

  router.get(
    '/orders/:order_id/payments',
    requireAuth,
    asyncHandler(async (req, res) => {
      const payments = await commerceService.listPaymentsByOrder(req.params.order_id);
      res.json(payments);
    })
  );

  router.put(
    '/orders/:order_id/pay',
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await commerceService.payOrder(req.params.order_id, req.user.id);
      res.json(result);
    })
  );

  router.put(
    '/orders/:order_id/cancel',
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await commerceService.cancelOrder(req.params.order_id, req.user.id);
      res.json(result);
    })
  );

  return router;
}
