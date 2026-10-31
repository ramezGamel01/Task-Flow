// Holds the task list for the whole app, saves it to the browser, and wraps the
// reducer in actions that also give feedback (toasts with Undo, sounds) and run focus sessions.
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { loadTasks, saveTasks, tasksReducer } from "./tasks.js";
import { demoTasks } from "../data/seed.js";
import { store } from "../lib/storage.js";
import { playChime, playComplete } from "../lib/sound.js";
import { useApp } from "./app.jsx";
import { useI18n } from "../i18n/I18n.jsx";

const TasksContext = createContext(null);
const FOCUS_KEY = "taskflow:focus";
export const FOCUS_MINUTES = 25;

export function TasksProvider({ children, initialTasks }) {
  const { lang, t, f } = useI18n();
  const { toast, sound } = useApp();
  const [tasks, dispatch] = useReducer(tasksReducer, null, () => initialTasks ?? loadTasks(store) ?? demoTasks(lang));
  // The running focus session: { id, startedAt, endsAt } in milliseconds
  const [focus, setFocus] = useState(() => store.getJSON(FOCUS_KEY, null));
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  useEffect(() => saveTasks(store, tasks), [tasks]);

  useEffect(() => {
    if (focus) store.setJSON(FOCUS_KEY, focus);
    else store.remove(FOCUS_KEY);
  }, [focus]);

  const byId = useCallback((id) => tasksRef.current.find((x) => x.id === id), []);

  const add = useCallback((task) => dispatch({ type: "add", task }), []);
  const update = useCallback((id, patch) => dispatch({ type: "update", id, patch }), []);

  const toggle = useCallback(
    (id) => {
      const task = byId(id);
      if (!task) return;
      if (task.status !== "done" && sound) playComplete();
      dispatch({ type: "toggle", id });
    },
    [byId, sound]
  );

  const remove = useCallback(
    (id) => {
      const index = tasksRef.current.findIndex((x) => x.id === id);
      if (index < 0) return;
      const task = tasksRef.current[index];
      dispatch({ type: "remove", id });
      setFocus((current) => (current?.id === id ? null : current));
      toast(t("toast.deleted", { title: task.title }), { label: t("toast.undo"), run: () => dispatch({ type: "restore", task, index }) });
    },
    [t, toast]
  );

  const move = useCallback((id, status, index) => {
    const task = tasksRef.current.find((x) => x.id === id);
    if (task && task.status !== "done" && status === "done" && sound) playComplete();
    dispatch({ type: "move", id, status, index });
  }, [sound]);

  const reschedule = useCallback((id, due) => dispatch({ type: "reschedule", id, due }), []);

  const finishFocus = useCallback(
    (session, early = false) => {
      const minutes = Math.round((Math.min(Date.now(), session.endsAt) - session.startedAt) / 60000);
      setFocus(null);
      const task = tasksRef.current.find((x) => x.id === session.id);
      if (!task || minutes < 1) return;
      dispatch({ type: "focus", id: session.id, minutes });
      if (!early) {
        if (sound) playChime();
        toast(t("focus.done", { time: f.duration(minutes), title: task.title }));
      }
    },
    [f, sound, t, toast]
  );

  const startFocus = useCallback(
    (id) => {
      const task = byId(id);
      if (!task) return;
      if (focus) finishFocus(focus, true);
      const startedAt = Date.now();
      setFocus({ id, startedAt, endsAt: startedAt + FOCUS_MINUTES * 60000 });
      toast(t("focus.started", { title: task.title }));
    },
    [byId, finishFocus, focus, t, toast]
  );

  const stopFocus = useCallback(() => focus && finishFocus(focus, true), [finishFocus, focus]);

  // Ends the session on time, including one that ran out while the tab was closed
  useEffect(() => {
    if (!focus) return;
    const left = focus.endsAt - Date.now();
    const timer = setTimeout(() => finishFocus(focus), Math.max(0, left));
    return () => clearTimeout(timer);
  }, [focus, finishFocus]);

  const value = useMemo(
    () => ({ tasks, dispatch, add, update, toggle, remove, move, reschedule, focus, startFocus, stopFocus, byId }),
    [tasks, add, update, toggle, remove, move, reschedule, focus, startFocus, stopFocus, byId]
  );
  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used inside TasksProvider");
  return ctx;
}
