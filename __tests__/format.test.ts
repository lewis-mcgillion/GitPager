import { describe, expect, it } from "vitest";
import {
  formatRelative,
  formatDate,
  formatTime,
  formatDateTime,
  formatDurationSeconds,
} from "@/lib/format";

describe("formatRelative", () => {
  it("formats recent past and future timestamps", () => {
    expect(formatRelative(new Date(Date.now() - 5 * 60_000))).toBe("5m ago");
    expect(formatRelative(new Date(Date.now() - 3 * 3_600_000))).toBe("3h ago");
    expect(formatRelative(new Date(Date.now() + 2 * 3_600_000))).toBe("in 2h");
    expect(formatRelative(new Date())).toBe("just now");
  });

  it("returns a placeholder for invalid or missing dates instead of 'NaNd ago'", () => {
    expect(formatRelative("not-a-date")).toBe("—");
    expect(formatRelative("")).toBe("—");
    expect(formatRelative(null)).toBe("—");
    expect(formatRelative(undefined)).toBe("—");
  });
});

describe("formatDate / formatTime / formatDateTime", () => {
  it("renders a placeholder for invalid or missing input rather than 'Invalid Date'", () => {
    for (const fn of [formatDate, formatTime, formatDateTime]) {
      expect(fn("garbage")).toBe("—");
      expect(fn(null)).toBe("—");
      expect(fn(undefined)).toBe("—");
    }
  });

  it("still formats valid dates", () => {
    const d = new Date("2026-01-02T03:04:05Z");
    expect(formatDate(d)).not.toBe("—");
    expect(formatTime(d)).not.toBe("—");
    expect(formatDateTime(d)).not.toBe("—");
  });
});

describe("formatDurationSeconds", () => {
  it("guards zero, negative and non-finite input", () => {
    expect(formatDurationSeconds(0)).toBe("0 min");
    expect(formatDurationSeconds(-3600)).toBe("0 min");
    expect(formatDurationSeconds(NaN)).toBe("0 min");
    expect(formatDurationSeconds(Infinity)).toBe("0 min");
  });

  it("formats weeks, days, hours and minutes with correct pluralisation", () => {
    expect(formatDurationSeconds(7 * 86400)).toBe("1 week");
    expect(formatDurationSeconds(14 * 86400)).toBe("2 weeks");
    expect(formatDurationSeconds(86400)).toBe("1 day");
    expect(formatDurationSeconds(2 * 86400)).toBe("2 days");
    expect(formatDurationSeconds(3600)).toBe("1 hour");
    expect(formatDurationSeconds(2 * 3600)).toBe("2 hours");
    expect(formatDurationSeconds(30 * 60)).toBe("30 min");
  });
});
