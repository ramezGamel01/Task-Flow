// Quick add that understands plain language, in English and Arabic:
//   "Call mom tomorrow at 6pm #personal !high"
//   "تسليم التقرير بكرة الساعة 3 #عمل !عاجل"
// Dates, times, #categories and !priorities are lifted out of the text and the rest is the title.
import { addDays, todayIso, parseIso, toIso } from "./dates.js";

// Arabic-Indic digits are read as Western digits; the mapping is one character to one,
// so match positions still line up with the original text.
const toWestern = (s) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

// JavaScript's \b only knows Latin letters, so word edges are spelled out
const START = "(?<=^|[\\s,،.])";
const END = "(?=$|[\\s,،.!?؟])";

export const CATEGORY_WORDS = {
  work: ["work", "job", "office", "عمل", "شغل"],
  personal: ["personal", "home", "life", "شخصي", "بيت"],
  study: ["study", "school", "learn", "uni", "دراسة", "مذاكرة", "تعلم"],
  fitness: ["fitness", "gym", "health", "sport", "رياضة", "جيم", "صحة"],
  shopping: ["shopping", "shop", "buy", "تسوق", "مشتريات", "شراء"],
  other: ["other", "misc", "أخرى", "اخرى", "متفرقات"],
};

const PRIORITY_WORDS = {
  // "!!!" and "!!" mean high, a lone "!" means medium
  high: ["high", "h", "1", "urgent", "!!", "!", "عالي", "عالية", "مهم", "عاجل"],
  medium: ["medium", "med", "m", "2", "متوسط", "متوسطة"],
  low: ["low", "l", "3", "منخفض", "منخفضة", "عادي"],
};

const WEEKDAYS = [
  ["sunday", "sun", "الأحد", "الاحد"],
  ["monday", "mon", "الاثنين", "الإثنين", "الاتنين"],
  ["tuesday", "tue", "tues", "الثلاثاء", "التلات"],
  ["wednesday", "wed", "الأربعاء", "الاربعاء", "الاربع"],
  ["thursday", "thu", "thur", "thurs", "الخميس"],
  ["friday", "fri", "الجمعة", "الجمعه"],
  ["saturday", "sat", "السبت"],
];

