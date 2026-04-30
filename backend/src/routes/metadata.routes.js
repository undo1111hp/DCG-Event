import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createMetadataRouter(metadataService, requireAuth, requireAdmin, requireOrganizerOrAdmin) {
  const router = Router();

  router.get(
    '/categories',
    asyncHandler(async (req, res) => {
      const categories = await metadataService.listCategories();
      res.json(categories);
    })
  );

  router.post(
    '/categories',
    requireAuth,
    requireOrganizerOrAdmin,
    asyncHandler(async (req, res) => {
      const category = await metadataService.createCategory(req.body);
      res.status(201).json(category);
    })
  );

  router.get(
    '/venues',
    asyncHandler(async (req, res) => {
      const venues = await metadataService.listVenues();
      res.json(venues);
    })
  );

  router.post(
    '/venues',
    requireAuth,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const venue = await metadataService.createVenue(req.body);
      res.status(201).json(venue);
    })
  );

  router.put(
    '/venues/:venueId',
    requireAuth,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const venue = await metadataService.updateVenue(req.params.venueId, req.body);
      res.json(venue);
    })
  );

  return router;
}
