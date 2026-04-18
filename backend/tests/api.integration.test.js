const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const speakeasy = require('speakeasy');
const request = require('supertest');

const { MealLog } = require('../models/meal-log');
const { User } = require('../models/user');
const { Workout } = require('../models/workout');
const { createApp } = require('../server');

const TEST_PASSWORD = 'Password1234';

let app;
let mongoServer;

function uniqueEmail(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}@vigilfit.test`;
}

async function registerUser(email) {
  const response = await request(app).post('/auth/register').send({
    email,
    password: TEST_PASSWORD,
    consentAccepted: true,
    privacyConsentVersion: '1.0',
  });

  assert.equal(response.status, 201);
  assert.ok(response.body.token);
  return response.body;
}

async function enableTwoFactorForUser(token) {
  const setupResponse = await request(app).post('/auth/2fa/setup').set('Authorization', `Bearer ${token}`);
  assert.equal(setupResponse.status, 200);
  assert.ok(setupResponse.body.manualEntryKey);

  const setupCode = speakeasy.totp({
    secret: setupResponse.body.manualEntryKey,
    encoding: 'base32',
  });

  const enableResponse = await request(app)
    .post('/auth/2fa/verify-enable')
    .set('Authorization', `Bearer ${token}`)
    .send({ code: setupCode });

  assert.equal(enableResponse.status, 200);
  assert.equal(enableResponse.body.user.twoFactorEnabled, true);

  return {
    manualEntryKey: setupResponse.body.manualEntryKey,
  };
}

before(async () => {
  process.env.JWT_SECRET = 'integration-test-secret';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  app = createApp();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Workout.deleteMany({}), MealLog.deleteMany({})]);
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('register/login hashes passwords and creates a valid session token', async () => {
  const email = uniqueEmail('auth');
  const registerResponse = await registerUser(email);
  assert.equal(registerResponse.user.twoFactorEnabled, false);
  assert.equal(registerResponse.user.aiInsightsEnabled, false);
  assert.equal(registerResponse.user.privacyConsentVersion, '1.0');
  assert.ok(registerResponse.user.privacyConsentAcceptedAt);

  const createdUser = await User.findOne({ email });
  assert.ok(createdUser);
  assert.notEqual(createdUser.passwordHash, TEST_PASSWORD);
  assert.equal(createdUser.passwordHash.startsWith('$2'), true);

  const loginResponse = await request(app).post('/auth/login').send({
    email,
    password: TEST_PASSWORD,
  });

  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.requiresTwoFactor, false);
  assert.ok(loginResponse.body.token);

  const meResponse = await request(app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${loginResponse.body.token}`);

  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.user.email, email);
});

test('security: weak passwords are rejected and protected routes require JWT', async () => {
  const missingConsentResponse = await request(app).post('/auth/register').send({
    email: uniqueEmail('noconsent'),
    password: TEST_PASSWORD,
  });
  assert.equal(missingConsentResponse.status, 400);

  const weakPasswordResponse = await request(app).post('/auth/register').send({
    email: uniqueEmail('weak'),
    password: 'short',
    consentAccepted: true,
  });
  assert.equal(weakPasswordResponse.status, 400);

  const protectedResponse = await request(app).get('/workouts');
  assert.equal(protectedResponse.status, 401);
});

test('2FA setup and login challenge flow works end-to-end', async () => {
  const email = uniqueEmail('twofactor');
  const registerResponse = await registerUser(email);

  const { manualEntryKey } = await enableTwoFactorForUser(registerResponse.token);

  const loginResponse = await request(app).post('/auth/login').send({
    email,
    password: TEST_PASSWORD,
  });

  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.requiresTwoFactor, true);
  assert.ok(loginResponse.body.challengeToken);

  const verifyCode = speakeasy.totp({
    secret: manualEntryKey,
    encoding: 'base32',
  });

  const verifyLoginResponse = await request(app).post('/auth/2fa/verify-login').send({
    challengeToken: loginResponse.body.challengeToken,
    code: verifyCode,
  });

  assert.equal(verifyLoginResponse.status, 200);
  assert.ok(verifyLoginResponse.body.token);
  assert.equal(verifyLoginResponse.body.user.twoFactorEnabled, true);
});

