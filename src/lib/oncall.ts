// On-call resolution: pure, dependency-free functions that compute who is on call
// for a schedule at a given time. Kept free of Prisma so they are trivially
// unit-testable. Database rows are mapped into these shapes by the callers.

/** One rotation layer of a schedule. Users rotate in `position` order. */
export interface RotationLayer {
  id: string;
  name: string;
  /** Higher position = higher priority (sits "on top" of lower layers). */
  position: number;
  /** Length of a single person's on-call turn, in seconds. */
  rotationLengthSeconds: number;
  /** Anchor instant from which the rotation is measured. */
  startTime: Date;
  /** User ids in rotation order. */
  userIds: string[];
}

/** A manual override ("cover for me") that wins over the rotations while active. */
export interface ScheduleOverride {
  userId: string;
  start: Date;
  end: Date;
}

/** Everything needed to resolve on-call for one schedule. */
export interface ResolvableSchedule {
  id: string;
  name: string;
  layers: RotationLayer[];
  overrides: ScheduleOverride[];
}

/** A contiguous stretch of time with a single on-call user (or a gap: null). */
export interface OnCallSegment {
  userId: string | null;
  start: Date;
  end: Date;
}

// Safety cap so a pathological (tiny) rotation length over a wide range can never
// produce an unbounded number of boundaries.
const MAX_BOUNDARIES = 100_000;

/**
 * Which user is on call for `schedule` at instant `at`.
 * Overrides take precedence; otherwise the highest-priority layer that has users
 * wins, using its periodic rotation.
 */
export function whoIsOnCall(schedule: ResolvableSchedule, at: Date): string | null {
  const t = at.getTime();

  // 1. Active overrides win. If several overlap, the one that started latest wins.
  const active = schedule.overrides
    .filter((o) => o.start.getTime() <= t && t < o.end.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  if (active.length > 0) {
    return active[active.length - 1].userId;
  }

  // 2. Layers, highest priority first.
  const layers = [...schedule.layers].sort((a, b) => b.position - a.position);
  for (const layer of layers) {
    const n = layer.userIds.length;
    if (n === 0) continue;
    const lenMs = layer.rotationLengthSeconds * 1000;
    if (lenMs <= 0) return layer.userIds[0];

    const elapsed = t - layer.startTime.getTime();
    const turnIndex = Math.floor(elapsed / lenMs);
    // Wrapped modulo keeps the rotation defined for times before the anchor too.
    const idx = ((turnIndex % n) + n) % n;
    return layer.userIds[idx];
  }

  return null;
}

/**
 * Break the window [from, to) into contiguous segments, each with the single
 * user on call during it. Used to render the resolved-schedule timeline/Gantt.
 */
export function buildScheduleSegments(
  schedule: ResolvableSchedule,
  from: Date,
  to: Date,
): OnCallSegment[] {
  if (to.getTime() <= from.getTime()) return [];

  const fromMs = from.getTime();
  const toMs = to.getTime();
  const boundaries = new Set<number>([fromMs, toMs]);

  // Rotation turn boundaries within the window.
  for (const layer of schedule.layers) {
    if (layer.userIds.length === 0) continue;
    const lenMs = layer.rotationLengthSeconds * 1000;
    if (lenMs <= 0) continue;

    const anchor = layer.startTime.getTime();
    const firstK = Math.ceil((fromMs - anchor) / lenMs);
    let added = 0;
    for (let t = anchor + firstK * lenMs; t < toMs; t += lenMs) {
      if (t > fromMs) {
        boundaries.add(t);
        if (++added > MAX_BOUNDARIES) break;
      }
    }
  }

  // Override start/end boundaries within the window.
  for (const o of schedule.overrides) {
    const s = o.start.getTime();
    const e = o.end.getTime();
    if (s > fromMs && s < toMs) boundaries.add(s);
    if (e > fromMs && e < toMs) boundaries.add(e);
  }

  const sorted = [...boundaries].sort((a, b) => a - b);
  const segments: OnCallSegment[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i];
    const e = sorted[i + 1];
    if (e <= s) continue;
    const mid = new Date(s + Math.floor((e - s) / 2));
    const userId = whoIsOnCall(schedule, mid);

    const last = segments[segments.length - 1];
    if (last && last.userId === userId) {
      last.end = new Date(e); // merge consecutive equal segments
    } else {
      segments.push({ userId, start: new Date(s), end: new Date(e) });
    }
  }

  return segments;
}
