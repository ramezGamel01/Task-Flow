import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  ListTodo,
  CheckCircle2,
  Clock,
  Flame,
  Sun,
  Plus,
  ArrowRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StatsCard } from "@/components/stats-card";
import { TaskCard } from "@/components/task-card";
import { EmptyState } from "@/components/empty-state";
import { TaskForm } from "@/components/task-form";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { useTasks } from "@/lib/tasks-context";
import { isToday, sortTasks } from "@/lib/task-utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · TaskFlow" },
      { name: "description", content: "Your task overview at a glance." },
    ],
  }),
  component: Index,
});

function Index() {
  const { tasks } = useTasks();

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const pending = tasks.filter((t) => t.status !== "completed").length;
    const high = tasks.filter((t) => t.priority === "high" && t.status !== "completed").length;
    const today = tasks.filter((t) => isToday(t.dueDate)).length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, pending, high, today, pct };
  }, [tasks]);

  const todaysTasks = useMemo(
    () => sortTasks(tasks.filter((t) => isToday(t.dueDate)), "priority").slice(0, 4),
    [tasks],
  );

  // The greeting depends on the visitor's clock, so it is set after hydration
  // to keep the server and client markup identical.
  const [greeting, setGreeting] = useState("Welcome back");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Hero */}
      <Card
        className="relative overflow-hidden rounded-3xl border-0 p-6 text-white sm:p-8"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
      >
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium uppercase tracking-wider text-white/70">
              {greeting}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              You have {stats.pending} task{stats.pending === 1 ? "" : "s"} in flight
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              {stats.today > 0
                ? `${stats.today} due today. Keep the momentum going.`
                : "Nothing due today — a perfect time to plan ahead."}
            </p>
          </div>
          <div className="w-full max-w-sm space-y-2 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/80">Overall progress</span>
              <span className="font-semibold">{stats.pct}%</span>
            </div>
            <Progress value={stats.pct} className="h-2 bg-white/20" />
            <div className="flex items-center justify-between text-xs text-white/70">
              <span>{stats.completed} completed</span>
              <span>{stats.total} total</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard label="Total tasks" value={stats.total} icon={ListTodo} accent="primary" />
        <StatsCard label="Completed" value={stats.completed} icon={CheckCircle2} accent="success" />
        <StatsCard label="Pending" value={stats.pending} icon={Clock} accent="warning" />
        <StatsCard label="High priority" value={stats.high} icon={Flame} accent="danger" />
        <StatsCard label="Today" value={stats.today} icon={Sun} accent="muted" />
      </div>

      {/* Today's focus */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Today's focus</h2>
            <p className="text-sm text-muted-foreground">Top priority items due today.</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link to="/today">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {todaysTasks.length === 0 ? (
          <EmptyState
            title="Nothing on today"
            description="Nothing scheduled for today — enjoy the calm or plan tomorrow."
            action={
              <TaskForm
                trigger={
                  <Button className="gap-1.5">
                    <Plus className="h-4 w-4" /> New task
                  </Button>
                }
              />
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {todaysTasks.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
