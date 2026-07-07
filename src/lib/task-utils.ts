import type { Task, Priority } from "./task-types";

export function isToday(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso + "T00:00:00");
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function isOverdue(task: Task): boolean {
  if (task.status === "completed" || !task.dueDate) return false;
  const d = new Date(task.dueDate + "T23:59:59");
  return d.getTime() < Date.now();
}

const PRIORITY_WEIGHT: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

export function sortTasks(tasks: Task[], sortBy: "dueDate" | "priority"): Task[] {
  const arr = [...tasks];
  if (sortBy === "priority") {
    arr.sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
  } else {
    arr.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }
  return arr;
}

export function formatDate(iso: string): string {
  if (!iso) return "No due date";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function offsetIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}