"use client";

import { Label } from "@primer/react";
import type { LabelColorOptions } from "@primer/react";

type Variant = LabelColorOptions;

const INCIDENT_STATUS: Record<string, { variant: Variant; text: string }> = {
  triggered: { variant: "danger", text: "Triggered" },
  acknowledged: { variant: "attention", text: "Acknowledged" },
  resolved: { variant: "success", text: "Resolved" },
};

const URGENCY: Record<string, { variant: Variant; text: string }> = {
  high: { variant: "danger", text: "High" },
  low: { variant: "secondary", text: "Low" },
};

const SERVICE_STATUS: Record<string, { variant: Variant; text: string }> = {
  active: { variant: "success", text: "Active" },
  maintenance: { variant: "attention", text: "Maintenance" },
  disabled: { variant: "secondary", text: "Disabled" },
};

export function IncidentStatusLabel({ status }: { status: string }) {
  const s = INCIDENT_STATUS[status] ?? { variant: "default" as Variant, text: status };
  return <Label variant={s.variant}>{s.text}</Label>;
}

export function UrgencyLabel({ urgency }: { urgency: string }) {
  const s = URGENCY[urgency] ?? { variant: "default" as Variant, text: urgency };
  return <Label variant={s.variant}>{s.text}</Label>;
}

export function ServiceStatusLabel({ status }: { status: string }) {
  const s = SERVICE_STATUS[status] ?? { variant: "default" as Variant, text: status };
  return <Label variant={s.variant}>{s.text}</Label>;
}
