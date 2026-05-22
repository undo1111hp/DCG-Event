import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getRecommendations } from '../services/recommendation.service.js';

export function createRecommendationsRouter(eventsRepository, domainRepository, requireAuth) {
  const router = Router();

  router.get(
    '/recommended',
    requireAuth,
    asyncHandler(async (req, res) => {
      const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 4));
      const recommendations = await getRecommendations(
        req.user.id,
        limit,
        eventsRepository,
        domainRepository
      );
      res.json(recommendations);
    })
  );

  return router;
}
