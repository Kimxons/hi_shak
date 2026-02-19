import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const linkColor = useThemeColor({}, 'primary');

  return (
    <Text
      style={[
        { color, fontFamily: Fonts.sans },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? [styles.link, { color: linkColor }] : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0.1,
  },
  defaultSemiBold: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -0.7,
    fontFamily: Fonts.rounded,
  },
  subtitle: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontFamily: Fonts.rounded,
  },
  link: {
    lineHeight: 24,
    fontSize: 15,
    fontWeight: '600',
  },
});
