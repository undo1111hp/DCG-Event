import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    _id: { type: Number },
    name: { type: String, required: true, unique: true }
  },
  { strict: false, collection: 'Category', versionKey: false }
);

export const CategoryModel = mongoose.model('Category', categorySchema, 'Category');
