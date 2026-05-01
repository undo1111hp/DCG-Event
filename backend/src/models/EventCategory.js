import mongoose from 'mongoose';

const eventCategorySchema = new mongoose.Schema(
  {
    _id: { type: Number },
    eventId: { type: Number, required: true },
    categoryId: { type: Number, required: true }
  },
  { strict: false, collection: 'EventCategory' }
);

eventCategorySchema.index({ eventId: 1, categoryId: 1 }, { unique: true });

export const EventCategoryModel = mongoose.model('EventCategory', eventCategorySchema, 'EventCategory');