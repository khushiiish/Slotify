import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required for a service'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      maxlength: [100, 'Service name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute'],
      validate: {
        validator: Number.isInteger,
        message: 'Duration must be an integer number of minutes',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'INACTIVE'],
        message: '{VALUE} is not a valid service status',
      },
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

serviceSchema.index({ businessId: 1, status: 1 });
serviceSchema.index({ businessId: 1, name: 1 });

export default mongoose.model('Service', serviceSchema);
