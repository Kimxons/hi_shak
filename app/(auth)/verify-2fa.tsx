import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/theme';
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
    <ScreenShell
      keyboardAware
      keyboardShouldPersistTaps="always"
      contentContainerStyle={styles.content}
      maxWidth={560}
      centered>
      <View style={styles.hero}>
        <ThemedText type="title">Two-factor verification</ThemedText>
        <ThemedText style={styles.description}>
          Enter the 6-digit code from your authenticator app
          {pendingTwoFactorEmail ? ` for ${pendingTwoFactorEmail}` : ''}.
        </ThemedText>
      </View>

      <View style={styles.formCard}>
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>Extra protection</ThemedText>
        </View>
        <ThemedText type="defaultSemiBold">Security checkpoint</ThemedText>
        <TextInput
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          placeholder="123456"
          placeholderTextColor="#82958D"
          style={styles.input}
          value={code}
          onChangeText={setCode}
        />

        {submitError ? <ThemedText style={styles.errorText}>{submitError}</ThemedText> : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            !canSubmit && styles.buttonDisabled,
            pressed && canSubmit && styles.buttonPressed,
          ]}
          disabled={!canSubmit}
          onPress={handleVerify}>
          <ThemedText style={styles.buttonText}>{isSubmitting ? 'Verifying...' : 'Verify and Continue'}</ThemedText>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.footerText}>Need to switch account?</ThemedText>
        <Pressable onPress={handleBackToSignIn}>
          <ThemedText type="link">Use another account</ThemedText>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
  },
  hero: {
    gap: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E4F6F0',
  },
  badgeText: {
    color: '#0B8A73',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  description: {
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
  input: {
    borderWidth: 1,
    borderColor: '#C5DCD1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F201A',
    backgroundColor: '#FFFFFF',
    marginTop: 4,
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
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#5F746B',
  },
});
