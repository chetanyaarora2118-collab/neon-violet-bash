import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { TrendingUp, Calendar, Target, Award } from "lucide-react";
import { getAllWorkouts, getTotalStats } from "@/lib/workout-storage";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Stats — FIT FIESTA" },
      { name: "description", content: "Track your fitness progress and personal records." },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = useMemo(() => {
    const workouts = getAllWorkouts().filter((w) => w.completed);
    const { totalWorkouts, totalVolume, totalSets } = getTotalStats();

    const exerciseVolumes: Record<string, number> = {};
    const exerciseBestWeight: Record<string, number> = {};
    let currentStreak = 0;
    let maxStreak = 0;

    const sorted = [...workouts].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let streak = 0;
    let lastDate: Date | null = null;
    for (const w of sorted) {
      const d = new Date(w.date);
      d.setHours(0, 0, 0, 0);
      if (lastDate) {
        const diff = (d.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          streak++;
        } else if (diff > 1) {
          maxStreak = Math.max(maxStreak, streak);
          streak = 1;
        }
      } else {
        streak = 1;
      }
      lastDate = d;

      for (const ex of w.exercises) {
        if (!exerciseVolumes[ex.name]) exerciseVolumes[ex.name] = 0;
        for (const s of ex.sets) {
          if (s.completed) {
            exerciseVolumes[ex.name] += s.reps * s.weight;
            if (!exerciseBestWeight[ex.name] || s.weight > exerciseBestWeight[ex.name]) {
              exerciseBestWeight[ex.name] = s.weight;
            }
          }
        }
      }
    }
    maxStreak = Math.max(maxStreak, streak);

    // Calculate current streak from today backward
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateMap = new Set<string>();
    for (const w of workouts) {
      const d = new Date(w.date);
      d.setHours(0, 0, 0, 0);
      dateMap.add(d.toISOString());
    }
    let checkDate = new Date(today);
    while (dateMap.has(checkDate.toISOString())) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    if (currentStreak === 0) {
      // Check if yesterday was the last workout
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (dateMap.has(yesterday.toISOString())) {
        currentStreak = 1;
        checkDate = new Date(yesterday);
        checkDate.setDate(checkDate.getDate() - 1);
        while (dateMap.has(checkDate.toISOString())) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }
    }

    const topExercises = Object.entries(exerciseVolumes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const weeklyData = getWeeklyVolume(workouts);

    return {
      totalWorkouts,
      totalVolume,
      totalSets,
      currentStreak,
      maxStreak,
      topExercises,
      exerciseBestWeight,
      weeklyData,
    };
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon border-t-transparent" />
      </div>
    );
  }

  const maxWeekly = Math.max(...stats.weeklyData.map((d) => d.volume), 1);

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight text-primary">
          STATS
        </h1>
        <p className="text-sm text-muted-foreground">Your progress at a glance</p>
      </div>

      {/* Big Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <BigStatCard
          icon={<Target className="h-5 w-5 text-neon" />}
          value={stats.totalWorkouts}
          label="Total Workouts"
        />
        <BigStatCard
          icon={<Award className="h-5 w-5 text-violet-bright" />}
          value={stats.currentStreak}
          label="Day Streak"
        />
        <BigStatCard
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          value={
            stats.totalVolume >= 1000000
              ? `${(stats.totalVolume / 1000000).toFixed(1)}M`
              : stats.totalVolume >= 1000
                ? `${(stats.totalVolume / 1000).toFixed(1)}K`
                : stats.totalVolume
          }
          label="Total Volume (kg)"
        />
        <BigStatCard
          icon={<Calendar className="h-5 w-5 text-neon-muted" />}
          value={stats.maxStreak}
          label="Best Streak"
        />
      </div>

      {/* Weekly Volume Chart */}
      <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-4 text-sm font-bold text-foreground">Weekly Volume</h2>
        <div className="flex items-end gap-2 h-32">
          {stats.weeklyData.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-neon/60 transition-all"
                style={{ height: `${(d.volume / maxWeekly) * 100}%` }}
              />
              <span className="text-[10px] text-muted-foreground">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Exercises */}
      {stats.topExercises.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-4 text-sm font-bold text-foreground">Top Exercises</h2>
          <div className="space-y-3">
            {stats.topExercises.map(([name, volume]) => {
              const maxVol = stats.topExercises[0][1];
              const pct = (volume / maxVol) * 100;
              return (
                <div key={name}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{name}</span>
                    <span className="text-xs text-muted-foreground">
                      {volume >= 1000 ? `${(volume / 1000).toFixed(1)}K` : volume} kg
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                    <div
                      className="h-full rounded-full bg-violet-bright transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {stats.exerciseBestWeight[name] && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Best: {stats.exerciseBestWeight[name]} kg
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats.topExercises.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <TrendingUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Complete some workouts to see your stats!
          </p>
        </div>
      )}
    </div>
  );
}

function BigStatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-surface p-4 border border-border">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function getWeeklyVolume(workouts: ReturnType<typeof getAllWorkouts>) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const result = days.map((day) => ({ day, volume: 0 }));

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
