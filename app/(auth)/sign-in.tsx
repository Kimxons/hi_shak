import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 4 && password.length > 7 && !isSubmitting,
    [email, password, isSubmitting]
  );

  async function handleSignIn() {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn(email.trim(), password);
      if (result.requiresTwoFactor) {
        router.replace('/(auth)/verify-2fa');
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenShell
      keyboardAware
      keyboardShouldPersistTaps="always"
      contentContainerStyle={styles.content}
      maxWidth={560}>
      <View style={styles.hero}>
        <ThemedText type="title">VigilFit</ThemedText>
        <ThemedText style={styles.tagline}>
          Train smarter, eat better, and protect your data by default.
        </ThemedText>
      </View>

      <View style={styles.formCard}>
        <ThemedText type="subtitle" style={styles.subtitle}>
          Sign in to your account
        </ThemedText>
        <ThemedText style={styles.helper}>
          Continue where you left off with secure access and personalized momentum.
        </ThemedText>

        <View style={styles.form}>
          <TextInput
            testID="sign-in-email-input"
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
            testID="sign-in-password-input"
            secureTextEntry
            textContentType="password"
            autoComplete="password"
            returnKeyType="done"
            placeholder="Password"
            placeholderTextColor="#82958D"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          {submitError ? <ThemedText style={styles.errorText}>{submitError}</ThemedText> : null}

          <Pressable
            testID="sign-in-submit-button"
            style={({ pressed }) => [
              styles.button,
              !canSubmit && styles.buttonDisabled,
              pressed && canSubmit && styles.buttonPressed,
            ]}
            disabled={!canSubmit}
            onPress={handleSignIn}>
            <ThemedText style={styles.buttonText}>{isSubmitting ? 'Signing in...' : 'Sign In'}</ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.footerText}>New to VigilFit?</ThemedText>
        <Link testID="sign-in-create-account-link" href="/(auth)/sign-up" style={styles.link}>
          <ThemedText type="link">Create a new account</ThemedText>
        </Link>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 18,
  },
  hero: {
    gap: 8,
  },
  subtitle: {
    fontSize: 24,
  },
  helper: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5F746B',
  },
  tagline: {
    fontSize: 16,
    lineHeight: 24,
    color: '#50635B',
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
  footer: {
    flexDirection: 'row',
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
