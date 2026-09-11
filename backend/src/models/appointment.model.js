import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required for an appointment'],
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service ID is required for an appointment'],
      index: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: [true, 'Staff ID is required for an appointment'],
      index: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Customer name cannot exceed 100 characters'],
    },
    customerEmail: {
      type: String,
      required: [true, 'Customer email is required'],
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid customer email address'],
      index: true,
    },
    customerPhone: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Appointment start time is required'],
      index: true,
    },
    endTime: {
      type: Date,
      required: [true, 'Appointment end time is required'],
      validate: {
        validator: function (value) {
          if (!this.startTime || !value) return true;
          return this.startTime < value;
        },
        message: 'Appointment start time must be earlier than end time',
      },
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
        message: '{VALUE} is not a valid appointment status',
      },
      default: 'CONFIRMED',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for scheduling queries, conflict checks, and reporting
appointmentSchema.index({ businessId: 1, startTime: 1 });
appointmentSchema.index({ staffId: 1, startTime: 1 });
appointmentSchema.index({ businessId: 1, status: 1, startTime: 1 });

export default mongoose.model('Appointment', appointmentSchema);
