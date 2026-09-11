import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      maxlength: [100, 'User name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address'],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ['SYSTEM_OWNER', 'BUSINESS_ADMIN'],
        message: '{VALUE} is not a valid user role',
      },
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      default: null,
      validate: {
        validator: function (value) {
          if (this.role === 'SYSTEM_OWNER') {
            return value === null || value === undefined;
          }
          if (this.role === 'BUSINESS_ADMIN') {
            return value !== null && value !== undefined;
          }
          return true;
        },
        message: 'Business Admin must be associated with a businessId; System Owner must have businessId as null',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'DISABLED'],
        message: '{VALUE} is not a valid user status',
      },
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ businessId: 1, role: 1 });

export default mongoose.model('User', userSchema);
