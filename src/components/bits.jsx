// Small shared pieces: the logo, the done checkbox, task meta chips, progress ring and empty states.
import { useEffect, useId, useRef, useState } from "react";
import { Check, Clock, Flag, ListChecks, StickyNote, Timer } from "lucide-react";
import { useI18n } from "../i18n/I18n.jsx";
import { diffDays, todayIso } from "../lib/dates.js";

export function Logo({ size = 30 }) {
  // Each logo needs its own gradient id: a hidden copy's gradient can't paint a visible one
  const id = `logo-${useId().replace(/:/g, "")}`;
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a99bff" />
          <stop offset="1" stopColor="#6c4cf5" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="20" rx="17" ry="7.5" fill="none" stroke={`url(#${id})`} strokeWidth="2.2" transform="rotate(-28 20 20)" opacity="0.55" />
      <circle cx="20" cy="20" r="10.5" fill={`url(#${id})`} />
      <path d="M15.2 20.4l3.2 3.1 6.6-7" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="34.2" cy="12.4" r="2.6" fill="#ff8fb3" />
    </svg>
  );
}

// The round done button, with a burst when a task gets finished
export function CheckButton({ done, onToggle, label, size = "md" }) {
  const [burst, setBurst] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      className={`check check-${size} ${done ? "is-done" : ""} ${burst ? "is-burst" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!done) {
          setBurst(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setBurst(false), 700);
        }
        onToggle();
      }}
    >
      <Check size={size === "sm" ? 12 : 14} strokeWidth={3} aria-hidden="true" />
      <span className="check-burst" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <i key={i} style={{ "--a": `${i * 45}deg` }} />
        ))}
      </span>
    </button>
  );
}

export function TaskMeta({ task, compact = false, today = todayIso() }) {
  const { t, f } = useI18n();
  const late = task.status !== "done" && task.due && task.due < today ? diffDays(task.due, today) : 0;
  const subDone = task.subtasks.filter((s) => s.done).length;
  return (
    <span className="meta">
      {task.due && (
        <span className={`chip chip-due ${late ? "is-late" : task.due === today ? "is-today" : ""}`}>
          {late ? t("task.late", { n: late }) : f.relDay(task.due, today)}
        </span>
      )}
      {task.time && (
        <span className="chip">
          <Clock size={12} aria-hidden="true" />
          {f.time(task.time)}
        </span>
      )}
      {!compact && (
        <span className="chip chip-cat" style={{ "--cat": `var(--cat-${task.category})` }}>
          <i className="dot" aria-hidden="true" />
          {t(`cat.${task.category}`)}
        </span>
      )}
      {task.priority !== "low" && (
        <span className={`chip chip-pri pri-${task.priority}`} title={t("pri.flag", { level: t(`pri.${task.priority}`) })}>
          <Flag size={12} aria-hidden="true" />
          <span className={compact ? "sr-only" : ""}>{t(`pri.${task.priority}`)}</span>
        </span>
      )}
      {task.subtasks.length > 0 && (
        <span className="chip" title={t("task.subtasks", { done: subDone, total: task.subtasks.length })}>
          <ListChecks size={12} aria-hidden="true" />
          <span aria-hidden="true">
            {f.number(subDone)}/{f.number(task.subtasks.length)}
          </span>
          <span className="sr-only">{t("task.subtasks", { done: subDone, total: task.subtasks.length })}</span>
        </span>
      )}
      {task.notes && !compact && (
        <span className="chip chip-icon" title={t("task.notes")}>
          <StickyNote size={12} aria-hidden="true" />
          <span className="sr-only">{t("task.notes")}</span>
        </span>
      )}
      {task.focus > 0 && !compact && (
        <span className="chip">
          <Timer size={12} aria-hidden="true" />
          {f.duration(task.focus)}
        </span>
      )}
    </span>
  );
}

export function ProgressRing({ value, size = 120, stroke = 10, label, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id={`ring-g-${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent-2)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          className="ring-value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#ring-g-${size})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="empty">
      <span className="empty-art" aria-hidden="true">
        <i />
        <i />
        <Icon size={26} />
      </span>
      <p className="empty-title">{title}</p>
      {children && <div className="empty-body">{children}</div>}
    </div>
  );
}

export function PageHead({ title, lead, children }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

export function Kbd({ children }) {
  return <kbd className="kbd">{children}</kbd>;
}
