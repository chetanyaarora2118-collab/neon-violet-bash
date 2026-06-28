import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Dumbbell,
  Hand,
  Activity,
  Shield,
  Mountain,
  Footprints,
  Coffee,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule · FIT FIESTA" },
      { name: "description", content: "Weekly workout split and training calendar." },
    ],
  }),
  component: Schedule,
});

const split = [
  { day: "DAY 1", muscle: "CHEST", icon: Shield, color: "neon" },
  { day: "DAY 2", muscle: "ARMS", icon: Hand, color: "violet" },
  { day: "DAY 3", muscle: "ABS", icon: Activity, color: "neon" },
  { day: "DAY 4", muscle: "BACK", icon: Mountain, color: "violet" },
  { day: "DAY 5", muscle: "SHOULDERS", icon: Dumbbell, color: "neon" },
  { day: "DAY 6", muscle: "LEGS", icon: Footprints, color: "violet" },
  { day: "DAY 7", muscle: "REST", icon: Coffee, color: "muted" },
] as const;

// Monday = index 0 for the split rotation
function splitForDate(date: Date) {
  const dow = date.getDay(); // 0=Sun..6=Sat
  const idx = (dow + 6) % 7; // Mon=0..Sun=6
  return split[idx];
}

function Schedule() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7; // start week on Monday
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const colorClass = (c: string) =>
    c === "neon"
      ? "bg-neon/15 text-neon border-neon/30"
      : c === "violet"
      ? "bg-violet-bright/15 text-violet-bright border-violet-bright/30"
      : "bg-muted/30 text-muted-foreground border-border";

  return (
    <div className="px-4 pt-8 pb-4">
      <header className="mb-6 text-center">
        <h1 className="font-display text-3xl tracking-tight text-neon neon-text-glow">
          SCHEDULE
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Your 6-day split. Stay consistent.</p>
      </header>

      {/* Split cards */}
      <section className="mb-8 space-y-3">
        {split.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.day}
              className={`flex items-center gap-4 rounded-2xl border p-4 ${colorClass(s.color)}`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/40">
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold opacity-70">{s.day}</p>
                <p className="font-display text-xl tracking-wide">{s.muscle}</p>
              </div>
              <Link
                to="/workout"
                className="rounded-lg border border-current/40 px-3 py-1.5 text-xs font-bold uppercase hover:bg-background/20"
              >
                Log
              </Link>
            </div>
          );
        })}
      </section>

      {/* Calendar */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="rounded-lg p-2 text-foreground hover:bg-secondary"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="font-display text-lg text-foreground">{monthLabel}</p>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="rounded-lg p-2 text-foreground hover:bg-secondary"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-muted-foreground">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((date, i) => {
            if (!date) return <div key={i} className="aspect-square" />;
            const s = splitForDate(date);
            const isToday = isSameDay(date, today);
            return (
              <div
                key={i}
                className={`aspect-square rounded-lg border p-1 flex flex-col items-center justify-between text-[9px] ${colorClass(
                  s.color,
                )} ${isToday ? "ring-2 ring-neon" : ""}`}
              >
                <span className="self-start text-[10px] font-bold opacity-80">
                  {date.getDate()}
                </span>
                <span className="font-display tracking-tight leading-tight text-center">
                  {s.muscle}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-neon" /> Push days</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-bright" /> Pull/Legs</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground" /> Rest</span>
        </div>
      </section>
    </div>
  );
}