import { Platform } from 'react-native';

const primaryLight = '#0B8A73';
const primaryDark = '#4DE3C6';

export const Colors = {
  light: {
    text: '#0F201A',
    background: '#F4FAF7',
    surface: '#FFFFFF',
    elevated: '#EBF6F1',
    border: '#D1E3DA',
    mutedText: '#5A6F66',
    primary: primaryLight,
    secondary: '#E97835',
    success: '#228B56',
    danger: '#C43D44',
    tint: primaryLight,
    icon: '#6A7E76',
    tabIconDefault: '#6A7E76',
    tabIconSelected: primaryLight,
  },
  dark: {
    text: '#EDF7F2',
    background: '#0F1714',
    surface: '#17231E',
    elevated: '#1E2D27',
    border: '#2B3D36',
    mutedText: '#A7BBB2',
    primary: primaryDark,
    secondary: '#FF9C5F',
    success: '#4ED38D',
    danger: '#FF7A81',
    tint: primaryDark,
    icon: '#A7BBB2',
    tabIconDefault: '#A7BBB2',
    tabIconSelected: primaryDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'Avenir Next',
    serif: 'Iowan Old Style',
    rounded: 'SF Pro Rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif-medium',
    mono: 'monospace',
  },
  android: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif-medium',
    mono: 'monospace',
  },
  web: {
    sans: "'Manrope', 'Avenir Next', 'Segoe UI Variable', 'Segoe UI', 'Helvetica Neue', sans-serif",
    serif: "'Source Serif 4', 'Iowan Old Style', Georgia, serif",
    rounded: "'Nunito Sans', 'Avenir Next', 'Segoe UI', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Layout = {
  radius: {
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
  },
  shadow: {
    card: {
      shadowColor: '#091410',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.12,
      shadowRadius: 22,
      elevation: 8,
    },
  },
};
