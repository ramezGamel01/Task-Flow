import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

// The Content-Security-Policy only lets inline scripts run if their hash is listed,
// so editing the theme script in index.html must come with a new hash in vercel.json.
describe("content security policy", () => {
  it("allows every inline script in index.html", () => {
    const html = readFileSync("index.html", "utf8");
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
    const csp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === "Content-Security-Policy").value;
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(inline.length).toBeGreaterThan(0);
    for (const body of inline) {
      const hash = `'sha256-${createHash("sha256").update(body).digest("base64")}'`;
      expect(csp).toContain(hash);
    }
  });
});
