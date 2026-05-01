import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    _id: { type: Number },
    orderId: { type: mongoose.Schema.Types.Mixed, required: true },
    registrationId: { type: mongoose.Schema.Types.Mixed, default: null },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, default: 'mock-gateway' },
    payment_method: { type: String, default: 'mock-gateway' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'success', 'failed', 'refunded'], default: 'paid' },
    payment_status: { type: String, enum: ['pending', 'paid', 'success', 'failed', 'refunded'], default: 'paid' },
    paymentDate: { type: String, default: null },
    payment_date: { type: String, default: null }
  },
  { strict: false, collection: 'Payment' }
);

export const PaymentModel = mongoose.model('Payment', paymentSchema, 'Payment');
