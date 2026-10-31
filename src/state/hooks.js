import { useApp } from "./app.jsx";
import { useI18n } from "../i18n/I18n.jsx";

// The first day of the week: the visitor's choice, else Saturday in Arabic (as in Egypt) and Monday in English
export function useWeekStart() {
  const { weekStart } = useApp();
  const { lang } = useI18n();
  return weekStart ?? (lang === "ar" ? 6 : 1);
}