const MONTHS = [
  ["january", "jan", "يناير"],
  ["february", "feb", "فبراير"],
  ["march", "mar", "مارس"],
  ["april", "apr", "أبريل", "ابريل"],
  ["may", "مايو"],
  ["june", "jun", "يونيو", "يونيه"],
  ["july", "jul", "يوليو", "يوليه"],
  ["august", "aug", "أغسطس", "اغسطس"],
  ["september", "sep", "sept", "سبتمبر"],
  ["october", "oct", "أكتوبر", "اكتوبر"],
  ["november", "nov", "نوفمبر"],
  ["december", "dec", "ديسمبر"],
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const alt = (words) => words.slice().sort((a, b) => b.length - a.length).map(escape).join("|");

const monthAlt = alt(MONTHS.flat());
const monthIndex = (word) => MONTHS.findIndex((names) => names.includes(word.toLowerCase()));

// Each rule finds one kind of token; the first match of each kind wins
const DATE_RULES = [
  {
    re: new RegExp(`${START}(?:the\\s+)?day\\s+after\\s+tomorrow${END}|${START}بعد\\s+(?:بكرة|بكره|غدا|غدًا|غداً|غد)${END}`, "i"),
    date: (_, today) => addDays(today, 2),
  },
  {
    re: new RegExp(`${START}(?:today|tonight|اليوم|النهارده|النهاردة|الليلة|الليله)${END}`, "i"),
    date: (_, today) => today,
  },
  {
    re: new RegExp(`${START}(?:tomorrow|tmrw|tmr|بكرة|بكره|غدا|غدًا|غداً)${END}`, "i"),
    date: (_, today) => addDays(today, 1),
  },
  {
    re: new RegExp(`${START}(?:next\\s+week|الأسبوع\\s+(?:الجاي|القادم|الجاية)|الاسبوع\\s+(?:الجاي|القادم|الجاية))${END}`, "i"),
    date: (_, today) => addDays(today, 7),
  },
  {
    re: new RegExp(`${START}(?:in\\s+(\\d{1,3})\\s+(days?|weeks?)|بعد\\s+(\\d{1,3})\\s+(يوم|أيام|ايام|أسبوع|اسبوع|أسابيع|اسابيع))${END}`, "i"),
    date(m, today) {
      const n = Number(m[1] ?? m[3]);
      const unit = (m[2] ?? m[4]).toLowerCase();
      return addDays(today, /week|سبوع|سابيع/.test(unit) ? n * 7 : n);
    },
  },
  {
    re: new RegExp(`${START}بعد\\s+(يومين|أسبوع|اسبوع|أسبوعين|اسبوعين)${END}`),
    date: (m, today) => addDays(today, { يومين: 2, أسبوع: 7, اسبوع: 7, أسبوعين: 14, اسبوعين: 14 }[m[1]]),
  },
  {
    re: new RegExp(`${START}(?:(?:on|by|next)\\s+|يوم\\s+)?(${alt(WEEKDAYS.flat())})${END}`, "i"),
    date(m, today) {
      const target = WEEKDAYS.findIndex((names) => names.includes(m[1].toLowerCase()));
      const current = parseIso(today).getDay();
      const ahead = ((target - current + 7) % 7) || 7;
      return addDays(today, ahead);
    },
  },
  {
    re: /(?<=^|\s)(\d{4})-(\d{2})-(\d{2})(?=$|\s)/,
    date: (m) => `${m[1]}-${m[2]}-${m[3]}`,
  },
  {
    // "5 Nov", "5 نوفمبر", "Nov 5", "November 5th"
    re: new RegExp(`${START}(?:(?:on|by)\\s+)?(?:(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthAlt})|(${monthAlt})\\s+(\\d{1,2})(?:st|nd|rd|th)?)${END}`, "i"),
    date(m, today) {
      const day = Number(m[1] ?? m[4]);
      const month = monthIndex(m[2] ?? m[3]);
      return upcoming(day, month, today);
    },
  },
  {
    // Day first, as written in Egypt and most of the world: 5/11
    re: /(?<=^|\s)(\d{1,2})\/(\d{1,2})(?=$|\s)/,
    date: (m, today) => upcoming(Number(m[1]), Number(m[2]) - 1, today),
  },
];

// The next time a day and month come round (this year, or next if it has passed)
function upcoming(day, month, today) {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const now = parseIso(today);
  let date = new Date(now.getFullYear(), month, day);
  if (date.getMonth() !== month) return null;
  if (toIso(date) < today) date = new Date(now.getFullYear() + 1, month, day);
  return toIso(date);
}

// A time needs a marker ("at", "@", "الساعة") or an am/pm, so "buy 3 apples" stays a title
const TIME_RE = new RegExp(
  `${START}(?:(?:at|@|الساعة|الساعه)\\s*(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm|a\\.m\\.|p\\.m\\.|صباحًا|صباحاً|صباحا|مساءً|مساءا|مساء|ص|م)?|(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm|a\\.m\\.|p\\.m\\.|صباحًا|صباحاً|صباحا|مساءً|مساءا|مساء)|(\\d{1,2}):(\\d{2})|(?:(?:at|@)\\s+)?(noon|midday|الضهر|الظهر)|(?:at\\s+)?(midnight))${END}`,
  "i"
);

function readTime(m) {
  if (m[9]) return "12:00";
  if (m[10]) return "00:00";
  let hour;
  let minute;
  let marker;
  if (m[1] !== undefined) [hour, minute, marker] = [m[1], m[2], m[3]];
  else if (m[4] !== undefined) [hour, minute, marker] = [m[4], m[5], m[6]];
  else [hour, minute] = [m[7], m[8]];
  let h = Number(hour);
  const min = Number(minute ?? 0);
  if (h > 23 || min > 59) return null;
  const mark = (marker ?? "").toLowerCase();
  const pm = /^(pm|p\.m\.|م|مساء)/.test(mark);
  const am = /^(am|a\.m\.|ص|صباح)/.test(mark);
  if (pm && h < 12) h += 12;
  else if (am && h === 12) h = 0;
  // A bare "at 6" with no am/pm most likely means the evening
  else if (!mark && m[1] !== undefined && !minute && h >= 1 && h <= 7) h += 12;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function parseQuickAdd(input, today = todayIso()) {
  const source = toWestern(input);
  const spans = [];
  const tokens = [];
  const result = { due: null, time: null, priority: null, category: null };

  const take = (match, type, value) => {
    const start = match.index;
    const end = start + match[0].length;
    if (spans.some(([s, e]) => start < e && end > s)) return false;
    spans.push([start, end]);
    tokens.push({ type, value, text: input.slice(start, end).trim(), start });
    return true;
  };

  // #category
  for (const m of source.matchAll(/(?<=^|\s)#([\p{L}\p{N}_-]+)/gu)) {
    const word = m[1].toLowerCase();
    const category = Object.keys(CATEGORY_WORDS).find((key) => CATEGORY_WORDS[key].includes(word));
    if (category && !result.category && take(m, "category", category)) result.category = category;
  }

  // !priority, or !!! / !! / ! on their own
  for (const m of source.matchAll(/(?<=^|\s)!(!{0,2}|[\p{L}\p{N}]+)(?=$|\s)/gu)) {
    const word = m[1].toLowerCase();
    let priority = Object.keys(PRIORITY_WORDS).find((key) => PRIORITY_WORDS[key].includes(word));
    if (word === "") priority = "medium";
    if (priority && !result.priority && take(m, "priority", priority)) result.priority = priority;
  }

  for (const rule of DATE_RULES) {
    if (result.due) break;
    const m = source.match(rule.re);
    if (!m) continue;
    const date = rule.date(m, today);
    if (date && take(m, "date", date)) result.due = date;
  }

  const t = source.match(TIME_RE);
  if (t) {
    const time = readTime(t);
    if (time && take(t, "time", time)) {
      result.time = time;
      // A time on its own means today
      if (!result.due) result.due = today;
    }
  }

  let title = "";
  let cursor = 0;
  for (const [s, e] of spans.slice().sort((a, b) => a[0] - b[0])) {
    title += input.slice(cursor, s) + " ";
    cursor = e;
  }
  title += input.slice(cursor);
  title = title.replace(/\s+([,،.])/g, "$1").replace(/\s{2,}/g, " ").trim().replace(/^[,،.\s]+|[,،\s]+$/g, "");

  tokens.sort((a, b) => a.start - b.start);
  return { title, ...result, tokens };
}
