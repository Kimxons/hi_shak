import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

export default function AccountScreen() {
  const {
    user,
    signOut,
    beginTwoFactorSetup,
    confirmTwoFactorSetup,
    disableTwoFactorAuth,
    setAiInsightsEnabled,
    updateReminderSettings,
    getPrivacyDataSummary,
    deleteAccount,
  } = useAuth();

  const [setupKey, setSetupKey] = useState<string | null>(null);
  const [setupOtpAuthUrl, setSetupOtpAuthUrl] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [mealReminderTime, setMealReminderTime] = useState('12:00');
  const [workoutReminderTime, setWorkoutReminderTime] = useState('18:00');
  const [reminderTimezone, setReminderTimezone] = useState('UTC');
  const [isReminderProcessing, setIsReminderProcessing] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [privacySummary, setPrivacySummary] = useState<{ workouts: number; nutritionLogs: number } | null>(
    null
  );
  const [privacySummaryError, setPrivacySummaryError] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleteProcessing, setIsDeleteProcessing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const twoFactorEnabled = Boolean(user?.twoFactorEnabled);
  const canVerifySetup = useMemo(
    () => Boolean(setupKey) && verificationCode.trim().length === 6 && !isProcessing,
    [setupKey, verificationCode, isProcessing]
  );
  const canDisable = useMemo(() => disablePassword.trim().length >= 8 && !isProcessing, [disablePassword, isProcessing]);
  const aiEnabled = Boolean(user?.aiInsightsEnabled);
  const canSaveReminders = useMemo(
    () =>
      /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(mealReminderTime.trim()) &&
      /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(workoutReminderTime.trim()) &&
      reminderTimezone.trim().length > 0 &&
      !isReminderProcessing,
    [mealReminderTime, workoutReminderTime, reminderTimezone, isReminderProcessing]
  );
  const canDeleteAccount = useMemo(
    () => deletePassword.trim().length >= 8 && !isDeleteProcessing,
    [deletePassword, isDeleteProcessing]
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    setRemindersEnabled(user.reminderPreferences.enabled);
    setMealReminderTime(user.reminderPreferences.mealReminderTime);
    setWorkoutReminderTime(user.reminderPreferences.workoutReminderTime);
    setReminderTimezone(user.reminderPreferences.timezone);
  }, [user]);

  async function handleSignOut() {
    await signOut();
  }

  async function handleSetupTwoFactor() {
    setTwoFactorError(null);
    setIsProcessing(true);
    setRecoveryCodes(null);

    try {
      const response = await beginTwoFactorSetup();
      setSetupKey(response.manualEntryKey);
      setSetupOtpAuthUrl(response.otpauthUrl);
    } catch (error) {
      setTwoFactorError(error instanceof Error ? error.message : 'Unable to start 2FA setup.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleEnableTwoFactor() {
    setTwoFactorError(null);
    setIsProcessing(true);

    try {
      const response = await confirmTwoFactorSetup(verificationCode.trim());
      setRecoveryCodes(response.recoveryCodes);
      setSetupKey(null);
      setSetupOtpAuthUrl(null);
      setVerificationCode('');
    } catch (error) {
      setTwoFactorError(error instanceof Error ? error.message : 'Unable to verify this code.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDisableTwoFactor() {
    setTwoFactorError(null);
    setIsProcessing(true);

    try {
      await disableTwoFactorAuth(disablePassword);
      setDisablePassword('');
      setRecoveryCodes(null);
    } catch (error) {
      setTwoFactorError(error instanceof Error ? error.message : 'Unable to disable 2FA.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleToggleAiInsights() {
    setAiError(null);
    setIsAiProcessing(true);

    try {
      await setAiInsightsEnabled(!aiEnabled);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Unable to update AI preference.');
    } finally {
      setIsAiProcessing(false);
    }
  }

  async function handleSaveReminderSettings() {
    setReminderError(null);
    setIsReminderProcessing(true);

    try {
      await updateReminderSettings({
        enabled: remindersEnabled,
        mealReminderTime: mealReminderTime.trim(),
        workoutReminderTime: workoutReminderTime.trim(),
        timezone: reminderTimezone.trim(),
      });
    } catch (error) {
      setReminderError(error instanceof Error ? error.message : 'Unable to update reminder preferences.');
    } finally {
      setIsReminderProcessing(false);
    }
  }

  async function handleLoadPrivacySummary() {
    setPrivacySummaryError(null);

    try {
      const response = await getPrivacyDataSummary();
      setPrivacySummary(response.counts);
    } catch (error) {
      setPrivacySummaryError(error instanceof Error ? error.message : 'Unable to load data summary.');
    }
  }

  async function handleDeleteAccount() {
    setDeleteError(null);
    setIsDeleteProcessing(true);

    try {
      await deleteAccount(deletePassword);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete account.');
    } finally {
      setIsDeleteProcessing(false);
    }
  }

  return (
    <ScreenShell keyboardAware scroll={false} contentContainerStyle={styles.content}>
      <ScrollView
        contentContainerStyle={styles.scrollStack}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        <ThemedText type="title">Account</ThemedText>
        <ThemedText style={styles.subtitle}>
          Manage security, personalization, and data controls from one place.
        </ThemedText>

        <View style={styles.card}>
          <ThemedText type="defaultSemiBold">Email</ThemedText>
          <ThemedText>{user?.email ?? 'Not available'}</ThemedText>
        </View>

        <View style={styles.card}>
          <ThemedText type="defaultSemiBold">Two-factor authentication</ThemedText>
          <ThemedText>{twoFactorEnabled ? 'Enabled' : 'Disabled'}</ThemedText>

          {twoFactorEnabled ? (
            <>
              <ThemedText style={styles.helperText}>
                Disable 2FA by confirming your password.
              </ThemedText>
              <TextInput
                secureTextEntry
                placeholder="Account password"
                placeholderTextColor="#82958D"
                style={styles.input}
                value={disablePassword}
                onChangeText={setDisablePassword}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  !canDisable && styles.buttonDisabled,
                  pressed && canDisable && styles.buttonPressed,
                ]}
                onPress={handleDisableTwoFactor}
                disabled={!canDisable}>
                <ThemedText style={styles.secondaryButtonText}>
                  {isProcessing ? 'Disabling...' : 'Disable 2FA'}
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              {!setupKey ? (
                <Pressable
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
                  onPress={handleSetupTwoFactor}
                  disabled={isProcessing}>
                  <ThemedText style={styles.secondaryButtonText}>
                    {isProcessing ? 'Starting...' : 'Set up 2FA'}
                  </ThemedText>
                </Pressable>
              ) : (
                <View style={styles.setupPanel}>
                  <ThemedText type="defaultSemiBold">Manual entry key</ThemedText>
                  <ThemedText style={styles.monoText}>{setupKey}</ThemedText>
                  <ThemedText type="defaultSemiBold">OTP URI</ThemedText>
                  <ThemedText style={styles.uriText}>{setupOtpAuthUrl}</ThemedText>
                  <ThemedText style={styles.helperText}>
                    Add the key to your authenticator app, then enter the 6-digit code.
                  </ThemedText>
                  <TextInput
                    autoCapitalize="none"
                    keyboardType="number-pad"
                    placeholder="6-digit code"
                    placeholderTextColor="#82958D"
                    style={styles.input}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                  />
                  <Pressable
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      !canVerifySetup && styles.buttonDisabled,
                      pressed && canVerifySetup && styles.buttonPressed,
                    ]}
                    onPress={handleEnableTwoFactor}
                    disabled={!canVerifySetup}>
                    <ThemedText style={styles.secondaryButtonText}>
                      {isProcessing ? 'Verifying...' : 'Enable 2FA'}
                    </ThemedText>
                  </Pressable>
                </View>
              )}
            </>
          )}

          {twoFactorError ? <ThemedText style={styles.errorText}>{twoFactorError}</ThemedText> : null}
        </View>

        {recoveryCodes ? (
          <View style={styles.card}>
            <ThemedText type="defaultSemiBold">Recovery codes</ThemedText>
            <ThemedText style={styles.helperText}>
              Save these codes now. Each code can be used once if you lose access to your authenticator app.
            </ThemedText>
            {recoveryCodes.map((code) => (
              <ThemedText key={code} style={styles.monoText}>
                {code}
              </ThemedText>
            ))}
          </View>
        ) : null}

        <View style={styles.card}>
          <ThemedText type="defaultSemiBold">AI insights and reminders</ThemedText>
          <ThemedText>{aiEnabled ? 'Enabled' : 'Disabled'}</ThemedText>
          <ThemedText style={styles.helperText}>
            When enabled, VigilFit analyzes your workout and food logs to generate supportive reminders
            and personalized recommendations. This feature does not provide medical advice.
          </ThemedText>
          <Pressable
            testID="ai-insights-toggle-button"
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            onPress={handleToggleAiInsights}
            disabled={isAiProcessing}>
            <ThemedText style={styles.secondaryButtonText}>
              {isAiProcessing ? 'Updating...' : aiEnabled ? 'Disable AI insights' : 'Enable AI insights'}
            </ThemedText>
          </Pressable>
          {aiError ? <ThemedText style={styles.errorText}>{aiError}</ThemedText> : null}
        </View>

        <View style={styles.card}>
          <ThemedText type="defaultSemiBold">Reminder preferences</ThemedText>
          <ThemedText style={styles.helperText}>
            Configure reminder prompts for meal logging and workout consistency.
          </ThemedText>
          <Pressable
            testID="reminders-toggle-button"
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            onPress={() => setRemindersEnabled((current) => !current)}>
            <ThemedText style={styles.secondaryButtonText}>
              {remindersEnabled ? 'Disable reminders' : 'Enable reminders'}
            </ThemedText>
          </Pressable>
          <TextInput
            testID="meal-reminder-time-input"
            autoCapitalize="none"
            placeholder="Meal reminder (HH:mm)"
            placeholderTextColor="#82958D"
            style={styles.input}
            value={mealReminderTime}
            onChangeText={setMealReminderTime}
          />
          <TextInput
            testID="workout-reminder-time-input"
            autoCapitalize="none"
            placeholder="Workout reminder (HH:mm)"
            placeholderTextColor="#82958D"
            style={styles.input}
            value={workoutReminderTime}
            onChangeText={setWorkoutReminderTime}
          />
          <TextInput
            testID="reminder-timezone-input"
            autoCapitalize="none"
            placeholder="Timezone (e.g. Africa/Nairobi)"
            placeholderTextColor="#82958D"
            style={styles.input}
            value={reminderTimezone}
            onChangeText={setReminderTimezone}
          />
          <Pressable
            testID="save-reminders-button"
            style={({ pressed }) => [
              styles.secondaryButton,
              !canSaveReminders && styles.buttonDisabled,
              pressed && canSaveReminders && styles.buttonPressed,
            ]}
            onPress={handleSaveReminderSettings}
            disabled={!canSaveReminders}>
            <ThemedText style={styles.secondaryButtonText}>
              {isReminderProcessing ? 'Saving...' : 'Save reminder settings'}
            </ThemedText>
          </Pressable>
          {reminderError ? <ThemedText style={styles.errorText}>{reminderError}</ThemedText> : null}
        </View>

        <View style={styles.card}>
          <ThemedText type="defaultSemiBold">Privacy and data minimization</ThemedText>
          <ThemedText style={styles.helperText}>
            You can review stored usage counts and delete your account data at any time.
          </ThemedText>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            onPress={handleLoadPrivacySummary}>
            <ThemedText style={styles.secondaryButtonText}>Load data summary</ThemedText>
          </Pressable>
          {privacySummary ? (
            <View style={styles.summaryBlock}>
              <ThemedText>Workouts stored: {privacySummary.workouts}</ThemedText>
              <ThemedText>Nutrition logs stored: {privacySummary.nutritionLogs}</ThemedText>
            </View>
          ) : null}
          {privacySummaryError ? <ThemedText style={styles.errorText}>{privacySummaryError}</ThemedText> : null}

          <TextInput
            testID="delete-account-password-input"
            secureTextEntry
            placeholder="Confirm password to delete account"
            placeholderTextColor="#82958D"
            style={styles.input}
            value={deletePassword}
            onChangeText={setDeletePassword}
          />
          <Pressable
            testID="delete-account-button"
            style={({ pressed }) => [
              styles.dangerButton,
              !canDeleteAccount && styles.buttonDisabled,
              pressed && canDeleteAccount && styles.buttonPressed,
            ]}
            onPress={handleDeleteAccount}
            disabled={!canDeleteAccount}>
            <ThemedText style={styles.dangerButtonText}>
              {isDeleteProcessing ? 'Deleting...' : 'Delete account and data'}
            </ThemedText>
          </Pressable>
          {deleteError ? <ThemedText style={styles.errorText}>{deleteError}</ThemedText> : null}
        </View>

        <Pressable
          testID="sign-out-button"
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleSignOut}>
          <ThemedText style={styles.buttonText}>Sign Out</ThemedText>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 18,
  },
  scrollStack: {
    gap: 16,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: '#577168',
  },
  card: {
    borderWidth: 1,
    borderColor: '#D2E2DA',
    borderRadius: Layout.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
    ...Layout.shadow.card,
  },
  button: {
    backgroundColor: '#0B8A73',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    width: 180,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 13,
    alignItems: 'center',
    backgroundColor: '#EDF8F3',
    borderWidth: 1,
    borderColor: '#BCDCCF',
    alignSelf: 'flex-start',
  },
  secondaryButtonText: {
    color: '#0B8A73',
    fontWeight: '600',
  },
  buttonPressed: {
    transform: [{ scale: 0.985 }],
  },
  buttonDisabled: {
    opacity: 0.48,
  },
  input: {
    borderWidth: 1,
    borderColor: '#C5DCD1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F201A',
    backgroundColor: '#FFFFFF',
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#577168',
  },
  monoText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  uriText: {
    fontSize: 12,
    lineHeight: 18,
  },
  setupPanel: {
    gap: 8,
  },
  errorText: {
    color: '#C43D44',
    fontSize: 14,
    lineHeight: 20,
  },
  summaryBlock: {
    gap: 4,
  },
  dangerButton: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 13,
    alignItems: 'center',
    backgroundColor: '#FFF1F3',
    borderWidth: 1,
    borderColor: '#F0BFC4',
    alignSelf: 'flex-start',
  },
  dangerButtonText: {
    color: '#B5353E',
    fontWeight: '600',
  },
});
