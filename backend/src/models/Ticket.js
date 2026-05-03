import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    _id: { type: Number },
    event_id: { type: Number, required: true },
    type: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity_available: { type: Number, required: true, min: 0 }
  },
  { strict: false, collection: 'Ticket', versionKey: false }
);

ticketSchema.index({ event_id: 1, type: 1 }, { unique: true });

export const TicketModel = mongoose.model('Ticket', ticketSchema, 'Ticket');
