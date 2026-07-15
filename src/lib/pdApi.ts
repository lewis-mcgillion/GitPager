// PagerDuty REST API client that runs in the browser. PagerDuty serves
// permissive CORS, so a static SPA can call it directly using the token from
// pdAuth. All calls go to the region-specific API base (EU by default).

import { PD_API_BASE } from "./pdConfig";
import { authHeader, logout } from "./pdAuth";

const PD_ACCEPT = "application/vnd.pagerduty+json;version=2";

export class PdAuthError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "PdAuthError";
  }
}

export class PdApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "PdApiError";
    this.status = status;
  }
}

type Query = Record<string, string | number | boolean | string[] | undefined>;

function buildQuery(query?: Query): string {
  if (!query) return "";
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) for (const v of value) sp.append(key, v);
    else sp.append(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

interface FetchOptions {
  method?: string;
  query?: Query;
  body?: unknown;
  /** Value for the `From` header (a user email) — required by incident writes. */
  from?: string;
}

export async function pdFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const auth = authHeader();
  if (!auth) throw new PdAuthError();

  const headers: Record<string, string> = { Accept: PD_ACCEPT, Authorization: auth };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.from) headers["From"] = opts.from;

  const res = await fetch(`${PD_API_BASE}${path}${buildQuery(opts.query)}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401) {
    logout();
    throw new PdAuthError("Session expired — please sign in again.");
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try {
      const j = JSON.parse(text);
      message = j?.error?.message || j?.error?.errors?.join(", ") || text;
    } catch {
      /* keep raw text */
    }
    throw new PdApiError(res.status, message || `Request failed (${res.status})`);
  }
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Fetch every page of a list endpoint, following PagerDuty's offset pagination. */
export async function pdList<T>(path: string, key: string, query: Query = {}): Promise<T[]> {
  const limit = 100;
  let offset = 0;
  const out: T[] = [];
  for (let page = 0; page < 50; page++) {
    const data = await pdFetch<Record<string, unknown>>(path, {
      query: { ...query, limit, offset },
    });
    const items = (data[key] as T[]) ?? [];
    out.push(...items);
    if (!data.more || items.length === 0) break;
    offset += limit;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Types (only the fields GitPager uses)
// ---------------------------------------------------------------------------

export interface PdRef {
  id: string;
  type: string;
  summary?: string;
  html_url?: string;
}

export interface PdUser {
  id: string;
  type: string;
  name: string;
  email: string;
  avatar_url?: string;
  html_url?: string;
  role?: string;
  job_title?: string | null;
  time_zone?: string;
  description?: string | null;
  teams?: PdRef[];
}

export interface PdOnCall {
  user: PdRef & { name?: string };
  schedule?: PdRef | null;
  escalation_policy?: PdRef | null;
  escalation_level?: number;
  start?: string | null;
  end?: string | null;
}

export interface PdRenderedEntry {
  start: string;
  end: string;
  user: PdRef & { name?: string };
}

export interface PdScheduleLayer {
  id?: string;
  name?: string;
  rendered_schedule_entries?: PdRenderedEntry[];
  rotation_virtual_start?: string;
  rotation_turn_length_seconds?: number;
  users?: { user: PdRef & { name?: string } }[];
}

export interface PdOverride {
  id: string;
  start: string;
  end: string;
  user: PdRef & { name?: string };
}

export interface PdSchedule {
  id: string;
  type: string;
  name: string;
  description?: string | null;
  time_zone?: string;
  html_url?: string;
  summary?: string;
  teams?: PdRef[];
  users?: (PdRef & { name?: string })[];
  schedule_layers?: PdScheduleLayer[];
  final_schedule?: PdScheduleLayer;
  overrides?: PdOverride[];
  escalation_policies?: PdRef[];
}

export interface PdEscalationRuleTarget extends PdRef {
  name?: string;
}

export interface PdEscalationRule {
  id: string;
  escalation_delay_in_minutes: number;
  targets: PdEscalationRuleTarget[];
}

export interface PdEscalationPolicy {
  id: string;
  type: string;
  name: string;
  description?: string | null;
  summary?: string;
  html_url?: string;
  num_loops?: number;
  escalation_rules?: PdEscalationRule[];
  services?: PdRef[];
  teams?: PdRef[];
}

export interface PdService {
  id: string;
  type: string;
  name: string;
  description?: string | null;
  status?: string;
  html_url?: string;
  summary?: string;
  escalation_policy?: PdRef;
  teams?: PdRef[];
}

export interface PdIncident {
  id: string;
  type: string;
  incident_number: number;
  title: string;
  description?: string;
  status: string;
  urgency: string;
  created_at: string;
  html_url?: string;
  service?: PdRef;
  escalation_policy?: PdRef;
  assignments?: { assignee: PdRef & { name?: string } }[];
  acknowledgements?: { acknowledger: PdRef & { name?: string }; at: string }[];
  last_status_change_at?: string;
}

export interface PdLogEntry {
  id: string;
  type: string;
  created_at: string;
  summary?: string;
  agent?: PdRef & { name?: string };
  channel?: { type?: string; summary?: string };
}

export interface PdTeam {
  id: string;
  type: string;
  name: string;
  description?: string | null;
  summary?: string;
  html_url?: string;
}

// ---------------------------------------------------------------------------
// Typed helpers
// ---------------------------------------------------------------------------

export async function getCurrentUser(): Promise<PdUser> {
  const data = await pdFetch<{ user: PdUser }>("/users/me");
  return data.user;
}

export function listOnCalls(query: Query = {}): Promise<PdOnCall[]> {
  return pdList<PdOnCall>("/oncalls", "oncalls", {
    "include[]": ["users"],
    ...query,
  });
}

export function listSchedules(): Promise<PdSchedule[]> {
  return pdList<PdSchedule>("/schedules", "schedules");
}

export async function getSchedule(id: string, since: string, until: string): Promise<PdSchedule> {
  const data = await pdFetch<{ schedule: PdSchedule }>(`/schedules/${id}`, {
    query: { since, until, time_zone: "UTC" },
  });
  return data.schedule;
}

export async function createOverride(
  scheduleId: string,
  input: { start: string; end: string; userId: string },
): Promise<PdOverride> {
  const data = await pdFetch<{ override: PdOverride }>(`/schedules/${scheduleId}/overrides`, {
    method: "POST",
    body: {
      override: {
        start: input.start,
        end: input.end,
        user: { id: input.userId, type: "user_reference" },
      },
    },
  });
  return data.override;
}

export function deleteOverride(scheduleId: string, overrideId: string): Promise<void> {
  return pdFetch<void>(`/schedules/${scheduleId}/overrides/${overrideId}`, { method: "DELETE" });
}

export function listEscalationPolicies(): Promise<PdEscalationPolicy[]> {
  return pdList<PdEscalationPolicy>("/escalation_policies", "escalation_policies");
}

export async function getEscalationPolicy(id: string): Promise<PdEscalationPolicy> {
  const data = await pdFetch<{ escalation_policy: PdEscalationPolicy }>(`/escalation_policies/${id}`);
  return data.escalation_policy;
}

export function listServices(): Promise<PdService[]> {
  return pdList<PdService>("/services", "services", { "include[]": ["escalation_policies", "teams"] });
}

export async function getService(id: string): Promise<PdService> {
  const data = await pdFetch<{ service: PdService }>(`/services/${id}`, {
    query: { "include[]": ["escalation_policies", "teams"] },
  });
  return data.service;
}

export function listIncidents(query: Query = {}): Promise<PdIncident[]> {
  return pdList<PdIncident>("/incidents", "incidents", {
    "include[]": ["assignees", "services"],
    sort_by: "created_at:desc",
    ...query,
  });
}

export async function getIncident(id: string): Promise<PdIncident> {
  const data = await pdFetch<{ incident: PdIncident }>(`/incidents/${id}`);
  return data.incident;
}

export function listIncidentLogEntries(id: string): Promise<PdLogEntry[]> {
  return pdList<PdLogEntry>(`/incidents/${id}/log_entries`, "log_entries", { "include[]": ["channels"] });
}

export async function manageIncident(
  id: string,
  status: "acknowledged" | "resolved",
  fromEmail: string,
): Promise<PdIncident> {
  const data = await pdFetch<{ incident: PdIncident }>(`/incidents/${id}`, {
    method: "PUT",
    from: fromEmail,
    body: { incident: { type: "incident_reference", status } },
  });
  return data.incident;
}

export function listUsers(): Promise<PdUser[]> {
  return pdList<PdUser>("/users", "users", { "include[]": ["teams"] });
}

export async function getUser(id: string): Promise<PdUser> {
  const data = await pdFetch<{ user: PdUser }>(`/users/${id}`, { query: { "include[]": ["teams"] } });
  return data.user;
}

export function listTeams(): Promise<PdTeam[]> {
  return pdList<PdTeam>("/teams", "teams");
}

export async function getTeam(id: string): Promise<PdTeam> {
  const data = await pdFetch<{ team: PdTeam }>(`/teams/${id}`);
  return data.team;
}
