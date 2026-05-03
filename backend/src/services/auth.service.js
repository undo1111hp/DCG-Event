import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

export function createAuthService(authRepository, eventsRepository, domainRepository) {
  function signToken(user) {
    return jwt.sign({ sub: user.id, email: user.email, role: user.role || 'user' }, env.jwtSecret, {
      expiresIn: '7d'
    });
  }

  function isBcryptHash(value) {
    return typeof value === 'string' && value.startsWith('$2') && value.length > 20;
  }

  async function verifyPassword(plain_password, stored_password_hash) {
    if (!stored_password_hash) {
      return false;
    }

    if (isBcryptHash(stored_password_hash)) {
      return bcrypt.compare(plain_password, stored_password_hash);
    }

    return plain_password === stored_password_hash;
  }

  async function register({ name, email, password }) {
    const normalized_email = String(email).trim().toLowerCase();
    const existing = await authRepository.findUserByEmail(normalized_email);
    if (existing) {
      throw new ApiError(409, 'Email already in use');
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await authRepository.createUser({
      name,
      email: normalized_email,
      password_hash,
      role: 'user'
    });

    return {
      token: signToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user'
      }
    };
  }

  async function login({ email, password }) {
    const normalized_email = String(email).trim().toLowerCase();
    const user = await authRepository.findUserByEmail(normalized_email);
    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      throw new ApiError(401, 'Invalid credentials');
    }

    if (!isBcryptHash(user.password_hash)) {
      const migrated_hash = await bcrypt.hash(password, 10);
      await authRepository.updateUserPassword(user.id, migrated_hash);
    }

    return {
      token: signToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user'
      }
    };
  }

  async function me(user_id) {
    const user = await authRepository.findUserById(user_id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user'
    };
  }

  async function updateProfile(user_id, { name, email }) {
    const current = await authRepository.findUserById(user_id);
    if (!current) {
      throw new ApiError(404, 'User not found');
    }

    if (email !== current.email) {
      const existing = await authRepository.findUserByEmail(email);
      if (existing && existing.id !== user_id) {
        throw new ApiError(409, 'Email already in use');
      }
    }

    const updated = await authRepository.updateUserProfile(user_id, { name, email });
    if (!updated) {
      throw new ApiError(404, 'User not found');
    }

    return {
      token: signToken(updated),
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role || 'user'
      }
    };
  }

  async function changePassword(user_id, { current_password, new_password }) {
    const user = await authRepository.findUserById(user_id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const valid = await verifyPassword(current_password, user.password_hash);
    if (!valid) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    const updated = await authRepository.updateUserPassword(user_id, password_hash);

    return {
      token: signToken(updated),
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role || 'user'
      }
    };
  }

  async function myRegistrations(userId) {
    const orders = await domainRepository.listOrdersByUser(userId);
    const activeOrders = orders.filter((order) => order.status !== 'cancelled');

    // Deduplicate: one entry per event (keep the most recent order)
    const seen = new Map();
    for (const order of activeOrders) {
      const existing = seen.get(order.event_id);
      if (!existing || new Date(order.created_at) > new Date(existing.created_at)) {
        seen.set(order.event_id, order);
      }
    }

    const uniqueOrders = [...seen.values()];
    if (uniqueOrders.length === 0) {
      return [];
    }

    const events = await Promise.all(
      uniqueOrders.map((order) => eventsRepository.getEventById(order.event_id))
    );

    return uniqueOrders
      .map((order, index) => {
        const event = events[index];
        if (!event) {
          return null;
        }

        return {
          order_id: order.id,
          registration_id: order.id,
          registered_at: order.registration_date || order.created_at,
          quantity: order.quantity,
          total_amount: order.total_amount,
          order_status: order.status,
          ...event
        };
      })
      .filter(Boolean);
  }

  async function listUsers() {
    const users = await authRepository.listUsers();
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      created_at: user.created_at
    }));
  }

  async function updateUserRole(user_id, role) {
    const allowed = ['user', 'organizer', 'admin'];
    if (!allowed.includes(role)) {
      throw new ApiError(400, 'role must be one of user, organizer, admin');
    }

    const updated = await authRepository.updateUserRole(user_id, role);
    if (!updated) {
      throw new ApiError(404, 'User not found');
    }

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role || 'user'
    };
  }

  return {
    register,
    login,
    me,
    updateProfile,
    changePassword,
    myRegistrations,
    listUsers,
    updateUserRole
  };
}
