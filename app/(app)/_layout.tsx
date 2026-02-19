import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AppLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const tabBarBaseColor = isDark ? 'rgba(23,35,30,0.96)' : 'rgba(255,255,255,0.96)';
  const tabBarBorderColor = isDark ? 'rgba(90,118,106,0.35)' : 'rgba(153,182,169,0.38)';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        tabBarItemStyle: styles.tabBarItem,
        tabBarStyle: {
          ...styles.tabBar,
          height: Platform.OS === 'ios' ? 66 + insets.bottom : 70,
          paddingBottom: Math.max(insets.bottom - 2, 8),
          backgroundColor: tabBarBaseColor,
          borderColor: tabBarBorderColor,
        },
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarBackground: () => (
          <View
            style={[
              styles.tabBarBackground,
              {
                backgroundColor: tabBarBaseColor,
                borderColor: tabBarBorderColor,
              },
            ]}
          />
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <IconSymbol name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
          tabBarIcon: ({ color }) => <IconSymbol name="figure.run" color={color} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
          tabBarIcon: ({ color }) => <IconSymbol name="fork.knife" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <IconSymbol name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 10,
    borderTopWidth: 0,
    borderRadius: 24,
    paddingTop: 8,
    elevation: 6,
    shadowColor: '#08120E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
  },
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
  },
  tabBarItem: {
    paddingTop: 2,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
