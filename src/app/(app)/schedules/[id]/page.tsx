import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { scheduleInclude, toResolvable, findScheduleUser, segmentsForSchedule } from "@/lib/schedules";
import { whoIsOnCall } from "@/lib/oncall";
import { formatDurationSeconds } from "@/lib/format";
import { ScheduleDetailView } from "./ScheduleDetailView";

const WINDOW_DAYS = 14;

export default async function ScheduleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [schedule, users, session] = await Promise.all([
    db.schedule.findUnique({ where: { id }, include: scheduleInclude }),
    db.user.findMany({ orderBy: { name: "asc" } }),
    getSession(),
  ]);

  if (!schedule) notFound();

  const now = new Date();
  const to = new Date(now.getTime() + WINDOW_DAYS * 86400 * 1000);

  const resolved = segmentsForSchedule(schedule, now, to);
  const onCallUser = findScheduleUser(schedule, whoIsOnCall(toResolvable(schedule), now));
  const current = resolved.find((s) => s.start <= now && now < s.end);

  return (
    <ScheduleDetailView
      scheduleId={schedule.id}
      name={schedule.name}
      teamName={schedule.team?.name ?? null}
      description={schedule.description}
      timeZone={schedule.timeZone}
      onCall={onCallUser}
      onCallUntil={current ? current.end : null}
      from={now}
      to={to}
      segments={resolved.map((s) => ({
        userId: s.user?.id ?? null,
        userName: s.user?.name ?? "Gap",
        avatarUrl: s.user?.avatarUrl ?? null,
        start: s.start,
        end: s.end,
      }))}
      layers={schedule.layers.map((l) => ({
        id: l.id,
        name: l.name,
        rotationLabel: formatDurationSeconds(l.rotationLengthSeconds),
        handoffTime: l.handoffTime,
        participants: l.users.map((u) => ({
          name: u.user.name,
          avatarUrl: u.user.avatarUrl,
          githubLogin: u.user.githubLogin,
        })),
      }))}
      overrides={schedule.overrides
        .filter((o) => o.end >= now)
        .map((o) => ({
          id: o.id,
          user: { name: o.user.name, avatarUrl: o.user.avatarUrl, githubLogin: o.user.githubLogin },
          start: o.start,
          end: o.end,
          active: o.start <= now && now < o.end,
        }))}
      users={users.map((u) => ({ id: u.id, name: u.name }))}
      defaultUserId={session?.id ?? users[0]?.id ?? ""}
    />
  );
}
