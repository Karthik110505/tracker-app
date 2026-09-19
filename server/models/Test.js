import mongoose from 'mongoose';

const TestSchema = new mongoose.Schema(
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
    folderId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: String,
      required: true,
      trim: true
    },
    session: {
      type: String,
      enum: ['morning', 'afternoon', null],
      default: null
    },
    duration: {
      type: String,
      default: '180 Min',
      trim: true
    },
    timeTaken: {
      type: String,
      default: '180 Min',
      trim: true
    },
    timeTakenMinutes: {
      type: Number,
      default: 0
    },
    marks: {
      type: Number,
      required: true,
      default: 0
    },
    totalMarks: {
      type: Number,
      required: true,
      default: 100
    },
    attempted: {
      type: Number,
      required: true,
      default: 0
    },
    totalQs: {
      type: Number,
      required: true,
      default: 65
    },
    correct: {
      type: Number,
      required: true,
      default: 0
    },
    incorrect: {
      type: Number,
      required: true,
      default: 0
    },
    notAttempted: {
      type: Number,
      required: true,
      default: 0
    },
    accuracy: {
      type: String,
      default: '0%',
      trim: true
    },
    accuracyVal: {
      type: Number,
      default: 0
    },
    attemptRate: {
      type: String,
      default: '0%',
      trim: true
    },
    attemptRateVal: {
      type: Number,
      default: 0
    },
    difficulty: {
      type: Number,
      default: null
    },
    gateYear: {
      type: String,
      default: null,
      trim: true
    },
    gateShift: {
      type: String,
      default: null,
      trim: true
    },
    rankGot: {
      type: Number,
      default: null
    },
    totalCandidates: {
      type: Number,
      default: null
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    deletedAt: {
      type: Date,
      default: null,
      index: true
    }
  },
  {
    timestamps: true,
    strict: true // Prevents any undeclared fields (including paperHtml) from being saved
  }
);

// Compound indexes
TestSchema.index({ userId: 1, id: 1 }, { unique: true });
TestSchema.index({ userId: 1, folderId: 1, date: -1 });
TestSchema.index({ userId: 1, updatedAt: -1 });

// HARD DEFENSE LAYER: Pre-save hook ensuring paperHtml can NEVER be persisted in MongoDB
TestSchema.pre('save', function (next) {
  if (this.get('paperHtml') !== undefined || this.paperHtml !== undefined) {
    return next(new Error('CRITICAL SECURITY VIOLATION: paperHtml is strictly forbidden in MongoDB Atlas.'));
  }
  
  // Clean up accuracyVal and attemptRateVal for numerical charts if not provided
  if (!this.accuracyVal && this.accuracy) {
    const parsed = parseFloat(this.accuracy.replace('%', ''));
    if (!isNaN(parsed)) this.accuracyVal = parsed;
  }
  if (!this.attemptRateVal && this.attemptRate) {
    const parsed = parseFloat(this.attemptRate.replace('%', ''));
    if (!isNaN(parsed)) this.attemptRateVal = parsed;
  } else if (!this.attemptRateVal && this.totalQs > 0) {
    this.attemptRateVal = parseFloat(((this.attempted / this.totalQs) * 100).toFixed(1));
    this.attemptRate = `${this.attemptRateVal}%`;
  }

  next();
});

export default mongoose.model('Test', TestSchema);
