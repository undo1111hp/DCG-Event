import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    _id: { type: Number },
    userId: { type: mongoose.Schema.Types.Mixed, required: true },
    eventId: { type: mongoose.Schema.Types.Mixed, required: true },
    ticketId: { type: mongoose.Schema.Types.Mixed, default: null },
    quantity: { type: Number, required: true, min: 1 },
    totalAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'paid', 'confirmed', 'failed', 'cancelled'], default: 'pending' },
    registrationDate: { type: String, default: null },
    registration_date: { type: String, default: null }
  },
  { strict: false, collection: 'Order' }
);

export const OrderModel = mongoose.model('Order', orderSchema, 'Order');
