import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 4 &&
      password.length > 7 &&
      confirmPassword === password &&
      consentAccepted &&
      !isSubmitting
    );
  }, [email, password, confirmPassword, consentAccepted, isSubmitting]);

  async function handleSignUp() {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await signUp(email.trim(), password, consentAccepted);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Unable to create your account. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenShell
      keyboardAware
      keyboardShouldPersistTaps="always"
      contentContainerStyle={styles.content}
      maxWidth={580}
      centered>
      <View style={styles.hero}>
        <ThemedText type="title">Create account</ThemedText>
        <ThemedText style={styles.tagline}>
          Start your secure fitness journey with private-by-default tracking.
        </ThemedText>
      </View>

      <View style={styles.formCard}>
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>Fast onboarding</ThemedText>
        </View>
        <ThemedText type="subtitle" style={styles.subtitle}>
          Get started in under a minute
        </ThemedText>
        <ThemedText style={styles.helper}>
          One account gives you secure tracking, reminders, AI insights, and full control over your data.
        </ThemedText>
        <View style={styles.form}>
          <TextInput
            testID="sign-up-email-input"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="next"
            placeholder="Email"
            placeholderTextColor="#82958D"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            testID="sign-up-password-input"
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="next"
            placeholder="Password"
            placeholderTextColor="#82958D"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            testID="sign-up-confirm-password-input"
            secureTextEntry
            textContentType="password"
            autoComplete="new-password"
            returnKeyType="done"
            placeholder="Confirm password"
            placeholderTextColor="#82958D"
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <Pressable
            testID="sign-up-consent-toggle"
            style={({ pressed }) => [styles.consentRow, pressed && styles.consentRowPressed]}
            onPress={() => setConsentAccepted((current) => !current)}>
            <View style={[styles.consentBox, consentAccepted && styles.consentBoxChecked]} />
            <ThemedText style={styles.consentText}>
              I agree to data collection and usage for tracking, reminders, and personalization.
            </ThemedText>
          </Pressable>

          {submitError ? <ThemedText style={styles.errorText}>{submitError}</ThemedText> : null}

          <Pressable
            testID="sign-up-submit-button"
            style={({ pressed }) => [
              styles.button,
              !canSubmit && styles.buttonDisabled,
              pressed && canSubmit && styles.buttonPressed,
            ]}
            disabled={!canSubmit}
            onPress={handleSignUp}>
            <ThemedText style={styles.buttonText}>
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.footerText}>Already registered?</ThemedText>
        <Link testID="sign-up-sign-in-link" href="/(auth)/sign-in" style={styles.link}>
          <ThemedText type="link">Sign in</ThemedText>
        </Link>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
  },
  hero: {
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FBE8D7',
  },
  badgeText: {
    color: '#A55720',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tagline: {
    fontSize: 16,
    lineHeight: 24,
    color: '#50635B',
  },
  helper: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5F746B',
  },
  formCard: {
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: '#D0E2D9',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
    ...Layout.shadow.card,
  },
  subtitle: {
    fontSize: 22,
  },
  form: {
    gap: 12,
    marginTop: 2,
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
  button: {
    backgroundColor: '#0B8A73',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonPressed: {
    transform: [{ scale: 0.985 }],
  },
  buttonDisabled: {
    opacity: 0.48,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorText: {
    color: '#C43D44',
    fontSize: 14,
    lineHeight: 20,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 2,
  },
  consentRowPressed: {
    opacity: 0.86,
  },
  consentBox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#9FB8AD',
    borderRadius: 6,
    marginTop: 2,
    backgroundColor: '#FFFFFF',
  },
  consentBoxChecked: {
    backgroundColor: '#0B8A73',
    borderColor: '#0B8A73',
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#5F746B',
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#5F746B',
  },
  link: {
    alignSelf: 'flex-start',
  },
});
