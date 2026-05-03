import { ApiError } from '../utils/apiError.js';

export function validateUpdateProfilePayload(req, res, next) {
  const { name, email } = req.body;

  if (!name || !email) {
    return next(new ApiError(400, 'name and email are required'));
  }

  next();
}

export function validateChangePasswordPayload(req, res, next) {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return next(new ApiError(400, 'current_password and new_password are required'));
  }

  if (String(new_password).length < 6) {
    return next(new ApiError(400, 'new_password must be at least 6 characters'));
  }

  next();
}
