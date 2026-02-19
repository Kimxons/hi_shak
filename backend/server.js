require('dotenv').config();

const bcrypt = require('bcryptjs');
const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const { randomBytes } = require('node:crypto');

const { connectToDatabase } = require('./db');
const { MealLog } = require('./models/meal-log');
const { User } = require('./models/user');
const { Workout } = require('./models/workout');

const port = Number(process.env.AUTH_API_PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || 'dev-only-change-this-secret';
const twoFactorIssuer = process.env.TOTP_ISSUER || 'VigilFit';
const privacyPolicyVersion = process.env.PRIVACY_POLICY_VERSION || '1.0';

function issueAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email, kind: 'access' }, jwtSecret, {
    algorithm: 'HS256',
    expiresIn: '7d',
  });
}

function issueTwoFactorChallengeToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email, kind: '2fa_challenge' }, jwtSecret, {
    algorithm: 'HS256',
    expiresIn: '5m',
  });
}

function sanitize(userRecord) {
  return {
    id: userRecord._id.toString(),
    email: userRecord.email,
    createdAt: new Date(userRecord.createdAt).toISOString(),
    twoFactorEnabled: Boolean(userRecord.twoFactorEnabled),
    aiInsightsEnabled: Boolean(userRecord.aiInsightsEnabled),
    privacyConsentVersion: userRecord.privacyConsentVersion || privacyPolicyVersion,
    privacyConsentAcceptedAt: userRecord.privacyConsentAcceptedAt
      ? new Date(userRecord.privacyConsentAcceptedAt).toISOString()
      : null,
    reminderPreferences: {
      enabled: Boolean(userRecord.remindersEnabled),
      mealReminderTime: userRecord.mealReminderTime || '12:00',
      workoutReminderTime: userRecord.workoutReminderTime || '18:00',
      timezone: userRecord.reminderTimezone || 'UTC',
    },
  };
}

function validateCredentials(email, password) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const rawPassword = typeof password === 'string' ? password : '';

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { error: 'Please enter a valid email address.' };
  }

  if (rawPassword.length < 8) {
    return { error: 'Password must be at least 8 characters long.' };
  }

  return { normalizedEmail, rawPassword };
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing access token.' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (payload.kind !== 'access') {
      return res.status(401).json({ error: 'Session is invalid.' });
    }

    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: 'Session is invalid.' });
    }

    req.authUser = user;
    req.authToken = token;
    return next();
  } catch {
    return res.status(401).json({ error: 'Session is invalid or expired.' });
  }
}

function normalizeOtpInput(code) {
  return typeof code === 'string' ? code.trim().replace(/\s+/g, '') : '';
}

function isValidReminderTime(value) {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

function resolveScheduledReminderIso(timeHHmm) {
  const [hours, minutes] = timeHHmm.split(':').map((value) => Number(value));
  const scheduled = new Date();
  scheduled.setHours(hours, minutes, 0, 0);

  if (scheduled.getTime() < Date.now()) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  return scheduled.toISOString();
}

function verifyTotpCode(secret, code) {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 1,
  });
}

function generateRecoveryCodes(count = 8) {
  return Array.from({ length: count }, () => {
    const value = randomBytes(4).toString('hex').toUpperCase();
    return `${value.slice(0, 4)}-${value.slice(4)}`;
  });
}

async function hashRecoveryCodes(codes) {
  return Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
}

