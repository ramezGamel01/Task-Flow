// Demo tasks for a first visit, written relative to today so the plan always looks current.
// They are created in the language the visitor is using.
import { addDays, todayIso } from "../lib/dates.js";
import { normalizeTask } from "../state/tasks.js";

// [en, ar, category, priority, day offset or null, time, status, subtasks, focus minutes]
const OPEN = [
  ["Ship the onboarding redesign", "إطلاق التصميم الجديد لصفحات البداية", "work", "high", 0, "10:00", "doing", [["Final copy review", "مراجعة النصوص النهائية", true], ["Fix the mobile spacing", "ضبط المسافات على الموبايل", true], ["Hand off to QA", "التسليم لفريق الاختبار", false]], 75],
  ["Reply to Sara about the contract", "الرد على سارة بخصوص العقد", "work", "high", 0, "13:00", "todo", [], 0],
  ["Buy groceries for the week", "شراء مشتريات الأسبوع", "shopping", "medium", 0, null, "todo", [["Milk", "لبن", false], ["Eggs", "بيض", true], ["Coffee", "قهوة", false], ["Tomatoes", "طماطم", false]], 0],
  ["Leg day at the gym", "تمرين الرجل في الجيم", "fitness", "medium", 0, "18:30", "todo", [], 0],
  ["Read two chapters of the design book", "قراءة فصلين من كتاب التصميم", "study", "low", 0, "22:00", "todo", [], 0],
  ["Renew the car licence", "تجديد رخصة العربية", "personal", "high", -2, null, "todo", [["Book the inspection", "حجز الفحص", false], ["Pay the fines", "دفع المخالفات", false]], 0],
  ["Send the October invoice to Nour", "إرسال فاتورة أكتوبر لنور", "work", "medium", -1, null, "todo", [], 0],
  ["Team retro", "اجتماع مراجعة الفريق", "work", "medium", 1, "11:00", "todo", [], 0],
  ["Call grandma", "مكالمة لجدتي", "personal", "low", 1, "20:00", "todo", [], 0],
  ["5 km run by the Nile", "جري ٥ كم على النيل", "fitness", "low", 2, "07:00", "todo", [], 0],
  ["Prepare the React talk slides", "تجهيز شرائح محاضرة React", "study", "high", 3, null, "doing", [["Outline", "المخطط", true], ["Demo app", "تطبيق العرض", false], ["Rehearse", "البروفة", false]], 50],
  ["Dentist appointment", "ميعاد دكتور الأسنان", "personal", "medium", 4, "16:00", "todo", [], 0],
  ["Plan the Alexandria weekend", "تخطيط ويك إند إسكندرية", "personal", "low", 9, null, "todo", [], 0],
  ["Learn three.js shaders", "تعلم شيدرز three.js", "study", "medium", 12, null, "todo", [], 0],
  ["Organise the desk", "ترتيب المكتب", "other", "low", null, null, "todo", [], 0],
  ["Look for a new keyboard", "البحث عن كيبورد جديد", "shopping", "low", null, null, "todo", [], 0],
];

// [en, ar, category, priority, completed this many days ago, focus minutes]
const DONE = [
  ["Morning run", "جري الصبح", "fitness", "low", 0, 0],
  ["Review two pull requests", "مراجعة طلبين دمج", "work", "medium", 0, 40],
  ["Write the weekly report", "كتابة التقرير الأسبوعي", "work", "medium", 1, 30],
  ["Pay the electricity bill", "دفع فاتورة الكهرباء", "personal", "high", 1, 0],
  ["Fix the login bug", "إصلاح مشكلة تسجيل الدخول", "work", "high", 2, 90],
  ["Meal prep for the week", "تحضير أكل الأسبوع", "personal", "low", 3, 0],
  ["Finish the CSS course module", "إنهاء وحدة كورس CSS", "study", "medium", 3, 60],
  ["Update the portfolio", "تحديث البورتفوليو", "work", "medium", 4, 45],
  ["Clean out the inbox", "تنظيف صندوق البريد", "other", "low", 5, 20],
  ["Swim 1 km", "سباحة ١ كم", "fitness", "medium", 6, 0],
  ["Book the dentist", "حجز دكتور الأسنان", "personal", "low", 8, 0],
  ["Water the plants", "سقي الزرع", "other", "low", 9, 0],
  ["Ship the pricing page", "إطلاق صفحة الأسعار", "work", "high", 10, 120],
  ["Practise Arabic calligraphy", "تمرين الخط العربي", "study", "low", 12, 30],
];

export function demoTasks(lang = "en", today = todayIso(), now = new Date()) {
  const ar = lang === "ar";
  const stamp = (daysAgo, hour) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, (daysAgo * 17) % 60, 0, 0);
    return d.toISOString();
  };
  const open = OPEN.map(([en, arTitle, category, priority, offset, time, status, subtasks, focus], i) =>
    normalizeTask({
      id: `demo_${i}`,
      title: ar ? arTitle : en,
      category,
      priority,
      due: offset === null ? null : addDays(today, offset),
      time,
      status,
      subtasks: subtasks.map(([s, sAr, done], j) => ({ id: `demo_${i}_${j}`, title: ar ? sAr : s, done })),
      focus,
      order: i,
      createdAt: stamp(14 - (i % 6), 9),
    })
  );
  const done = DONE.map(([en, arTitle, category, priority, daysAgo, focus], i) =>
    normalizeTask({
      id: `demo_done_${i}`,
      title: ar ? arTitle : en,
      category,
      priority,
      due: addDays(today, -daysAgo),
      status: "done",
      focus,
      order: i,
      createdAt: stamp(daysAgo + 2, 9),
      completedAt: stamp(daysAgo, 9 + ((i * 5) % 10)),
    })
  );
  return [...open, ...done];
}
