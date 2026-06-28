import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Dumbbell, Flame, Trophy, Zap, ArrowRight } from "lucide-react";
import { getTotalStats, getAllWorkouts } from "@/lib/workout-storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FIT FIESTA" },
      { name: "description", content: "Your personal workout dashboard. Track lifts, hit PRs, stay consistent." },
    ],
  }),
  component: Index,
});

function Index() {
  const [stats, setStats] = useState({ totalWorkouts: 0, totalVolume: 0, totalSets: 0 });
  const [recentWorkouts, setRecentWorkouts] = useState<ReturnType<typeof getAllWorkouts>>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStats(getTotalStats());
    setRecentWorkouts(getAllWorkouts().slice(-3).reverse());
  }, []);

  const formatVolume = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return v.toString();
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-8 pb-4">
      {/* Hero */}
      <div className="mb-8 text-center">
        <h1 className="font-display text-5xl tracking-tight text-neon neon-text-glow">
          FIT FIESTA
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Unleash your potential. Track every rep.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard
          icon={<Flame className="h-5 w-5 text-neon" />}
          value={stats.totalWorkouts.toString()}
          label="Workouts"
        />
        <StatCard
          icon={<Zap className="h-5 w-5 text-violet-bright" />}
          value={formatVolume(stats.totalVolume)}
          label="Volume"
        />
        <StatCard
          icon={<Trophy className="h-5 w-5 text-primary" />}
          value={stats.totalSets.toString()}
          label="Sets"
        />
      </div>

      {/* Start Workout CTA */}
      <Link
        to="/workout"
        className="mb-8 flex items-center justify-between rounded-2xl bg-gradient-to-r from-neon/20 to-violet-bright/20 p-5 border border-neon/20 neon-glow transition-transform hover:scale-[1.02]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neon/20">
            <Dumbbell className="h-6 w-6 text-neon" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">Start Workout</p>
            <p className="text-sm text-muted-foreground">Log your lifts, crush your goals</p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-neon" />
      </Link>

      {/* Recent Workouts */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Recent</h2>
          <Link to="/history" className="text-sm text-neon hover:underline">
            View all
          </Link>
        </div>
        {recentWorkouts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <Dumbbell className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No workouts yet.</p>
            <p className="text-sm text-muted-foreground">Tap Start Workout to begin!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentWorkouts.map((w) => (
              <div
                key={w.id}
                className="rounded-xl bg-surface p-4 border border-border"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{w.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(w.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                      {" · "}
                      {w.exercises.length} exercises
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-neon">
                      {w.completed ? "Done" : "In Progress"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-surface p-4 text-center border border-border">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
        {icon}
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
