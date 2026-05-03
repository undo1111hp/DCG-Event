import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createReviewsRouter(reviewsService, requireAuth) {
  const router = Router();

  router.get(
    '/events/:event_id/reviews',
    asyncHandler(async (req, res) => {
      const reviews = await reviewsService.listReviewsByEvent(req.params.event_id);
      res.json(reviews);
    })
  );

  router.post(
    '/events/:event_id/reviews',
    requireAuth,
    asyncHandler(async (req, res) => {
      const review = await reviewsService.addReview(req.user.id, req.params.event_id, req.body);
      res.status(201).json(review);
    })
  );

  return router;
}
