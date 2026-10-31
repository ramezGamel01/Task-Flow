import { useRef, useState } from "react";
import { Download, ExternalLink, Sparkles, Trash2, Upload } from "lucide-react";
import { PageHead } from "../components/bits.jsx";
import { Confirm } from "../components/overlays.jsx";
import { useWeekStart } from "../state/hooks.js";
import { useI18n } from "../i18n/I18n.jsx";
import { useApp } from "../state/app.jsx";
import { useTasks } from "../state/TasksProvider.jsx";
import { normalizeTask } from "../state/tasks.js";
import { demoTasks } from "../data/seed.js";
import { todayIso } from "../lib/dates.js";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_TASKS = 5000;

function Row({ label, hint, htmlFor, children }) {
  return (
    <div className="set-row">
      <div className="set-text">
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <p className="set-label">{label}</p>}
        {hint && <p className="set-hint">{hint}</p>}
      </div>
      <div className="set-control">{children}</div>
    </div>
  );
}

function Switch({ on, onChange, label }) {
  const { t } = useI18n();
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? "is-on" : ""}`} onClick={() => onChange(!on)}>
      <span className="switch-knob" aria-hidden="true" />
      <span className="switch-text">{on ? t("set.on") : t("set.off")}</span>
    </button>
  );
}

export default function Settings() {
  const { t, f, lang, setLang } = useI18n();
  const { theme, setTheme, motion, setMotion, sound, setSound, name, setName, setWeekStart, toast } = useApp();
  const { tasks, dispatch } = useTasks();
  const weekStart = useWeekStart();
  const [confirm, setConfirm] = useState(null);
  const file = useRef(null);

  function exportTasks() {
    const blob = new Blob([JSON.stringify({ app: "taskflow", version: 2, exportedAt: new Date().toISOString(), tasks }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taskflow-${todayIso()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importTasks(event) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    // A real export is a few hundred kilobytes; refuse anything huge rather than freeze the tab
    if (chosen.size > MAX_IMPORT_BYTES) {
      toast(t("set.importFailed"));
      return;
    }
    try {
      const data = JSON.parse(await chosen.text());
      const list = Array.isArray(data) ? data : data.tasks;
      if (!Array.isArray(list)) throw new Error("not a task list");
      const imported = list
        .slice(0, MAX_IMPORT_TASKS)
        .filter((x) => x && typeof x === "object" && x.title)
        .map((x) => normalizeTask(x));
      if (!imported.length) throw new Error("empty");
      // Imported tasks join the list; ones with the same id replace the old copy
      const ids = new Set(imported.map((x) => x.id));
      dispatch({ type: "replace", tasks: [...imported, ...tasks.filter((x) => !ids.has(x.id))] });
      toast(t("set.imported", { n: imported.length }));
    } catch {
      toast(t("set.importFailed"));
    }
  }

  return (
    <div className="page settings-page">
      <PageHead title={t("nav.settings")} lead={t("set.lead")} />

      <section className="panel set-group">
        <h2>{t("set.profile")}</h2>
        <Row label={t("set.name")} hint={t("set.nameHint")} htmlFor="set-name">
          <input id="set-name" className="input" dir="auto" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
        </Row>
      </section>

      <section className="panel set-group">
        <h2>{t("set.appearance")}</h2>
        <Row label={t("set.theme")}>
          <div className="segmented segmented-sm">
            {["light", "dark"].map((v) => (
              <button key={v} type="button" className={theme === v ? "is-on" : ""} aria-pressed={theme === v} onClick={() => setTheme(v)}>
                {t(`set.${v}`)}
              </button>
            ))}
          </div>
        </Row>
        <Row label={t("set.language")}>
          <div className="segmented segmented-sm">
            <button type="button" lang="en" className={lang === "en" ? "is-on" : ""} aria-pressed={lang === "en"} onClick={() => setLang("en")}>
              English
            </button>
            <button type="button" lang="ar" className={lang === "ar" ? "is-on" : ""} aria-pressed={lang === "ar"} onClick={() => setLang("ar")}>
              العربية
            </button>
          </div>
        </Row>
        <Row label={t("set.weekStart")}>
          <div className="segmented segmented-sm">
            {[6, 0, 1].map((d) => (
              <button key={d} type="button" className={weekStart === d ? "is-on" : ""} aria-pressed={weekStart === d} onClick={() => setWeekStart(d)}>
                {f.weekdayLong(d)}
              </button>
            ))}
          </div>
        </Row>
        <Row label={t("set.motion")} hint={t("set.motionHint")}>
          <Switch on={motion} onChange={setMotion} label={t("set.motion")} />
        </Row>
        <Row label={t("set.sound")} hint={t("set.soundHint")}>
          <Switch on={sound} onChange={setSound} label={t("set.sound")} />
        </Row>
      </section>

      <section className="panel set-group">
        <h2>{t("set.data")}</h2>
        <p className="set-hint set-lead">{t("set.dataHint")}</p>
        <div className="set-actions">
          <button type="button" className="btn btn-soft" onClick={exportTasks}>
            <Download size={16} aria-hidden="true" />
            {t("set.export")}
          </button>
          <button type="button" className="btn btn-soft" onClick={() => file.current?.click()}>
            <Upload size={16} aria-hidden="true" />
            {t("set.import")}
          </button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={importTasks} />
          <button type="button" className="btn btn-soft" onClick={() => setConfirm("demo")}>
            <Sparkles size={16} aria-hidden="true" />
            {t("set.demo")}
          </button>
          <button type="button" className="btn btn-danger-ghost" onClick={() => setConfirm("wipe")}>
            <Trash2 size={16} aria-hidden="true" />
            {t("set.wipe")}
          </button>
        </div>
      </section>

      <section className="panel set-group">
        <h2>{t("set.about")}</h2>
        <p className="set-about">{t("set.aboutBody")}</p>
        <div className="set-actions">
          <a className="btn btn-ghost" href="https://github.com/ramezGamel01/Task-Flow" target="_blank" rel="noreferrer">
            {t("set.source")}
            <ExternalLink size={14} aria-hidden="true" />
          </a>
          <a className="btn btn-ghost" href="https://ramezgamel.vercel.app" target="_blank" rel="noreferrer">
            {t("set.portfolio")}
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      </section>

      <Confirm
        open={confirm === "wipe"}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          dispatch({ type: "replace", tasks: [] });
          toast(t("set.wiped"));
        }}
        title={t("dialog.wipe.title")}
        body={t("dialog.wipe.body")}
      />
      <Confirm
        open={confirm === "demo"}
        danger={false}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          dispatch({ type: "replace", tasks: demoTasks(lang) });
          toast(t("set.demoLoaded"));
        }}
        title={t("dialog.demo.title")}
        body={t("dialog.demo.body")}
        confirmLabel={t("dialog.demo.confirm")}
      />
    </div>
  );
}
