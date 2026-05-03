import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    _id: { type: Number },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    role: { type: String, enum: ['admin', 'organizer', 'user'], default: 'user' },
    created_at: { type: String, default: null }
  },
  { strict: false, collection: 'User', versionKey: false }
);

export const UserModel = mongoose.model('User', userSchema, 'User');
