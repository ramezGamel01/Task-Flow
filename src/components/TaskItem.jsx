import { Timer, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router";
import { CheckButton, TaskMeta } from "./bits.jsx";
import { useI18n } from "../i18n/I18n.jsx";
import { useTasks } from "../state/TasksProvider.jsx";
import { todayIso } from "../lib/dates.js";

// Opens a task in the side panel; the task id lives in the URL, so Back closes it
export function useOpenTask() {
  const [, setParams] = useSearchParams();
  return (id) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.set("task", id);
        return next;
      },
      { state: { drawer: true } }
    );
}

export default function TaskItem({ task, today = todayIso(), showCategory = true, style }) {
  const { t } = useI18n();
  const { toggle, remove, focus } = useTasks();
  const open = useOpenTask();
  const done = task.status === "done";
  const focusing = focus?.id === task.id;
  return (
    <li
      className={`task ${done ? "is-done" : ""} ${task.status === "doing" ? "is-doing" : ""} ${focusing ? "is-focusing" : ""}`}
      style={{ "--cat": `var(--cat-${task.category})`, ...style }}
    >
      <CheckButton done={done} onToggle={() => toggle(task.id)} label={t(done ? "task.reopen" : "task.complete", { title: task.title })} />
      <button type="button" className="task-main" onClick={() => open(task.id)} aria-label={t("task.open", { title: task.title })}>
        <span className="task-title">
          {task.title}
          {focusing && (
            <span className="focus-badge">
              <Timer size={11} aria-hidden="true" />
              {t("task.focusing")}
            </span>
          )}
        </span>
        <TaskMeta task={task} today={today} compact={!showCategory} />
      </button>
      <button type="button" className="icon-btn task-delete" onClick={() => remove(task.id)} aria-label={t("task.delete", { title: task.title })} title={t("task.delete", { title: task.title })}>
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </li>
  );
}
