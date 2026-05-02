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

  async function verifyPassword(plainPassword, storedPasswordHash) {
    if (!storedPasswordHash) {
      return false;
    }

    if (isBcryptHash(storedPasswordHash)) {
      return bcrypt.compare(plainPassword, storedPasswordHash);
    }

    return plainPassword === storedPasswordHash;
  }

  async function register({ name, email, password }) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await authRepository.findUserByEmail(normalizedEmail);
    if (existing) {
      throw new ApiError(409, 'Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await authRepository.createUser({
      name,
      email: normalizedEmail,
      passwordHash,
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
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await authRepository.findUserByEmail(normalizedEmail);
    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, 'Invalid credentials');
    }

    if (!isBcryptHash(user.passwordHash)) {
      const migratedHash = await bcrypt.hash(password, 10);
      await authRepository.updateUserPassword(user.id, migratedHash);
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

  async function me(userId) {
    const user = await authRepository.findUserById(userId);
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

  async function updateProfile(userId, { name, email }) {
    const current = await authRepository.findUserById(userId);
    if (!current) {
      throw new ApiError(404, 'User not found');
    }

    if (email !== current.email) {
      const existing = await authRepository.findUserByEmail(email);
      if (existing && existing.id !== userId) {
        throw new ApiError(409, 'Email already in use');
      }
    }

    const updated = await authRepository.updateUserProfile(userId, { name, email });
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

  async function changePassword(userId, { currentPassword, newPassword }) {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await authRepository.updateUserPassword(userId, passwordHash);

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
      const existing = seen.get(order.eventId);
      if (!existing || new Date(order.createdAt) > new Date(existing.createdAt)) {
        seen.set(order.eventId, order);
      }
    }

    const uniqueOrders = [...seen.values()];
    if (uniqueOrders.length === 0) {
      return [];
    }

    const events = await Promise.all(
      uniqueOrders.map((order) => eventsRepository.getEventById(order.eventId))
    );

    return uniqueOrders
      .map((order, index) => {
        const event = events[index];
        if (!event) {
          return null;
        }

        return {
          orderId: order.id,
          registrationId: order.id,
          registeredAt: order.registrationDate || order.createdAt,
          quantity: order.quantity,
          totalAmount: order.totalAmount,
          orderStatus: order.status,
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
      createdAt: user.createdAt
    }));
  }

  async function updateUserRole(userId, role) {
    const allowed = ['user', 'organizer', 'admin'];
    if (!allowed.includes(role)) {
      throw new ApiError(400, 'role must be one of user, organizer, admin');
    }

    const updated = await authRepository.updateUserRole(userId, role);
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
