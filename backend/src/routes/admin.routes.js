import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createAdminRouter(authService, requireAuth, requireAdmin) {
  const router = Router();

  router.get(
    '/users',
    requireAuth,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const users = await authService.listUsers();
      res.json(users);
    })
  );

  router.put(
    '/users/:user_id/role',
    requireAuth,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const user = await authService.updateUserRole(req.params.user_id, req.body.role);
      res.json(user);
    })
  );

  return router;
}
