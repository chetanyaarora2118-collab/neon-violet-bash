import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Trash2, Calendar, Clock, Dumbbell } from "lucide-react";
import { getAllWorkouts, deleteWorkout, type WorkoutSession } from "@/lib/workout-storage";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — FIT FIESTA" },
      { name: "description", content: "View your past workouts and training history." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setWorkouts(getAllWorkouts().reverse());
  }, []);

  const handleDelete = (id: string) => {
    if (!confirm("Delete this workout?")) return;
    deleteWorkout(id);
    setWorkouts(getAllWorkouts().reverse());
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight text-violet-bright">
          HISTORY
        </h1>
        <p className="text-sm text-muted-foreground">Your training log</p>
      </div>

      {workouts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Dumbbell className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No workouts logged yet.</p>
          <p className="text-sm text-muted-foreground">Start your first workout to see it here!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workouts.map((w) => {
            let totalVolume = 0;
            let totalSets = 0;
            for (const ex of w.exercises) {
              for (const s of ex.sets) {
                if (s.completed) {
                  totalVolume += s.reps * s.weight;
                  totalSets++;
                }
              }
            }
            const date = new Date(w.date);
            return (
              <div
                key={w.id}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-foreground">{w.name}</h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {date.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {w.durationMinutes > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {w.durationMinutes} min
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mb-3 flex gap-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Volume</span>
                    <p className="font-bold text-neon">
                      {totalVolume >= 1000
                        ? `${(totalVolume / 1000).toFixed(1)}K`
                        : totalVolume}{" "}
                      kg
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Sets</span>
                    <p className="font-bold text-violet-bright">{totalSets}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Exercises</span>
                    <p className="font-bold text-foreground">{w.exercises.length}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {w.exercises.map((ex) => (
                    <div
                      key={ex.id}
                      className="flex items-center justify-between rounded-lg bg-surface-raised px-3 py-2"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {ex.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {ex.sets.filter((s) => s.completed).length}/{ex.sets.length} sets
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
