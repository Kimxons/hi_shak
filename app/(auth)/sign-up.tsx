import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
    <ThemedView style={styles.container}>
      <ThemedText type="title">Create account</ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        Start your secure fitness journey
      </ThemedText>

      <View style={styles.form}>
        <TextInput
          testID="sign-up-email-input"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#7E8A96"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          testID="sign-up-password-input"
          secureTextEntry
          placeholder="Password"
          placeholderTextColor="#7E8A96"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          testID="sign-up-confirm-password-input"
          secureTextEntry
          placeholder="Confirm password"
          placeholderTextColor="#7E8A96"
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <Pressable
          testID="sign-up-consent-toggle"
          style={styles.consentRow}
          onPress={() => setConsentAccepted((current) => !current)}>
          <View style={[styles.consentBox, consentAccepted && styles.consentBoxChecked]} />
          <ThemedText style={styles.consentText}>
            I agree to data collection and usage for tracking, reminders, and personalization.
          </ThemedText>
        </Pressable>

        {submitError ? <ThemedText style={styles.errorText}>{submitError}</ThemedText> : null}

        <Pressable
          testID="sign-up-submit-button"
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          disabled={!canSubmit}
          onPress={handleSignUp}>
          <ThemedText style={styles.buttonText}>
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </ThemedText>
        </Pressable>
      </View>

      <Link testID="sign-up-sign-in-link" href="/(auth)/sign-in" style={styles.link}>
        <ThemedText type="link">Already have an account? Sign in</ThemedText>
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
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 2,
  },
  consentBox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#A6B4C0',
    borderRadius: 4,
    marginTop: 2,
    backgroundColor: '#FFFFFF',
  },
  consentBoxChecked: {
    backgroundColor: '#0A7EA4',
    borderColor: '#0A7EA4',
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    marginTop: 14,
    alignSelf: 'flex-start',
  },
});
