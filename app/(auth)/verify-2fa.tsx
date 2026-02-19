import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';

export default function VerifyTwoFactorScreen() {
  const router = useRouter();
  const { pendingTwoFactorChallenge, pendingTwoFactorEmail, verifyTwoFactorCode, clearTwoFactorChallenge } =
    useAuth();

  const [code, setCode] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => code.trim().length >= 6 && Boolean(pendingTwoFactorChallenge) && !isSubmitting,
    [code, pendingTwoFactorChallenge, isSubmitting]
  );

  useEffect(() => {
    if (!pendingTwoFactorChallenge) {
      router.replace('/(auth)/sign-in');
    }
  }, [pendingTwoFactorChallenge, router]);

  async function handleVerify() {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await verifyTwoFactorCode(code.trim());
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to verify this code.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBackToSignIn() {
    clearTwoFactorChallenge();
    router.replace('/(auth)/sign-in');
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Two-factor verification</ThemedText>
      <ThemedText style={styles.description}>
        Enter the 6-digit code from your authenticator app
        {pendingTwoFactorEmail ? ` for ${pendingTwoFactorEmail}` : ''}. You can also use a recovery code.
      </ThemedText>

      <View style={styles.form}>
        <TextInput
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="123456 or ABCD-EFGH"
          placeholderTextColor="#7E8A96"
          style={styles.input}
          value={code}
          onChangeText={setCode}
        />

        {submitError ? <ThemedText style={styles.errorText}>{submitError}</ThemedText> : null}

        <Pressable
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          disabled={!canSubmit}
          onPress={handleVerify}>
          <ThemedText style={styles.buttonText}>{isSubmitting ? 'Verifying...' : 'Verify and Continue'}</ThemedText>
        </Pressable>
      </View>

      <Pressable onPress={handleBackToSignIn}>
        <ThemedText type="link">Use another account</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
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
});
