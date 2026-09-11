import mongoose from 'mongoose';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const availabilitySchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required for availability'],
      index: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
      index: true,
    },
    dayOfWeek: {
      type: Number,
      required: [true, 'Day of week is required (0 = Sunday, 6 = Saturday)'],
      min: [0, 'Day of week must be between 0 (Sunday) and 6 (Saturday)'],
      max: [6, 'Day of week must be between 0 (Sunday) and 6 (Saturday)'],
      validate: {
        validator: Number.isInteger,
        message: 'Day of week must be an integer from 0 to 6',
      },
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [TIME_REGEX, 'Start time must be in 24-hour format HH:mm (e.g., 09:00)'],
      trim: true,
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [TIME_REGEX, 'End time must be in 24-hour format HH:mm (e.g., 17:30)'],
      trim: true,
      validate: {
        validator: function (value) {
          if (!this.startTime || !value) return true;
          return this.startTime < value;
        },
        message: 'Start time ({VALUE}) must be before end time',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for slot calculation queries
availabilitySchema.index({ businessId: 1, staffId: 1, dayOfWeek: 1, isActive: 1 });

export default mongoose.model('Availability', availabilitySchema);
