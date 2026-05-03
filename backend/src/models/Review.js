import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    _id: { type: Number },
    user_id: { type: mongoose.Schema.Types.Mixed, required: true },
    event_id: { type: mongoose.Schema.Types.Mixed, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' }
  },
  { strict: false, collection: 'Review', versionKey: false }
);

reviewSchema.index({ user_id: 1, event_id: 1 }, { unique: true });

export const ReviewModel = mongoose.model('Review', reviewSchema, 'Review');
