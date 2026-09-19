import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    displayName: {
      type: String,
      default: 'Karthik',
      trim: true
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

export default mongoose.model('User', UserSchema);
