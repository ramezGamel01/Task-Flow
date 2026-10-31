import { useMemo, useRef } from "react";
import { ChartColumn, CircleCheck, Flame, Target, Timer, TrendingDown, TrendingUp } from "lucide-react";
import { Empty, PageHead } from "../components/bits.jsx";
import { useOnScreen } from "../three/SceneGuard.jsx";
import { useI18n } from "../i18n/I18n.jsx";
import { useTasks } from "../state/TasksProvider.jsx";
import { busiestWeekday, byCategory, completionsByDay, focusTotal, onTimeRate, streak, weekCompare } from "../lib/insights.js";
import { parseIso, todayIso } from "../lib/dates.js";

function Kpi({ icon: Icon, label, value, note, tone }) {
  return (
    <div className={`kpi ${tone ? `kpi-${tone}` : ""}`}>
      <span className="kpi-icon" aria-hidden="true">
        <Icon size={18} />
      </span>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
      {note && <p className="kpi-note">{note}</p>}
    </div>
  );
}

function BarChart({ data, today }) {
  const { t, f, dir } = useI18n();
  const box = useRef(null);
  const seen = useOnScreen(box, "0px");
  const W = 900;
  const H = 260;
  const pad = { top: 28, bottom: 46, side: 10 };
  const max = Math.max(3, ...data.map((d) => d.count));
  const slot = (W - pad.side * 2) / data.length;
  const barW = Math.min(34, slot * 0.5);
  const plotH = H - pad.top - pad.bottom;
  const steps = [0, Math.ceil(max / 2), max];
  return (
    <figure className={`chart ${seen ? "is-in" : ""}`} ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("ins.chart")}>
        <defs>
          <linearGradient id="bar-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent-2)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        {steps.map((s) => {
          const y = pad.top + plotH - (s / max) * plotH;
          return <line key={s} x1={pad.side} x2={W - pad.side} y1={y} y2={y} className="chart-grid" />;
        })}
        {data.map((d, i) => {
          // Arabic reads right to left, so the newest day sits on the left
          const at = dir === "rtl" ? data.length - 1 - i : i;
          const x = pad.side + at * slot + (slot - barW) / 2;
          const h = d.count ? Math.max(6, (d.count / max) * plotH) : 3;
          const y = pad.top + plotH - h;
          const date = parseIso(d.day);
          return (
            <g key={d.day} className={`bar ${d.day === today ? "is-today" : ""}`} style={{ "--i": i }}>
              <title>{t("ins.bar", { date: f.day(d.day), count: d.count })}</title>
              <rect className="bar-hit" x={pad.side + at * slot} y={pad.top} width={slot} height={plotH} />
              <rect className="bar-fill" x={x} y={y} width={barW} height={h} rx={Math.min(8, barW / 2)} style={{ transformOrigin: `${x + barW / 2}px ${pad.top + plotH}px` }} />
              {d.count > 0 && (
                <text className="bar-value" x={x + barW / 2} y={y - 8} textAnchor="middle">
                  {f.number(d.count)}
                </text>
              )}
              <text className="bar-day" x={x + barW / 2} y={H - 24} textAnchor="middle">
                {f.weekdayShort(date.getDay())}
              </text>
              <text className="bar-date" x={x + barW / 2} y={H - 8} textAnchor="middle">
                {f.dayNum(d.day)}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export default function Insights() {
  const { t, f } = useI18n();
  const { tasks } = useTasks();
  const today = todayIso();
  const stats = useMemo(
    () => ({
      days: completionsByDay(tasks, 14, today),
      week: weekCompare(tasks, today),
      streak: streak(tasks, today),
      onTime: onTimeRate(tasks),
      focus: focusTotal(tasks),
      categories: byCategory(tasks),
      busiest: busiestWeekday(tasks),
      topFocus: tasks.filter((x) => x.focus > 0).sort((a, b) => b.focus - a.focus).slice(0, 4),
    }),
    [tasks, today]
  );
  const anyDone = tasks.some((x) => x.status === "done");
  const delta = stats.week.delta;
  const catMax = Math.max(1, ...stats.categories.map((c) => c.open + c.done));
  const focusMax = Math.max(1, ...stats.topFocus.map((x) => x.focus));

  return (
    <div className="page insights-page">
      <PageHead title={t("nav.insights")} lead={t("ins.lead")} />
      {!anyDone ? (
        <Empty icon={ChartColumn} title={t("ins.empty")} />
      ) : (
        <>
          <div className="kpis">
            <Kpi
              icon={delta >= 0 ? TrendingUp : TrendingDown}
              label={t("ins.week")}
              value={f.number(stats.week.current)}
              note={delta === 0 ? t("ins.same") : t("ins.vsLast", { n: Math.abs(delta), sign: delta > 0 ? "+" : "−" })}
              tone={delta > 0 ? "up" : delta < 0 ? "down" : undefined}
            />
            <Kpi icon={Flame} label={t("ins.streak")} value={f.number(stats.streak)} note={t("ins.streakNote")} tone="warm" />
            <Kpi icon={Target} label={t("ins.onTime")} value={stats.onTime === null ? "–" : f.percent(stats.onTime)} note={t("ins.onTimeNote")} />
            <Kpi icon={Timer} label={t("ins.focus")} value={f.duration(stats.focus)} note={t("ins.focusNote")} />
          </div>

          <div className="insight-grid">
            <section className="panel panel-wide">
              <header className="panel-head">
                <h2>{t("ins.chart")}</h2>
                {stats.busiest !== null && <p className="panel-note">{t("ins.busiest", { day: f.weekdayLong(stats.busiest) })}</p>}
              </header>
              <BarChart data={stats.days} today={today} />
            </section>

            <section className="panel">
              <header className="panel-head">
                <h2>{t("ins.categories")}</h2>
                <p className="legend">
                  <span>
                    <i className="legend-done" aria-hidden="true" />
                    {t("ins.done")}
                  </span>
                  <span>
                    <i className="legend-open" aria-hidden="true" />
                    {t("ins.open")}
                  </span>
                </p>
              </header>
              <ul className="cat-bars">
                {stats.categories.map((c) => (
                  <li key={c.category} style={{ "--cat": `var(--cat-${c.category})` }}>
                    <span className="cat-name">
                      <i className="dot" aria-hidden="true" />
                      {t(`cat.${c.category}`)}
                    </span>
                    <span className="cat-track" role="img" aria-label={`${t(`cat.${c.category}`)}: ${t("ins.done")} ${f.number(c.done)}, ${t("ins.open")} ${f.number(c.open)}`}>
                      <i className="cat-done" style={{ width: `${(c.done / catMax) * 100}%` }} />
                      <i className="cat-open" style={{ width: `${(c.open / catMax) * 100}%` }} />
                    </span>
                    <span className="cat-num">
                      {f.number(c.done)}
                      <small>/{f.number(c.done + c.open)}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {stats.topFocus.length > 0 && (
              <section className="panel">
                <header className="panel-head">
                  <h2>{t("ins.topFocus")}</h2>
                </header>
                <ul className="focus-list">
                  {stats.topFocus.map((x) => (
                    <li key={x.id} style={{ "--cat": `var(--cat-${x.category})` }}>
                      <span className="focus-name" dir="auto">
                        {x.status === "done" && <CircleCheck size={14} aria-hidden="true" />}
                        {x.title}
                      </span>
                      <span className="focus-bar" aria-hidden="true">
                        <i style={{ width: `${(x.focus / focusMax) * 100}%` }} />
                      </span>
                      <span className="focus-min">{f.duration(x.focus)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
