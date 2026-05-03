import mongoose from 'mongoose';

const venueSchema = new mongoose.Schema(
  {
    _id: { type: Number },
    name: { type: String, required: true },
    address: { type: String, default: '' },
    city: { type: String, required: true },
    capacity: { type: Number, required: true, min: 1 }
  },
  { strict: false, collection: 'Venue', versionKey: false }
);

export const VenueModel = mongoose.model('Venue', venueSchema, 'Venue');
