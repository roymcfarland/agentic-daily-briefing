import { describe, expect, it } from "vitest";

import { ageInHours } from "@/lib/briefing/freshness";

const now = new Date("2026-05-29T12:00:00Z");

describe("ageInHours", () => {
  it("returns null when publishedAt is missing", () => {
    expect(ageInHours(undefined, now)).toBeNull();
  });

  it("returns null when publishedAt is unparseable", () => {
    expect(ageInHours("not a date", now)).toBeNull();
  });

  it("returns elapsed hours from a fixed current time", () => {
    expect(ageInHours("2026-05-29T07:00:00Z", now)).toBeCloseTo(5);
  });

  it("clamps future timestamps to zero", () => {
    expect(ageInHours("2026-05-29T13:00:00Z", now)).toBe(0);
  });
});
