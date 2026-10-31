// The app frame: sidebar on wide screens, a bottom tab bar on phones, a top bar with
// search, focus timer and New task, plus the panels and dialogs every page shares.
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useNavigate } from "react-router";
import { Keyboard, Moon, Plus, Search, Settings, Square, Sun, Timer } from "lucide-react";
import { Logo } from "./bits.jsx";
import TaskDrawer from "./TaskDrawer.jsx";
import CommandPalette, { PAGES } from "./CommandPalette.jsx";
import ScrollRail from "./ScrollRail.jsx";
import { QuickAddDialog, ShortcutsDialog, Toasts } from "./overlays.jsx";
import { useI18n } from "../i18n/I18n.jsx";
import { useApp } from "../state/app.jsx";
import { useTasks } from "../state/TasksProvider.jsx";
import { CATEGORIES } from "../state/tasks.js";
import { todayIso } from "../lib/dates.js";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function useCounts() {
  const { tasks } = useTasks();
  const today = todayIso();
  const open = tasks.filter((x) => x.status !== "done");
  return {
    "/": open.filter((x) => x.due && x.due <= today).length,
    "/board": open.filter((x) => x.status === "doing").length,
    "/list": open.length,
    categories: Object.fromEntries(CATEGORIES.map((c) => [c, open.filter((x) => x.category === c).length])),
  };
}

function FocusPill() {
  const { t, f } = useI18n();
  const { focus, stopFocus, byId } = useTasks();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!focus) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [focus]);
  const task = focus ? byId(focus.id) : null;
  const left = focus ? Math.max(0, (focus.endsAt - now) / 1000) : 0;
  useEffect(() => {
    if (!focus || !task) return;
    const base = "TaskFlow";
    document.title = `${f.clock(left)} · ${task.title}`;
    return () => {
      document.title = base;
    };
  }, [focus, task, left, f]);
  if (!focus || !task) return null;
  const total = (focus.endsAt - focus.startedAt) / 1000;
  return (
    <div className="focus-pill" style={{ "--p": 1 - left / total }} role="timer" aria-label={t("focus.on", { title: task.title })}>
      <Timer size={15} aria-hidden="true" />
      <span className="focus-time">{f.clock(left)}</span>
      <span className="focus-title" dir="auto">
        {task.title}
      </span>
      <button type="button" className="icon-btn icon-btn-sm" onClick={stopFocus} aria-label={t("focus.stop")} title={t("focus.stop")}>
        <Square size={12} />
      </button>
    </div>
  );
}

function Sidebar() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme, setOverlay } = useApp();
  const counts = useCounts();
  return (
    <aside className="sidebar">
      <Link to="/" className="brand" viewTransition aria-label="TaskFlow">
        <Logo />
        <span>
          <span className="brand-name">TaskFlow</span>
          <span className="brand-tag">{t("brand.tagline")}</span>
        </span>
      </Link>

      <button type="button" className="btn btn-primary side-new" onClick={() => setOverlay("quickadd")}>
        <Plus size={17} aria-hidden="true" />
        {t("nav.new")}
        <kbd className="kbd kbd-on-primary">N</kbd>
      </button>

      <nav className="side-nav" aria-label={t("nav.main")}>
        <p className="side-title">{t("nav.views")}</p>
        {PAGES.filter((p) => p.to !== "/settings").map(({ to, key, icon: Icon }) => (
          <NavLink key={to} to={to} end viewTransition className="side-link">
            <Icon size={18} aria-hidden="true" />
            <span>{t(key)}</span>
            {counts[to] > 0 && <span className="side-count">{counts[to]}</span>}
          </NavLink>
        ))}
        <p className="side-title">{t("nav.categories")}</p>
        {CATEGORIES.map((c) => (
          <Link key={c} to={`/list?category=${c}`} viewTransition className="side-link side-cat" style={{ "--cat": `var(--cat-${c})` }}>
            <i className="dot" aria-hidden="true" />
            <span>{t(`cat.${c}`)}</span>
            {counts.categories[c] > 0 && <span className="side-count">{counts.categories[c]}</span>}
          </Link>
        ))}
      </nav>

      <div className="side-foot">
        <NavLink to="/settings" viewTransition className="side-link">
          <Settings size={18} aria-hidden="true" />
          <span>{t("nav.settings")}</span>
        </NavLink>
        <div className="side-tools">
          <button type="button" className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={t(theme === "dark" ? "nav.toLight" : "nav.toDark")} title={t(theme === "dark" ? "nav.toLight" : "nav.toDark")}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button type="button" className="icon-btn lang-btn" onClick={() => setLang(lang === "ar" ? "en" : "ar")} aria-label={t("nav.langLabel")}>
            <span lang={lang === "ar" ? "en" : "ar"}>{t("nav.lang")}</span>
          </button>
          <button type="button" className="icon-btn" onClick={() => setOverlay("shortcuts")} aria-label={t("nav.shortcuts")} title={t("nav.shortcuts")}>
            <Keyboard size={17} />
          </button>
        </div>
        <p className="side-note">{t("nav.saved")}</p>
      </div>
    </aside>
  );
}

