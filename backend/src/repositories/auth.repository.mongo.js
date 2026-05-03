import mongoose from 'mongoose';
import { UserModel } from '../models/User.js';

function formatDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

async function nextNumericId(model) {
  const [result] = await model.aggregate([{ $group: { _id: null, maxId: { $max: '$_id' } } }]);
  return Number((result?.maxId || 0) + 1);
}

function toNumericId(id) {
  const parsed = Number(id);
  return Number.isFinite(parsed) ? parsed : id;
}

function idFilter(id) {
  const numericId = Number(id);
  if (Number.isFinite(numericId)) {
    return { _id: numericId };
  }

  if (mongoose.isValidObjectId(id)) {
    return { _id: new mongoose.Types.ObjectId(id) };
  }

  return { _id: String(id) };
}

function mapUser(doc) {
  if (!doc) {
    return null;
  }

  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    password_hash: doc.password || '',
    phone: doc.phone || '',
    role: doc.role || 'user',
    created_at: formatDate(doc.created_at)
  };
}

export const authRepositoryMongo = {
  async createUser(user) {
    const created = await UserModel.create({
      _id: await nextNumericId(UserModel),
      name: user.name,
      email: user.email,
      password: user.password_hash || user.password,
      phone: user.phone || '',
      role: user.role || 'user',
      created_at: formatDate(new Date())
    });
    return mapUser(created);
  },

  async findUserByEmail(email) {
    const doc = await UserModel.findOne({ email }).lean().exec();
    return mapUser(doc);
  },

  async findUserById(id) {
    const doc = await UserModel.collection.findOne(idFilter(id));
    return mapUser(doc);
  },

  async updateUserProfile(id, updates) {
    const result = await UserModel.collection.updateOne(idFilter(id), {
      $set: { name: updates.name, email: updates.email }
    });

    if (!result.matchedCount) {
      return null;
    }

    return mapUser(await UserModel.collection.findOne(idFilter(id)));
  },

  async updateUserPassword(id, passwordHash) {
    const result = await UserModel.collection.updateOne(idFilter(id), {
      $set: { password: passwordHash }
    });

    if (!result.matchedCount) {
      return null;
    }

    return mapUser(await UserModel.collection.findOne(idFilter(id)));
  },

  async listUsers() {
    const docs = await UserModel.find({}).sort({ _id: -1 }).lean().exec();
    return docs.map(mapUser);
  },

  async updateUserRole(id, role) {
    const result = await UserModel.collection.updateOne(idFilter(id), {
      $set: { role }
    });

    if (!result.matchedCount) {
      return null;
    }

    return mapUser(await UserModel.collection.findOne(idFilter(id)));
  }
};
