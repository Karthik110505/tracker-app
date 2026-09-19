import mongoose from 'mongoose';

const FolderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    id: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    color: {
      type: String,
      default: '#6366f1',
      trim: true
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

// Compound unique index ensuring a user cannot have duplicate folder IDs
FolderSchema.index({ userId: 1, id: 1 }, { unique: true });

export default mongoose.model('Folder', FolderSchema);
