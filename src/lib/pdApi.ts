// PagerDuty REST API client that runs in the browser. PagerDuty serves
// permissive CORS, so a static SPA can call it directly using the token from
// pdAuth. Calls go to the region-specific API base resolved at sign-in
// (US https://api.pagerduty.com or EU https://api.eu.pagerduty.com).

import { authHeader, getApiBase, setApiBase, logout } from "./pdAuth";

const PD_ACCEPT = "application/vnd.pagerduty+json;version=2";

/** Candidate REST API bases, tried in order when probing an account's region. */
export const PD_API_BASES = ["https://api.pagerduty.com", "https://api.eu.pagerduty.com"];

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

  const url = `${getApiBase()}${path}${buildQuery(opts.query)}`;
  let res: Response;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    // PagerDuty rate-limits with 429 + Retry-After. Back off briefly and retry
    // rather than surfacing a hard error to the user.
    if (res.status !== 429 || attempt >= 3) break;
    const retryAfter = Number(res.headers.get("retry-after"));
    const delayMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, delayMs));
  }

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
    if (res.status === 403) {
      message =
        (message ? `${message} — ` : "") +
        "This token can't perform that action (403). Personal API tokens act with your PagerDuty permissions.";
    }
    if (res.status === 429) {
      message = "PagerDuty is rate-limiting requests (429). Please wait a moment and try again.";
    }
    throw new PdApiError(res.status, message || `Request failed (${res.status})`);
  }
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Probe the candidate regions with the current token and remember the one that
 *  responds (anything other than 401 = right region). Lets a pasted REST token
 *  work whether the account is US or EU without the user choosing a region. */
export async function detectAndStoreRegion(): Promise<void> {
  const auth = authHeader();
  if (!auth) return;
  for (const base of PD_API_BASES) {
    try {
      const res = await fetch(`${base}/abilities`, { headers: { Accept: PD_ACCEPT, Authorization: auth } });
      if (res.status !== 401) {
        setApiBase(base);
        return;
      }
    } catch {
      /* network error — try the next base */
    }
  }
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

/** A single page of results from a PagerDuty list endpoint. */
export interface PdPage<T> {
  items: T[];
  more: boolean;
  offset: number;
  limit: number;
}

/** Fetch one page of a list endpoint (no auto-pagination). Powers the
 *  search-first browse UI, which loads a page at a time on demand instead of
 *  crawling every page of an account-wide collection. */
export async function pdFetchPage<T>(
  path: string,
  key: string,
  query: Query,
  offset: number,
  limit = 25,
): Promise<PdPage<T>> {
  const data = await pdFetch<Record<string, unknown>>(path, { query: { ...query, limit, offset } });
  return { items: (data[key] as T[]) ?? [], more: Boolean(data.more), offset, limit };
}

/** An empty page — returned when a user-scoped browse has nothing to scope to
 *  (e.g. a user on no teams). We prompt to search instead of falling back to an
 *  unscoped account-wide fetch. */
function emptyPage<T>(offset = 0, limit = 25): PdPage<T> {
  return { items: [], more: false, offset, limit };
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
  const data = await pdFetch<{ user: PdUser }>("/users/me", { query: { "include[]": ["teams"] } });
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

/** The schedules a user actually participates in, derived from their on-call
 *  entries over the next ~90 days. This scopes the query to just that user
 *  instead of paging through every schedule/on-call in the account. */
export async function listMySchedules(userId: string): Promise<PdRef[]> {
  const now = new Date();
  const until = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const oncalls = await listOnCalls({
    "user_ids[]": [userId],
    "include[]": [],
    since: now.toISOString(),
    until: until.toISOString(),
  });
  const byId = new Map<string, PdRef>();
  for (const o of oncalls) if (o.schedule?.id) byId.set(o.schedule.id, o.schedule);
  return [...byId.values()].sort((a, b) => (a.summary ?? "").localeCompare(b.summary ?? ""));
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

/** Members of a single team. Scopes the query to the team (`team_ids[]`) so we
 *  fetch only its members instead of crawling every user in the account. */
export function listTeamMembers(teamId: string): Promise<PdUser[]> {
  return pdList<PdUser>("/users", "users", { "team_ids[]": [teamId] });
}

// ---------------------------------------------------------------------------
// Paged, query-first browse helpers
//
// Each returns a single page. With no `query`, results are scoped to the
// signed-in user (their teams) so the default view prioritises what they
// belong to. With a `query`, we search that endpoint account-wide by name.
// ---------------------------------------------------------------------------

export function searchEscalationPolicies(p: {
  query?: string;
  userIds?: string[];
  offset?: number;
  limit?: number;
}): Promise<PdPage<PdEscalationPolicy>> {
  const q: Query = {};
  if (p.query) q.query = p.query;
  else if (p.userIds?.length) q["user_ids[]"] = p.userIds;
  else return Promise.resolve(emptyPage<PdEscalationPolicy>(p.offset ?? 0, p.limit ?? 25));
  return pdFetchPage<PdEscalationPolicy>("/escalation_policies", "escalation_policies", q, p.offset ?? 0, p.limit ?? 25);
}

export function searchSchedules(p: { query?: string; offset?: number; limit?: number }): Promise<PdPage<PdSchedule>> {
  const q: Query = {};
  if (p.query) q.query = p.query;
  return pdFetchPage<PdSchedule>("/schedules", "schedules", q, p.offset ?? 0, p.limit ?? 25);
}

export function searchServices(p: {
  query?: string;
  teamIds?: string[];
  offset?: number;
  limit?: number;
}): Promise<PdPage<PdService>> {
  const q: Query = { "include[]": ["escalation_policies", "teams"] };
  if (p.query) q.query = p.query;
  else if (p.teamIds?.length) q["team_ids[]"] = p.teamIds;
  else return Promise.resolve(emptyPage<PdService>(p.offset ?? 0, p.limit ?? 25));
  return pdFetchPage<PdService>("/services", "services", q, p.offset ?? 0, p.limit ?? 25);
}

export function searchTeams(p: { query?: string; offset?: number; limit?: number }): Promise<PdPage<PdTeam>> {
  const q: Query = {};
  if (p.query) q.query = p.query;
  return pdFetchPage<PdTeam>("/teams", "teams", q, p.offset ?? 0, p.limit ?? 25);
}

export function searchUsers(p: {
  query?: string;
  teamIds?: string[];
  offset?: number;
  limit?: number;
}): Promise<PdPage<PdUser>> {
  const q: Query = { "include[]": ["teams"] };
  if (p.query) q.query = p.query;
  else if (p.teamIds?.length) q["team_ids[]"] = p.teamIds;
  else return Promise.resolve(emptyPage<PdUser>(p.offset ?? 0, p.limit ?? 25));
  return pdFetchPage<PdUser>("/users", "users", q, p.offset ?? 0, p.limit ?? 25);
}

/** One page of incidents, newest first. Used by the incidents page instead of
 *  the account-wide crawl so we fetch a page at a time, sorted created_at desc. */
export function listIncidentsPage(p: {
  statuses: string[];
  serviceIds?: string[];
  offset?: number;
  limit?: number;
}): Promise<PdPage<PdIncident>> {
  const q: Query = {
    "include[]": ["assignees", "services"],
    "statuses[]": p.statuses,
    sort_by: "created_at:desc",
  };
  if (p.serviceIds?.length) q["service_ids[]"] = p.serviceIds;
  return pdFetchPage<PdIncident>("/incidents", "incidents", q, p.offset ?? 0, p.limit ?? 25);
}
