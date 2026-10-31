// The task list as plain data: how tasks are made, changed, saved and loaded.
// Everything here is a pure function, so it is easy to test and the React layer stays thin.

export const STATUSES = ["todo", "doing", "done"];
export const PRIORITIES = ["high", "medium", "low"];
export const CATEGORIES = ["work", "personal", "study", "fitness", "shopping", "other"];

export const STORAGE_KEY = "taskflow:v2";
// Where the first version of TaskFlow kept its tasks
export const LEGACY_KEY = "taskflow:tasks:v1";

const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 };

let counter = 0;
export function makeId(prefix = "t") {
  counter = (counter + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const isIsoDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTime = (v) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

// Turns anything task-shaped (an import, an old save) into a valid task
export function normalizeTask(raw, now = new Date().toISOString()) {
  const status = pick(raw.status, STATUSES, "todo");
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : makeId(),
    title: String(raw.title ?? "").trim().slice(0, 200) || "Untitled",
    notes: String(raw.notes ?? "").slice(0, 4000),
    due: isIsoDate(raw.due) ? raw.due : null,
    time: isTime(raw.time) ? raw.time : null,
    priority: pick(raw.priority, PRIORITIES, "medium"),
    category: pick(raw.category, CATEGORIES, "other"),
    status,
    subtasks: Array.isArray(raw.subtasks)
      ? raw.subtasks
          .filter((s) => s && String(s.title ?? "").trim())
          .map((s) => ({ id: typeof s.id === "string" ? s.id : makeId("s"), title: String(s.title).trim().slice(0, 200), done: Boolean(s.done) }))
      : [],
    order: Number.isFinite(raw.order) ? raw.order : 0,
    focus: Number.isFinite(raw.focus) && raw.focus > 0 ? Math.round(raw.focus) : 0,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
    completedAt: status === "done" ? (typeof raw.completedAt === "string" ? raw.completedAt : now) : null,
  };
}

export function createTask(input, tasks = [], now = new Date().toISOString()) {
  const status = pick(input.status, STATUSES, "todo");
  // New tasks go to the top of their board column
  const top = Math.min(0, ...tasks.filter((t) => t.status === status).map((t) => t.order));
  return normalizeTask({ ...input, id: makeId(), status, order: top - 1, createdAt: now }, now);
}

// The first TaskFlow stored { description, dueDate, status: pending | in-progress | completed }
export function migrateV1(list, now = new Date().toISOString()) {
  if (!Array.isArray(list)) return [];
  const status = { pending: "todo", "in-progress": "doing", completed: "done" };
  return list.map((old, i) =>
    normalizeTask(
      {
        id: old.id,
        title: old.title,
        notes: old.description,
        due: old.dueDate,
        priority: old.priority,
        category: old.category,
        status: status[old.status] ?? "todo",
        order: i,
        createdAt: old.createdAt,
        completedAt: old.status === "completed" ? old.createdAt : null,
      },
      now
    )
  );
}

// Reads saved tasks: the current format, else the first version's, else nothing (null)
export function loadTasks(storage) {
  const saved = storage.getJSON(STORAGE_KEY, null);
  if (saved && Array.isArray(saved.tasks)) return saved.tasks.map((t) => normalizeTask(t));
  const legacy = storage.getJSON(LEGACY_KEY, null);
  if (Array.isArray(legacy) && legacy.length) return migrateV1(legacy);
  return null;
}

export function saveTasks(storage, tasks) {
  storage.setJSON(STORAGE_KEY, { version: 2, tasks });
}

function patchTask(task, patch, now) {
  const next = { ...task, ...patch };
  if (patch.status && patch.status !== task.status) {
    next.completedAt = patch.status === "done" ? now : null;
  }
  return next;
}

export function tasksReducer(tasks, action) {
  const now = action.now ?? new Date().toISOString();
  switch (action.type) {
    case "add":
      return [createTask(action.task, tasks, now), ...tasks];
    case "update":
      return tasks.map((t) => (t.id === action.id ? patchTask(t, action.patch, now) : t));
    case "toggle":
      return tasks.map((t) => (t.id === action.id ? patchTask(t, { status: t.status === "done" ? "todo" : "done" }, now) : t));
    case "remove":
      return tasks.filter((t) => t.id !== action.id);
    case "restore": {
      if (tasks.some((t) => t.id === action.task.id)) return tasks;
      const next = tasks.slice();
      next.splice(Math.min(action.index ?? 0, next.length), 0, action.task);
      return next;
    }
    case "move": {
      // Drop a task into a board column at a position, renumbering that column
      const moving = tasks.find((t) => t.id === action.id);
      if (!moving) return tasks;
      const column = tasks
        .filter((t) => t.status === action.status && t.id !== action.id)
        .sort((a, b) => a.order - b.order);
      const index = Math.max(0, Math.min(action.index ?? column.length, column.length));
      column.splice(index, 0, patchTask(moving, { status: action.status }, now));
      const order = new Map(column.map((t, i) => [t.id, i]));
      return tasks.map((t) => {
        if (t.id === action.id) return { ...column[index], order: index };
        return order.has(t.id) ? { ...t, order: order.get(t.id) } : t;
      });
    }
    case "reschedule":
      return tasks.map((t) => (t.id === action.id ? { ...t, due: action.due } : t));
    case "rescheduleMany": {
      const ids = new Set(action.ids);
      return tasks.map((t) => (ids.has(t.id) ? { ...t, due: action.due } : t));
    }
    case "addSubtask":
      return tasks.map((t) =>
        t.id === action.id ? { ...t, subtasks: [...t.subtasks, { id: makeId("s"), title: action.title.trim(), done: false }] } : t
      );
    case "toggleSubtask":
      return tasks.map((t) =>
        t.id === action.id ? { ...t, subtasks: t.subtasks.map((s) => (s.id === action.subId ? { ...s, done: !s.done } : s)) } : t
      );
    case "removeSubtask":
      return tasks.map((t) => (t.id === action.id ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== action.subId) } : t));
    case "focus":
      return tasks.map((t) => (t.id === action.id ? { ...t, focus: t.focus + Math.max(0, Math.round(action.minutes)) } : t));
    case "clearDone":
      return tasks.filter((t) => t.status !== "done");
    case "replace":
      return action.tasks.map((t) => normalizeTask(t, now));
    default:
      return tasks;
  }
}

// Sorting for lists: open tasks by date and time, then priority
export function compareTasks(by = "due") {
  return (a, b) => {
    if (by === "priority") return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || compareTasks("due")(a, b);
    if (by === "created") return b.createdAt.localeCompare(a.createdAt);
    if (by === "title") return a.title.localeCompare(b.title);
    if (a.due !== b.due) {
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    }
    if (a.time !== b.time) {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    }
    return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
  };
}

export function matchesQuery(task, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return task.title.toLowerCase().includes(q) || task.notes.toLowerCase().includes(q) || task.subtasks.some((s) => s.title.toLowerCase().includes(q));
}
