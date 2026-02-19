const mongoose = require('mongoose');

const mealLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mealType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    foodName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    calories: {
      type: Number,
      required: true,
      min: 0,
      max: 5000,
    },
    proteinGrams: {
      type: Number,
      default: 0,
      min: 0,
      max: 500,
    },
    carbsGrams: {
      type: Number,
      default: 0,
      min: 0,
      max: 1000,
    },
    fatGrams: {
      type: Number,
      default: 0,
      min: 0,
      max: 500,
    },
    loggedAt: {
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

const MealLog = mongoose.models.MealLog || mongoose.model('MealLog', mealLogSchema);

module.exports = {
  MealLog,
};
