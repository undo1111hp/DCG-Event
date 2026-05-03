import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    _id: { type: Number },
    order_id: { type: mongoose.Schema.Types.Mixed, required: true },
    registration_id: { type: mongoose.Schema.Types.Mixed, default: null },
    amount: { type: Number, required: true, min: 0 },
    payment_method: { type: String, default: 'mock-gateway' },
    payment_status: { type: String, enum: ['pending', 'paid', 'success', 'failed', 'refunded'], default: 'paid' },
    payment_date: { type: String, default: null }
  },
  { strict: false, collection: 'Payment', versionKey: false }
);

export const PaymentModel = mongoose.model('Payment', paymentSchema, 'Payment');
