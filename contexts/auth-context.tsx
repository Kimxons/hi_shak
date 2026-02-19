import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  deleteMyAccount,
  disableTwoFactor,
  fetchAiRecommendations,
  fetchCurrentUser,
  fetchPrivacyDataSummary,
  fetchTodayReminders,
  getReminderPreferences,
  loginUser,
  registerUser,
  setupTwoFactor,
  updateAiPreferences,
  updateReminderPreferences,
  verifyEnableTwoFactor,
  verifyTwoFactorLogin,
  type AiRecommendationsResponse,
  type ApiUser,
  type PrivacyDataSummaryResponse,
  type ReminderNotificationsResponse,
  type ReminderPreferences,
  type SetupTwoFactorResponse,
  type VerifyEnableTwoFactorResponse,
  type VerifyTwoFactorLoginResponse,
} from '@/services/auth-api';

type AuthUser = ApiUser;
type SignInResult = { requiresTwoFactor: boolean };

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  user: AuthUser | null;
  token: string | null;
  pendingTwoFactorChallenge: string | null;
  pendingTwoFactorEmail: string | null;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  verifyTwoFactorCode: (code: string) => Promise<VerifyTwoFactorLoginResponse>;
  clearTwoFactorChallenge: () => void;
  signUp: (email: string, password: string, consentAccepted: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  beginTwoFactorSetup: () => Promise<SetupTwoFactorResponse>;
  confirmTwoFactorSetup: (code: string) => Promise<VerifyEnableTwoFactorResponse>;
  disableTwoFactorAuth: (password: string) => Promise<void>;
  setAiInsightsEnabled: (enabled: boolean) => Promise<void>;
  getAiRecommendations: () => Promise<AiRecommendationsResponse>;
  getReminderPreferences: () => Promise<ReminderPreferences>;
  updateReminderSettings: (preferences: Partial<ReminderPreferences>) => Promise<ReminderPreferences>;
  getTodayReminders: () => Promise<ReminderNotificationsResponse>;
  getPrivacyDataSummary: () => Promise<PrivacyDataSummaryResponse>;
  deleteAccount: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_TOKEN_KEY = 'vigilfit_auth_token';

async function safeGetStoredToken() {
  try {
    const value = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    return value && value.trim().length > 0 ? value : null;
  } catch {
    return null;
  }
}

async function safeSetStoredToken(token: string) {
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  } catch {
    // Ignore @@
  }
}

