import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Inbox, RotateCcw, Search, Trash2 } from "lucide-react";
import TaskItem from "../components/TaskItem.jsx";
import { Empty, PageHead } from "../components/bits.jsx";
import { Confirm } from "../components/overlays.jsx";
import { useI18n } from "../i18n/I18n.jsx";
import { useTasks } from "../state/TasksProvider.jsx";
import { CATEGORIES, compareTasks, matchesQuery, PRIORITIES, STATUSES } from "../state/tasks.js";
import { BUCKETS, bucketOf, todayIso } from "../lib/dates.js";

const SORTS = ["due", "priority", "created", "title"];
const GROUPS = ["date", "category", "none"];

// Filters live in the URL, so the sidebar's category links and Back both work
function useFilters() {
  const [params, setParams] = useSearchParams();
  const list = (key) => (params.get(key) ? params.get(key).split(",") : []);
  const filters = {
    q: params.get("q") ?? "",
    status: STATUSES.includes(params.get("status")) ? params.get("status") : "all",
    priority: list("priority").filter((p) => PRIORITIES.includes(p)),
    category: list("category").filter((c) => CATEGORIES.includes(c)),
    sort: SORTS.includes(params.get("sort")) ? params.get("sort") : "due",
    group: GROUPS.includes(params.get("group")) ? params.get("group") : "date",
  };
  const set = (key, value) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        const v = Array.isArray(value) ? value.join(",") : value;
        const isDefault = !v || (key === "status" && v === "all") || (key === "sort" && v === "due") || (key === "group" && v === "date");
        if (isDefault) next.delete(key);
        else next.set(key, v);
        return next;
      },
      { replace: true }
    );
  const reset = () =>
    setParams(
      (p) => {
        const next = new URLSearchParams();
        if (p.get("task")) next.set("task", p.get("task"));
        return next;
      },
      { replace: true }
    );
  return { filters, set, reset };
}

export default function List() {
  const { t, f } = useI18n();
  const { tasks, dispatch } = useTasks();
  const { filters, set, reset } = useFilters();
  const [confirm, setConfirm] = useState(false);
  const today = todayIso();

  const filtered = useMemo(
    () =>
      tasks
        .filter((x) => filters.status === "all" || x.status === filters.status)
        .filter((x) => !filters.priority.length || filters.priority.includes(x.priority))
        .filter((x) => !filters.category.length || filters.category.includes(x.category))
        .filter((x) => matchesQuery(x, filters.q))
        .sort(compareTasks(filters.sort)),
    [tasks, filters.status, filters.priority, filters.category, filters.q, filters.sort]
  );

  const groups = useMemo(() => {
    if (filters.group === "none") return [{ key: "all", title: null, items: filtered }];
    if (filters.group === "category")
      return CATEGORIES.map((c) => ({ key: c, title: t(`cat.${c}`), cat: c, items: filtered.filter((x) => x.category === c) })).filter((g) => g.items.length);
    return BUCKETS.map((b) => ({ key: b, title: t(`bucket.${b}`), tone: b, items: filtered.filter((x) => bucketOf(x, today) === b) })).filter((g) => g.items.length);
  }, [filtered, filters.group, t, today]);

  const doneCount = tasks.filter((x) => x.status === "done").length;
  const anyFilter = filters.q || filters.status !== "all" || filters.priority.length || filters.category.length;
  const toggleIn = (key, value) => set(key, filters[key].includes(value) ? filters[key].filter((v) => v !== value) : [...filters[key], value]);

  return (
    <div className="page list-page">
      <PageHead title={t("nav.list")} lead={t("list.lead")}>
        {doneCount > 0 && (
          <button type="button" className="btn btn-small btn-ghost" onClick={() => setConfirm(true)}>
            <Trash2 size={15} aria-hidden="true" />
            {t("list.clearDone")}
          </button>
        )}
      </PageHead>

      <div className="toolbar">
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">{t("list.search")}</span>
          <input type="search" dir="auto" value={filters.q} onChange={(e) => set("q", e.target.value)} placeholder={t("list.search")} />
        </label>
        <div className="segmented segmented-sm" role="group" aria-label={t("field.status")}>
          {["all", ...STATUSES].map((s) => (
            <button key={s} type="button" className={filters.status === s ? "is-on" : ""} aria-pressed={filters.status === s} onClick={() => set("status", s)}>
              {s === "all" ? t("list.all") : t(`status.${s}`)}
            </button>
          ))}
        </div>
        <div className="toolbar-selects">
          <label className="select">
            <span>{t("list.sort")}</span>
            <select value={filters.sort} onChange={(e) => set("sort", e.target.value)}>
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {t(`sort.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="select">
            <span>{t("list.group")}</span>
            <select value={filters.group} onChange={(e) => set("group", e.target.value)}>
              {GROUPS.map((g) => (
                <option key={g} value={g}>
                  {t(`group.${g}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="filter-row">
        <div role="group" aria-label={t("list.priority")} className="filter-set">
          {PRIORITIES.map((p) => (
            <button key={p} type="button" className={`filter-chip pri-${p} ${filters.priority.includes(p) ? "is-on" : ""}`} aria-pressed={filters.priority.includes(p)} onClick={() => toggleIn("priority", p)}>
              <i className="pri-dot" aria-hidden="true" />
              {t(`pri.${p}`)}
            </button>
          ))}
        </div>
        <div role="group" aria-label={t("list.category")} className="filter-set">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" style={{ "--cat": `var(--cat-${c})` }} className={`filter-chip ${filters.category.includes(c) ? "is-on" : ""}`} aria-pressed={filters.category.includes(c)} onClick={() => toggleIn("category", c)}>
              <i className="dot" aria-hidden="true" />
              {t(`cat.${c}`)}
            </button>
          ))}
        </div>
        {anyFilter ? (
          <button type="button" className="link-btn" onClick={reset}>
            <RotateCcw size={14} aria-hidden="true" />
            {t("list.reset")}
          </button>
        ) : null}
      </div>

      <p className="list-count" aria-live="polite">
        {t("list.count", { n: filtered.length })}
      </p>

      {filtered.length === 0 ? (
        <Empty icon={Inbox} title={t("list.empty")}>
          {anyFilter ? (
            <button type="button" className="btn btn-soft btn-small" onClick={reset}>
              {t("list.reset")}
            </button>
          ) : null}
        </Empty>
      ) : (
        groups.map((g) => (
          <section key={g.key} className={`plan-section ${g.tone === "overdue" ? "tone-danger" : ""}`}>
            {g.title && (
              <header className="plan-head">
                <h2 style={g.cat ? { "--cat": `var(--cat-${g.cat})` } : undefined}>
                  {g.cat && <i className="dot" aria-hidden="true" />}
                  {g.title}
                  <span className="plan-count">{f.number(g.items.length)}</span>
                </h2>
              </header>
            )}
            <ul className="task-list">
              {g.items.map((task) => (
                <TaskItem key={task.id} task={task} today={today} showCategory={filters.group !== "category"} />
              ))}
            </ul>
          </section>
        ))
      )}

      <Confirm open={confirm} onClose={() => setConfirm(false)} onConfirm={() => dispatch({ type: "clearDone" })} title={t("dialog.clearDone.title")} body={t("dialog.clearDone.body")} />
    </div>
  );
}
