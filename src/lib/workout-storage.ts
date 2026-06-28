export interface ExerciseSet {
  reps: number;
  weight: number;
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
}

export interface WorkoutSession {
  id: string;
  date: string;
  name: string;
  exercises: WorkoutExercise[];
  durationMinutes: number;
  completed: boolean;
}

const STORAGE_KEY = "fit-fiesta-workouts";

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function getAllWorkouts(): WorkoutSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WorkoutSession[];
  } catch {
    return [];
  }
}

export function saveWorkout(workout: WorkoutSession): void {
  if (typeof window === "undefined") return;
  const workouts = getAllWorkouts();
  const existingIndex = workouts.findIndex((w) => w.id === workout.id);
  if (existingIndex >= 0) {
    workouts[existingIndex] = workout;
  } else {
    workouts.push(workout);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
}

export function deleteWorkout(id: string): void {
  if (typeof window === "undefined") return;
  const workouts = getAllWorkouts().filter((w) => w.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
}

export function createWorkoutSession(name: string): WorkoutSession {
  return {
    id: generateId(),
    date: new Date().toISOString(),
    name,
    exercises: [],
    durationMinutes: 0,
    completed: false,
  };
}

export function getExerciseNames(): string[] {
  const workouts = getAllWorkouts();
  const names = new Set<string>();
  for (const w of workouts) {
    for (const e of w.exercises) {
      names.add(e.name);
    }
  }
  return Array.from(names).sort();
}

export function getWeeklyStats(): { day: string; volume: number }[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const result = days.map((day) => ({ day, volume: 0 }));

  const workouts = getAllWorkouts();
  for (const w of workouts) {
    const d = new Date(w.date);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 7) {
      const dayIndex = d.getDay();
      let volume = 0;
      for (const ex of w.exercises) {
        for (const s of ex.sets) {
          if (s.completed) {
            volume += s.reps * s.weight;
          }
        }
      }
      result[dayIndex].volume += volume;
    }
  }
  return result;
}

export function getTotalStats() {
  const workouts = getAllWorkouts().filter((w) => w.completed);
  let totalWorkouts = workouts.length;
  let totalVolume = 0;
  let totalSets = 0;

  for (const w of workouts) {
    for (const ex of w.exercises) {
      for (const s of ex.sets) {
        if (s.completed) {
          totalVolume += s.reps * s.weight;
          totalSets++;
        }
      }
    }
  }

  return { totalWorkouts, totalVolume, totalSets };
}
