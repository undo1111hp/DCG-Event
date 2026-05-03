import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createEventsRouter(
  eventsService,
  requireAuth,
  optionalAuth,
  requireOrganizerOrAdmin
) {
  const router = Router();

  router.get(
    '/',
    optionalAuth,
    asyncHandler(async (req, res) => {
      const events = await eventsService.listEvents(req.query, req.user);
      res.json(events);
    })
  );

  router.get(
    '/manage',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      const events = await eventsService.listEvents({ ...req.query, manage: 'true' }, req.user);
      res.json(events);
    })
  );

  router.post(
    '/',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      const event = await eventsService.createEvent(req.body, req.user);
      res.status(201).json(event);
    })
  );

  router.get(
    '/:event_id',
    optionalAuth,
    asyncHandler(async (req, res) => {
      const event = await eventsService.getEventById(req.params.event_id, req.user);
      res.json(event);
    })
  );

  router.get(
    '/:event_id/stats',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      const stats = await eventsService.getEventStats(req.params.event_id, req.user);
      res.json(stats);
    })
  );

  router.put(
    '/:event_id',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      const event = await eventsService.updateEvent(req.params.event_id, req.body, req.user);
      res.json(event);
    })
  );

  router.delete(
    '/:event_id',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      await eventsService.deleteEvent(req.params.event_id, req.user);
      res.status(204).send();
    })
  );

  router.post(
    '/:event_id/register',
    requireAuth,
    asyncHandler(async (req, res) => {
      const reg = await eventsService.registerForEvent(req.params.event_id, req.user.id);
      res.status(201).json(reg);
    })
  );

  router.get(
    '/:event_id/orders',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      const orders = await eventsService.listOrdersForEvent(req.params.event_id, req.user);
      res.json(orders);
    })
  );

  return router;
}