test('2FA disable requires password confirmation', async () => {
  const email = uniqueEmail('disable');
  const registerResponse = await registerUser(email);
  const { manualEntryKey } = await enableTwoFactorForUser(registerResponse.token);

  const loginResponse = await request(app).post('/auth/login').send({
    email,
    password: TEST_PASSWORD,
  });
  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.requiresTwoFactor, true);

  const verifyCode = speakeasy.totp({
    secret: manualEntryKey,
    encoding: 'base32',
  });

  const verifyLoginResponse = await request(app).post('/auth/2fa/verify-login').send({
    challengeToken: loginResponse.body.challengeToken,
    code: verifyCode,
  });
  assert.equal(verifyLoginResponse.status, 200);

  const disableWithWrongPasswordResponse = await request(app)
    .post('/auth/2fa/disable')
    .set('Authorization', `Bearer ${verifyLoginResponse.body.token}`)
    .send({ password: 'wrong-password' });
  assert.equal(disableWithWrongPasswordResponse.status, 401);

  const disableWithCorrectPasswordResponse = await request(app)
    .post('/auth/2fa/disable')
    .set('Authorization', `Bearer ${verifyLoginResponse.body.token}`)
    .send({ password: TEST_PASSWORD });
  assert.equal(disableWithCorrectPasswordResponse.status, 200);
  assert.equal(disableWithCorrectPasswordResponse.body.user.twoFactorEnabled, false);
});

test('workout/nutrition APIs are user-scoped and AI recommendations require opt-in', async () => {
  const email = uniqueEmail('fitness');
  const registerResponse = await registerUser(email);
  const token = registerResponse.token;

  const createWorkoutResponse = await request(app)
    .post('/workouts')
    .set('Authorization', `Bearer ${token}`)
    .send({
      workoutType: 'Strength',
      durationMinutes: 45,
      caloriesBurned: 320,
      performedAt: new Date().toISOString(),
      notes: 'Upper body session',
    });

  assert.equal(createWorkoutResponse.status, 201);
  const workoutId = createWorkoutResponse.body.workout.id;

  const createLogResponse = await request(app)
    .post('/nutrition/logs')
    .set('Authorization', `Bearer ${token}`)
    .send({
      mealType: 'Lunch',
      foodName: 'Chicken and rice',
      calories: 640,
      proteinGrams: 45,
      carbsGrams: 70,
      fatGrams: 18,
      loggedAt: new Date().toISOString(),
      notes: 'Post-workout meal',
    });

  assert.equal(createLogResponse.status, 201);
  const logId = createLogResponse.body.log.id;

  const updateWorkoutResponse = await request(app)
    .put(`/workouts/${workoutId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      workoutType: 'Updated Strength',
      durationMinutes: 50,
      caloriesBurned: 380,
      performedAt: new Date().toISOString(),
      notes: 'Updated note',
    });
  assert.equal(updateWorkoutResponse.status, 200);
  assert.equal(updateWorkoutResponse.body.workout.workoutType, 'Updated Strength');

  const updateLogResponse = await request(app)
    .put(`/nutrition/logs/${logId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      mealType: 'Dinner',
      foodName: 'Updated meal',
      calories: 700,
      proteinGrams: 50,
      carbsGrams: 80,
      fatGrams: 20,
      loggedAt: new Date().toISOString(),
      notes: 'Updated nutrition note',
    });
  assert.equal(updateLogResponse.status, 200);
  assert.equal(updateLogResponse.body.log.foodName, 'Updated meal');

  const workoutsResponse = await request(app).get('/workouts').set('Authorization', `Bearer ${token}`);
  assert.equal(workoutsResponse.status, 200);
  assert.equal(workoutsResponse.body.workouts.length, 1);

  const logsResponse = await request(app).get('/nutrition/logs').set('Authorization', `Bearer ${token}`);
  assert.equal(logsResponse.status, 200);
  assert.equal(logsResponse.body.logs.length, 1);

  const secondUser = await registerUser(uniqueEmail('other'));
  const unauthorizedDelete = await request(app)
    .delete(`/workouts/${workoutId}`)
    .set('Authorization', `Bearer ${secondUser.token}`);
  assert.equal(unauthorizedDelete.status, 404);

  const aiWithoutOptIn = await request(app)
    .get('/ai/recommendations')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(aiWithoutOptIn.status, 403);

  const enableAiResponse = await request(app)
    .put('/ai/preferences')
    .set('Authorization', `Bearer ${token}`)
    .send({ enabled: true });
  assert.equal(enableAiResponse.status, 200);
  assert.equal(enableAiResponse.body.user.aiInsightsEnabled, true);

  const aiResponse = await request(app)
    .get('/ai/recommendations')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(aiResponse.status, 200);
  assert.equal(Array.isArray(aiResponse.body.recommendations), true);
  assert.equal(aiResponse.body.recommendations.length > 0, true);
  assert.equal(typeof aiResponse.body.summary.workoutsThisWeek, 'number');
  assert.equal(typeof aiResponse.body.summary.mealsToday, 'number');
  assert.equal(typeof aiResponse.body.summary.caloriesToday, 'number');
  assert.equal(typeof aiResponse.body.disclaimer, 'string');
  assert.equal(aiResponse.body.disclaimer.toLowerCase().includes('not medical advice'), true);
});

