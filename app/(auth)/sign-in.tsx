import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
    <ThemedView style={styles.container}>
      <ThemedText type="title">VigilFit</ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        Sign in to your account
      </ThemedText>

      <View style={styles.form}>
        <TextInput
          testID="sign-in-email-input"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#7E8A96"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          testID="sign-in-password-input"
          secureTextEntry
          placeholder="Password"
          placeholderTextColor="#7E8A96"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        {submitError ? <ThemedText style={styles.errorText}>{submitError}</ThemedText> : null}

        <Pressable
          testID="sign-in-submit-button"
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          disabled={!canSubmit}
          onPress={handleSignIn}>
          <ThemedText style={styles.buttonText}>{isSubmitting ? 'Signing in...' : 'Sign In'}</ThemedText>
        </Pressable>
      </View>

      <Link testID="sign-in-create-account-link" href="/(auth)/sign-up" style={styles.link}>
        <ThemedText type="link">Create a new account</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  subtitle: {
    fontSize: 20,
    marginBottom: 10,
  },
  form: {
    gap: 12,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D3DAE1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#11181C',
    backgroundColor: '#FFFFFF',
  },
  button: {
    backgroundColor: '#0A7EA4',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorText: {
    color: '#B42318',
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    marginTop: 14,
    alignSelf: 'flex-start',
  },
});
