import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Minus,
  Check,
  Trash2,
  X,
  Save,
  Play,
  Pause,
  Timer,
  Trophy,
  AlertCircle,
} from "lucide-react";
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
      { property: "og:title", content: "Workout — FIT FIESTA" },
      { property: "og:description", content: "Log your workout exercises, sets, reps, and weight." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkoutPage,
});

const SESSION_KEY = "fit-fiesta-active-session";
const TIMER_KEY = "fit-fiesta-active-timer";

type Phase = "idle" | "active" | "paused" | "summary";
interface TimerState {
  phase: Phase;
  accumulatedMs: number;
  runningSince: number | null;
}

const IDLE_TIMER: TimerState = { phase: "idle", accumulatedMs: 0, runningSince: null };

function elapsed(t: TimerState, now: number) {
  return t.accumulatedMs + (t.runningSince ? now - t.runningSince : 0);
}

function formatTime(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = h > 0 ? m.toString().padStart(2, "0") : m.toString();
  return `${h > 0 ? h + ":" : ""}${mm}:${s.toString().padStart(2, "0")}`;
}

function WorkoutPage() {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [timer, setTimer] = useState<TimerState>(IDLE_TIMER);
  const [now, setNow] = useState(Date.now());
  const [exerciseName, setExerciseName] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<WorkoutSession | null>(null);
  const [rest, setRest] = useState<{ endsAt: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Restore any in-progress workout
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      const savedTimer = localStorage.getItem(TIMER_KEY);
      if (saved) setSession(JSON.parse(saved));
      if (savedTimer) {
        const t = JSON.parse(savedTimer) as TimerState;
        setTimer(t.phase === "summary" ? IDLE_TIMER : t);
      } else if (saved) {
        // Older saved session without timer data: treat as paused
        setTimer({ phase: "paused", accumulatedMs: 0, runningSince: null });
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(TIMER_KEY);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (session && (timer.phase === "active" || timer.phase === "paused")) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
    }
  }, [session, timer, mounted]);

  useEffect(() => {
    if (timer.phase !== "active" && !rest) return;
    const i = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(i);
  }, [timer.phase, rest]);

  useEffect(() => {
    if (rest && now >= rest.endsAt) setRest(null);
  }, [now, rest]);

  const startWorkout = () => {
    const t = Date.now();
    setSession(createWorkoutSession("Workout"));
    setTimer({ phase: "active", accumulatedMs: 0, runningSince: t });
    setNow(t);
    setSummary(null);
    setError(null);
  };

  const pause = () => {
    const t = Date.now();
    setTimer((prev) => ({ phase: "paused", accumulatedMs: elapsed(prev, t), runningSince: null }));
  };
  const resume = () => {
    const t = Date.now();
    setTimer((prev) => ({ ...prev, phase: "active", runningSince: t }));
    setNow(t);
  };

  const clearActive = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TIMER_KEY);
  };

  const cancelWorkout = () => {
    if (!confirm("Discard this workout? Nothing will be saved.")) return;
    clearActive();
    setSession(null);
    setTimer(IDLE_TIMER);
    setRest(null);
    setError(null);
  };

  const finishWorkout = () => {
    if (!session) return;
    const doneSets = session.exercises.reduce(
      (n, ex) => n + ex.sets.filter((s) => s.completed).length,
      0,
    );
    if (doneSets === 0) {
      setError("Tick at least one set as done before finishing.");
      return;
    }
    const totalMs = elapsed(timer, Date.now());
    const finished: WorkoutSession = {
      ...session,
      // Keep only sets the user actually completed
      exercises: session.exercises
        .map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.completed) }))
        .filter((ex) => ex.sets.length > 0),
      completed: true,
      durationMinutes: Math.max(1, Math.round(totalMs / 60000)),
    };
    try {
      saveWorkout(finished);
    } catch {
      setError("Couldn't save your workout. Your browser storage may be full.");
      return;
    }
    clearActive();
    setSummary(finished);
    setSession(null);
    setTimer({ phase: "summary", accumulatedMs: totalMs, runningSince: null });
    setRest(null);
    setError(null);
  };

  const handleAddExercise = useCallback(() => {
    if (!exerciseName.trim() || !session) return;
    const newExercise: WorkoutExercise = {
      id: Math.random().toString(36).substring(2, 10),
      name: exerciseName.trim(),
      sets: [{ reps: 0, weight: 0, completed: false }],
    };
    setSession({ ...session, exercises: [...session.exercises, newExercise] });
    setExerciseName("");
    setSuggestions([]);
    setError(null);
  }, [exerciseName, session]);

  const handleInputChange = (value: string) => {
    setExerciseName(value);
    if (value.trim()) {
      setSuggestions(
        getExerciseNames()
          .filter((n) => n.toLowerCase().includes(value.toLowerCase()))
          .slice(0, 5),
      );
    } else setSuggestions([]);
  };

  const mapExercise = (id: string, fn: (ex: WorkoutExercise) => WorkoutExercise) => {
    if (!session) return;
    setSession({ ...session, exercises: session.exercises.map((ex) => (ex.id === id ? fn(ex) : ex)) });
  };

  const updateSet = (id: string, idx: number, field: keyof ExerciseSet, value: number | boolean) => {
    mapExercise(id, (ex) => ({
      ...ex,
      sets: ex.sets.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }));
  };

  const toggleSet = (id: string, idx: number, set: ExerciseSet) => {
    if (!set.completed && set.reps <= 0) {
      setError("Enter reps for this set before ticking it done.");
      return;
    }
    setError(null);
    updateSet(id, idx, "completed", !set.completed);
    if (!set.completed) setRest({ endsAt: Date.now() + 90_000 });
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon border-t-transparent" />
      </div>
    );
  }

  // ----- Summary -----
  if (timer.phase === "summary" && summary) {
    const sets = summary.exercises.reduce((n, e) => n + e.sets.length, 0);
    const volume = summary.exercises.reduce(
      (v, e) => v + e.sets.reduce((a, s) => a + s.reps * s.weight, 0),
      0,
    );
    return (
      <div className="px-4 pt-10 pb-4 text-center">
        <Trophy className="mx-auto mb-4 h-14 w-14 text-neon" />
        <h1 className="font-display text-3xl text-neon neon-text-glow">WORKOUT SAVED</h1>
        <p className="mt-1 text-sm text-muted-foreground">Great work — it's in your history.</p>
        <div className="my-6 grid grid-cols-3 gap-3">
          <SummaryStat label="Time" value={formatTime(Math.floor(timer.accumulatedMs / 1000))} />
          <SummaryStat label="Sets" value={sets.toString()} />
          <SummaryStat label="Volume kg" value={volume.toLocaleString()} />
        </div>
        <ul className="mb-6 space-y-2 text-left">
          {summary.exercises.map((e) => (
            <li key={e.id} className="flex justify-between rounded-xl bg-surface p-3 border border-border text-sm">
              <span className="font-semibold text-foreground">{e.name}</span>
              <span className="text-muted-foreground">{e.sets.length} sets</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-3">
          <Link
            to="/history"
            className="flex-1 rounded-xl border border-border bg-surface py-3 text-sm font-semibold text-foreground"
          >
            View history
          </Link>
          <button
            onClick={() => {
              setTimer(IDLE_TIMER);
              setSummary(null);
            }}
            className="flex-1 rounded-xl bg-neon py-3 text-sm font-bold text-background"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ----- Idle: explicit start -----
  if (timer.phase === "idle" || !session) {
    return (
      <div className="px-4 pt-10 pb-4 text-center">
        <h1 className="font-display text-3xl tracking-tight text-neon neon-text-glow">WORKOUT</h1>
        <p className="mt-1 mb-10 text-sm text-muted-foreground">Ready when you are.</p>
        <button
          onClick={startWorkout}
          className="mx-auto flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-full bg-neon text-background neon-glow transition-transform active:scale-95"
        >
          <Play className="h-12 w-12" />
          <span className="text-lg font-bold">START</span>
        </button>
        <p className="mt-8 text-xs text-muted-foreground">
          The timer starts as soon as you tap Start. You can pause anytime.
        </p>
      </div>
    );
  }

  const secs = Math.floor(elapsed(timer, now) / 1000);
  const restLeft = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header + controls */}
      <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {timer.phase === "paused" ? "Paused" : "In progress"}
            </p>
            <p
              className={`font-display text-4xl tabular-nums ${timer.phase === "paused" ? "text-muted-foreground" : "text-neon"}`}
              aria-live="polite"
            >
              {formatTime(secs)}
            </p>
          </div>
          {timer.phase === "active" ? (
            <button
              onClick={pause}
              className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-foreground"
            >
              <Pause className="h-4 w-4" /> Pause
            </button>
          ) : (
            <button
              onClick={resume}
              className="flex items-center gap-2 rounded-xl bg-neon px-4 py-3 text-sm font-bold text-background"
            >
              <Play className="h-4 w-4" /> Resume
            </button>
          )}
        </div>
        {rest && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-violet-bright/15 px-3 py-2 text-sm">
            <span className="flex items-center gap-2 text-violet-bright">
              <Timer className="h-4 w-4" /> Rest {formatTime(restLeft)}
            </span>
            <button onClick={() => setRest(null)} className="text-xs text-muted-foreground hover:text-foreground">
              Skip
            </button>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Add Exercise */}
      <div className="relative mb-6 flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={exerciseName}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddExercise()}
            placeholder="Add exercise (e.g. Bench Press)"
            aria-label="Exercise name"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-surface-raised shadow-lg">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setExerciseName(s);
                    setSuggestions([]);
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
          aria-label="Add exercise"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-neon text-background disabled:opacity-30 transition-transform active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        {session.exercises.map((exercise) => (
          <div key={exercise.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{exercise.name}</h3>
              <button
                onClick={() =>
                  setSession({ ...session, exercises: session.exercises.filter((e) => e.id !== exercise.id) })
                }
                aria-label={`Remove ${exercise.name}`}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {exercise.sets.map((set, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-xl bg-surface-raised p-2">
                  <span className="w-6 text-center text-xs font-bold text-muted-foreground">{idx + 1}</span>
                  <div className="flex flex-1 items-center gap-2">
                    <label className="flex-1">
                      <span className="text-[10px] uppercase text-muted-foreground">kg</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={set.weight || ""}
                        onChange={(e) => updateSet(exercise.id, idx, "weight", Math.max(0, Number(e.target.value)))}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1 text-center text-sm text-foreground focus:border-neon focus:outline-none"
                      />
                    </label>
                    <label className="flex-1">
                      <span className="text-[10px] uppercase text-muted-foreground">reps</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={set.reps || ""}
                        onChange={(e) => updateSet(exercise.id, idx, "reps", Math.max(0, Number(e.target.value)))}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1 text-center text-sm text-foreground focus:border-neon focus:outline-none"
                      />
                    </label>
                  </div>
                  <button
                    onClick={() => toggleSet(exercise.id, idx, set)}
                    aria-label={set.completed ? "Mark set not done" : "Mark set done"}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                      set.completed ? "bg-neon text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  {exercise.sets.length > 1 && (
                    <button
                      onClick={() =>
                        mapExercise(exercise.id, (ex) => ({ ...ex, sets: ex.sets.filter((_, i) => i !== idx) }))
                      }
                      aria-label="Remove set"
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() =>
                mapExercise(exercise.id, (ex) => {
                  const last = ex.sets[ex.sets.length - 1];
                  return {
                    ...ex,
                    sets: [...ex.sets, { reps: last?.reps ?? 0, weight: last?.weight ?? 0, completed: false }],
                  };
                })
              }
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border py-2 text-sm text-muted-foreground hover:border-neon hover:text-neon transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Set
            </button>
          </div>
        ))}
      </div>

      {session.exercises.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Add your first exercise above to start logging sets.</p>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={cancelWorkout}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3 text-sm font-semibold text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-4 w-4" /> Cancel
        </button>
        <button
          onClick={finishWorkout}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neon py-3 text-sm font-bold text-background neon-glow transition-transform active:scale-95"
        >
          <Save className="h-4 w-4" /> Finish
        </button>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3 border border-border">
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