function Topbar() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme, setOverlay } = useApp();
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className={`topbar ${solid ? "is-solid" : ""}`}>
      <Link to="/" className="brand brand-mobile" viewTransition aria-label="TaskFlow">
        <Logo size={26} />
        <span className="brand-name">TaskFlow</span>
      </Link>
      <button type="button" className="search-btn" onClick={() => setOverlay("palette")} aria-keyshortcuts="Control+K Meta+K">
        <Search size={16} aria-hidden="true" />
        <span className="search-label">{t("nav.search")}</span>
        <span className="search-keys" aria-hidden="true">
          <kbd className="kbd">{isMac ? "⌘" : "Ctrl"}</kbd>
          <kbd className="kbd">K</kbd>
        </span>
      </button>
      <FocusPill />
      <div className="top-tools">
        <button type="button" className="icon-btn lang-btn" onClick={() => setLang(lang === "ar" ? "en" : "ar")} aria-label={t("nav.langLabel")}>
          <span lang={lang === "ar" ? "en" : "ar"}>{t("nav.lang")}</span>
        </button>
        <button type="button" className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={t(theme === "dark" ? "nav.toLight" : "nav.toDark")}>
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <NavLink to="/settings" viewTransition className="icon-btn" aria-label={t("nav.settings")}>
          <Settings size={17} />
        </NavLink>
      </div>
    </div>
  );
}

function MobileNav() {
  const { t } = useI18n();
  const { setOverlay } = useApp();
  const tabs = PAGES.filter((p) => p.to !== "/settings");
  return (
    <nav className="tabbar" aria-label={t("nav.main")}>
      {tabs.slice(0, 2).map(({ to, key, icon: Icon }) => (
        <NavLink key={to} to={to} end viewTransition className="tab">
          <Icon size={20} aria-hidden="true" />
          <span>{t(key)}</span>
        </NavLink>
      ))}
      <button type="button" className="tab-new" onClick={() => setOverlay("quickadd")} aria-label={t("nav.new")}>
        <Plus size={24} aria-hidden="true" />
      </button>
      {tabs.slice(2, 4).map(({ to, key, icon: Icon }) => (
        <NavLink key={to} to={to} end viewTransition className="tab">
          <Icon size={20} aria-hidden="true" />
          <span>{t(key)}</span>
        </NavLink>
      ))}
    </nav>
  );
}

// N for a new task, Ctrl/Cmd+K for the palette, ? for help, G then a letter to change page
function useShortcuts() {
  const { setOverlay, overlay } = useApp();
  const navigate = useNavigate();
  const pending = useRef(0);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOverlay(overlay === "palette" ? null : "palette");
        return;
      }
      const target = e.target;
      const typing = target.closest?.("input, textarea, select, [contenteditable='true']");
      if (typing || e.ctrlKey || e.metaKey || e.altKey || document.querySelector("dialog[open]")) return;
      const key = e.key.toLowerCase();
      if (pending.current) {
        clearTimeout(pending.current);
        pending.current = 0;
        const page = PAGES.find((p) => p.letter === key);
        if (page) {
          e.preventDefault();
          navigate(page.to, { viewTransition: true });
        }
        return;
      }
      if (key === "n") {
        e.preventDefault();
        setOverlay("quickadd");
      } else if (e.key === "?") {
        e.preventDefault();
        setOverlay("shortcuts");
      } else if (key === "/") {
        e.preventDefault();
        setOverlay("palette");
      } else if (key === "g") {
        pending.current = setTimeout(() => (pending.current = 0), 1200);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, overlay, setOverlay]);
}

export default function Layout() {
  const { t } = useI18n();
  const location = useLocation();
  useShortcuts();
  // A new task made from the board or calendar keeps that page's context
  const defaults = location.pathname === "/" ? { due: todayIso() } : {};
  return (
    <>
      <a className="skip-link" href="#main">
        {t("nav.skip")}
      </a>
      <div className="backdrop" aria-hidden="true" />
      <div className="shell">
        <Sidebar />
        <div className="main-col">
          <Topbar />
          <main id="main" tabIndex={-1} className="main">
            <Outlet />
          </main>
        </div>
      </div>
      <MobileNav />
      <TaskDrawer />
      <CommandPalette />
      <QuickAddDialog defaults={defaults} />
      <ShortcutsDialog />
      <Toasts />
      <ScrollRail />
      <ScrollRestoration />
    </>
  );
}