test('reminder preferences and privacy endpoints support ethical/data-minimization controls', async () => {
  const email = uniqueEmail('privacy');
  const registerResponse = await registerUser(email);
  const token = registerResponse.token;

  const preferencesResponse = await request(app)
    .get('/reminders/preferences')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(preferencesResponse.status, 200);
  assert.equal(typeof preferencesResponse.body.preferences.enabled, 'boolean');

  const updatePreferencesResponse = await request(app)
    .put('/reminders/preferences')
    .set('Authorization', `Bearer ${token}`)
    .send({
      enabled: true,
      mealReminderTime: '13:30',
      workoutReminderTime: '19:00',
      timezone: 'Africa/Nairobi',
    });
  assert.equal(updatePreferencesResponse.status, 200);
  assert.equal(updatePreferencesResponse.body.preferences.mealReminderTime, '13:30');
  assert.equal(updatePreferencesResponse.body.preferences.workoutReminderTime, '19:00');
  assert.equal(updatePreferencesResponse.body.preferences.timezone, 'Africa/Nairobi');

  const remindersTodayResponse = await request(app)
    .get('/reminders/today')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(remindersTodayResponse.status, 200);
  assert.equal(Array.isArray(remindersTodayResponse.body.notifications), true);

  const privacyPolicyResponse = await request(app).get('/privacy/policy');
  assert.equal(privacyPolicyResponse.status, 200);
  assert.equal(Array.isArray(privacyPolicyResponse.body.dataCollected), true);

  const privacySummaryResponse = await request(app)
    .get('/privacy/data-summary')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(privacySummaryResponse.status, 200);
  assert.equal(typeof privacySummaryResponse.body.counts.workouts, 'number');
  assert.equal(typeof privacySummaryResponse.body.counts.nutritionLogs, 'number');

  const deleteWithWrongPasswordResponse = await request(app)
    .delete('/privacy/account')
    .set('Authorization', `Bearer ${token}`)
    .send({ password: 'wrong-password' });
  assert.equal(deleteWithWrongPasswordResponse.status, 401);

  const deleteWithCorrectPasswordResponse = await request(app)
    .delete('/privacy/account')
    .set('Authorization', `Bearer ${token}`)
    .send({ password: TEST_PASSWORD });
  assert.equal(deleteWithCorrectPasswordResponse.status, 204);
});
