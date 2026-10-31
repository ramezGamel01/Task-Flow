// Calendar dates as "YYYY-MM-DD" strings in local time, so a task due "today" never
// slides to yesterday or tomorrow because of a time zone.

const pad = (n) => String(n).padStart(2, "0");

export function toIso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseIso(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayIso(now = new Date()) {
  return toIso(now);
}

export function addDays(iso, days) {
  const date = parseIso(iso);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

// Whole days from a to b (positive when b is later)
export function diffDays(a, b) {
  return Math.round((parseIso(b) - parseIso(a)) / 86400000);
}

export function nowTime(now = new Date()) {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function isOverdue(task, today = todayIso()) {
  return task.status !== "done" && Boolean(task.due) && task.due < today;
}

// Which part of the plan a task belongs to
export function bucketOf(task, today = todayIso()) {
  if (task.status === "done") return "done";
  if (!task.due) return "someday";
  if (task.due < today) return "overdue";
  if (task.due === today) return "today";
  const days = diffDays(today, task.due);
  if (days === 1) return "tomorrow";
  if (days <= 7) return "week";
  return "later";
}

export const BUCKETS = ["overdue", "today", "tomorrow", "week", "later", "someday", "done"];

// The 6 × 7 grid of dates shown for a month, starting on the given weekday (0 = Sunday)
export function monthGrid(year, month, weekStart = 1) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - weekStart + 7) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => toIso(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
}

// The seven weekday indexes in display order
export function weekOrder(weekStart = 1) {
  return Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);
}

export function lastDays(count, today = todayIso()) {
  return Array.from({ length: count }, (_, i) => addDays(today, i - count + 1));
}
