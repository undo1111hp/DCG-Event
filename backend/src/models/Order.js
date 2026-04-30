import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    _id: { type: Number },
    userId: { type: mongoose.Schema.Types.Mixed, required: true },
    eventId: { type: mongoose.Schema.Types.Mixed, required: true },
    ticketId: { type: mongoose.Schema.Types.Mixed, default: null },
    quantity: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled'], default: 'paid' },
    registration_date: { type: String, default: null }
  },
  { strict: false, collection: 'Order' }
);

export const OrderModel = mongoose.model('Order', orderSchema, 'Order');
