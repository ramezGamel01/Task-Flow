import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, ChevronDown, Coffee, PartyPopper } from "lucide-react";
import QuickAdd from "../components/QuickAdd.jsx";
import TaskItem, { useOpenTask } from "../components/TaskItem.jsx";
import { Empty, ProgressRing } from "../components/bits.jsx";
import { SceneBoundary, useOnScreen } from "../three/SceneGuard.jsx";
import { useI18n } from "../i18n/I18n.jsx";
import { useApp } from "../state/app.jsx";
import { useTasks } from "../state/TasksProvider.jsx";
import { compareTasks } from "../state/tasks.js";
import { bucketOf, toIso, todayIso } from "../lib/dates.js";
import { CATEGORY_COLORS } from "../data/palette.js";

const OrbitScene = lazy(() => import("../three/OrbitScene.jsx"));

function greetingKey(hour) {
  if (hour < 12) return "greet.morning";
  if (hour < 18) return "greet.afternoon";
  return "greet.evening";
}

// A flat drawing of the orbit for browsers without WebGL
function OrbitFallback({ planets }) {
  return (
    <div className="orbit-fallback" aria-hidden="true">
      {["high", "medium", "low"].map((ring) => (
        <span key={ring} className={`orbit-ring ring-${ring}`}>
          {planets
            .filter((p) => !p.done && p.priority === ring)
            .map((p, i, list) => (
              <i key={p.id} style={{ "--a": `${(i / list.length) * 360}deg`, background: CATEGORY_COLORS[p.category] }} />
            ))}
        </span>
      ))}
      <span className="orbit-core" />
    </div>
  );
}

