import Constants from 'expo-constants';

export type ApiUser = {
  id: string;
  email: string;
  createdAt: string;
  twoFactorEnabled: boolean;
  aiInsightsEnabled: boolean;
  privacyConsentVersion: string;
  privacyConsentAcceptedAt: string | null;
  reminderPreferences: {
    enabled: boolean;
    mealReminderTime: string;
    workoutReminderTime: string;
    timezone: string;
  };
};

type AuthResponse = {
  token: string;
  user: ApiUser;
  requiresTwoFactor?: false;
};

type MeResponse = {
  user: ApiUser;
};

export type LoginTwoFactorChallengeResponse = {
  requiresTwoFactor: true;
  challengeToken: string;
  user: ApiUser;
};

export type VerifyTwoFactorLoginResponse = {
  token: string;
  user: ApiUser;
  recoveryCodeUsed: boolean;
  remainingRecoveryCodes: number;
};

export type SetupTwoFactorResponse = {
  manualEntryKey: string;
  otpauthUrl: string;
};

export type VerifyEnableTwoFactorResponse = {
  user: ApiUser;
  recoveryCodes: string[];
};

export type AiRecommendation = {
  id: string;
  category: 'training' | 'nutrition' | 'recovery' | 'reminder';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
};

export type AiRecommendationsResponse = {
  generatedAt: string;
  summary: {
    workoutsThisWeek: number;
    mealsToday: number;
    caloriesToday: number;
  };
  recommendations: AiRecommendation[];
  disclaimer: string;
};

export type ReminderPreferences = {
  enabled: boolean;
  mealReminderTime: string;
  workoutReminderTime: string;
  timezone: string;
};

export type ReminderNotification = {
  id: string;
  type: 'nutrition' | 'training' | 'ai';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  scheduledFor: string;
};

export type ReminderNotificationsResponse = {
  generatedAt: string;
  timezone: string;
  notifications: ReminderNotification[];
  disclaimer?: string;
  message?: string;
};

export type PrivacyDataSummaryResponse = {
  user: {
    email: string;
    createdAt: string;
    privacyConsentVersion: string;
    privacyConsentAcceptedAt: string | null;
  };
  counts: {
    workouts: number;
    nutritionLogs: number;
  };
};

function resolveApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.replace(/\/+$/, '');
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:4000`;
  }

  return 'http://localhost:4000';
}

const API_BASE_URL = resolveApiBaseUrl();

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error || 'Request failed.');
  }

  return payload as T;
}

export async function registerUser(email: string, password: string, consentAccepted: boolean) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, consentAccepted, privacyConsentVersion: '1.0' }),
  });

  return parseApiResponse<AuthResponse>(response);
}

export async function loginUser(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  return parseApiResponse<AuthResponse | LoginTwoFactorChallengeResponse>(response);
}

export async function verifyTwoFactorLogin(challengeToken: string, code: string) {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/verify-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeToken, code }),
  });

  return parseApiResponse<VerifyTwoFactorLoginResponse>(response);
}

export async function fetchCurrentUser(token: string) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse<MeResponse>(response);
}

export async function setupTwoFactor(token: string) {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/setup`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse<SetupTwoFactorResponse>(response);
}

export async function verifyEnableTwoFactor(token: string, code: string) {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/verify-enable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
  });

  return parseApiResponse<VerifyEnableTwoFactorResponse>(response);
}

export async function disableTwoFactor(token: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/disable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  });

  return parseApiResponse<MeResponse>(response);
}

export async function updateAiPreferences(token: string, enabled: boolean) {
  const response = await fetch(`${API_BASE_URL}/ai/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ enabled }),
  });

  return parseApiResponse<MeResponse>(response);
}

export async function fetchAiRecommendations(token: string) {
  const response = await fetch(`${API_BASE_URL}/ai/recommendations`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse<AiRecommendationsResponse>(response);
}

export async function getReminderPreferences(token: string) {
  const response = await fetch(`${API_BASE_URL}/reminders/preferences`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse<{ preferences: ReminderPreferences }>(response);
}

export async function updateReminderPreferences(
  token: string,
  preferences: Partial<ReminderPreferences>
) {
  const response = await fetch(`${API_BASE_URL}/reminders/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(preferences),
  });

  return parseApiResponse<{ preferences: ReminderPreferences }>(response);
}

export async function fetchTodayReminders(token: string) {
  const response = await fetch(`${API_BASE_URL}/reminders/today`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse<ReminderNotificationsResponse>(response);
}

export async function fetchPrivacyDataSummary(token: string) {
  const response = await fetch(`${API_BASE_URL}/privacy/data-summary`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse<PrivacyDataSummaryResponse>(response);
}

export async function deleteMyAccount(token: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/privacy/account`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || 'Unable to delete account.');
  }
}

export { API_BASE_URL };
