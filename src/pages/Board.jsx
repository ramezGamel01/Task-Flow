import { useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, Plus, X } from "lucide-react";
import QuickAdd from "../components/QuickAdd.jsx";
import { useOpenTask } from "../components/TaskItem.jsx";
import { CheckButton, PageHead, TaskMeta } from "../components/bits.jsx";
import { useI18n } from "../i18n/I18n.jsx";
import { useTasks } from "../state/TasksProvider.jsx";
import { CATEGORIES, STATUSES } from "../state/tasks.js";
import { elementAt, startDrag } from "../lib/drag.js";
import { todayIso } from "../lib/dates.js";

function Card({ task, today, onPointerDown, onKeyDown }) {
  const { t } = useI18n();
  const { toggle } = useTasks();
  const open = useOpenTask();
  const subDone = task.subtasks.filter((s) => s.done).length;
  return (
    <li
      className={`card ${task.status === "done" ? "is-done" : ""}`}
      data-card={task.id}
      tabIndex={0}
      style={{ "--cat": `var(--cat-${task.category})` }}
      onPointerDown={onPointerDown}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) open(task.id);
        else onKeyDown(e);
      }}
      onClick={() => open(task.id)}
      aria-label={t("task.open", { title: task.title })}
    >
      <div className="card-top">
        <CheckButton size="sm" done={task.status === "done"} onToggle={() => toggle(task.id)} label={t(task.status === "done" ? "task.reopen" : "task.complete", { title: task.title })} />
        <p className="card-title" dir="auto">
          {task.title}
        </p>
        <span className="card-grip" aria-hidden="true" title={t("board.drag", { title: task.title })}>
          <GripVertical size={16} />
        </span>
      </div>
      <TaskMeta task={task} today={today} compact />
      {task.subtasks.length > 0 && (
        <div className="sub-bar" aria-hidden="true">
          <i style={{ width: `${(subDone / task.subtasks.length) * 100}%` }} />
        </div>
      )}
    </li>
  );
}

