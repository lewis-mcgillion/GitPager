import { db } from "./db";
import { Prisma } from "@/generated/prisma";
import { whoIsOnCall, buildScheduleSegments, type ResolvableSchedule, type OnCallSegment } from "./oncall";

// Prisma include shared by schedule queries so the mapper always has what it needs.
export const scheduleInclude = {
  team: true,
  layers: {
    orderBy: { position: "asc" },
    include: {
      users: {
        orderBy: { position: "asc" },
        include: { user: true },
      },
    },
  },
  overrides: {
    orderBy: { start: "asc" },
    include: { user: true },
  },
} satisfies Prisma.ScheduleInclude;

export type ScheduleWithRelations = Prisma.ScheduleGetPayload<{ include: typeof scheduleInclude }>;

export interface OnCallUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  githubLogin: string | null;
}

/** Map a DB schedule (with relations) into the pure resolver shape. */
export function toResolvable(schedule: ScheduleWithRelations): ResolvableSchedule {
  return {
    id: schedule.id,
    name: schedule.name,
    layers: schedule.layers.map((l) => ({
      id: l.id,
      name: l.name,
      position: l.position,
      rotationLengthSeconds: l.rotationLengthSeconds,
      startTime: l.startTime,
      userIds: l.users.map((u) => u.userId),
    })),
    overrides: schedule.overrides.map((o) => ({
      userId: o.userId,
      start: o.start,
      end: o.end,
    })),
  };
}

/** Find the full user record for a user id among a schedule's included relations. */
export function findScheduleUser(
  schedule: ScheduleWithRelations,
  userId: string | null,
): OnCallUser | null {
  if (!userId) return null;
  for (const layer of schedule.layers) {
    for (const lu of layer.users) {
      if (lu.userId === userId) return lu.user;
    }
  }
  for (const o of schedule.overrides) {
    if (o.userId === userId) return o.user;
  }
  return null;
}

export interface ScheduleOnCall {
  schedule: ScheduleWithRelations;
  user: OnCallUser | null;
}

/** Resolve who is on call right now for every schedule. */
export async function getOnCallNow(at: Date = new Date()): Promise<ScheduleOnCall[]> {
  const schedules = await db.schedule.findMany({
    include: scheduleInclude,
    orderBy: { name: "asc" },
  });
  return schedules.map((schedule) => {
    const userId = whoIsOnCall(toResolvable(schedule), at);
    return { schedule, user: findScheduleUser(schedule, userId) };
  });
}

/** Resolve the current on-call user id for a single schedule id (for escalation). */
export async function onCallUserIdForSchedule(
  scheduleId: string,
  at: Date = new Date(),
): Promise<string | null> {
  const schedule = await db.schedule.findUnique({ where: { id: scheduleId }, include: scheduleInclude });
  if (!schedule) return null;
  return whoIsOnCall(toResolvable(schedule), at);
}

export interface ResolvedSegment {
  user: OnCallUser | null;
  start: Date;
  end: Date;
}

/** Build resolved on-call segments for a schedule over a window (for the timeline). */
export function segmentsForSchedule(
  schedule: ScheduleWithRelations,
  from: Date,
  to: Date,
): ResolvedSegment[] {
  const raw: OnCallSegment[] = buildScheduleSegments(toResolvable(schedule), from, to);
  return raw.map((s) => ({
    user: findScheduleUser(schedule, s.userId),
    start: s.start,
    end: s.end,
  }));
}
