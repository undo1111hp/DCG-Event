import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    _id: { type: Number },
    orderId: { type: mongoose.Schema.Types.Mixed, required: true },
    amount: { type: Number, required: true, min: 0 },
    payment_method: { type: String, required: true, default: 'mock-gateway' },
    payment_status: { type: String, required: true, default: 'paid' },
    payment_date: { type: String, required: true }
  },
  { strict: false, collection: 'Payment' }
);

export const PaymentModel = mongoose.model('Payment', paymentSchema, 'Payment');
