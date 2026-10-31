import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "./parse.js";

// Saturday 31 October 2026
const TODAY = "2026-10-31";
const parse = (text) => parseQuickAdd(text, TODAY);

describe("quick add in English", () => {
  it("lifts out the date, time, category and priority", () => {
    const r = parse("Call mom tomorrow at 6pm #personal !high");
    expect(r).toMatchObject({ title: "Call mom", due: "2026-11-01", time: "18:00", category: "personal", priority: "high" });
    expect(r.tokens.map((t) => t.type)).toEqual(["date", "time", "category", "priority"]);
  });

  it("leaves plain numbers in the title", () => {
    expect(parse("Buy 3 apples")).toMatchObject({ title: "Buy 3 apples", due: null, time: null });
  });

  it("reads weekdays as the next one to come", () => {
    expect(parse("Gym on monday").due).toBe("2026-11-02");
    expect(parse("Groceries saturday").due).toBe("2026-11-07");
  });

  it("understands relative days and weeks", () => {
    expect(parse("Renew passport in 3 days").due).toBe("2026-11-03");
    expect(parse("Plan trip in 2 weeks").due).toBe("2026-11-14");
    expect(parse("Team offsite next week").due).toBe("2026-11-07");
    expect(parse("Dentist the day after tomorrow").due).toBe("2026-11-02");
  });

  it("reads day-first and named dates, rolling past ones into next year", () => {
    expect(parse("Pay rent 5/11").due).toBe("2026-11-05");
    expect(parse("Birthday Nov 20th").due).toBe("2026-11-20");
    expect(parse("Taxes 15 march").due).toBe("2027-03-15");
  });

  it("reads 24-hour times and a bare evening hour, and a time alone means today", () => {
    expect(parse("Standup 09:30")).toMatchObject({ title: "Standup", due: TODAY, time: "09:30" });
    expect(parse("Dinner at 7").time).toBe("19:00");
    expect(parse("Lunch at noon").time).toBe("12:00");
    expect(parse("Run at 6:15am").time).toBe("06:15");
  });

  it("ignores unknown tags and keeps them in the title", () => {
    expect(parse("Fix #42 bug !!")).toMatchObject({ title: "Fix #42 bug", category: null, priority: "high" });
  });
});

describe("quick add in Arabic", () => {
  it("lifts out Arabic dates, times, categories and priorities", () => {
    const r = parse("تسليم التقرير بكرة الساعة 3 #عمل !عاجل");
    expect(r).toMatchObject({ title: "تسليم التقرير", due: "2026-11-01", time: "15:00", category: "work", priority: "high" });
  });

  it("reads Arabic-Indic digits", () => {
    expect(parse("اجتماع بعد ٣ أيام الساعة ١٠ ص")).toMatchObject({ title: "اجتماع", due: "2026-11-03", time: "10:00" });
  });

  it("reads weekday names with or without يوم", () => {
    expect(parse("جيم يوم الاتنين").due).toBe("2026-11-02");
    expect(parse("مشتريات الخميس #تسوق")).toMatchObject({ title: "مشتريات", due: "2026-11-05", category: "shopping" });
  });

  it("reads بعد بكرة before بكرة", () => {
    expect(parse("زيارة جدتي بعد بكرة").due).toBe("2026-11-02");
  });

  it("reads Arabic month names", () => {
    expect(parse("عيد ميلاد سارة 20 نوفمبر").due).toBe("2026-11-20");
  });
});
