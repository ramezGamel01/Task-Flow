import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { Task } from "./task-types";
import { offsetIso, todayIso } from "./task-utils";

const STORAGE_KEY = "taskflow:tasks:v1";

function seedTasks(): Task[] {
  const now = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      title: "Design new dashboard layout",
      description: "Sketch and prototype the revised analytics dashboard.",
      dueDate: todayIso(),
      priority: "high",
      category: "work",
      status: "in-progress",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: "Morning run — 5km",
      description: "Loop around the park before breakfast.",
      dueDate: todayIso(),
      priority: "medium",
      category: "fitness",
      status: "pending",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: "Read chapter 4 of Deep Work",
      description: "Take notes on the key rituals section.",
      dueDate: offsetIso(1),
      priority: "low",
      category: "study",
      status: "pending",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: "Weekly groceries",
      description: "Produce, pantry staples, and coffee beans.",
      dueDate: offsetIso(2),
      priority: "medium",
      category: "shopping",
      status: "pending",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: "Call mom",
      description: "Catch up about the weekend visit.",
      dueDate: offsetIso(-1),
      priority: "high",
      category: "personal",
      status: "pending",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: "Review PR #482",
      description: "Auth flow refactor — approved with two minor comments.",
      dueDate: offsetIso(-3),
      priority: "medium",
      category: "work",
      status: "completed",
      createdAt: now,
    },
  ];
}

interface Ctx {
  tasks: Task[];
  addTask: (t: Omit<Task, "id" | "createdAt">) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleComplete: (id: string) => void;
}

const TasksContext = createContext<Ctx | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setTasks(JSON.parse(raw));
      } else {
        const seed = seedTasks();
        setTasks(seed);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      }
    } catch {
      setTasks(seedTasks());
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks, hydrated]);

  const addTask = useCallback((t: Omit<Task, "id" | "createdAt">) => {
    const task: Task = {
      ...t,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [task, ...prev]);
    toast.success("Task created");
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    toast.success("Task updated");
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast.success("Task deleted");
  }, []);

  const toggleComplete = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = t.status === "completed" ? "pending" : "completed";
        toast.success(next === "completed" ? "Nice — task completed" : "Task reopened");
        return { ...t, status: next };
      }),
    );
  }, []);

  const value = useMemo(
    () => ({ tasks, addTask, updateTask, deleteTask, toggleComplete }),
    [tasks, addTask, updateTask, deleteTask, toggleComplete],
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): Ctx {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used inside TasksProvider");
  return ctx;
}