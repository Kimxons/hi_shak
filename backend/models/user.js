const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: null,
    },
    twoFactorTempSecret: {
      type: String,
      default: null,
    },
    aiInsightsEnabled: {
      type: Boolean,
      default: false,
    },
    privacyConsentAcceptedAt: {
      type: Date,
      default: null,
    },
    privacyConsentVersion: {
      type: String,
      default: '1.0',
      trim: true,
    },
    remindersEnabled: {
      type: Boolean,
      default: true,
    },
    mealReminderTime: {
      type: String,
      default: '12:00',
      trim: true,
    },
    workoutReminderTime: {
      type: String,
      default: '18:00',
      trim: true,
    },
    reminderTimezone: {
      type: String,
      default: 'UTC',
      trim: true,
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

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = {
  User,
};
