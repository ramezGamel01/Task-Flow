import { describe, expect, it } from "vitest";
import { compareTasks, createTask, LEGACY_KEY, loadTasks, migrateV1, normalizeTask, saveTasks, STORAGE_KEY, tasksReducer } from "./tasks.js";
import { demoTasks } from "../data/seed.js";
import { bucketOf, monthGrid } from "../lib/dates.js";
import { completionsByDay, onTimeRate, streak, weekCompare } from "../lib/insights.js";

const NOW = "2026-10-31T09:00:00.000Z";
const memoryStore = (data = {}) => ({
  data,
  getJSON(key, fallback) {
    return key in this.data ? JSON.parse(this.data[key]) : fallback;
  },
  setJSON(key, value) {
    this.data[key] = JSON.stringify(value);
  },
});

describe("tasks", () => {
  it("fills in defaults and rejects bad values", () => {
    const t = normalizeTask({ title: "  Plan  ", priority: "urgent", due: "tomorrow", time: "25:00", status: "done" }, NOW);
    expect(t).toMatchObject({ title: "Plan", priority: "medium", due: null, time: null, status: "done", completedAt: NOW, category: "other" });
  });

  it("migrates the first version's saved tasks", () => {
    const old = [
      { id: "a", title: "Old", description: "notes", dueDate: "2026-11-02", priority: "high", category: "work", status: "in-progress", createdAt: NOW },
      { id: "b", title: "Done", description: "", dueDate: "", priority: "low", category: "study", status: "completed", createdAt: NOW },
    ];
    const [a, b] = migrateV1(old, NOW);
    expect(a).toMatchObject({ id: "a", notes: "notes", due: "2026-11-02", status: "doing" });
    expect(b).toMatchObject({ due: null, status: "done", completedAt: NOW });
  });

  it("loads the new format first, then the old one, else nothing", () => {
    expect(loadTasks(memoryStore())).toBeNull();
    const legacy = memoryStore({ [LEGACY_KEY]: JSON.stringify([{ id: "x", title: "From v1", status: "pending" }]) });
    expect(loadTasks(legacy)[0]).toMatchObject({ id: "x", status: "todo" });
    const store = memoryStore();
    saveTasks(store, [createTask({ title: "New" })]);
    expect(JSON.parse(store.data[STORAGE_KEY]).version).toBe(2);
    expect(loadTasks(store)[0].title).toBe("New");
  });

  it("completes and reopens a task, stamping when it was done", () => {
    let list = tasksReducer([], { type: "add", task: { title: "Write" }, now: NOW });
    const id = list[0].id;
    list = tasksReducer(list, { type: "toggle", id, now: NOW });
    expect(list[0]).toMatchObject({ status: "done", completedAt: NOW });
    list = tasksReducer(list, { type: "toggle", id, now: NOW });
    expect(list[0]).toMatchObject({ status: "todo", completedAt: null });
  });

  it("moves a task between board columns and keeps each column in order", () => {
    let list = ["A", "B", "C"].map((title, i) => normalizeTask({ id: title, title, status: "todo", order: i }));
    list.push(normalizeTask({ id: "D", title: "D", status: "doing", order: 0 }));
    list = tasksReducer(list, { type: "move", id: "C", status: "doing", index: 0, now: NOW });
    const column = (s) => list.filter((t) => t.status === s).sort((a, b) => a.order - b.order).map((t) => t.id);
    expect(column("doing")).toEqual(["C", "D"]);
    expect(column("todo")).toEqual(["A", "B"]);
    list = tasksReducer(list, { type: "move", id: "A", status: "todo", index: 1, now: NOW });
    expect(column("todo")).toEqual(["B", "A"]);
  });

  it("puts a deleted task back where it was", () => {
    const list = ["A", "B", "C"].map((title) => normalizeTask({ id: title, title }));
    const removed = tasksReducer(list, { type: "remove", id: "B" });
    expect(tasksReducer(removed, { type: "restore", task: list[1], index: 1 }).map((t) => t.id)).toEqual(["A", "B", "C"]);
  });

  it("handles subtasks", () => {
    let list = [normalizeTask({ id: "A", title: "A" })];
    list = tasksReducer(list, { type: "addSubtask", id: "A", title: "Step" });
    const sub = list[0].subtasks[0];
    list = tasksReducer(list, { type: "toggleSubtask", id: "A", subId: sub.id });
    expect(list[0].subtasks[0].done).toBe(true);
    list = tasksReducer(list, { type: "removeSubtask", id: "A", subId: sub.id });
    expect(list[0].subtasks).toEqual([]);
  });

  it("sorts by date, then time, then priority", () => {
    const list = [
      normalizeTask({ id: "late", title: "x", due: "2026-11-02" }),
      normalizeTask({ id: "none", title: "x" }),
      normalizeTask({ id: "noon", title: "x", due: "2026-11-01", time: "12:00" }),
      normalizeTask({ id: "early", title: "x", due: "2026-11-01", time: "08:00" }),
    ];
    expect(list.sort(compareTasks("due")).map((t) => t.id)).toEqual(["early", "noon", "late", "none"]);
  });
});

describe("dates and insights", () => {
  const today = "2026-10-31";

  it("sorts tasks into the parts of the plan", () => {
    const t = (due, status = "todo") => normalizeTask({ title: "x", due, status });
    expect(bucketOf(t("2026-10-29"), today)).toBe("overdue");
    expect(bucketOf(t(today), today)).toBe("today");
    expect(bucketOf(t("2026-11-01"), today)).toBe("tomorrow");
    expect(bucketOf(t("2026-11-05"), today)).toBe("week");
    expect(bucketOf(t("2026-12-01"), today)).toBe("later");
    expect(bucketOf(t(null), today)).toBe("someday");
    expect(bucketOf(t("2026-10-01", "done"), today)).toBe("done");
  });

  it("lays out a month starting on the chosen weekday", () => {
    const grid = monthGrid(2026, 10, 6); // November 2026, weeks starting Saturday
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-10-31");
    expect(grid[1]).toBe("2026-11-01");
  });

  it("works out the demo's streak, weekly totals and on-time rate", () => {
    const now = new Date(2026, 9, 31, 12);
    const tasks = demoTasks("en", today, now);
    expect(streak(tasks, today)).toBe(7);
    const days = completionsByDay(tasks, 14, today);
    expect(days).toHaveLength(14);
    expect(days.at(-1)).toEqual({ day: today, count: 2 });
    expect(weekCompare(tasks, today).current).toBe(10);
    expect(onTimeRate(tasks)).toBe(1);
  });

  it("writes the demo in Arabic when the visitor reads Arabic", () => {
    const tasks = demoTasks("ar", today, new Date(2026, 9, 31, 12));
    expect(tasks[0].title).toMatch(/[؀-ۿ]/);
  });
});
