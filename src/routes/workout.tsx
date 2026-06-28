import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Plus, Minus, Check, Trash2, Timer, X, Save, Play } from "lucide-react";
import {
  createWorkoutSession,
  saveWorkout,
  getExerciseNames,
  type WorkoutExercise,
  type ExerciseSet,
  type WorkoutSession,
} from "@/lib/workout-storage";

export const Route = createFileRoute("/workout")({
  head: () => ({
    meta: [
      { title: "Workout — FIT FIESTA" },
      { name: "description", content: "Log your workout exercises, sets, reps, and weight." },
    ],
  }),
  component: WorkoutPage,
});

function WorkoutPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exerciseName, setExerciseName] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("fit-fiesta-active-session");
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch {
        setSession(createWorkoutSession("Workout"));
      }
    } else {
      setSession(createWorkoutSession("Workout"));
    }
  }, []);

  useEffect(() => {
    if (session) {
      localStorage.setItem("fit-fiesta-active-session", JSON.stringify(session));
    }
  }, [session]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const handleAddExercise = useCallback(() => {
    if (!exerciseName.trim() || !session) return;
    const newExercise: WorkoutExercise = {
      id: Math.random().toString(36).substring(2, 10),
      name: exerciseName.trim(),
      sets: [{ reps: 0, weight: 0, completed: false }],
    };
    setSession({
      ...session,
      exercises: [...session.exercises, newExercise],
    });
    setExerciseName("");
    setShowSuggestions(false);
  }, [exerciseName, session]);

  const handleInputChange = (value: string) => {
    setExerciseName(value);
    if (value.trim().length > 0) {
      const allNames = getExerciseNames();
      const filtered = allNames.filter((n) =>
        n.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const addSet = (exerciseId: string) => {
    if (!session) return;
    setSession({
      ...session,
      exercises: session.exercises.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: [...ex.sets, { reps: 0, weight: 0, completed: false }] }
          : ex
      ),
    });
  };

  const removeSet = (exerciseId: string, setIndex: number) => {
    if (!session) return;
    setSession({
      ...session,
      exercises: session.exercises.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: ex.sets.filter((_, i) => i !== setIndex) }
          : ex
      ),
    });
  };

  const updateSet = (
    exerciseId: string,
    setIndex: number,
    field: keyof ExerciseSet,
    value: number | boolean
  ) => {
    if (!session) return;
    setSession({
      ...session,
      exercises: session.exercises.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s, i) =>
                i === setIndex ? { ...s, [field]: value } : s
              ),
            }
          : ex
      ),
    });
  };

  const removeExercise = (exerciseId: string) => {
    if (!session) return;
    setSession({
      ...session,
      exercises: session.exercises.filter((ex) => ex.id !== exerciseId),
    });
  };

  const finishWorkout = () => {
    if (!session) return;
    const finished: WorkoutSession = {
      ...session,
      completed: true,
      durationMinutes: Math.floor(timerSeconds / 60),
    };
    saveWorkout(finished);
    localStorage.removeItem("fit-fiesta-active-session");
    navigate({ to: "/history" });
  };

  const cancelWorkout = () => {
    if (!confirm("Discard this workout?")) return;
    localStorage.removeItem("fit-fiesta-active-session");
    setSession(createWorkoutSession("Workout"));
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!mounted || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-tight text-neon neon-text-glow">
            WORKOUT
          </h1>
          <p className="text-sm text-muted-foreground">Log your lifts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (timerRunning) {
                setTimerRunning(false);
              } else {
                setTimerRunning(true);
              }
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              timerRunning
                ? "bg-neon/20 text-neon"
                : "bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            <Timer className="h-4 w-4" />
            {formatTime(timerSeconds)}
          </button>
        </div>
      </div>

      {/* Add Exercise */}
      <div className="relative mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={exerciseName}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddExercise();
              }}
              placeholder="Exercise name (e.g. Bench Press)"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon"
            />
            {showSuggestions && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-surface-raised shadow-lg">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setExerciseName(s);
                      setShowSuggestions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-secondary first:rounded-t-xl last:rounded-b-xl"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleAddExercise}
            disabled={!exerciseName.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-neon text-background disabled:opacity-30 transition-transform active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Exercise List */}
      <div className="space-y-4">
        {session.exercises.map((exercise) => (
          <div
            key={exercise.id}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{exercise.name}</h3>
              <button
                onClick={() => removeExercise(exercise.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Sets Table */}
            <div className="space-y-2">
              {exercise.sets.map((set, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-xl bg-surface-raised p-2"
                >
                  <span className="w-8 text-center text-xs font-bold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase text-muted-foreground">kg</label>
                      <input
                        type="number"
                        value={set.weight || ""}
                        onChange={(e) =>
                          updateSet(exercise.id, idx, "weight", Number(e.target.value))
                        }
                        className="w-full rounded-lg border border-border bg-background px-2 py-1 text-center text-sm text-foreground focus:border-neon focus:outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] uppercase text-muted-foreground">reps</label>
                      <input
                        type="number"
                        value={set.reps || ""}
                        onChange={(e) =>
                          updateSet(exercise.id, idx, "reps", Number(e.target.value))
                        }
                        className="w-full rounded-lg border border-border bg-background px-2 py-1 text-center text-sm text-foreground focus:border-neon focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      updateSet(exercise.id, idx, "completed", !set.completed)
                    }
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                      set.completed
                        ? "bg-neon text-background"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  {exercise.sets.length > 1 && (
                    <button
                      onClick={() => removeSet(exercise.id, idx)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => addSet(exercise.id)}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border py-2 text-sm text-muted-foreground hover:border-neon hover:text-neon transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Set
            </button>
          </div>
        ))}
      </div>

      {session.exercises.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center">
          <Play className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Add your first exercise above</p>
        </div>
      )}

      {/* Actions */}
      {session.exercises.length > 0 && (
        <div className="mt-6 flex gap-3">
          <button
            onClick={cancelWorkout}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3 text-sm font-semibold text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4" /> Discard
          </button>
          <button
            onClick={finishWorkout}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neon py-3 text-sm font-bold text-background neon-glow transition-transform active:scale-95"
          >
            <Save className="h-4 w-4" /> Finish
          </button>
        </div>
      )}
    </div>
  );
}
