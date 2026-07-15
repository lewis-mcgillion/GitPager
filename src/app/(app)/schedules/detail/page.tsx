"use client";

import { useMemo, useState } from "react";
import { Button, IconButton, Select, TextInput, FormControl, Flash, Text } from "@primer/react";
import { TrashIcon, LinkExternalIcon, PlusIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@primer/octicons-react";
import { useAsync } from "@/lib/useAsync";
import { useQueryId } from "@/lib/useQueryId";
import { getSchedule, createOverride, deleteOverride, type PdSchedule } from "@/lib/pdApi";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardRow, UserInline, EmptyState, Loading, ErrorState } from "@/components/ui";
import { OnCallTimeline, type TimelineSegment } from "@/components/OnCallTimeline";
import { userColor } from "@/lib/colors";
import { formatDateTime } from "@/lib/format";

const WINDOW_DAYS = 21;

function toLocalInput(d: Date): string {
  // Format a Date as the value a <input type="datetime-local"> expects.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

export default function ScheduleDetailPage() {
  const { id, ready } = useQueryId();
  if (!ready) return <Loading />;
  if (!id) return <ErrorState message="No schedule id was provided." />;
  return <ScheduleDetail id={id} />;
}

function ScheduleDetail({ id }: { id: string }) {
  // How many days the visible window is shifted from today. Earlier/Later page
  // it by a full window; Today resets to 0.
  const [offsetDays, setOffsetDays] = useState(0);

  const range = useMemo(() => {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() + offsetDays);
    const until = new Date(since);
    until.setDate(until.getDate() + WINDOW_DAYS);
    return { since: since.toISOString(), until: until.toISOString(), sinceDate: since, untilDate: until };
  }, [offsetDays]);

  const { data, loading, error, reload } = useAsync<PdSchedule>(
    () => getSchedule(id, range.since, range.until),
    [id, range.since, range.until],
  );

  if (loading) return <Loading label="Loading schedule…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ErrorState message="Schedule not found." />;

  const entries = data.final_schedule?.rendered_schedule_entries ?? [];
  const segments: TimelineSegment[] = entries.map((e) => ({
    userId: e.user.id,
    userName: e.user.summary || e.user.name || "Unknown",
    avatarUrl: null,
    start: new Date(e.start),
    end: new Date(e.end),
  }));

  const now = new Date();
  const current = entries.find((e) => new Date(e.start) <= now && now < new Date(e.end));

  // Distinct users appearing in the window, for the colour legend.
  const legend = Array.from(
    new Map(segments.filter((s) => s.userId).map((s) => [s.userId, s])).values(),
  );

  const overrides = data.overrides ?? [];
  const pickableUsers = data.users ?? [];

  const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const lastVisibleDay = new Date(range.untilDate.getTime() - 1);
  const rangeLabel = `${fmtDay(range.sinceDate)} – ${lastVisibleDay.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return (
    <div>
      <PageHeader
        title={data.name}
        description={data.description || `On-call rotation shown ${WINDOW_DAYS} days at a time — use Earlier / Later to move through time.`}
        actions={
          data.html_url ? (
            <a href={data.html_url} target="_blank" rel="noreferrer">
              <Button leadingVisual={LinkExternalIcon}>Open in PagerDuty</Button>
            </a>
          ) : undefined
        }
      />

      {current ? (
        <Card padded style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: "var(--fgColor-success, #1a7f37)",
                flexShrink: 0,
              }}
            />
            <Text style={{ fontWeight: 600 }}>On call now:</Text>
            <UserInline user={{ name: current.user.summary || current.user.name || "Unknown" }} />
            <Text style={{ color: "var(--fgColor-muted, #656d76)", fontSize: 13 }}>
              until {formatDateTime(current.end)}
            </Text>
          </div>
        </Card>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          margin: "0 0 12px",
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Timeline</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button size="small" leadingVisual={ChevronLeftIcon} onClick={() => setOffsetDays((o) => o - WINDOW_DAYS)}>
            Earlier
          </Button>
          <Button size="small" onClick={() => setOffsetDays(0)} disabled={offsetDays === 0}>
            Today
          </Button>
          <Button size="small" trailingVisual={ChevronRightIcon} onClick={() => setOffsetDays((o) => o + WINDOW_DAYS)}>
            Later
          </Button>
        </div>
      </div>
      <Text
        style={{ display: "block", color: "var(--fgColor-muted, #656d76)", fontSize: 12, margin: "0 0 12px" }}
      >
        {rangeLabel}
      </Text>
      <Card padded>
        {segments.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon size={24} />}
            title="Nothing scheduled"
            description="This schedule has no rendered on-call entries in the current window."
          />
        ) : (
          <>
            <OnCallTimeline segments={segments} from={range.sinceDate} to={range.untilDate} now={now} />
            {legend.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
                {legend.map((s) => {
                  const c = userColor(s.userId!);
                  return (
                    <span key={s.userId} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: c.bg, display: "inline-block" }} />
                      {s.userName}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </>
        )}
      </Card>

      <OverridesSection
        scheduleId={id}
        overrides={overrides}
        users={pickableUsers.map((u) => ({ id: u.id, name: u.summary || u.name || "Unknown" }))}
        onChange={reload}
      />
    </div>
  );
}

function OverridesSection({
  scheduleId,
  overrides,
  users,
  onChange,
}: {
  scheduleId: string;
  overrides: PdSchedule["overrides"];
  users: { id: string; name: string }[];
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const [start, setStart] = useState(toLocalInput(now));
  const [end, setEnd] = useState(toLocalInput(inOneHour));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const startIso = new Date(start).toISOString();
    const endIso = new Date(end).toISOString();
    if (new Date(endIso) <= new Date(startIso)) {
      setError("The override must end after it starts.");
      return;
    }
    if (!userId) {
      setError("Pick who should cover this shift.");
      return;
    }
    setBusy(true);
    try {
      await createOverride(scheduleId, { start: startIso, end: endIso, userId });
      setOpen(false);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(overrideId: string) {
    try {
      await deleteOverride(scheduleId, overrideId);
      onChange();
    } catch {
      /* surfaced on next reload */
    }
  }

  const list = overrides ?? [];

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "28px 0 12px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Overrides</h2>
        <Button
          size="small"
          leadingVisual={PlusIcon}
          onClick={() => setOpen((o) => !o)}
          disabled={users.length === 0}
        >
          Cover a shift
        </Button>
      </div>

      {open ? (
        <Card padded style={{ marginBottom: 16 }}>
          <form onSubmit={submit} style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
            <FormControl>
              <FormControl.Label>Who&apos;s covering</FormControl.Label>
              <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
                {users.map((u) => (
                  <Select.Option key={u.id} value={u.id}>
                    {u.name}
                  </Select.Option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormControl.Label>Start</FormControl.Label>
              <TextInput type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormControl.Label>End</FormControl.Label>
              <TextInput type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </FormControl>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Adding…" : "Add override"}
            </Button>
          </form>
          {error ? (
            <Flash variant="danger" style={{ marginTop: 12 }}>
              {error}
            </Flash>
          ) : null}
        </Card>
      ) : null}

      {list.length === 0 ? (
        <Card>
          <EmptyState title="No overrides" description="Nobody is covering a shift on this schedule right now." />
        </Card>
      ) : (
        <Card>
          {list.map((o, i) => (
            <CardRow key={o.id} style={i === 0 ? { borderTop: "none" } : undefined}>
              <div style={{ flex: "0 0 220px", minWidth: 0 }}>
                <UserInline user={{ name: o.user.summary || o.user.name || "Unknown" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                {formatDateTime(o.start)} → {formatDateTime(o.end)}
              </div>
              <IconButton
                icon={TrashIcon}
                aria-label="Remove override"
                variant="invisible"
                size="small"
                onClick={() => remove(o.id)}
              />
            </CardRow>
          ))}
        </Card>
      )}
    </>
  );
}
