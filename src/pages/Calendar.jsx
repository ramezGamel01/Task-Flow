import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarX2, ChevronLeft, ChevronRight } from "lucide-react";
import QuickAdd from "../components/QuickAdd.jsx";
import TaskItem, { useOpenTask } from "../components/TaskItem.jsx";
import { Empty, PageHead } from "../components/bits.jsx";
import { useI18n } from "../i18n/I18n.jsx";
import { useApp } from "../state/app.jsx";
import { useTasks } from "../state/TasksProvider.jsx";
import { useWeekStart } from "../state/hooks.js";
import { compareTasks } from "../state/tasks.js";
import { addDays, monthGrid, parseIso, todayIso, weekOrder } from "../lib/dates.js";
import { elementAt, startDrag } from "../lib/drag.js";

const MAX_CHIPS = 3;

export default function Calendar() {
  const { t, f, dir } = useI18n();
  const { toast } = useApp();
  const { tasks, reschedule } = useTasks();
  const open = useOpenTask();
  const weekStart = useWeekStart();
  const today = todayIso();
  const [selected, setSelected] = useState(today);
  const [cursor, setCursor] = useState(() => {
    const d = parseIso(today);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [dropDate, setDropDate] = useState(null);
  const [focusDay, setFocusDay] = useState(null);
  const grid = useRef(null);
  const dropRef = useRef(null);

  const days = monthGrid(cursor.y, cursor.m, weekStart);
  const byDay = useMemo(() => {
    const map = new Map();
    for (const task of tasks.slice().sort(compareTasks("due"))) {
      if (!task.due) continue;
      if (!map.has(task.due)) map.set(task.due, []);
      map.get(task.due).push(task);
    }
    return map;
  }, [tasks]);
  const undated = tasks.filter((x) => !x.due && x.status !== "done");
  const selectedTasks = byDay.get(selected) ?? [];

  const shiftMonth = (n) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const select = (iso, focus = false) => {
    setSelected(iso);
    const d = parseIso(iso);
    if (d.getMonth() !== cursor.m || d.getFullYear() !== cursor.y) setCursor({ y: d.getFullYear(), m: d.getMonth() });
    if (focus) setFocusDay(iso);
  };

  useEffect(() => {
    if (!focusDay) return;
    grid.current?.querySelector(`[data-date="${focusDay}"] .cal-day`)?.focus();
    setFocusDay(null);
  }, [focusDay, cursor]);

  // Arrow keys move between days (mirrored in Arabic); Home and End jump to the week's ends
  function onDayKey(e, iso) {
    const forward = dir === "rtl" ? -1 : 1;
    const moves = { ArrowRight: forward, ArrowLeft: -forward, ArrowDown: 7, ArrowUp: -7 };
    if (moves[e.key]) {
      e.preventDefault();
      select(addDays(iso, moves[e.key]), true);
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      shiftMonth(e.key === "PageUp" ? -1 : 1);
    }
  }

  function onChipDown(e, task) {
    if (e.pointerType !== "mouse") return;
    startDrag(e, {
      source: e.currentTarget,
      onMove(point) {
        const cell = elementAt(point, "[data-date]");
        const date = cell?.dataset.date ?? null;
        if (dropRef.current !== date) {
          dropRef.current = date;
          setDropDate(date);
        }
      },
      onDrop() {
        const date = dropRef.current;
        if (date && date !== task.due) {
          reschedule(task.id, date);
          toast(t("toast.rescheduled", { date: f.relDay(date, today) }));
        }
        dropRef.current = null;
        setDropDate(null);
      },
      onCancel() {
        dropRef.current = null;
        setDropDate(null);
      },
    });
  }

  const chip = (task) => (
    <button
      key={task.id}
      type="button"
      className={`cal-chip ${task.status === "done" ? "is-done" : ""} ${task.status !== "done" && task.due && task.due < today ? "is-late" : ""}`}
      style={{ "--cat": `var(--cat-${task.category})` }}
      onPointerDown={(e) => onChipDown(e, task)}
      onClick={(e) => {
        e.stopPropagation();
        open(task.id);
      }}
      title={task.title}
    >
      {task.time && <span className="cal-chip-time">{f.time(task.time)}</span>}
      <span className="cal-chip-title" dir="auto">
        {task.title}
      </span>
    </button>
  );

  return (
    <div className="page calendar-page">
      <PageHead title={t("nav.calendar")} lead={t("cal.lead")}>
        <div className="cal-nav">
          <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} aria-label={t("cal.prev")} title={t("cal.prev")}>
            {dir === "rtl" ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <p className="cal-month" aria-live="polite">
            {f.monthYear(new Date(cursor.y, cursor.m, 1))}
          </p>
          <button type="button" className="icon-btn" onClick={() => shiftMonth(1)} aria-label={t("cal.next")} title={t("cal.next")}>
            {dir === "rtl" ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
          <button type="button" className="btn btn-small btn-ghost" onClick={() => select(today)}>
            {t("cal.today")}
          </button>
        </div>
      </PageHead>

      <div className="cal-layout">
        <div className="cal" ref={grid} role="grid" aria-label={f.monthYear(new Date(cursor.y, cursor.m, 1))}>
          <div className="cal-weekdays" role="row">
            {weekOrder(weekStart).map((i) => (
              <span key={i} role="columnheader">
                {f.weekdayShort(i)}
              </span>
            ))}
          </div>
          <div className="cal-grid">
            {days.map((iso) => {
              const list = byDay.get(iso) ?? [];
              const outside = parseIso(iso).getMonth() !== cursor.m;
              const open = list.filter((x) => x.status !== "done").length;
              return (
                <div
                  key={iso}
                  role="gridcell"
                  data-date={iso}
                  className={`cal-cell ${outside ? "is-outside" : ""} ${iso === today ? "is-today" : ""} ${iso === selected ? "is-selected" : ""} ${dropDate === iso ? "is-drop" : ""} ${iso < today ? "is-past" : ""}`}
                  onClick={() => select(iso)}
                >
                  <button
                    type="button"
                    className="cal-day"
                    tabIndex={iso === selected ? 0 : -1}
                    aria-pressed={iso === selected}
                    aria-label={`${f.longDay(iso)}, ${t("cal.dayTasks", { n: list.length })}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      select(iso);
                    }}
                    onKeyDown={(e) => onDayKey(e, iso)}
                  >
                    {f.dayNum(iso)}
                  </button>
                  {open > 0 && <span className="cal-dots" aria-hidden="true">{list.slice(0, 4).map((x) => <i key={x.id} style={{ background: `var(--cat-${x.category})` }} />)}</span>}
                  <div className="cal-chips">
                    {list.slice(0, MAX_CHIPS).map(chip)}
                    {list.length > MAX_CHIPS && <span className="cal-more">{t("cal.more", { n: list.length - MAX_CHIPS })}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="cal-side">
          <section className="day-panel">
            <header className="plan-head">
              <h2>
                {f.longDay(selected)}
                <span className="plan-count">{selectedTasks.length}</span>
              </h2>
            </header>
            {selectedTasks.length ? (
              <ul className="task-list">
                {selectedTasks.map((task) => (
                  <TaskItem key={task.id} task={task} today={today} showCategory={false} />
                ))}
              </ul>
            ) : (
              <p className="day-empty">{t("cal.dayEmpty")}</p>
            )}
            <QuickAdd key={selected} id="cal-add" compact defaults={{ due: selected }} />
          </section>

          <section className="undated">
            <header className="plan-head">
              <h2>
                {t("cal.noDate")}
                <span className="plan-count">{undated.length}</span>
              </h2>
            </header>
            {undated.length ? (
              <>
                <p className="hint">{t("cal.noDateHint")}</p>
                <div className="undated-chips">{undated.map(chip)}</div>
              </>
            ) : (
              <Empty icon={CalendarX2} title={t("ins.none")} />
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
