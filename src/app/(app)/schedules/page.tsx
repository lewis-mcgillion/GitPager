import { getOnCallNow } from "@/lib/schedules";
import { SchedulesView } from "./SchedulesView";

export default async function SchedulesPage() {
  const onCall = await getOnCallNow();

  return (
    <SchedulesView
      schedules={onCall.map(({ schedule, user }) => ({
        id: schedule.id,
        name: schedule.name,
        teamName: schedule.team?.name ?? null,
        description: schedule.description,
        layerCount: schedule.layers.length,
        participantCount: new Set(
          schedule.layers.flatMap((l) => l.users.map((u) => u.userId)),
        ).size,
        onCall: user
          ? { name: user.name, avatarUrl: user.avatarUrl, githubLogin: user.githubLogin }
          : null,
      }))}
    />
  );
}
