// The side panel for one task. It opens when the URL has ?task=<id>, slides in from the
// reading end of the page (the right in English, the left in Arabic), and edits save as you type.
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { Play, Square, Trash2, X } from "lucide-react";
import { CheckButton } from "./bits.jsx";
import { useI18n } from "../i18n/I18n.jsx";
import { useTasks } from "../state/TasksProvider.jsx";
import { CATEGORIES, PRIORITIES, STATUSES } from "../state/tasks.js";

export default function TaskDrawer() {
  const { t, f } = useI18n();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { tasks, update, toggle, remove, dispatch, focus, startFocus, stopFocus } = useTasks();
  const id = params.get("task");
  const task = id ? tasks.find((x) => x.id === id) : null;
  const ref = useRef(null);
  const [step, setStep] = useState("");
  // Keep showing the last task while the panel animates closed
  const [shown, setShown] = useState(task);
  if (task && task !== shown) setShown(task);

  const close = () => {
    if (location.state?.drawer) navigate(-1);
    else
      setParams(
        (p) => {
          const next = new URLSearchParams(p);
          next.delete("task");
          return next;
        },
        { replace: true }
      );
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (id && !el.open) el.showModal?.();
    if (!id && el.open) el.close();
  }, [id]);

  const current = task ?? shown;

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-labelledby="drawer-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => e.target === ref.current && close()}
    >
      <div className="drawer-panel">
        <header className="drawer-head">
          <h2 id="drawer-title" className="drawer-kicker">
            {t("drawer.title")}
          </h2>
          <button type="button" className="icon-btn" onClick={close} aria-label={t("drawer.close")} title={t("drawer.close")}>
            <X size={18} />
          </button>
        </header>

        {id && !task ? (
          <p className="drawer-missing">{t("drawer.missing")}</p>
        ) : current ? (
          <div className="drawer-body" style={{ "--cat": `var(--cat-${current.category})` }}>
            <div className="drawer-title-row">
              <CheckButton done={current.status === "done"} onToggle={() => toggle(current.id)} label={t(current.status === "done" ? "task.reopen" : "task.complete", { title: current.title })} size="lg" />
              <label className="sr-only" htmlFor="task-title">
                {t("field.title")}
              </label>
              <textarea
                id="task-title"
                className="drawer-title"
                rows={1}
                dir="auto"
                value={current.title}
                onChange={(e) => update(current.id, { title: e.target.value.replace(/\n/g, " ") })}
                onBlur={(e) => !e.target.value.trim() && update(current.id, { title: t("task.untitled") })}
              />
            </div>

            <fieldset className="field">
              <legend>{t("field.status")}</legend>
              <div className="segmented">
                {STATUSES.map((s) => (
                  <button key={s} type="button" className={current.status === s ? "is-on" : ""} aria-pressed={current.status === s} onClick={() => update(current.id, { status: s })}>
                    <i className={`status-dot status-${s}`} aria-hidden="true" />
                    {t(`status.${s}`)}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="field-row">
              <div className="field">
                <label htmlFor="task-due">{t("field.due")}</label>
                <div className="input-with-clear">
                  <input id="task-due" type="date" className="input" value={current.due ?? ""} onChange={(e) => update(current.id, { due: e.target.value || null })} />
                  {current.due && (
                    <button type="button" className="clear-btn" onClick={() => update(current.id, { due: null, time: null })}>
                      {t("field.clear")}
                    </button>
                  )}
                </div>
              </div>
              <div className="field">
                <label htmlFor="task-time">{t("field.time")}</label>
                <input id="task-time" type="time" className="input" value={current.time ?? ""} onChange={(e) => update(current.id, { time: e.target.value || null })} />
              </div>
            </div>

            <fieldset className="field">
              <legend>{t("field.priority")}</legend>
              <div className="segmented">
                {PRIORITIES.map((p) => (
                  <button key={p} type="button" className={`pri-${p} ${current.priority === p ? "is-on" : ""}`} aria-pressed={current.priority === p} onClick={() => update(current.id, { priority: p })}>
                    <i className="pri-dot" aria-hidden="true" />
                    {t(`pri.${p}`)}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="field">
              <legend>{t("field.category")}</legend>
              <div className="cat-picker">
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" style={{ "--cat": `var(--cat-${c})` }} className={current.category === c ? "is-on" : ""} aria-pressed={current.category === c} onClick={() => update(current.id, { category: c })}>
                    <i className="dot" aria-hidden="true" />
                    {t(`cat.${c}`)}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="field">
              <legend>
                {t("field.subtasks")}
                {current.subtasks.length > 0 && (
                  <span className="legend-count">
                    {f.number(current.subtasks.filter((s) => s.done).length)}/{f.number(current.subtasks.length)}
                  </span>
                )}
              </legend>
              {current.subtasks.length > 0 && (
                <>
                  <div className="sub-bar" aria-hidden="true">
                    <i style={{ width: `${(current.subtasks.filter((s) => s.done).length / current.subtasks.length) * 100}%` }} />
                  </div>
                  <ul className="subtasks">
                    {current.subtasks.map((s) => (
                      <li key={s.id} className={s.done ? "is-done" : ""}>
                        <CheckButton size="sm" done={s.done} onToggle={() => dispatch({ type: "toggleSubtask", id: current.id, subId: s.id })} label={t(s.done ? "task.reopen" : "task.complete", { title: s.title })} />
                        <span dir="auto">{s.title}</span>
                        <button type="button" className="icon-btn icon-btn-sm" onClick={() => dispatch({ type: "removeSubtask", id: current.id, subId: s.id })} aria-label={t("drawer.removeSub", { title: s.title })}>
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <form
                className="sub-add"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!step.trim()) return;
                  dispatch({ type: "addSubtask", id: current.id, title: step });
                  setStep("");
                }}
              >
                <input className="input" dir="auto" value={step} onChange={(e) => setStep(e.target.value)} placeholder={t("field.subtaskPh")} aria-label={t("field.subtaskPh")} />
              </form>
            </fieldset>

            <div className="field">
              <label htmlFor="task-notes">{t("field.notes")}</label>
              <textarea id="task-notes" className="input notes" dir="auto" rows={4} value={current.notes} placeholder={t("field.notesPh")} onChange={(e) => update(current.id, { notes: e.target.value })} />
            </div>

            <p className="drawer-stamps">
              <span>{t("drawer.created", { date: f.stamp(current.createdAt) })}</span>
              {current.completedAt && <span>{t("drawer.completed", { date: f.stamp(current.completedAt) })}</span>}
              {current.focus > 0 && <span>{t("drawer.focused", { time: f.duration(current.focus) })}</span>}
            </p>
          </div>
        ) : null}

        {task && (
          <footer className="drawer-foot">
            {focus?.id === task.id ? (
              <button type="button" className="btn btn-soft" onClick={stopFocus}>
                <Square size={15} aria-hidden="true" />
                {t("focus.stop")}
              </button>
            ) : (
              task.status !== "done" && (
                <button type="button" className="btn btn-soft" onClick={() => startFocus(task.id)}>
                  <Play size={15} aria-hidden="true" />
                  {t("drawer.focus")}
                </button>
              )
            )}
            <button
              type="button"
              className="btn btn-danger-ghost"
              onClick={() => {
                const doomed = task.id;
                close();
                remove(doomed);
              }}
            >
              <Trash2 size={15} aria-hidden="true" />
              {t("drawer.delete")}
            </button>
          </footer>
        )}
      </div>
    </dialog>
  );
}
