import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { createWorkout, deleteWorkout, fetchWorkouts, type WorkoutEntry } from '@/services/fitness-api';

function formatDate(dateIso: string) {
  return new Date(dateIso).toLocaleDateString();
}

export default function WorkoutsScreen() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<WorkoutEntry[]>([]);
  const [workoutType, setWorkoutType] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [performedDate, setPerformedDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      Boolean(token) &&
      workoutType.trim().length > 1 &&
      Number(durationMinutes) > 0 &&
      performedDate.trim().length === 10 &&
      !isSaving
    );
  }, [token, workoutType, durationMinutes, performedDate, isSaving]);

  const loadEntries = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWorkouts(token);
      setEntries(response.workouts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load workouts.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadEntries();
    }, [loadEntries])
  );

  async function handleCreateWorkout() {
    if (!token || !canSubmit) {
      return;
    }

    const performedAt = new Date(`${performedDate}T12:00:00.000Z`);
    if (Number.isNaN(performedAt.getTime())) {
      setError('Use date format YYYY-MM-DD.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await createWorkout(token, {
        workoutType: workoutType.trim(),
        durationMinutes: Number(durationMinutes),
        caloriesBurned: Number(caloriesBurned || 0),
        performedAt: performedAt.toISOString(),
        notes: notes.trim(),
      });

      setEntries((current) => [response.workout, ...current]);
      setWorkoutType('');
      setDurationMinutes('');
      setCaloriesBurned('');
      setNotes('');
      setPerformedDate(new Date().toISOString().slice(0, 10));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save workout.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteWorkout(workoutId: string) {
    if (!token) {
      return;
    }

    setError(null);

    try {
      await deleteWorkout(token, workoutId);
      setEntries((current) => current.filter((entry) => entry.id !== workoutId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete workout.');
    }
  }

  return (
    <ScreenShell keyboardAware scroll={false} contentContainerStyle={styles.content}>
      <ScrollView
        contentContainerStyle={styles.scrollStack}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        <ThemedText type="title">Workouts</ThemedText>
        <ThemedText style={styles.description}>
          Track sessions, spot momentum, and keep your plan realistic and repeatable.
        </ThemedText>

        <View style={styles.card}>
          <ThemedText type="defaultSemiBold">Add workout</ThemedText>
          <TextInput
            testID="workout-type-input"
            placeholder="Workout type (e.g. Strength)"
            placeholderTextColor="#82958D"
            style={styles.input}
            value={workoutType}
            onChangeText={setWorkoutType}
          />
          <TextInput
            testID="workout-duration-input"
            keyboardType="number-pad"
            placeholder="Duration in minutes"
            placeholderTextColor="#82958D"
            style={styles.input}
            value={durationMinutes}
            onChangeText={setDurationMinutes}
          />
          <TextInput
            testID="workout-calories-input"
            keyboardType="number-pad"
            placeholder="Calories burned (optional)"
            placeholderTextColor="#82958D"
            style={styles.input}
            value={caloriesBurned}
            onChangeText={setCaloriesBurned}
          />
          <TextInput
            testID="workout-date-input"
            autoCapitalize="none"
            placeholder="Date (YYYY-MM-DD)"
            placeholderTextColor="#82958D"
            style={styles.input}
            value={performedDate}
            onChangeText={setPerformedDate}
          />
          <TextInput
            testID="workout-notes-input"
            placeholder="Notes (optional)"
            placeholderTextColor="#82958D"
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <Pressable
            testID="workout-save-button"
            style={({ pressed }) => [
              styles.primaryButton,
              !canSubmit && styles.buttonDisabled,
              pressed && canSubmit && styles.buttonPressed,
            ]}
            disabled={!canSubmit}
            onPress={handleCreateWorkout}>
            <ThemedText style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Save workout'}</ThemedText>
          </Pressable>
        </View>

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        <View style={styles.card}>
          <ThemedText type="defaultSemiBold">Recent workouts</ThemedText>
          {isLoading ? <ThemedText>Loading workouts...</ThemedText> : null}
          {!isLoading && entries.length === 0 ? <ThemedText>No workouts yet.</ThemedText> : null}
          {entries.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <View style={styles.entryText}>
                <ThemedText type="defaultSemiBold">{entry.workoutType}</ThemedText>
                <ThemedText>
                  {entry.durationMinutes} min | {entry.caloriesBurned} kcal | {formatDate(entry.performedAt)}
                </ThemedText>
                {entry.notes ? <ThemedText>{entry.notes}</ThemedText> : null}
              </View>
              <Pressable
                style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
                onPress={() => handleDeleteWorkout(entry.id)}>
                <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 18,
  },
  scrollStack: {
    gap: 14,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    color: '#577168',
  },
  card: {
    borderWidth: 1,
    borderColor: '#D2E2DA',
    borderRadius: Layout.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
    ...Layout.shadow.card,
  },
  input: {
    borderWidth: 1,
    borderColor: '#C5DCD1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0F201A',
    backgroundColor: '#FFFFFF',
  },
  notesInput: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#0B8A73',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonPressed: {
    transform: [{ scale: 0.985 }],
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.48,
  },
  entryRow: {
    borderTopWidth: 1,
    borderTopColor: '#E1ECE7',
    paddingTop: 10,
    gap: 10,
  },
  entryText: {
    gap: 4,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#F0BFC4',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFF1F3',
  },
  deleteButtonPressed: {
    opacity: 0.84,
  },
  deleteButtonText: {
    color: '#B5353E',
    fontWeight: '600',
  },
  errorText: {
    color: '#C43D44',
    fontSize: 14,
    lineHeight: 20,
  },
});
