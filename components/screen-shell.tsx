import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { Layout } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

type ScreenShellProps = {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
  keyboardAware?: boolean;
  maxWidth?: number;
  centered?: boolean;
};

const AnimatedView = Animated.createAnimatedComponent(View);

export function ScreenShell({
  children,
  scroll = true,
  style,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  keyboardAware = false,
  maxWidth = 760,
  centered = false,
}: ScreenShellProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const orbMint = useThemeColor({ light: '#D6F2E5', dark: '#214337' }, 'elevated');
  const orbAmber = useThemeColor({ light: '#FBE8D7', dark: '#3B2A1E' }, 'surface');
  const isCompact = width < 390;
  const horizontalPadding = isCompact ? 14 : 20;
  const topPadding = Math.max(insets.top + (isCompact ? 14 : 20), 30);
  const bottomPadding = Math.max(insets.bottom + (isCompact ? 90 : 96), 96);
  const orbSize = isCompact ? 200 : 260;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const shellPaddingStyle: ViewStyle = {
    paddingHorizontal: horizontalPadding,
    paddingTop: topPadding,
    paddingBottom: bottomPadding,
    maxWidth,
    width: '100%' as const,
    alignSelf: 'center',
  };

  const alignedContentStyle: ViewStyle = centered
    ? {
      flexGrow: 1,
      justifyContent: 'center',
    }
    : {
      flexGrow: 1,
    };

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, alignedContentStyle, shellPaddingStyle, contentContainerStyle]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.staticContent, shellPaddingStyle, contentContainerStyle]}>{children}</View>
  );

  return (
    <ThemedView style={[styles.root, style]}>
      <View style={[styles.orb, styles.orbTopRight, { backgroundColor: orbMint, width: orbSize, height: orbSize }]} />
      <View
        style={[styles.orb, styles.orbBottomLeft, { backgroundColor: orbAmber, width: orbSize, height: orbSize }]}
      />
      <AnimatedView style={[styles.animatedLayer, { opacity, transform: [{ translateY }] }]}>
        {keyboardAware ? (
          <KeyboardAvoidingView
            style={styles.animatedLayer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}>
            {content}
          </KeyboardAvoidingView>
        ) : (
          content
        )}
      </AnimatedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  animatedLayer: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    flexGrow: 1,
  },
  staticContent: {
    flex: 1,
    gap: 16,
  },
  orb: {
    position: 'absolute',
    borderRadius: Layout.radius.xl * 6,
    opacity: 0.48,
  },
  orbTopRight: {
    top: -120,
    right: -70,
  },
  orbBottomLeft: {
    bottom: -140,
    left: -90,
  },
});
