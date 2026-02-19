import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Workouts</ThemedText>
        <ThemedText style={styles.description}>Track sessions and review your recent training history.</ThemedText>

        <View style={styles.card}>
          <ThemedText type="defaultSemiBold">Add workout</ThemedText>
          <TextInput
            testID="workout-type-input"
            placeholder="Workout type (e.g. Strength)"
            placeholderTextColor="#7E8A96"
            style={styles.input}
            value={workoutType}
            onChangeText={setWorkoutType}
          />
          <TextInput
            testID="workout-duration-input"
            keyboardType="number-pad"
            placeholder="Duration in minutes"
            placeholderTextColor="#7E8A96"
            style={styles.input}
            value={durationMinutes}
            onChangeText={setDurationMinutes}
          />
          <TextInput
            testID="workout-calories-input"
            keyboardType="number-pad"
            placeholder="Calories burned (optional)"
            placeholderTextColor="#7E8A96"
            style={styles.input}
            value={caloriesBurned}
            onChangeText={setCaloriesBurned}
          />
          <TextInput
            testID="workout-date-input"
            autoCapitalize="none"
            placeholder="Date (YYYY-MM-DD)"
            placeholderTextColor="#7E8A96"
            style={styles.input}
            value={performedDate}
            onChangeText={setPerformedDate}
          />
          <TextInput
            testID="workout-notes-input"
            placeholder="Notes (optional)"
            placeholderTextColor="#7E8A96"
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <Pressable
            testID="workout-save-button"
            style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
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
              <Pressable style={styles.deleteButton} onPress={() => handleDeleteWorkout(entry.id)}>
                <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 56,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 14,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: '#D3DAE1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D3DAE1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#11181C',
    backgroundColor: '#FFFFFF',
  },
  notesInput: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#0A7EA4',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  entryRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8EE',
    paddingTop: 10,
    gap: 10,
  },
  entryText: {
    gap: 4,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2B8B8',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFF2F2',
  },
  deleteButtonText: {
    color: '#9A2020',
    fontWeight: '600',
  },
  errorText: {
    color: '#B42318',
    fontSize: 14,
    lineHeight: 20,
  },
});
