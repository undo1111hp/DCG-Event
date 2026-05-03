import { memoryStore } from './memoryStore.js';

export const authRepositoryMemory = {
  async createUser(user) {
    const created = {
      id: memoryStore.makeId(),
      ...user,
      role: user.role || 'user',
      created_at: new Date().toISOString()
    };
    memoryStore.users.push(created);
    return created;
  },

  async findUserByEmail(email) {
    return memoryStore.users.find((u) => u.email === email) || null;
  },

  async findUserById(id) {
    return memoryStore.users.find((u) => u.id === id) || null;
  },

  async updateUserProfile(id, updates) {
    const user = memoryStore.users.find((u) => u.id === id);
    if (!user) {
      return null;
    }

    user.name = updates.name;
    user.email = updates.email;
    return user;
  },

  async updateUserPassword(id, password_hash) {
    const user = memoryStore.users.find((u) => u.id === id);
    if (!user) {
      return null;
    }

    user.password_hash = password_hash;
    return user;
  },

  async listUsers() {
    return memoryStore.users;
  },

  async updateUserRole(id, role) {
    const user = memoryStore.users.find((u) => u.id === id);
    if (!user) {
      return null;
    }

    user.role = role;
    return user;
  }
};
