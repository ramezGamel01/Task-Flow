// App-wide preferences and UI plumbing: theme, animations, sounds, name, week start, toasts and dialogs.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { store } from "../lib/storage.js";

const AppContext = createContext(null);

const systemReduce = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function AppProvider({ children }) {
  const [theme, setThemeState] = useState(() => document.documentElement.dataset.theme || "light");
  const [motion, setMotionState] = useState(() => {
    const saved = store.get("taskflow:motion");
    return saved ? saved === "on" : !systemReduce();
  });
  const [sound, setSoundState] = useState(() => store.get("taskflow:sound") !== "off");
  const [name, setNameState] = useState(() => store.get("taskflow:name") ?? "");
  const [weekStart, setWeekStartState] = useState(() => {
    const saved = Number(store.get("taskflow:weekStart"));
    return [0, 1, 6].includes(saved) && store.get("taskflow:weekStart") !== null ? saved : null;
  });
  const [toasts, setToasts] = useState([]);
  // Which overlay is open: "palette", "quickadd", "shortcuts" or null
  const [overlay, setOverlay] = useState(null);
  const toastId = useRef(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0b0a18" : "#f5f3fc");
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("no-motion", !motion);
  }, [motion]);

  const setTheme = useCallback(
    (next) => {
      store.set("taskflow:theme", next);
      const apply = () => setThemeState(next);
      if (document.startViewTransition && motion) document.startViewTransition(apply);
      else apply();
    },
    [motion]
  );

  const setMotion = useCallback((on) => {
    store.set("taskflow:motion", on ? "on" : "off");
    setMotionState(on);
  }, []);

  const setSound = useCallback((on) => {
    store.set("taskflow:sound", on ? "on" : "off");
    setSoundState(on);
  }, []);

  const setName = useCallback((value) => {
    store.set("taskflow:name", value);
    setNameState(value);
  }, []);

  const setWeekStart = useCallback((value) => {
    store.set("taskflow:weekStart", String(value));
    setWeekStartState(value);
  }, []);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((x) => x.id !== id)), []);

  // A toast can carry one action, such as Undo
  const toast = useCallback(
    (text, action) => {
      const id = ++toastId.current;
      setToasts((list) => [...list.slice(-2), { id, text, action }]);
      setTimeout(() => dismiss(id), action ? 6000 : 3200);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({ theme, setTheme, motion, setMotion, sound, setSound, name, setName, weekStart, setWeekStart, toasts, toast, dismiss, overlay, setOverlay }),
    [theme, setTheme, motion, setMotion, sound, setSound, name, setName, weekStart, setWeekStart, toasts, toast, dismiss, overlay]
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
