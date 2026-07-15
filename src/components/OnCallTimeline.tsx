"use client";

import { Avatar } from "@primer/react";
import { avatarSrc } from "@/components/ui";
import { userColor } from "@/lib/colors";

export interface TimelineSegment {
  userId: string | null;
  userName: string;
  avatarUrl?: string | null;
  start: Date;
  end: Date;
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

// Horizontal, single-row Gantt of who is on call across the [from, to] window.
// This is the core "fix PagerDuty's UX" visual: at a glance you can see the
// rotation, hand-offs, overrides and where "now" sits.
export function OnCallTimeline({
  segments,
  from,
  to,
  now,
}: {
  segments: TimelineSegment[];
  from: Date;
  to: Date;
  now: Date;
}) {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  const span = Math.max(1, toMs - fromMs);
  const pct = (t: number) => ((t - fromMs) / span) * 100;

  // Midnight gridlines within the window.
  const days: Date[] = [];
  const cursor = new Date(fromMs);
  cursor.setHours(0, 0, 0, 0);
  if (cursor.getTime() < fromMs) cursor.setDate(cursor.getDate() + 1);
  while (cursor.getTime() < toMs && days.length < 400) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const nowMs = new Date(now).getTime();
  const showNow = nowMs >= fromMs && nowMs < toMs;

  return (
    <div>
      <div
        style={{
          position: "relative",
          height: 56,
          border: "1px solid var(--borderColor-default, #d0d7de)",
          borderRadius: 8,
          background: "var(--bgColor-muted, #f6f8fa)",
          overflow: "hidden",
        }}
      >
        {days.map((day) => (
          <div
            key={`grid-${day.getTime()}`}
            style={{
              position: "absolute",
              left: `${pct(day.getTime())}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: "var(--borderColor-muted, #d8dee4)",
            }}
          />
        ))}

        {segments.map((s, i) => {
          if (!s.userId) return null;
          const left = pct(new Date(s.start).getTime());
          const width = Math.max(0, pct(new Date(s.end).getTime()) - left);
          const c = userColor(s.userId);
          const startLabel = new Date(s.start).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <div
              key={`seg-${i}`}
              title={`${s.userName} — from ${startLabel}`}
              style={{
                position: "absolute",
                left: `${left}%`,
                width: `${width}%`,
                top: 8,
                bottom: 8,
                background: c.bg,
                color: c.fg,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 8px",
                overflow: "hidden",
                whiteSpace: "nowrap",
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
              }}
            >
              {width > 6 ? <Avatar src={avatarSrc(s.avatarUrl)} size={18} /> : null}
              {width > 10 ? (
                <span style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.userName}
                </span>
              ) : null}
            </div>
          );
        })}

        {showNow ? (
          <div
            style={{
              position: "absolute",
              left: `${pct(nowMs)}%`,
              top: 0,
              bottom: 0,
              width: 2,
              background: "var(--fgColor-danger, #cf222e)",
            }}
          />
        ) : null}
      </div>

      <div style={{ position: "relative", height: 18, marginTop: 4 }}>
        {days.map((day) => (
          <div
            key={`label-${day.getTime()}`}
            style={{
              position: "absolute",
              left: `${pct(day.getTime())}%`,
              fontSize: 11,
              color: "var(--fgColor-muted, #656d76)",
              transform: "translateX(3px)",
              whiteSpace: "nowrap",
            }}
          >
            {dayLabel(day)}
          </div>
        ))}
      </div>
    </div>
  );
}
