import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

const POINTER_EVENTS_DEPRECATION_WARNING = 'props.pointerEvents is deprecated. Use style.pointerEvents';

if (__DEV__) {
  const globalRef = globalThis as { __vigilfitConsoleWarnPatched?: boolean };

  if (!globalRef.__vigilfitConsoleWarnPatched) {
    globalRef.__vigilfitConsoleWarnPatched = true;
    const originalWarn = console.warn.bind(console);

    console.warn = (...args: Parameters<typeof console.warn>) => {
      const firstArg = args[0];
      if (typeof firstArg === 'string' && firstArg.includes(POINTER_EVENTS_DEPRECATION_WARNING)) {
        return;
      }

      originalWarn(...args);
    };
  }
}

function AuthGate() {
  const { isAuthenticated, isLoadingSession } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key || isLoadingSession) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [isAuthenticated, isLoadingSession, navigationState?.key, router, segments]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AuthGate />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