async function safeClearStoredToken() {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    return;
  } catch {
    // ignore @@
  }

  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, '');
  } catch {
    // Ignore @@
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [pendingTwoFactorChallenge, setPendingTwoFactorChallenge] = useState<string | null>(null);
  const [pendingTwoFactorEmail, setPendingTwoFactorEmail] = useState<string | null>(null);

  const applySession = useCallback(async (nextToken: string, nextUser: AuthUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setPendingTwoFactorChallenge(null);
    setPendingTwoFactorEmail(null);
    await safeSetStoredToken(nextToken);
  }, []);

  const clearSession = useCallback(async () => {
    setToken(null);
    setUser(null);
    setPendingTwoFactorChallenge(null);
    setPendingTwoFactorEmail(null);
    await safeClearStoredToken();
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const savedToken = await safeGetStoredToken();

        if (!savedToken) {
          return;
        }

        const me = await fetchCurrentUser(savedToken);
        if (isMounted) {
          setToken(savedToken);
          setUser(me.user);
        }
      } catch {
        await safeClearStoredToken();
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSession(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const response = await loginUser(email, password);

      if (response.requiresTwoFactor) {
        setPendingTwoFactorChallenge(response.challengeToken);
        setPendingTwoFactorEmail(response.user.email);
        return { requiresTwoFactor: true };
      }

      await applySession(response.token, response.user);
      return { requiresTwoFactor: false };
    },
    [applySession]
  );

  const verifyTwoFactorCode = useCallback(
    async (code: string) => {
      if (!pendingTwoFactorChallenge) {
        throw new Error('Your 2FA challenge expired. Please sign in again.');
      }

      const response = await verifyTwoFactorLogin(pendingTwoFactorChallenge, code);
      await applySession(response.token, response.user);
      return response;
    },
    [pendingTwoFactorChallenge, applySession]
  );

  const clearTwoFactorChallenge = useCallback(() => {
    setPendingTwoFactorChallenge(null);
    setPendingTwoFactorEmail(null);
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, consentAccepted: boolean) => {
      const response = await registerUser(email, password, consentAccepted);
      await applySession(response.token, response.user);
    },
    [applySession]
  );

  const signOut = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const beginTwoFactorSetup = useCallback(async () => {
    if (!token) {
      throw new Error('No active session found.');
    }

    return setupTwoFactor(token);
  }, [token]);

  const confirmTwoFactorSetup = useCallback(
    async (code: string) => {
      if (!token) {
        throw new Error('No active session found.');
      }

      const response = await verifyEnableTwoFactor(token, code);
      setUser(response.user);
      return response;
    },
    [token]
  );

  const disableTwoFactorAuth = useCallback(
    async (password: string) => {
      if (!token) {
        throw new Error('No active session found.');
      }

      const response = await disableTwoFactor(token, password);
      setUser(response.user);
    },
    [token]
  );

  const setAiInsightsEnabled = useCallback(
    async (enabled: boolean) => {
      if (!token) {
        throw new Error('No active session found.');
      }

      const response = await updateAiPreferences(token, enabled);
      setUser(response.user);
    },
    [token]
  );

  const getAiRecommendations = useCallback(async () => {
    if (!token) {
      throw new Error('No active session found.');
    }

    return fetchAiRecommendations(token);
  }, [token]);

  const getReminderPreferencesForUser = useCallback(async () => {
    if (!token) {
      throw new Error('No active session found.');
    }

    const response = await getReminderPreferences(token);
    return response.preferences;
  }, [token]);

  const updateReminderSettings = useCallback(
    async (preferences: Partial<ReminderPreferences>) => {
      if (!token) {
        throw new Error('No active session found.');
      }

      const response = await updateReminderPreferences(token, preferences);
      setUser((current) =>
        current
          ? {
            ...current,
            reminderPreferences: response.preferences,
          }
          : current
      );
      return response.preferences;
    },
    [token]
  );

  const getTodayReminders = useCallback(async () => {
    if (!token) {
      throw new Error('No active session found.');
    }

    return fetchTodayReminders(token);
  }, [token]);

  const getPrivacyDataSummary = useCallback(async () => {
    if (!token) {
      throw new Error('No active session found.');
    }

    return fetchPrivacyDataSummary(token);
  }, [token]);

  const deleteAccount = useCallback(
    async (password: string) => {
      if (!token) {
        throw new Error('No active session found.');
      }

      await deleteMyAccount(token, password);
      await clearSession();
    },
    [token, clearSession]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(user),
      isLoadingSession,
      user,
      token,
      pendingTwoFactorChallenge,
      pendingTwoFactorEmail,
      signIn,
      verifyTwoFactorCode,
      clearTwoFactorChallenge,
      signUp,
      signOut,
      beginTwoFactorSetup,
      confirmTwoFactorSetup,
      disableTwoFactorAuth,
      setAiInsightsEnabled,
      getAiRecommendations,
      getReminderPreferences: getReminderPreferencesForUser,
      updateReminderSettings,
      getTodayReminders,
      getPrivacyDataSummary,
      deleteAccount,
    }),
    [
      user,
      token,
      isLoadingSession,
      pendingTwoFactorChallenge,
      pendingTwoFactorEmail,
      signIn,
      verifyTwoFactorCode,
      clearTwoFactorChallenge,
      signUp,
      signOut,
      beginTwoFactorSetup,
      confirmTwoFactorSetup,
      disableTwoFactorAuth,
      setAiInsightsEnabled,
      getAiRecommendations,
      getReminderPreferencesForUser,
      updateReminderSettings,
      getTodayReminders,
      getPrivacyDataSummary,
      deleteAccount,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
