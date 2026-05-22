import express from 'express';
import cors from 'cors';
import { createAuthRouter } from './routes/auth.routes.js';
import { createAdminRouter } from './routes/admin.routes.js';
import { createEventsRouter } from './routes/events.routes.js';
import { createCommerceRouter } from './routes/commerce.routes.js';
import { createMetadataRouter } from './routes/metadata.routes.js';
import { createReviewsRouter } from './routes/reviews.routes.js';
import { createRecommendationsRouter } from './routes/recommendations.routes.js';
import { requireAuth, optionalAuth, requireAdmin, requireOrganizerOrAdmin } from './middleware/auth.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { getRepositories } from './repositories/index.js';
import { createAuthService } from './services/auth.service.js';
import { createEventsService } from './services/events.service.js';
import { createCommerceService } from './services/commerce.service.js';
import { createMetadataService } from './services/metadata.service.js';
import { createReviewsService } from './services/reviews.service.js';

export function createApp() {
  const app = express();
  const { authRepository, eventsRepository, domainRepository } = getRepositories();
  const authService = createAuthService(authRepository, eventsRepository, domainRepository);
  const eventsService = createEventsService(eventsRepository, domainRepository);
  const commerceService = createCommerceService(eventsRepository, domainRepository);
  const metadataService = createMetadataService(domainRepository);
  const reviewsService = createReviewsService(eventsRepository, domainRepository);

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', createAuthRouter(authService, requireAuth));
  app.use('/api/admin', createAdminRouter(authService, requireAuth, requireAdmin));
  app.use('/api/events', createRecommendationsRouter(eventsRepository, domainRepository, requireAuth));
  app.use(
    '/api/events',
    createEventsRouter(eventsService, requireAuth, optionalAuth, requireOrganizerOrAdmin)
  );
  app.use('/api/commerce', createCommerceRouter(commerceService, requireAuth, requireOrganizerOrAdmin));
  app.use('/api/meta', createMetadataRouter(metadataService, requireAuth, requireAdmin, requireOrganizerOrAdmin));
  app.use('/api', createReviewsRouter(reviewsService, requireAuth));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
