import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';
import {
  createNutritionLog,
  deleteNutritionLog,
  fetchNutritionLogs,
  type NutritionLogEntry,
} from '@/services/fitness-api';

function formatDate(dateIso: string) {
  return new Date(dateIso).toLocaleDateString();
}

export default function NutritionScreen() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<NutritionLogEntry[]>([]);
  const [mealType, setMealType] = useState('');
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [proteinGrams, setProteinGrams] = useState('');
  const [carbsGrams, setCarbsGrams] = useState('');
  const [fatGrams, setFatGrams] = useState('');
  const [loggedDate, setLoggedDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      Boolean(token) &&
      mealType.trim().length > 1 &&
      foodName.trim().length > 1 &&
      Number(calories) >= 0 &&
      loggedDate.trim().length === 10 &&
      !isSaving
    );
  }, [token, mealType, foodName, calories, loggedDate, isSaving]);

  const loadEntries = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchNutritionLogs(token);
      setEntries(response.logs);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load nutrition logs.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadEntries();
    }, [loadEntries])
  );

  async function handleCreateLog() {
    if (!token || !canSubmit) {
      return;
    }

    const loggedAt = new Date(`${loggedDate}T12:00:00.000Z`);
    if (Number.isNaN(loggedAt.getTime())) {
      setError('Use date format YYYY-MM-DD.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await createNutritionLog(token, {
        mealType: mealType.trim(),
        foodName: foodName.trim(),
        calories: Number(calories),
        proteinGrams: Number(proteinGrams || 0),
        carbsGrams: Number(carbsGrams || 0),
        fatGrams: Number(fatGrams || 0),
        loggedAt: loggedAt.toISOString(),
        notes: notes.trim(),
      });

      setEntries((current) => [response.log, ...current]);
      setMealType('');
      setFoodName('');
      setCalories('');
      setProteinGrams('');
      setCarbsGrams('');
      setFatGrams('');
      setNotes('');
      setLoggedDate(new Date().toISOString().slice(0, 10));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save nutrition log.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteLog(logId: string) {
    if (!token) {
      return;
    }

    setError(null);

    try {
      await deleteNutritionLog(token, logId);
      setEntries((current) => current.filter((entry) => entry.id !== logId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete nutrition log.');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Nutrition</ThemedText>
        <ThemedText style={styles.description}>Log meals and track your daily macro intake.</ThemedText>

        <View style={styles.card}>
          <ThemedText type="defaultSemiBold">Add meal log</ThemedText>
          <TextInput
            testID="nutrition-meal-type-input"
            placeholder="Meal type (e.g. Breakfast)"
            placeholderTextColor="#7E8A96"
            style={styles.input}
            value={mealType}
            onChangeText={setMealType}
          />
          <TextInput
            testID="nutrition-food-name-input"
            placeholder="Food name"
            placeholderTextColor="#7E8A96"
            style={styles.input}
            value={foodName}
            onChangeText={setFoodName}
          />
          <TextInput
            testID="nutrition-calories-input"
            keyboardType="number-pad"
            placeholder="Calories"
            placeholderTextColor="#7E8A96"
            style={styles.input}
            value={calories}
            onChangeText={setCalories}
          />
          <View style={styles.macroRow}>
            <TextInput
              testID="nutrition-protein-input"
              keyboardType="number-pad"
              placeholder="Protein (g)"
              placeholderTextColor="#7E8A96"
              style={[styles.input, styles.macroInput]}
              value={proteinGrams}
              onChangeText={setProteinGrams}
            />
            <TextInput
              testID="nutrition-carbs-input"
              keyboardType="number-pad"
              placeholder="Carbs (g)"
              placeholderTextColor="#7E8A96"
              style={[styles.input, styles.macroInput]}
              value={carbsGrams}
              onChangeText={setCarbsGrams}
            />
            <TextInput
              testID="nutrition-fat-input"
              keyboardType="number-pad"
              placeholder="Fat (g)"
              placeholderTextColor="#7E8A96"
              style={[styles.input, styles.macroInput]}
              value={fatGrams}
              onChangeText={setFatGrams}
            />
          </View>
          <TextInput
            testID="nutrition-date-input"
            autoCapitalize="none"
            placeholder="Date (YYYY-MM-DD)"
            placeholderTextColor="#7E8A96"
            style={styles.input}
            value={loggedDate}
            onChangeText={setLoggedDate}
          />
          <TextInput
            testID="nutrition-notes-input"
            placeholder="Notes (optional)"
            placeholderTextColor="#7E8A96"
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <Pressable
            testID="nutrition-save-button"
            style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
            disabled={!canSubmit}
            onPress={handleCreateLog}>
            <ThemedText style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Save meal log'}</ThemedText>
          </Pressable>
        </View>

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        <View style={styles.card}>
          <ThemedText type="defaultSemiBold">Recent nutrition logs</ThemedText>
          {isLoading ? <ThemedText>Loading nutrition logs...</ThemedText> : null}
          {!isLoading && entries.length === 0 ? <ThemedText>No nutrition logs yet.</ThemedText> : null}
          {entries.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <View style={styles.entryText}>
                <ThemedText type="defaultSemiBold">
                  {entry.mealType}: {entry.foodName}
                </ThemedText>
                <ThemedText>
                  {entry.calories} kcal | P {entry.proteinGrams}g C {entry.carbsGrams}g F {entry.fatGrams}g
                </ThemedText>
                <ThemedText>{formatDate(entry.loggedAt)}</ThemedText>
                {entry.notes ? <ThemedText>{entry.notes}</ThemedText> : null}
              </View>
              <Pressable style={styles.deleteButton} onPress={() => handleDeleteLog(entry.id)}>
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
  macroRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroInput: {
    flex: 1,
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
