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
    '/:eventId',
    optionalAuth,
    asyncHandler(async (req, res) => {
      const event = await eventsService.getEventById(req.params.eventId, req.user);
      res.json(event);
    })
  );

  router.get(
    '/:eventId/stats',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      const stats = await eventsService.getEventStats(req.params.eventId, req.user);
      res.json(stats);
    })
  );

  router.put(
    '/:eventId',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      const event = await eventsService.updateEvent(req.params.eventId, req.body, req.user);
      res.json(event);
    })
  );

  router.delete(
    '/:eventId',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      await eventsService.deleteEvent(req.params.eventId, req.user);
      res.status(204).send();
    })
  );

  router.post(
    '/:eventId/categories/:categoryId',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      const result = await eventsService.linkCategoryToEvent(
        req.params.eventId,
        req.params.categoryId,
        req.user
      );
      res.status(201).json(result);
    })
  );

  router.delete(
    '/:eventId/categories/:categoryId',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      await eventsService.unlinkCategoryFromEvent(
        req.params.eventId,
        req.params.categoryId,
        req.user
      );
      res.status(204).send();
    })
  );

  router.post(
    '/:eventId/register',
    requireAuth,
    asyncHandler(async (req, res) => {
      const reg = await eventsService.registerForEvent(req.params.eventId, req.user.id);
      res.status(201).json(reg);
    })
  );

  router.get(
    '/:eventId/registrations',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      const regs = await eventsService.listRegistrationsForEvent(req.params.eventId, req.user);
      res.json(regs);
    })
  );

  return router;
}
