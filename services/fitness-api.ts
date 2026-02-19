import { API_BASE_URL } from '@/services/auth-api';

export type WorkoutEntry = {
  id: string;
  workoutType: string;
  durationMinutes: number;
  caloriesBurned: number;
  performedAt: string;
  notes: string;
  createdAt: string;
};

export type NutritionLogEntry = {
  id: string;
  mealType: string;
  foodName: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  loggedAt: string;
  notes: string;
  createdAt: string;
};

type CreateWorkoutInput = {
  workoutType: string;
  durationMinutes: number;
  caloriesBurned: number;
  performedAt: string;
  notes?: string;
};

type CreateNutritionLogInput = {
  mealType: string;
  foodName: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  loggedAt: string;
  notes?: string;
};

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error || 'Request failed.');
  }

  return payload as T;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchWorkouts(token: string) {
  const response = await fetch(`${API_BASE_URL}/workouts`, {
    method: 'GET',
    headers: authHeaders(token),
  });

  return parseApiResponse<{ workouts: WorkoutEntry[] }>(response);
}

export async function createWorkout(token: string, input: CreateWorkoutInput) {
  const response = await fetch(`${API_BASE_URL}/workouts`, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return parseApiResponse<{ workout: WorkoutEntry }>(response);
}

export async function deleteWorkout(token: string, workoutId: string) {
  const response = await fetch(`${API_BASE_URL}/workouts/${workoutId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || 'Unable to delete workout.');
  }
}

export async function fetchNutritionLogs(token: string) {
  const response = await fetch(`${API_BASE_URL}/nutrition/logs`, {
    method: 'GET',
    headers: authHeaders(token),
  });

  return parseApiResponse<{ logs: NutritionLogEntry[] }>(response);
}

export async function createNutritionLog(token: string, input: CreateNutritionLogInput) {
  const response = await fetch(`${API_BASE_URL}/nutrition/logs`, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return parseApiResponse<{ log: NutritionLogEntry }>(response);
}

export async function deleteNutritionLog(token: string, logId: string) {
  const response = await fetch(`${API_BASE_URL}/nutrition/logs/${logId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || 'Unable to delete nutrition log.');
  }
}
