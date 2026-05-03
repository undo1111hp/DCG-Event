import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    _id: { type: Number },
    user_id: { type: mongoose.Schema.Types.Mixed, required: true },
    event_id: { type: mongoose.Schema.Types.Mixed, required: true },
    ticket_id: { type: mongoose.Schema.Types.Mixed, default: null },
    quantity: { type: Number, required: true, min: 1 },
    total_amount: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'paid', 'confirmed', 'failed', 'cancelled'], default: 'pending' },
    registration_date: { type: String, default: null }
  },
  { strict: false, collection: 'Order', versionKey: false }
);

export const OrderModel = mongoose.model('Order', orderSchema, 'Order');
