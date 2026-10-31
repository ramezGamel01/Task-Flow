import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { STRINGS } from "./strings.js";
import { makeFormat, makeTranslator } from "./I18n.jsx";

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(jsx?)$/.test(name) && !name.includes(".test.") ? [path] : [];
  });
}

describe("translations", () => {
  it("has every English string in Arabic and nothing extra", () => {
    const en = Object.keys(STRINGS.en).sort();
    const ar = Object.keys(STRINGS.ar).sort();
    expect(ar).toEqual(en);
  });

  it("defines every key the code asks for", () => {
    const used = new Set();
    for (const file of sourceFiles(join(process.cwd(), "src"))) {
      for (const m of readFileSync(file, "utf8").matchAll(/\bt\(\s*"([\w.]+)"/g)) used.add(m[1]);
    }
    const missing = [...used].filter((key) => !(key in STRINGS.en));
    expect(missing).toEqual([]);
  });

  it("picks Arabic plural forms and Arabic-Indic digits", () => {
    const t = makeTranslator("ar");
    expect(t("list.count", { n: 0 })).toBe("لا مهام");
    expect(t("list.count", { n: 2 })).toBe("مهمتان");
    expect(t("list.count", { n: 5 })).toBe("٥ مهام");
    expect(t("list.count", { n: 11 })).toBe("١١ مهمة");
  });

  it("uses the zero form in English when there is one", () => {
    const t = makeTranslator("en");
    expect(t("today.left", { n: 0 })).toBe("Nothing left for today");
    expect(t("today.left", { n: 1 })).toBe("1 task left today");
    expect(t("today.left", { n: 4 })).toBe("4 tasks left today");
  });

  it("formats relative days, durations and the focus clock", () => {
    const f = makeFormat("en");
    expect(f.relDay("2026-11-01", "2026-10-31")).toBe("tomorrow");
    expect(f.relDay("2026-10-29", "2026-10-31")).toBe("2 days ago");
    expect(f.duration(75)).toBe("1 h 15 min");
    expect(f.clock(65)).toBe("01:05");
    expect(makeFormat("ar").clock(65)).toBe("٠١:٠٥");
  });
});