export default function Board() {
  const { t, f, dir } = useI18n();
  const { tasks, move } = useTasks();
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [drop, setDrop] = useState(null);
  const [announce, setAnnounce] = useState("");
  const [refocus, setRefocus] = useState(null);
  const today = todayIso();
  const dropRef = useRef(null);

  const columns = useMemo(
    () =>
      STATUSES.map((status) => ({
        status,
        all: tasks.filter((x) => x.status === status).sort((a, b) => a.order - b.order),
        items: tasks.filter((x) => x.status === status && (filter === "all" || x.category === filter)).sort((a, b) => a.order - b.order),
      })),
    [tasks, filter]
  );

  useEffect(() => {
    if (!refocus) return;
    document.querySelector(`[data-card="${refocus}"]`)?.focus();
    setRefocus(null);
  }, [refocus, tasks]);

  // Where a drop lands in the full column, even when a category filter hides some cards
  const indexFor = (status, beforeId, movingId) => {
    const column = columns.find((c) => c.status === status).all.filter((x) => x.id !== movingId);
    if (!beforeId) {
      const visible = columns.find((c) => c.status === status).items.filter((x) => x.id !== movingId);
      const last = visible.at(-1);
      return last ? column.findIndex((x) => x.id === last.id) + 1 : column.length;
    }
    return column.findIndex((x) => x.id === beforeId);
  };

  const commit = (task, status, index) => {
    move(task.id, status, index);
    const count = columns.find((c) => c.status === status).all.filter((x) => x.id !== task.id).length + 1;
    setAnnounce(t("board.moved", { title: task.title, status: t(`status.${status}`), pos: index + 1, count }));
  };

  function onPointerDown(e, task) {
    const fromGrip = e.target.closest(".card-grip");
    if (e.target.closest("button") && !fromGrip) return;
    // On touch screens only the grip drags, so the page can still scroll
    if (e.pointerType !== "mouse" && !fromGrip) return;
    const source = e.currentTarget;
    const height = source.offsetHeight;
    startDrag(e, {
      source,
      onMove(point, first) {
        if (first) setDragging(task.id);
        const column = elementAt(point, "[data-column]");
        if (!column) return;
        const cards = [...column.querySelectorAll("[data-card]")].filter((el) => el.dataset.card !== task.id);
        const before = cards.find((el) => {
          const r = el.getBoundingClientRect();
          return point.y < r.top + r.height / 2;
        });
        const next = { status: column.dataset.column, beforeId: before?.dataset.card ?? null, height };
        const last = dropRef.current;
        if (!last || last.status !== next.status || last.beforeId !== next.beforeId) {
          dropRef.current = next;
          setDrop(next);
        }
      },
      onDrop() {
        const target = dropRef.current;
        if (target) commit(task, target.status, indexFor(target.status, target.beforeId, task.id));
        dropRef.current = null;
        setDrop(null);
        setDragging(null);
      },
      onCancel() {
        dropRef.current = null;
        setDrop(null);
        setDragging(null);
      },
    });
  }

  // Alt + arrows move the focused card: sideways between columns, up and down within one
  function onKeyDown(e, task) {
    if (!e.altKey || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const col = STATUSES.indexOf(task.status);
    const column = columns[col].all;
    const pos = column.findIndex((x) => x.id === task.id);
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const forward = (e.key === "ArrowRight") !== (dir === "rtl");
      const target = STATUSES[col + (forward ? 1 : -1)];
      if (!target) return;
      const index = Math.min(pos, columns[STATUSES.indexOf(target)].all.length);
      commit(task, target, index);
    } else {
      const index = pos + (e.key === "ArrowDown" ? 1 : -1);
      if (index < 0 || index >= column.length) return;
      commit(task, task.status, index);
    }
    setRefocus(task.id);
  }

  return (
    <div className="page board-page">
      <PageHead title={t("nav.board")} lead={t("board.lead")} />

      <div className="filter-row" role="group" aria-label={t("list.category")}>
        <button type="button" className={`filter-chip ${filter === "all" ? "is-on" : ""}`} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          {t("board.all")}
        </button>
        {CATEGORIES.map((c) => (
          <button key={c} type="button" style={{ "--cat": `var(--cat-${c})` }} className={`filter-chip ${filter === c ? "is-on" : ""}`} aria-pressed={filter === c} onClick={() => setFilter(filter === c ? "all" : c)}>
            <i className="dot" aria-hidden="true" />
            {t(`cat.${c}`)}
          </button>
        ))}
      </div>

      <div className={`board ${dragging ? "is-dragging" : ""}`}>
        {columns.map(({ status, items }) => {
          const visible = items.filter((x) => x.id !== dragging);
          const slotAt = drop?.status === status ? (drop.beforeId ? visible.findIndex((x) => x.id === drop.beforeId) : visible.length) : -1;
          const slot = <li key="slot" className="drop-slot" style={{ height: drop?.height }} aria-hidden="true" />;
          return (
            <section key={status} className={`column column-${status} ${drop?.status === status ? "is-target" : ""}`} data-column={status} aria-labelledby={`col-${status}`}>
              <header className="column-head">
                <h2 id={`col-${status}`}>
                  <i className={`status-dot status-${status}`} aria-hidden="true" />
                  {t(`status.${status}`)}
                  <span className="plan-count">{f.number(items.length)}</span>
                </h2>
                <button type="button" className="icon-btn icon-btn-sm" onClick={() => setAdding(adding === status ? null : status)} aria-label={t("board.add", { status: t(`status.${status}`) })} aria-expanded={adding === status}>
                  {adding === status ? <X size={16} /> : <Plus size={16} />}
                </button>
              </header>
              {adding === status && (
                <div className="column-add">
                  <QuickAdd id={`add-${status}`} compact autoFocus defaults={{ status, category: filter === "all" ? undefined : filter }} />
                </div>
              )}
              <ul className="column-list">
                {visible.map((task, i) => [
                  i === slotAt && slot,
                  <Card key={task.id} task={task} today={today} onPointerDown={(e) => onPointerDown(e, task)} onKeyDown={(e) => onKeyDown(e, task)} />,
                ])}
                {slotAt === visible.length && slot}
                {visible.length === 0 && slotAt < 0 && <li className="column-empty">{t("board.empty")}</li>}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="sr-only" aria-live="assertive">
        {announce}
      </p>
    </div>
  );
}
