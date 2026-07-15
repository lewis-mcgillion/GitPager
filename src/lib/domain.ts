// Shared domain types and constants. SQLite has no enums, so these string-union
// types are the source of truth for the allowed values of the corresponding
// string columns in prisma/schema.prisma.

export type UserRole = "admin" | "member";
export type TeamRole = "manager" | "member";
export type ServiceStatus = "active" | "maintenance" | "disabled";
export type IncidentStatus = "triggered" | "acknowledged" | "resolved";
export type IncidentUrgency = "high" | "low";
export type RotationType = "daily" | "weekly" | "custom";
export type EscalationTargetType = "user" | "schedule";
export type NotificationChannel = "inapp" | "email" | "slack";
export type LogEntryType =
  | "triggered"
  | "acknowledged"
  | "resolved"
  | "escalated"
  | "notified"
  | "reassigned"
  | "annotated";

export const INCIDENT_STATUSES: IncidentStatus[] = [
  "triggered",
  "acknowledged",
  "resolved",
];

export const SERVICE_STATUSES: ServiceStatus[] = [
  "active",
  "maintenance",
  "disabled",
];

export const ROTATION_TYPES: RotationType[] = ["daily", "weekly", "custom"];

// Common rotation turn lengths in seconds.
export const ROTATION_LENGTH_SECONDS: Record<Exclude<RotationType, "custom">, number> = {
  daily: 24 * 60 * 60,
  weekly: 7 * 24 * 60 * 60,
};

// Open (actionable) incident statuses.
export const OPEN_INCIDENT_STATUSES: IncidentStatus[] = ["triggered", "acknowledged"];

export function isOpenStatus(status: string): boolean {
  return status === "triggered" || status === "acknowledged";
}
