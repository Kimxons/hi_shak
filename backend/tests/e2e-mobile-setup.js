require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const { connectToDatabase } = require('../db');
const { MealLog } = require('../models/meal-log');
const { User } = require('../models/user');
const { Workout } = require('../models/workout');

const DEFAULT_EMAIL = 'e2e.mobile@vigilfit.test';
const DEFAULT_PASSWORD = 'Password1234';

async function main() {
  const email = (process.env.E2E_MOBILE_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
  const password = process.env.E2E_MOBILE_PASSWORD || DEFAULT_PASSWORD;

  if (!email.includes('@')) {
    throw new Error('E2E_MOBILE_EMAIL must be a valid email address.');
  }

  if (password.length < 8) {
    throw new Error('E2E_MOBILE_PASSWORD must be at least 8 characters long.');
  }

  await connectToDatabase();

  const passwordHash = await bcrypt.hash(password, 12);
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      email,
      passwordHash,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorTempSecret: null,
      twoFactorRecoveryCodes: [],
      aiInsightsEnabled: false,
      privacyConsentAcceptedAt: new Date(),
      privacyConsentVersion: '1.0',
      remindersEnabled: true,
      mealReminderTime: '12:00',
      workoutReminderTime: '18:00',
      reminderTimezone: 'UTC',
    });
  } else {
    user.passwordHash = passwordHash;
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorTempSecret = null;
    user.twoFactorRecoveryCodes = [];
    user.aiInsightsEnabled = false;
    user.privacyConsentAcceptedAt = user.privacyConsentAcceptedAt || new Date();
    user.privacyConsentVersion = '1.0';
    user.remindersEnabled = true;
    user.mealReminderTime = '12:00';
    user.workoutReminderTime = '18:00';
    user.reminderTimezone = 'UTC';
    await user.save();
  }

  await Promise.all([Workout.deleteMany({ userId: user._id }), MealLog.deleteMany({ userId: user._id })]);

  console.log(`E2E mobile user is ready: ${email}`);
  console.log('Two-factor auth disabled, AI insights disabled, and workout/nutrition logs cleared.');

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
