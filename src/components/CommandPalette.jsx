// Ctrl/Cmd + K: jump to a page, run a command, find a task, or type something new and
// create it straight away (the text goes through the same quick add reading).
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { CalendarDays, ChartColumn, CornerDownLeft, Keyboard, Languages, ListTodo, Moon, Orbit, Plus, Search, Settings, Sparkles, SquareKanban, Sun } from "lucide-react";
import { useModal } from "./overlays.jsx";
import { useOpenTask } from "./TaskItem.jsx";
import { useApp } from "../state/app.jsx";
import { useI18n } from "../i18n/I18n.jsx";
import { useTasks } from "../state/TasksProvider.jsx";
import { matchesQuery } from "../state/tasks.js";
import { parseQuickAdd } from "../lib/parse.js";
import { todayIso } from "../lib/dates.js";

export const PAGES = [
  { to: "/", key: "nav.today", icon: Orbit, letter: "t" },
  { to: "/board", key: "nav.board", icon: SquareKanban, letter: "b" },
  { to: "/list", key: "nav.list", icon: ListTodo, letter: "l" },
  { to: "/calendar", key: "nav.calendar", icon: CalendarDays, letter: "c" },
  { to: "/insights", key: "nav.insights", icon: ChartColumn, letter: "i" },
  { to: "/settings", key: "nav.settings", icon: Settings, letter: "s" },
];

export default function CommandPalette() {
  const { t, lang, setLang } = useI18n();
  const { overlay, setOverlay, theme, setTheme, motion, setMotion, toast } = useApp();
  const { tasks, add } = useTasks();
  const openTask = useOpenTask();
  const navigate = useNavigate();
  const open = overlay === "palette";
  const ref = useModal(open);
  const input = useRef(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open]);

  const close = () => setOverlay(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const has = (label) => !q || label.toLowerCase().includes(q);
    const actions = [
      { id: "new", label: t("nav.new"), icon: Plus, run: () => setOverlay("quickadd"), keep: true },
      { id: "theme", label: t("pal.theme"), icon: theme === "dark" ? Sun : Moon, run: () => setTheme(theme === "dark" ? "light" : "dark") },
      { id: "lang", label: t("pal.lang"), icon: Languages, run: () => setLang(lang === "ar" ? "en" : "ar") },
      { id: "motion", label: t(motion ? "pal.motionOff" : "pal.motionOn"), icon: Sparkles, run: () => setMotion(!motion) },
      { id: "keys", label: t("nav.shortcuts"), icon: Keyboard, run: () => setOverlay("shortcuts"), keep: true },
    ].filter((a) => has(a.label));
    const pages = PAGES.map((p) => ({ id: p.to, label: t(p.key), icon: p.icon, run: () => navigate(p.to, { viewTransition: true }) })).filter((p) => has(p.label));
    const found = q
      ? tasks
          .filter((task) => matchesQuery(task, q))
          .slice(0, 6)
          .map((task) => ({ id: task.id, label: task.title, icon: Search, task, run: () => openTask(task.id) }))
      : [];
    const list = [];
    if (pages.length) list.push({ title: t("pal.goto"), items: pages });
    if (found.length) list.push({ title: t("pal.tasks"), items: found });
    if (actions.length) list.push({ title: t("pal.actions"), items: actions });
    // Offer to create the text as a task; it comes last, so typing a page name and Enter still goes there
    const parsed = q ? parseQuickAdd(query, todayIso()) : null;
    if (parsed?.title && !found.some((x) => x.label.toLowerCase() === q)) {
      list.push({
        title: t("nav.new"),
        items: [
          {
            id: "create",
            label: t("pal.create", { title: parsed.title }),
            icon: Plus,
            run: () => {
              add({ title: parsed.title, due: parsed.due, time: parsed.time, priority: parsed.priority ?? "medium", category: parsed.category ?? "other" });
              toast(t("qa.added", { title: parsed.title }));
            },
          },
        ],
      });
    }
    return list;
  }, [query, t, theme, lang, motion, tasks, setOverlay, setTheme, setLang, setMotion, navigate, openTask, add, toast]);

  const flat = groups.flatMap((g) => g.items);
  const safeActive = Math.min(active, Math.max(0, flat.length - 1));

  const run = (item) => {
    if (!item) return;
    if (!item.keep) close();
    item.run();
  };

  function onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((safeActive + 1) % Math.max(1, flat.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((safeActive - 1 + flat.length) % Math.max(1, flat.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(flat[safeActive]);
    }
  }

  useEffect(() => {
    ref.current?.querySelector(".pal-item.is-active")?.scrollIntoView({ block: "nearest" });
  }, [safeActive, ref]);

  let index = -1;
  return (
    <dialog ref={ref} className="dialog palette" aria-label={t("pal.label")} onClose={close} onClick={(e) => e.target === ref.current && close()}>
      <div className="pal-box">
        <div className="pal-search">
          <Search size={18} aria-hidden="true" />
          <input
            ref={input}
            dir="auto"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={t("pal.placeholder")}
            aria-label={t("pal.placeholder")}
            role="combobox"
            aria-expanded="true"
            aria-controls="pal-list"
            aria-activedescendant={flat[safeActive] ? `pal-${flat[safeActive].id}` : undefined}
            autoComplete="off"
            spellCheck="false"
          />
          <kbd className="kbd">Esc</kbd>
        </div>
        <div className="pal-list" id="pal-list" role="listbox" aria-label={t("pal.label")}>
          {flat.length === 0 && <p className="pal-empty">{t("pal.empty")}</p>}
          {groups.map((group) => (
            <div key={group.title} role="group" aria-label={group.title} className="pal-group">
              <p className="pal-title" aria-hidden="true">
                {group.title}
              </p>
              {group.items.map((item) => {
                index += 1;
                const mine = index;
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    id={`pal-${item.id}`}
                    role="option"
                    aria-selected={mine === safeActive}
                    className={`pal-item ${mine === safeActive ? "is-active" : ""}`}
                    onPointerMove={() => mine !== safeActive && setActive(mine)}
                    onClick={() => run(item)}
                    style={item.task ? { "--cat": `var(--cat-${item.task.category})` } : undefined}
                  >
                    {item.task ? <i className="dot" aria-hidden="true" /> : <Icon size={17} aria-hidden="true" />}
                    <span dir="auto">{item.label}</span>
                    {mine === safeActive && <CornerDownLeft className="pal-enter" size={14} aria-hidden="true" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p className="pal-hint">{t("pal.hint")}</p>
      </div>
    </dialog>
  );
}
