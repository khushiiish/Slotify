import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: [100, 'Business name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Business slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-friendly (lowercase letters, numbers, hyphens)'],
      index: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid contact email address'],
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    timezone: {
      type: String,
      required: [true, 'Timezone is required'],
      default: 'Asia/Kolkata',
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'DISABLED'],
        message: '{VALUE} is not a valid business status',
      },
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Business', businessSchema);
