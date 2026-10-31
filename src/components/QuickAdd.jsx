// The quick add field. Recognised words light up inside the field as you type, and chips
// underneath show what they were read as. A copy of the text sits behind the input, coloured,
// while the input's own text is transparent; the two scroll together.
import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Clock, CornerDownLeft, Flag, Hash, Plus } from "lucide-react";
import { parseQuickAdd } from "../lib/parse.js";
import { todayIso } from "../lib/dates.js";
import { useI18n } from "../i18n/I18n.jsx";
import { useTasks } from "../state/TasksProvider.jsx";
import { useApp } from "../state/app.jsx";

const ICONS = { date: CalendarDays, time: Clock, category: Hash, priority: Flag };

const QuickAdd = forwardRef(function QuickAdd({ defaults = {}, onAdded, autoFocus = false, compact = false, id = "quick-add" }, ref) {
  const { t, f, dir } = useI18n();
  const { add } = useTasks();
  const { toast } = useApp();
  const [text, setText] = useState("");
  const input = useRef(null);
  const mirror = useRef(null);
  const today = todayIso();
  const parsed = useMemo(() => parseQuickAdd(text, today), [text, today]);

  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }), []);

  useLayoutEffect(() => {
    if (mirror.current && input.current) mirror.current.scrollLeft = input.current.scrollLeft;
  });

  const pieces = useMemo(() => {
    const out = [];
    let cursor = 0;
    for (const token of parsed.tokens) {
      if (token.start > cursor) out.push({ text: text.slice(cursor, token.start) });
      out.push({ text: text.slice(token.start, token.start + token.text.length), type: token.type });
      cursor = token.start + token.text.length;
    }
    out.push({ text: text.slice(cursor) });
    return out;
  }, [parsed, text]);

  const describe = (token) => {
    if (token.type === "date") return f.relDay(token.value, today);
    if (token.type === "time") return f.time(token.value);
    if (token.type === "category") return t(`cat.${token.value}`);
    return t(`pri.${token.value}`);
  };

  function submit(e) {
    e.preventDefault();
    if (!parsed.title) return;
    const task = {
      title: parsed.title,
      due: parsed.due ?? defaults.due ?? null,
      time: parsed.time,
      priority: parsed.priority ?? defaults.priority ?? "medium",
      category: parsed.category ?? defaults.category ?? "other",
      status: defaults.status ?? "todo",
    };
    add(task);
    toast(t("qa.added", { title: task.title }));
    setText("");
    onAdded?.(task);
  }

  return (
    <form className={`qa ${compact ? "qa-compact" : ""} ${text ? "has-text" : ""}`} onSubmit={submit} role="search" aria-label={t("qa.label")}>
      <div className="qa-row">
        <Plus className="qa-plus" size={20} aria-hidden="true" />
        <div className="qa-field">
          <div className="qa-mirror" ref={mirror} aria-hidden="true" dir={text ? "auto" : dir}>
            {pieces.map((p, i) =>
              p.type ? (
                <mark key={i} className={`qa-mark qa-${p.type}`}>
                  {p.text}
                </mark>
              ) : (
                <span key={i}>{p.text}</span>
              )
            )}
          </div>
          <input
            ref={input}
            id={id}
            className="qa-input"
            dir={text ? "auto" : dir}
            value={text}
            autoFocus={autoFocus}
            autoComplete="off"
            spellCheck="false"
            placeholder={t("qa.placeholder")}
            aria-label={t("qa.label")}
            aria-describedby={`${id}-hint`}
            onChange={(e) => setText(e.target.value)}
            onScroll={(e) => mirror.current && (mirror.current.scrollLeft = e.currentTarget.scrollLeft)}
          />
        </div>
        <button type="submit" className="btn btn-primary qa-submit" disabled={!parsed.title}>
          <span>{t("qa.add")}</span>
          <CornerDownLeft size={15} aria-hidden="true" />
        </button>
      </div>
      <div className="qa-foot" id={`${id}-hint`} aria-live="polite">
        {parsed.tokens.length ? (
          <ul className="qa-tokens">
            {parsed.tokens.map((token) => {
              const Icon = ICONS[token.type];
              return (
                <li key={`${token.type}-${token.start}`} className={`qa-token qa-${token.type}`} style={token.type === "category" ? { "--cat": `var(--cat-${token.value})` } : undefined}>
                  <Icon size={12} aria-hidden="true" />
                  {t(`qa.token.${token.type}`, { value: describe(token) })}
                </li>
              );
            })}
          </ul>
        ) : (
          !compact && <p className="qa-hint">{t("qa.hint")}</p>
        )}
      </div>
    </form>
  );
});

export default QuickAdd;
