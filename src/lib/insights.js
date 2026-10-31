// Numbers for the Insights page, worked out from the task list.
import { addDays, lastDays, parseIso, todayIso, toIso } from "./dates.js";
import { CATEGORIES } from "../state/tasks.js";

const dayOf = (isoTime) => toIso(new Date(isoTime));

export function completionsByDay(tasks, days = 14, today = todayIso()) {
  const counts = new Map(lastDays(days, today).map((d) => [d, 0]));
  for (const t of tasks) {
    if (t.status !== "done" || !t.completedAt) continue;
    const d = dayOf(t.completedAt);
    if (counts.has(d)) counts.set(d, counts.get(d) + 1);
  }
  return [...counts].map(([day, count]) => ({ day, count }));
}

// Days in a row with at least one task finished, counting back from today
// (or from yesterday, so the streak doesn't look broken first thing in the morning)
export function streak(tasks, today = todayIso()) {
  const done = new Set(tasks.filter((t) => t.status === "done" && t.completedAt).map((t) => dayOf(t.completedAt)));
  let day = done.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (done.has(day)) {
    count += 1;
    day = addDays(day, -1);
  }
  return count;
}

export function weekCompare(tasks, today = todayIso()) {
  const byDay = completionsByDay(tasks, 14, today);
  const last = byDay.slice(0, 7).reduce((s, d) => s + d.count, 0);
  const current = byDay.slice(7).reduce((s, d) => s + d.count, 0);
  return { current, last, delta: current - last };
}

// Share of finished tasks that were done on or before their due date
export function onTimeRate(tasks) {
  const dated = tasks.filter((t) => t.status === "done" && t.due && t.completedAt);
  if (!dated.length) return null;
  const onTime = dated.filter((t) => dayOf(t.completedAt) <= t.due).length;
  return onTime / dated.length;
}

export function byCategory(tasks) {
  return CATEGORIES.map((category) => {
    const list = tasks.filter((t) => t.category === category);
    return { category, open: list.filter((t) => t.status !== "done").length, done: list.filter((t) => t.status === "done").length };
  }).filter((c) => c.open + c.done > 0);
}

export function focusTotal(tasks) {
  return tasks.reduce((sum, t) => sum + t.focus, 0);
}

// The weekday (0 = Sunday) with the most finished tasks
export function busiestWeekday(tasks) {
  const counts = Array(7).fill(0);
  for (const t of tasks) if (t.status === "done" && t.completedAt) counts[parseIso(dayOf(t.completedAt)).getDay()] += 1;
  const max = Math.max(...counts);
  return max ? counts.indexOf(max) : null;
}
