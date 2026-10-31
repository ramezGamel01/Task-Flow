import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { STRINGS } from "./strings.js";
import { store } from "../lib/storage.js";
import { diffDays, parseIso, todayIso } from "../lib/dates.js";

const I18nContext = createContext(null);

export const localeOf = (lang) => (lang === "ar" ? "ar-EG" : "en-GB");

export function makeTranslator(lang) {
  const plural = new Intl.PluralRules(lang === "ar" ? "ar" : "en");
  const digits = new Intl.NumberFormat(localeOf(lang));
  const dict = STRINGS[lang];
  return function t(key, vars = {}) {
    let entry = dict[key] ?? STRINGS.en[key] ?? key;
    if (typeof entry === "object") {
      const n = Number(vars.n ?? 0);
      // English has no "zero" category, so an explicit zero form is checked first
      entry = (n === 0 && entry.zero) || entry[plural.select(n)] || entry.other;
    }
    // Numbers come out in the page's own digits (Arabic-Indic in Arabic)
    return entry.replace(/\{(\w+)\}/g, (_, name) => {
      const v = vars[name];
      if (v === undefined) return `{${name}}`;
      return typeof v === "number" ? digits.format(v) : String(v);
    });
  };
}

export function makeFormat(lang) {
  const locale = localeOf(lang);
  const t = makeTranslator(lang);
  const number = new Intl.NumberFormat(locale);
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const two = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 });
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const dayYear = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  const longDay = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });
  const monthYear = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const dayNum = new Intl.DateTimeFormat(locale, { day: "numeric" });
  const weekdayShort = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const weekdayLong = new Intl.DateTimeFormat(locale, { weekday: "long" });
  const clock = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  // 4 January 2026 was a Sunday: a fixed week to name weekdays by index
  const weekdayDate = (i) => new Date(2026, 0, 4 + i);

  return {
    number: (v) => number.format(v),
    percent: (v) => percent.format(v),
    day: (iso) => day.format(parseIso(iso)),
    dayYear: (iso) => dayYear.format(parseIso(iso)),
    longDay: (iso) => longDay.format(parseIso(iso)),
    monthYear: (date) => monthYear.format(date),
    dayNum: (iso) => dayNum.format(parseIso(iso)),
    weekdayShort: (i) => weekdayShort.format(weekdayDate(i)),
    weekdayLong: (i) => weekdayLong.format(weekdayDate(i)),
    stamp: (isoTime) => dayYear.format(new Date(isoTime)),
    time(hhmm) {
      const [h, m] = hhmm.split(":").map(Number);
      return clock.format(new Date(2026, 0, 1, h, m));
    },
    // "today", "tomorrow", "in 3 days", then a plain date further out
    relDay(iso, today = todayIso()) {
      const days = diffDays(today, iso);
      if (Math.abs(days) <= 6) return relative.format(days, "day");
      return parseIso(iso).getFullYear() === parseIso(today).getFullYear() ? day.format(parseIso(iso)) : dayYear.format(parseIso(iso));
    },
    duration(minutes) {
      const h = Math.floor(minutes / 60);
      const m = Math.round(minutes % 60);
      if (h && m) return t("dur.hm", { h, m });
      if (h) return t("dur.h", { h });
      return t("dur.m", { m });
    },
    clock(seconds) {
      const s = Math.max(0, Math.ceil(seconds));
      return t("dur.clock", { m: two.format(Math.floor(s / 60)), s: two.format(s % 60) });
    },
  };
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => (store.get("taskflow:lang") === "ar" ? "ar" : "en"));

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((next) => {
    store.set("taskflow:lang", next);
    const apply = () => setLangState(next);
    // Cross-fade the whole page when the browser supports view transitions
    if (document.startViewTransition && !document.documentElement.classList.contains("no-motion")) {
      document.startViewTransition(apply);
    } else apply();
  }, []);

  const value = useMemo(
    () => ({ lang, setLang, t: makeTranslator(lang), f: makeFormat(lang), dir: lang === "ar" ? "rtl" : "ltr" }),
    [lang, setLang]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
