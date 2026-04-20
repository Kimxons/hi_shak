import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { fetchNutritionLogs, fetchWorkouts } from '@/services/fitness-api';

function getWeekStart(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);
  current.setHours(0, 0, 0, 0);
  return current;
}

export default function DashboardScreen() {
  const { user, token, getAiRecommendations, getTodayReminders } = useAuth();
  const [workoutsThisWeek, setWorkoutsThisWeek] = useState(0);
  const [mealsToday, setMealsToday] = useState(0);
  const [caloriesToday, setCaloriesToday] = useState(0);
  const [aiRecommendations, setAiRecommendations] = useState<
    { id: string; title: string; message: string; priority: string; category: string }[]
  >([]);
  const [aiDisclaimer, setAiDisclaimer] = useState<string | null>(null);
  const [reminders, setReminders] = useState<
    { id: string; title: string; message: string; scheduledFor: string; priority: string }[]
  >([]);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);

  const weekStart = useMemo(() => getWeekStart(), []);
  const todayStart = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const loadSummary = useCallback(async () => {
    if (!token) {
      return;
    }

    setError(null);
    setAiError(null);
    setReminderError(null);

    try {
      const [workoutResponse, nutritionResponse] = await Promise.all([
        fetchWorkouts(token),
        fetchNutritionLogs(token),
      ]);

      const weeklyWorkouts = workoutResponse.workouts.filter(
        (workout) => new Date(workout.performedAt).getTime() >= weekStart.getTime()
      ).length;

      const todayLogs = nutritionResponse.logs.filter(
        (log) => new Date(log.loggedAt).getTime() >= todayStart.getTime()
      );
      const todayCalories = todayLogs.reduce((total, log) => total + log.calories, 0);

      setWorkoutsThisWeek(weeklyWorkouts);
      setMealsToday(todayLogs.length);
      setCaloriesToday(todayCalories);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard summary.');
    }

    if (user?.aiInsightsEnabled) {
      try {
        const aiResponse = await getAiRecommendations();
        setAiRecommendations(aiResponse.recommendations);
        setAiDisclaimer(aiResponse.disclaimer);
      } catch (loadError) {
        setAiError(loadError instanceof Error ? loadError.message : 'Unable to load AI insights.');
        setAiRecommendations([]);
        setAiDisclaimer(null);
      }
    } else {
      setAiRecommendations([]);
      setAiDisclaimer(null);
    }

    try {
      const remindersResponse = await getTodayReminders();
      setReminders(remindersResponse.notifications);
      setReminderMessage(remindersResponse.message || null);
    } catch (loadError) {
      setReminderError(loadError instanceof Error ? loadError.message : 'Unable to load reminders.');
      setReminders([]);
      setReminderMessage(null);
    }
  }, [token, weekStart, todayStart, user?.aiInsightsEnabled, getAiRecommendations, getTodayReminders]);

  useFocusEffect(
    useCallback(() => {
      void loadSummary();
    }, [loadSummary])
  );

  return (
    <ScreenShell contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <ThemedText style={styles.heroBadgeText}>Daily overview</ThemedText>
        </View>
        <ThemedText testID="dashboard-title" type="title">
          Dashboard
        </ThemedText>
        <ThemedText style={styles.welcome}>
          Welcome back, {user?.email ?? 'Athlete'}. Stay consistent and let your next win compound.
        </ThemedText>
      </View>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      <View style={styles.grid}>
        <View style={styles.metricCard}>
          <ThemedText type="defaultSemiBold">Workouts this week</ThemedText>
          <ThemedText style={styles.metric}>{workoutsThisWeek}</ThemedText>
        </View>
        <View style={styles.metricCard}>
          <ThemedText type="defaultSemiBold">Meals logged today</ThemedText>
          <ThemedText style={styles.metric}>{mealsToday}</ThemedText>
        </View>
        <View style={styles.metricCard}>
          <ThemedText type="defaultSemiBold">Calories today</ThemedText>
          <ThemedText style={styles.metric}>{caloriesToday}</ThemedText>
        </View>
      </View>

      <View testID="dashboard-ai-card" style={styles.featureCard}>
        <ThemedText type="defaultSemiBold">AI insights and reminders</ThemedText>
        {!user?.aiInsightsEnabled ? (
          <ThemedText>Enable AI insights in Account to receive personalized recommendations.</ThemedText>
        ) : null}
        {user?.aiInsightsEnabled && aiError ? <ThemedText style={styles.errorText}>{aiError}</ThemedText> : null}
        {user?.aiInsightsEnabled && !aiError && aiRecommendations.length === 0 ? (
          <ThemedText>No AI insights available yet. Add more logs to personalize recommendations.</ThemedText>
        ) : null}
        {user?.aiInsightsEnabled &&
          aiRecommendations.map((recommendation) => (
            <View key={recommendation.id} style={styles.recommendationItem}>
              <ThemedText type="defaultSemiBold">
                {recommendation.title} ({recommendation.priority})
              </ThemedText>
              <ThemedText>{recommendation.message}</ThemedText>
            </View>
          ))}
        {user?.aiInsightsEnabled && aiDisclaimer ? (
          <ThemedText style={styles.disclaimerText}>{aiDisclaimer}</ThemedText>
        ) : null}
      </View>

      <View style={styles.featureCard}>
        <ThemedText type="defaultSemiBold">Reminder notifications</ThemedText>
        {reminderError ? <ThemedText style={styles.errorText}>{reminderError}</ThemedText> : null}
        {reminderMessage ? <ThemedText>{reminderMessage}</ThemedText> : null}
        {!reminderError && reminders.length === 0 ? <ThemedText>No reminders for now.</ThemedText> : null}
        {reminders.map((reminder) => (
          <View key={reminder.id} style={styles.recommendationItem}>
            <ThemedText type="defaultSemiBold">
              {reminder.title} ({reminder.priority})
            </ThemedText>
            <ThemedText>{reminder.message}</ThemedText>
            <ThemedText style={styles.disclaimerText}>
              Scheduled: {new Date(reminder.scheduledFor).toLocaleString()}
            </ThemedText>
          </View>
        ))}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 14,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: '#D5E6DE',
    borderRadius: Layout.radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: 'rgba(255,255,255,0.94)',
    gap: 10,
    ...Layout.shadow.card,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#EAF4EF',
  },
  heroBadgeText: {
    color: '#44665B',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  welcome: {
    fontSize: 15,
    lineHeight: 23,
    color: '#577168',
  },
  grid: {
    gap: 10,
  },
  metricCard: {
    borderWidth: 1,
    borderColor: '#D2E2DA',
    borderRadius: Layout.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 6,
    ...Layout.shadow.card,
  },
  featureCard: {
    borderWidth: 1,
    borderColor: '#D2E2DA',
    borderRadius: Layout.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
    ...Layout.shadow.card,
  },
  metric: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '700',
    color: '#0B8A73',
  },
  errorText: {
    color: '#C43D44',
    fontSize: 14,
    lineHeight: 20,
  },
  recommendationItem: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8EE',
    paddingTop: 8,
    gap: 4,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#667F75',
  },
});
