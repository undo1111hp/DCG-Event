import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema(
  {
    _id: { type: Number },
    event_id: { type: mongoose.Schema.Types.Mixed, required: true },
    user_id: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { strict: false, collection: 'Registration', versionKey: false }
);

registrationSchema.index({ event_id: 1, user_id: 1 }, { unique: true });

export const RegistrationModel = mongoose.model('Registration', registrationSchema, 'Registration');
