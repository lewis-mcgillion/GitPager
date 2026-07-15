import { describe, it, expect } from "vitest";
import {
  whoIsOnCall,
  buildScheduleSegments,
  type ResolvableSchedule,
} from "@/lib/oncall";

const WEEK = 7 * 24 * 60 * 60; // seconds
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// A Monday 11:00 UTC anchor.
const ANCHOR = new Date("2026-01-05T11:00:00.000Z");

function weeklySchedule(userIds: string[], overrides: ResolvableSchedule["overrides"] = []): ResolvableSchedule {
  return {
    id: "sched",
    name: "Primary",
    layers: [
      {
        id: "layer",
        name: "Weekly",
        position: 0,
        rotationLengthSeconds: WEEK,
        startTime: ANCHOR,
        userIds,
      },
    ],
    overrides,
  };
}

describe("whoIsOnCall — rotation math", () => {
  it("returns the first user at the anchor instant", () => {
    expect(whoIsOnCall(weeklySchedule(["A", "B", "C"]), ANCHOR)).toBe("A");
  });

  it("advances one user per rotation length", () => {
    const s = weeklySchedule(["A", "B", "C"]);
    expect(whoIsOnCall(s, new Date(ANCHOR.getTime() + WEEK_MS))).toBe("B");
    expect(whoIsOnCall(s, new Date(ANCHOR.getTime() + 2 * WEEK_MS))).toBe("C");
    expect(whoIsOnCall(s, new Date(ANCHOR.getTime() + 3 * WEEK_MS))).toBe("A");
  });

  it("stays with the same user within a turn", () => {
    const s = weeklySchedule(["A", "B"]);
    expect(whoIsOnCall(s, new Date(ANCHOR.getTime() + DAY_MS))).toBe("A");
    expect(whoIsOnCall(s, new Date(ANCHOR.getTime() + WEEK_MS - 1))).toBe("A");
  });

  it("wraps correctly for times before the anchor", () => {
    const s = weeklySchedule(["A", "B", "C"]);
    // 1ms before anchor -> previous turn -> last user
    expect(whoIsOnCall(s, new Date(ANCHOR.getTime() - 1))).toBe("C");
  });

  it("returns null when there are no users", () => {
    expect(whoIsOnCall(weeklySchedule([]), ANCHOR)).toBeNull();
  });
});

describe("whoIsOnCall — layers & overrides", () => {
  it("prefers the highest-position layer", () => {
    const s: ResolvableSchedule = {
      id: "s",
      name: "s",
      layers: [
        { id: "low", name: "low", position: 0, rotationLengthSeconds: WEEK, startTime: ANCHOR, userIds: ["A"] },
        { id: "high", name: "high", position: 1, rotationLengthSeconds: WEEK, startTime: ANCHOR, userIds: ["B"] },
      ],
      overrides: [],
    };
    expect(whoIsOnCall(s, ANCHOR)).toBe("B");
  });

  it("falls through to a lower layer when the top layer has no users", () => {
    const s: ResolvableSchedule = {
      id: "s",
      name: "s",
      layers: [
        { id: "low", name: "low", position: 0, rotationLengthSeconds: WEEK, startTime: ANCHOR, userIds: ["A"] },
        { id: "high", name: "high", position: 1, rotationLengthSeconds: WEEK, startTime: ANCHOR, userIds: [] },
      ],
      overrides: [],
    };
    expect(whoIsOnCall(s, ANCHOR)).toBe("A");
  });

  it("lets an active override win over the rotation", () => {
    const start = new Date(ANCHOR.getTime() + DAY_MS);
    const end = new Date(ANCHOR.getTime() + 2 * DAY_MS);
    const s = weeklySchedule(["A", "B"], [{ userId: "OVERRIDE", start, end }]);
    // During the override window
    expect(whoIsOnCall(s, new Date(ANCHOR.getTime() + 1.5 * DAY_MS))).toBe("OVERRIDE");
    // Outside it, back to the rotation
    expect(whoIsOnCall(s, new Date(ANCHOR.getTime() + 3 * DAY_MS))).toBe("A");
  });

  it("treats the override end as exclusive", () => {
    const start = new Date(ANCHOR.getTime());
    const end = new Date(ANCHOR.getTime() + DAY_MS);
    const s = weeklySchedule(["A", "B"], [{ userId: "OVERRIDE", start, end }]);
    expect(whoIsOnCall(s, end)).toBe("A"); // exactly at end -> rotation
  });

  it("resolves overlapping overrides to the latest-starting one", () => {
    const s = weeklySchedule(["A"], [
      { userId: "FIRST", start: new Date(ANCHOR.getTime()), end: new Date(ANCHOR.getTime() + 3 * DAY_MS) },
      { userId: "SECOND", start: new Date(ANCHOR.getTime() + DAY_MS), end: new Date(ANCHOR.getTime() + 2 * DAY_MS) },
    ]);
    expect(whoIsOnCall(s, new Date(ANCHOR.getTime() + 1.5 * DAY_MS))).toBe("SECOND");
  });
});

describe("buildScheduleSegments", () => {
  it("produces one segment per rotation turn", () => {
    const s = weeklySchedule(["A", "B", "C"]);
    const segments = buildScheduleSegments(s, ANCHOR, new Date(ANCHOR.getTime() + 3 * WEEK_MS));
    expect(segments.map((x) => x.userId)).toEqual(["A", "B", "C"]);
    expect(segments[0].start.getTime()).toBe(ANCHOR.getTime());
    expect(segments[2].end.getTime()).toBe(ANCHOR.getTime() + 3 * WEEK_MS);
  });

  it("splits a turn around an override", () => {
    const oStart = new Date(ANCHOR.getTime() + 2 * DAY_MS);
    const oEnd = new Date(ANCHOR.getTime() + 4 * DAY_MS);
    const s = weeklySchedule(["A", "B"], [{ userId: "OVR", start: oStart, end: oEnd }]);
    const segments = buildScheduleSegments(s, ANCHOR, new Date(ANCHOR.getTime() + WEEK_MS));
    expect(segments.map((x) => x.userId)).toEqual(["A", "OVR", "A"]);
    expect(segments[1].start.getTime()).toBe(oStart.getTime());
    expect(segments[1].end.getTime()).toBe(oEnd.getTime());
  });

  it("returns an empty array for a non-positive window", () => {
    const s = weeklySchedule(["A"]);
    expect(buildScheduleSegments(s, ANCHOR, ANCHOR)).toEqual([]);
  });
});
