import mongoose from 'mongoose';

const blockedDateSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required for a blocked date'],
      index: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required for a blocked date entry'],
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [200, 'Reason cannot exceed 200 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for slot generation checks
blockedDateSchema.index({ businessId: 1, date: 1 });
blockedDateSchema.index({ businessId: 1, staffId: 1, date: 1 });

export default mongoose.model('BlockedDate', blockedDateSchema);
