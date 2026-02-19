const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    workoutType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
    },
    caloriesBurned: {
      type: Number,
      default: 0,
      min: 0,
      max: 50000,
    },
    performedAt: {
      type: Date,
      required: true,
      index: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 400,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    versionKey: false,
  }
);

const Workout = mongoose.models.Workout || mongoose.model('Workout', workoutSchema);

module.exports = {
  Workout,
};
