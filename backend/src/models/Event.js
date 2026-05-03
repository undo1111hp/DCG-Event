import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    _id: { type: Number },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    start_time: { type: String, default: null },
    end_time: { type: String, default: null },
    rating_avg: { type: Number, default: 0 },
    rating_count: { type: Number, default: 0 },
    category_ids: [{ type: mongoose.Schema.Types.Mixed }],
    venue_ids: [{ type: mongoose.Schema.Types.Mixed }],
  },
  { strict: false, collection: 'Event', versionKey: false }
);

export const EventModel = mongoose.model('Event', eventSchema, 'Event');