function Section({ title, count, tone, action, children }) {
  return (
    <section className={`plan-section ${tone ? `tone-${tone}` : ""}`}>
      <header className="plan-head">
        <h2>
          {title}
          <span className="plan-count">{count}</span>
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export default function Today() {
  const { t, f, dir } = useI18n();
  const { name, motion, theme, toast } = useApp();
  const { tasks, dispatch } = useTasks();
  const open = useOpenTask();
  const [showDone, setShowDone] = useState(false);
  const [hovered, setHovered] = useState(null);
  const today = todayIso();
  const hero = useRef(null);
  const sceneBox = useRef(null);
  const label = useRef(null);
  const scroll = useRef(0);
  const onScreen = useOnScreen(sceneBox, "80px");

  const plan = useMemo(() => {
    const sorted = tasks.slice().sort(compareTasks("due"));
    const doneToday = sorted.filter((x) => x.status === "done" && x.completedAt && toIso(new Date(x.completedAt)) === today);
    const overdue = sorted.filter((x) => bucketOf(x, today) === "overdue");
    const dueToday = sorted.filter((x) => bucketOf(x, today) === "today");
    const upcoming = sorted.filter((x) => ["tomorrow", "week"].includes(bucketOf(x, today))).slice(0, 6);
    return { doneToday, overdue, dueToday, upcoming };
  }, [tasks, today]);

  const total = plan.dueToday.length + plan.doneToday.length;
  const progress = total ? plan.doneToday.length / total : 0;
  const focusedToday = plan.doneToday.reduce((s, x) => s + x.focus, 0);

  const planets = useMemo(
    () => [
      ...plan.overdue.map((x) => ({ id: x.id, title: x.title, category: x.category, priority: x.priority, overdue: true, done: false })),
      ...plan.dueToday.map((x) => ({ id: x.id, title: x.title, category: x.category, priority: x.priority, overdue: false, done: false })),
      ...plan.doneToday.map((x) => ({ id: x.id, title: x.title, category: x.category, priority: x.priority, overdue: false, done: true })),
    ],
    [plan]
  );
  const hoveredTitle = planets.find((p) => p.id === hovered)?.title;

  // 0 → 1 as the hero scrolls away; the scene reads it every frame
  useEffect(() => {
    const update = () => {
      const box = hero.current?.getBoundingClientRect();
      if (box) scroll.current = Math.min(1, Math.max(0, -box.top / (box.height * 0.9)));
      if (hero.current) hero.current.style.setProperty("--p", scroll.current.toFixed(3));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const onHover = useCallback((id) => setHovered(id), []);
  const greeting = t(greetingKey(new Date().getHours()));

  return (
    <div className="page today">
      <section className="hero" ref={hero}>
        <div className="hero-copy">
          <p className="eyebrow">{f.longDay(today)}</p>
          <h1 className="hero-title">{name.trim() ? t("greet.named", { greeting, name: name.trim() }) : greeting}</h1>
          <p className="hero-summary">
            {t("today.left", { n: plan.dueToday.length })}
            {plan.overdue.length > 0 && <span className="pill pill-danger">{t("today.overdue", { n: plan.overdue.length })}</span>}
          </p>
          <div className="hero-progress">
            <ProgressRing value={progress} size={104} stroke={9} label={`${t("today.progress")}: ${f.percent(progress)}`}>
              <strong>{f.percent(progress)}</strong>
            </ProgressRing>
            <div>
              <p className="hero-progress-title">{t("today.progress")}</p>
              <p className="hero-progress-sub">{t("today.ofDone", { done: plan.doneToday.length, total })}</p>
              {focusedToday > 0 && <p className="hero-progress-sub">{t("today.focused", { time: f.duration(focusedToday) })}</p>}
            </div>
          </div>
          <ul className="orbit-legend" aria-label={t("today.orbit")}>
            <li>
              <i className="legend-ring ring-1" aria-hidden="true" />
              {t("today.inner")}
            </li>
            <li>
              <i className="legend-ring ring-2" aria-hidden="true" />
              {t("today.middle")}
            </li>
            <li>
              <i className="legend-ring ring-3" aria-hidden="true" />
              {t("today.outer")}
            </li>
          </ul>
        </div>

        <figure className="hero-scene" ref={sceneBox} aria-label={t("today.orbitLabel")}>
          <div className="scene-canvas" aria-hidden="true">
            <SceneBoundary fallback={<OrbitFallback planets={planets} />}>
              <Suspense fallback={<OrbitFallback planets={planets} />}>
                <OrbitScene
                  planets={planets}
                  progress={progress}
                  dark={theme === "dark"}
                  motion={motion}
                  dir={dir === "rtl" ? -1 : 1}
                  active={onScreen}
                  scroll={scroll}
                  hovered={hovered}
                  onHover={onHover}
                  onSelect={open}
                  label={label}
                />
              </Suspense>
            </SceneBoundary>
            <span className="planet-label" ref={label}>
              {hoveredTitle}
            </span>
          </div>
          <figcaption className="scene-hint">{t("today.orbitHint")}</figcaption>
        </figure>
      </section>

      <div className="today-add">
        <QuickAdd defaults={{ due: today }} />
      </div>

      <div className="plan">
        {plan.overdue.length > 0 && (
          <Section
            title={t("bucket.overdue")}
            count={plan.overdue.length}
            tone="danger"
            action={
              <button
                type="button"
                className="btn btn-small btn-soft"
                onClick={() => {
                  dispatch({ type: "rescheduleMany", ids: plan.overdue.map((x) => x.id), due: today });
                  toast(t("today.movedAll", { n: plan.overdue.length }));
                }}
              >
                <CalendarClock size={15} aria-hidden="true" />
                {t("today.moveAll")}
              </button>
            }
          >
            <ul className="task-list">
              {plan.overdue.map((task) => (
                <TaskItem key={task.id} task={task} today={today} />
              ))}
            </ul>
          </Section>
        )}

        <Section title={t("today.planned")} count={plan.dueToday.length}>
          {plan.dueToday.length ? (
            <ul className="task-list">
              {plan.dueToday.map((task) => (
                <TaskItem key={task.id} task={task} today={today} />
              ))}
            </ul>
          ) : (
            <Empty icon={plan.doneToday.length ? PartyPopper : Coffee} title={plan.doneToday.length ? t("today.allDone") : t("today.clear")} />
          )}
        </Section>

        {plan.upcoming.length > 0 && (
          <Section title={t("today.upNext")} count={plan.upcoming.length}>
            <ul className="task-list">
              {plan.upcoming.map((task) => (
                <TaskItem key={task.id} task={task} today={today} />
              ))}
            </ul>
          </Section>
        )}

        {plan.doneToday.length > 0 && (
          <section className="plan-section tone-done">
            <button type="button" className="done-toggle" aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>
              <ChevronDown size={16} aria-hidden="true" />
              {showDone ? t("today.hideDone") : t("today.showDone", { n: plan.doneToday.length })}
            </button>
            {showDone && (
              <ul className="task-list">
                {plan.doneToday.map((task) => (
                  <TaskItem key={task.id} task={task} today={today} />
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