async function consumeRecoveryCode(user, submittedCode) {
  const normalized = submittedCode.toUpperCase();

  for (let index = 0; index < user.twoFactorRecoveryCodes.length; index += 1) {
    const matches = await bcrypt.compare(normalized, user.twoFactorRecoveryCodes[index]);

    if (matches) {
      user.twoFactorRecoveryCodes.splice(index, 1);
      await user.save();
      return true;
    }
  }

  return false;
}

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/auth/register', async (req, res) => {
    const { email, password, consentAccepted, privacyConsentVersion: providedConsentVersion } = req.body || {};
    const validated = validateCredentials(email, password);

    if (validated.error) {
      return res.status(400).json({ error: validated.error });
    }

    if (consentAccepted !== true) {
      return res.status(400).json({
        error:
          'You must accept the privacy and data usage terms before creating an account.',
      });
    }

    const existingUser = await User.findOne({ email: validated.normalizedEmail }).select('_id');
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(validated.rawPassword, 12);
    let user;
    const consentVersion =
      typeof providedConsentVersion === 'string' && providedConsentVersion.trim()
        ? providedConsentVersion.trim()
        : privacyPolicyVersion;

    try {
      user = await User.create({
        email: validated.normalizedEmail,
        passwordHash,
        privacyConsentAcceptedAt: new Date(),
        privacyConsentVersion: consentVersion,
      });
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 11000) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      throw error;
    }

    const token = issueAccessToken(user);
    return res.status(201).json({ token, user: sanitize(user) });
  });

  app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const rawPassword = typeof password === 'string' ? password : '';

    if (!normalizedEmail || !rawPassword) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatches = await bcrypt.compare(rawPassword, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const challengeToken = issueTwoFactorChallengeToken(user);
      return res.status(200).json({
        requiresTwoFactor: true,
        challengeToken,
        user: sanitize(user),
      });
    }

    const token = issueAccessToken(user);
    return res.status(200).json({ token, user: sanitize(user), requiresTwoFactor: false });
  });

  app.post('/auth/2fa/verify-login', async (req, res) => {
    const { challengeToken, code } = req.body || {};
    const normalizedCode = normalizeOtpInput(code);

    if (!challengeToken || !normalizedCode) {
      return res.status(400).json({ error: 'Challenge token and authentication code are required.' });
    }

    let payload;

    try {
      payload = jwt.verify(challengeToken, jwtSecret);
      if (payload.kind !== '2fa_challenge') {
        return res.status(401).json({ error: '2FA challenge is invalid or expired.' });
      }
    } catch {
      return res.status(401).json({ error: '2FA challenge is invalid or expired.' });
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(401).json({ error: '2FA challenge is invalid or expired.' });
    }

    let codeAccepted = false;
    let recoveryCodeUsed = false;

    if (/^\d{6}$/.test(normalizedCode)) {
      codeAccepted = verifyTotpCode(user.twoFactorSecret, normalizedCode);
    } else {
      const used = await consumeRecoveryCode(user, normalizedCode);
      codeAccepted = used;
      recoveryCodeUsed = used;
    }

    if (!codeAccepted) {
      return res.status(401).json({ error: 'Invalid authentication code.' });
    }

    const token = issueAccessToken(user);
    return res.status(200).json({
      token,
      user: sanitize(user),
      recoveryCodeUsed,
      remainingRecoveryCodes: user.twoFactorRecoveryCodes.length,
    });
  });

  app.get('/auth/me', authMiddleware, (req, res) => {
    return res.status(200).json({ user: sanitize(req.authUser) });
  });

  app.get('/privacy/policy', (_req, res) => {
    return res.status(200).json({
      version: privacyPolicyVersion,
      summary:
        'VigilFit stores only account, authentication, workout, nutrition, and reminder preference data required for app functionality and personalization.',
      dataCollected: [
        'Email address',
        'Password hash and authentication metadata',
        'Workout logs',
        'Nutrition logs',
        '2FA and reminder preferences',
        'AI insights preference',
      ],
      dataUse:
        'Data is used for account security, tracking progress, reminders, and personalized in-app recommendations. No medical diagnosis is provided.',
      thirdPartySharing:
        'No personal data is shared with third parties without explicit user permission.',
    });
  });

  app.get('/privacy/data-summary', authMiddleware, async (req, res) => {
    const [workoutCount, nutritionLogCount] = await Promise.all([
      Workout.countDocuments({ userId: req.authUser._id }),
      MealLog.countDocuments({ userId: req.authUser._id }),
    ]);

    return res.status(200).json({
      user: {
        email: req.authUser.email,
        createdAt: req.authUser.createdAt,
        privacyConsentVersion: req.authUser.privacyConsentVersion || privacyPolicyVersion,
        privacyConsentAcceptedAt: req.authUser.privacyConsentAcceptedAt || null,
      },
      counts: {
        workouts: workoutCount,
        nutritionLogs: nutritionLogCount,
      },
    });
  });

  app.delete('/privacy/account', authMiddleware, async (req, res) => {
    const { password } = req.body || {};
    const rawPassword = typeof password === 'string' ? password : '';

    if (!rawPassword) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    const passwordMatches = await bcrypt.compare(rawPassword, req.authUser.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Password is incorrect.' });
    }

    await Promise.all([
      Workout.deleteMany({ userId: req.authUser._id }),
      MealLog.deleteMany({ userId: req.authUser._id }),
      User.deleteOne({ _id: req.authUser._id }),
    ]);

    return res.status(204).send();
  });

  app.post('/auth/2fa/setup', authMiddleware, async (req, res) => {
    const user = req.authUser;

    if (user.twoFactorEnabled) {
      return res.status(409).json({ error: 'Two-factor authentication is already enabled.' });
    }

    const secret = speakeasy.generateSecret({
      name: `${twoFactorIssuer}:${user.email}`,
      issuer: twoFactorIssuer,
      length: 20,
    });

    user.twoFactorTempSecret = secret.base32;
    await user.save();

    return res.status(200).json({
      manualEntryKey: secret.base32,
      otpauthUrl: secret.otpauth_url,
    });
  });

  app.post('/auth/2fa/verify-enable', authMiddleware, async (req, res) => {
    const user = req.authUser;
    const { code } = req.body || {};
    const normalizedCode = normalizeOtpInput(code);

    if (!user.twoFactorTempSecret) {
      return res.status(400).json({ error: 'Start 2FA setup before verification.' });
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      return res.status(400).json({ error: 'Enter a valid 6-digit code from your authenticator app.' });
    }

    const isValid = verifyTotpCode(user.twoFactorTempSecret, normalizedCode);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid authentication code.' });
    }

    const rawRecoveryCodes = generateRecoveryCodes();
    const hashedRecoveryCodes = await hashRecoveryCodes(rawRecoveryCodes);

    user.twoFactorEnabled = true;
    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorTempSecret = null;
    user.twoFactorRecoveryCodes = hashedRecoveryCodes;
    await user.save();

    return res.status(200).json({
      user: sanitize(user),
      recoveryCodes: rawRecoveryCodes,
    });
  });

  app.post('/auth/2fa/disable', authMiddleware, async (req, res) => {
    const user = req.authUser;
    const { password } = req.body || {};
    const rawPassword = typeof password === 'string' ? password : '';

    if (!rawPassword) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    const passwordMatches = await bcrypt.compare(rawPassword, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Password is incorrect.' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorTempSecret = null;
    user.twoFactorRecoveryCodes = [];
    await user.save();

    return res.status(200).json({ user: sanitize(user) });
  });

  function parseDateInput(value, fieldName) {
    if (typeof value !== 'string' || !value.trim()) {
      return { error: `${fieldName} is required.` };
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return { error: `${fieldName} must be a valid date.` };
    }

    return { value: parsed };
  }

  function parseNumberInput(value, fieldName, min = 0) {
    const parsed = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(parsed) || parsed < min) {
      return { error: `${fieldName} must be a valid number.` };
    }

    return { value: parsed };
  }

  function sanitizeWorkout(workout) {
    return {
      id: workout._id.toString(),
      workoutType: workout.workoutType,
      durationMinutes: workout.durationMinutes,
      caloriesBurned: workout.caloriesBurned,
      performedAt: new Date(workout.performedAt).toISOString(),
      notes: workout.notes || '',
      createdAt: new Date(workout.createdAt).toISOString(),
    };
  }

  function sanitizeMealLog(mealLog) {
    return {
      id: mealLog._id.toString(),
      mealType: mealLog.mealType,
      foodName: mealLog.foodName,
      calories: mealLog.calories,
      proteinGrams: mealLog.proteinGrams,
      carbsGrams: mealLog.carbsGrams,
      fatGrams: mealLog.fatGrams,
      loggedAt: new Date(mealLog.loggedAt).toISOString(),
      notes: mealLog.notes || '',
      createdAt: new Date(mealLog.createdAt).toISOString(),
    };
  }

  function buildAiRecommendations({ workouts, logs }) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    const day = weekStart.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    const workoutsThisWeek = workouts.filter(
      (workout) => new Date(workout.performedAt).getTime() >= weekStart.getTime()
    ).length;
    const mealsToday = logs.filter((log) => new Date(log.loggedAt).getTime() >= todayStart.getTime());
    const caloriesToday = mealsToday.reduce((total, log) => total + log.calories, 0);
    const proteinToday = mealsToday.reduce((total, log) => total + log.proteinGrams, 0);

    const recommendations = [];

    if (workoutsThisWeek === 0) {
      recommendations.push({
        id: 'training-start',
        category: 'training',
        priority: 'high',
        title: 'Start your training week',
        message: 'No workouts logged this week. Aim for a 20-30 minute session today.',
      });
    } else if (workoutsThisWeek < 3) {
      recommendations.push({
        id: 'training-progress',
        category: 'training',
        priority: 'medium',
        title: 'Increase workout consistency',
        message: `You have ${workoutsThisWeek} workout(s) this week. Target 3 sessions for steady progress.`,
      });
    }

    if (mealsToday.length === 0) {
      recommendations.push({
        id: 'nutrition-reminder',
        category: 'reminder',
        priority: 'high',
        title: 'Log your meals',
        message: 'No nutrition logs found for today. Log your next meal to keep data accurate.',
      });
    } else if (mealsToday.length < 3) {
      recommendations.push({
        id: 'nutrition-frequency',
        category: 'reminder',
        priority: 'medium',
        title: 'Keep meal tracking consistent',
        message: `You logged ${mealsToday.length} meal(s) today. Continue logging to improve recommendations.`,
      });
    }

    if (mealsToday.length > 0 && caloriesToday < 1200) {
      recommendations.push({
        id: 'calories-low',
        category: 'nutrition',
        priority: 'medium',
        title: 'Check daily energy intake',
        message: `Logged calories today are ${caloriesToday}. Confirm your meals are complete.`,
      });
    }

    if (proteinToday > 0 && proteinToday < 80) {
      recommendations.push({
        id: 'protein-target',
        category: 'nutrition',
        priority: 'low',
        title: 'Improve protein coverage',
        message: `Protein logged today is ${proteinToday}g. Consider adding a higher-protein meal.`,
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        id: 'maintain-routine',
        category: 'recovery',
        priority: 'low',
        title: 'Maintain your routine',
        message: 'Your recent logs look consistent. Keep tracking workouts, meals, and recovery.',
      });
    }

    return {
      generatedAt: now.toISOString(),
      summary: {
        workoutsThisWeek,
        mealsToday: mealsToday.length,
        caloriesToday,
      },
      recommendations,
      disclaimer:
        'AI insights are supportive wellness suggestions and not medical advice. Consult a professional for medical guidance.',
    };
  }

  app.get('/workouts', authMiddleware, async (req, res) => {
    const workouts = await Workout.find({ userId: req.authUser._id })
      .sort({ performedAt: -1, createdAt: -1 })
      .limit(100);

    return res.status(200).json({ workouts: workouts.map(sanitizeWorkout) });
  });

  app.post('/workouts', authMiddleware, async (req, res) => {
    const { workoutType, durationMinutes, caloriesBurned, performedAt, notes } = req.body || {};
    const trimmedWorkoutType = typeof workoutType === 'string' ? workoutType.trim() : '';
    const parsedDuration = parseNumberInput(durationMinutes, 'durationMinutes', 1);
    const parsedCalories = parseNumberInput(caloriesBurned ?? 0, 'caloriesBurned', 0);
    const parsedPerformedAt = parseDateInput(performedAt, 'performedAt');

    if (!trimmedWorkoutType) {
      return res.status(400).json({ error: 'workoutType is required.' });
    }

    if (parsedDuration.error) {
      return res.status(400).json({ error: parsedDuration.error });
    }

    if (parsedCalories.error) {
      return res.status(400).json({ error: parsedCalories.error });
    }

    if (parsedPerformedAt.error) {
      return res.status(400).json({ error: parsedPerformedAt.error });
    }

    const workout = await Workout.create({
      userId: req.authUser._id,
      workoutType: trimmedWorkoutType,
      durationMinutes: Math.round(parsedDuration.value),
      caloriesBurned: Math.round(parsedCalories.value),
      performedAt: parsedPerformedAt.value,
      notes: typeof notes === 'string' ? notes.trim() : '',
    });

    return res.status(201).json({ workout: sanitizeWorkout(workout) });
  });

  app.put('/workouts/:workoutId', authMiddleware, async (req, res) => {
    const { workoutId } = req.params;
    const { workoutType, durationMinutes, caloriesBurned, performedAt, notes } = req.body || {};
    const trimmedWorkoutType = typeof workoutType === 'string' ? workoutType.trim() : '';
    const parsedDuration = parseNumberInput(durationMinutes, 'durationMinutes', 1);
    const parsedCalories = parseNumberInput(caloriesBurned ?? 0, 'caloriesBurned', 0);
    const parsedPerformedAt = parseDateInput(performedAt, 'performedAt');

    if (!trimmedWorkoutType) {
      return res.status(400).json({ error: 'workoutType is required.' });
    }

    if (parsedDuration.error) {
      return res.status(400).json({ error: parsedDuration.error });
    }

    if (parsedCalories.error) {
      return res.status(400).json({ error: parsedCalories.error });
    }

    if (parsedPerformedAt.error) {
      return res.status(400).json({ error: parsedPerformedAt.error });
    }

    const updatedWorkout = await Workout.findOneAndUpdate(
      { _id: workoutId, userId: req.authUser._id },
      {
        workoutType: trimmedWorkoutType,
        durationMinutes: Math.round(parsedDuration.value),
        caloriesBurned: Math.round(parsedCalories.value),
        performedAt: parsedPerformedAt.value,
        notes: typeof notes === 'string' ? notes.trim() : '',
      },
      { returnDocument: 'after' }
    );

    if (!updatedWorkout) {
      return res.status(404).json({ error: 'Workout not found.' });
    }

    return res.status(200).json({ workout: sanitizeWorkout(updatedWorkout) });
  });

  app.delete('/workouts/:workoutId', authMiddleware, async (req, res) => {
    const { workoutId } = req.params;
    const deleted = await Workout.findOneAndDelete({ _id: workoutId, userId: req.authUser._id });

    if (!deleted) {
      return res.status(404).json({ error: 'Workout not found.' });
    }

    return res.status(204).send();
  });

  app.get('/nutrition/logs', authMiddleware, async (req, res) => {
    const logs = await MealLog.find({ userId: req.authUser._id })
      .sort({ loggedAt: -1, createdAt: -1 })
      .limit(100);

    return res.status(200).json({ logs: logs.map(sanitizeMealLog) });
  });

  app.post('/nutrition/logs', authMiddleware, async (req, res) => {
    const { mealType, foodName, calories, proteinGrams, carbsGrams, fatGrams, loggedAt, notes } = req.body || {};
    const trimmedMealType = typeof mealType === 'string' ? mealType.trim() : '';
    const trimmedFoodName = typeof foodName === 'string' ? foodName.trim() : '';
    const parsedCalories = parseNumberInput(calories, 'calories', 0);
    const parsedProtein = parseNumberInput(proteinGrams ?? 0, 'proteinGrams', 0);
    const parsedCarbs = parseNumberInput(carbsGrams ?? 0, 'carbsGrams', 0);
    const parsedFat = parseNumberInput(fatGrams ?? 0, 'fatGrams', 0);
    const parsedLoggedAt = parseDateInput(loggedAt, 'loggedAt');

    if (!trimmedMealType) {
      return res.status(400).json({ error: 'mealType is required.' });
    }

    if (!trimmedFoodName) {
      return res.status(400).json({ error: 'foodName is required.' });
    }

    if (parsedCalories.error) {
      return res.status(400).json({ error: parsedCalories.error });
    }

    if (parsedProtein.error) {
      return res.status(400).json({ error: parsedProtein.error });
    }

    if (parsedCarbs.error) {
      return res.status(400).json({ error: parsedCarbs.error });
    }

    if (parsedFat.error) {
      return res.status(400).json({ error: parsedFat.error });
    }

    if (parsedLoggedAt.error) {
      return res.status(400).json({ error: parsedLoggedAt.error });
    }

    const log = await MealLog.create({
      userId: req.authUser._id,
      mealType: trimmedMealType,
      foodName: trimmedFoodName,
      calories: Math.round(parsedCalories.value),
      proteinGrams: Math.round(parsedProtein.value),
      carbsGrams: Math.round(parsedCarbs.value),
      fatGrams: Math.round(parsedFat.value),
      loggedAt: parsedLoggedAt.value,
      notes: typeof notes === 'string' ? notes.trim() : '',
    });

    return res.status(201).json({ log: sanitizeMealLog(log) });
  });

  app.put('/nutrition/logs/:logId', authMiddleware, async (req, res) => {
    const { logId } = req.params;
    const { mealType, foodName, calories, proteinGrams, carbsGrams, fatGrams, loggedAt, notes } = req.body || {};
    const trimmedMealType = typeof mealType === 'string' ? mealType.trim() : '';
    const trimmedFoodName = typeof foodName === 'string' ? foodName.trim() : '';
    const parsedCalories = parseNumberInput(calories, 'calories', 0);
    const parsedProtein = parseNumberInput(proteinGrams ?? 0, 'proteinGrams', 0);
    const parsedCarbs = parseNumberInput(carbsGrams ?? 0, 'carbsGrams', 0);
    const parsedFat = parseNumberInput(fatGrams ?? 0, 'fatGrams', 0);
    const parsedLoggedAt = parseDateInput(loggedAt, 'loggedAt');

    if (!trimmedMealType) {
      return res.status(400).json({ error: 'mealType is required.' });
    }

    if (!trimmedFoodName) {
      return res.status(400).json({ error: 'foodName is required.' });
    }

    if (parsedCalories.error) {
      return res.status(400).json({ error: parsedCalories.error });
    }

    if (parsedProtein.error) {
      return res.status(400).json({ error: parsedProtein.error });
    }

    if (parsedCarbs.error) {
      return res.status(400).json({ error: parsedCarbs.error });
    }

    if (parsedFat.error) {
      return res.status(400).json({ error: parsedFat.error });
    }

    if (parsedLoggedAt.error) {
      return res.status(400).json({ error: parsedLoggedAt.error });
    }

    const updatedLog = await MealLog.findOneAndUpdate(
      { _id: logId, userId: req.authUser._id },
      {
        mealType: trimmedMealType,
        foodName: trimmedFoodName,
        calories: Math.round(parsedCalories.value),
        proteinGrams: Math.round(parsedProtein.value),
        carbsGrams: Math.round(parsedCarbs.value),
        fatGrams: Math.round(parsedFat.value),
        loggedAt: parsedLoggedAt.value,
        notes: typeof notes === 'string' ? notes.trim() : '',
      },
      { returnDocument: 'after' }
    );

    if (!updatedLog) {
      return res.status(404).json({ error: 'Nutrition log not found.' });
    }

    return res.status(200).json({ log: sanitizeMealLog(updatedLog) });
  });

  app.delete('/nutrition/logs/:logId', authMiddleware, async (req, res) => {
    const { logId } = req.params;
    const deleted = await MealLog.findOneAndDelete({ _id: logId, userId: req.authUser._id });

    if (!deleted) {
      return res.status(404).json({ error: 'Nutrition log not found.' });
    }

    return res.status(204).send();
  });

  app.get('/reminders/preferences', authMiddleware, async (req, res) => {
    return res.status(200).json({
      preferences: {
        enabled: Boolean(req.authUser.remindersEnabled),
        mealReminderTime: req.authUser.mealReminderTime || '12:00',
        workoutReminderTime: req.authUser.workoutReminderTime || '18:00',
        timezone: req.authUser.reminderTimezone || 'UTC',
      },
    });
  });

  app.put('/reminders/preferences', authMiddleware, async (req, res) => {
    const {
      enabled,
      mealReminderTime,
      workoutReminderTime,
      timezone,
    } = req.body || {};

    if (typeof enabled === 'boolean') {
      req.authUser.remindersEnabled = enabled;
    }

    if (mealReminderTime !== undefined) {
      if (!isValidReminderTime(mealReminderTime)) {
        return res
          .status(400)
          .json({ error: 'mealReminderTime must be in HH:mm format.' });
      }

      req.authUser.mealReminderTime = mealReminderTime.trim();
    }

    if (workoutReminderTime !== undefined) {
      if (!isValidReminderTime(workoutReminderTime)) {
        return res
          .status(400)
          .json({ error: 'workoutReminderTime must be in HH:mm format.' });
      }

      req.authUser.workoutReminderTime = workoutReminderTime.trim();
    }

    if (timezone !== undefined) {
      const timezoneValue = typeof timezone === 'string' ? timezone.trim() : '';
      if (!timezoneValue || timezoneValue.length > 80) {
        return res.status(400).json({ error: 'timezone must be a valid IANA timezone string.' });
      }

      req.authUser.reminderTimezone = timezoneValue;
    }

    await req.authUser.save();

    return res.status(200).json({
      preferences: {
        enabled: Boolean(req.authUser.remindersEnabled),
        mealReminderTime: req.authUser.mealReminderTime,
        workoutReminderTime: req.authUser.workoutReminderTime,
        timezone: req.authUser.reminderTimezone,
      },
    });
  });

  app.get('/reminders/today', authMiddleware, async (req, res) => {
    if (!req.authUser.remindersEnabled) {
      return res.status(200).json({
        generatedAt: new Date().toISOString(),
        timezone: req.authUser.reminderTimezone || 'UTC',
        notifications: [],
        message: 'Reminders are disabled for this account.',
      });
    }

    const [workouts, logs] = await Promise.all([
      Workout.find({ userId: req.authUser._id }).sort({ performedAt: -1 }).limit(60),
      MealLog.find({ userId: req.authUser._id }).sort({ loggedAt: -1 }).limit(120),
    ]);

    const aiPayload = req.authUser.aiInsightsEnabled
      ? buildAiRecommendations({ workouts, logs })
      : null;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    const day = weekStart.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    const mealsToday = logs.filter((log) => new Date(log.loggedAt).getTime() >= todayStart.getTime()).length;
    const workoutsThisWeek = workouts.filter(
      (workout) => new Date(workout.performedAt).getTime() >= weekStart.getTime()
    ).length;

    const notifications = [];

    if (mealsToday === 0) {
      notifications.push({
        id: 'meal-log-reminder',
        type: 'nutrition',
        priority: 'high',
        title: 'Log your next meal',
        message: 'No meal entries found for today. Log your next meal to keep nutrition tracking accurate.',
        scheduledFor: resolveScheduledReminderIso(req.authUser.mealReminderTime || '12:00'),
      });
    }

    if (workoutsThisWeek < 3) {
      notifications.push({
        id: 'workout-consistency-reminder',
        type: 'training',
        priority: 'medium',
        title: 'Plan your next workout',
        message: `You currently have ${workoutsThisWeek} workout(s) this week. Schedule the next session to stay consistent.`,
        scheduledFor: resolveScheduledReminderIso(req.authUser.workoutReminderTime || '18:00'),
      });
    }

    if (aiPayload && aiPayload.recommendations.length > 0) {
      const topRecommendation = aiPayload.recommendations[0];
      notifications.push({
        id: `ai-${topRecommendation.id}`,
        type: 'ai',
        priority: topRecommendation.priority,
        title: topRecommendation.title,
        message: topRecommendation.message,
        scheduledFor: resolveScheduledReminderIso(req.authUser.workoutReminderTime || '18:00'),
      });
    }

    return res.status(200).json({
      generatedAt: now.toISOString(),
      timezone: req.authUser.reminderTimezone || 'UTC',
      notifications,
      disclaimer:
        'Reminder notifications are wellness support prompts, not medical guidance.',
    });
  });

  app.put('/ai/preferences', authMiddleware, async (req, res) => {
    const { enabled } = req.body || {};
    const shouldEnable = Boolean(enabled);

    req.authUser.aiInsightsEnabled = shouldEnable;
    await req.authUser.save();

    return res.status(200).json({ user: sanitize(req.authUser) });
  });

  app.get('/ai/recommendations', authMiddleware, async (req, res) => {
    if (!req.authUser.aiInsightsEnabled) {
      return res.status(403).json({ error: 'Enable AI insights in account settings before requesting recommendations.' });
    }

    const [workouts, logs] = await Promise.all([
      Workout.find({ userId: req.authUser._id }).sort({ performedAt: -1 }).limit(60),
      MealLog.find({ userId: req.authUser._id }).sort({ loggedAt: -1 }).limit(120),
    ]);

    const payload = buildAiRecommendations({ workouts, logs });
    return res.status(200).json(payload);
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  connectToDatabase()
    .then(() => {
      app.listen(port, () => {
        if (!process.env.JWT_SECRET) {
          console.warn('JWT_SECRET is not set. Using a development-only fallback secret.');
        }

        console.log(`VigilFit auth API listening on http://localhost:${port}`);
      });
    })
    .catch((error) => {
      console.error('Failed to connect to MongoDB:', error.message);
      process.exit(1);
    });
}

module.exports = { createApp };
