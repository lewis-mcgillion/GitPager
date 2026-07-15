// A mock PagerDuty REST API for load/perf testing. It generates a realistically
// large account and answers the same endpoints (with pagination, query= search
// and entity filters) that the real API does — so we can exercise GitPager's
// data layer at scale WITHOUT touching a real PagerDuty account.

import { vi } from "vitest";
import type {
  PdUser,
  PdTeam,
  PdSchedule,
  PdService,
  PdEscalationPolicy,
  PdOnCall,
  PdIncident,
  PdRenderedEntry,
} from "@/lib/pdApi";

export interface Scale {
  users: number;
  teams: number;
  schedules: number;
  services: number;
  policies: number;
  incidents: number;
  /** On-call rows per policy = levels × users-per-level. Drives the storm. */
  oncallLevels: number;
  oncallUsersPerLevel: number;
}

export const DEFAULT_SCALE: Scale = {
  users: 600,
  teams: 60,
  schedules: 120,
  services: 250,
  policies: 300,
  incidents: 2000,
  oncallLevels: 4,
  oncallUsersPerLevel: 5,
};

export interface Dataset {
  me: PdUser;
  users: PdUser[];
  teams: PdTeam[];
  schedules: PdSchedule[];
  services: PdService[];
  policies: PdEscalationPolicy[];
  oncalls: PdOnCall[];
  incidents: PdIncident[];
  /** policyId -> set of user ids that are (directly or via schedule) targets. */
  policyTargetUsers: Map<string, Set<string>>;
  scale: Scale;
}

// Small deterministic PRNG so runs are reproducible.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ref = (id: string, summary: string, type: string) => ({ id, type, summary });

export function buildDataset(scale: Scale = DEFAULT_SCALE): Dataset {
  const rnd = mulberry32(1234567);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

  const teams: PdTeam[] = Array.from({ length: scale.teams }, (_, i) => ({
    id: `PT${i}`,
    type: "team",
    name: `Team ${i} Platform`,
    summary: `Team ${i} Platform`,
  }));

  const users: PdUser[] = Array.from({ length: scale.users }, (_, i) => {
    // Everyone is on 1–3 teams; user 0 (me) is pinned to the first three.
    const teamSet = new Set<string>();
    if (i === 0) {
      teamSet.add("PT0");
      teamSet.add("PT1");
      teamSet.add("PT2");
    } else {
      const n = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) teamSet.add(pick(teams).id);
    }
    return {
      id: `PU${i}`,
      type: "user",
      name: `User ${i} Example`,
      email: `user${i}@example.com`,
      avatar_url: undefined,
      role: pick(["user", "admin", "observer", "responder"]),
      job_title: pick(["SRE", "Engineer", "EM", "Support", "Platform"]),
      teams: [...teamSet].map((t) => ref(t, `Team ${t.slice(2)} Platform`, "team_reference")),
    };
  });
  const me = users[0];

  const schedules: PdSchedule[] = Array.from({ length: scale.schedules }, (_, i) => ({
    id: `PS${i}`,
    type: "schedule",
    name: `Schedule ${i} Rotation`,
    summary: `Schedule ${i} Rotation`,
    description: `Primary on-call rotation ${i}`,
  }));

  const services: PdService[] = Array.from({ length: scale.services }, (_, i) => {
    const teamSet = new Set<string>([pick(teams).id]);
    if (rnd() > 0.5) teamSet.add(pick(teams).id);
    return {
      id: `PSVC${i}`,
      type: "service",
      name: `Service ${i} API`,
      summary: `Service ${i} API`,
      description: `Backing service ${i}`,
      status: pick(["active", "warning", "critical", "maintenance", "disabled"]),
      teams: [...teamSet].map((t) => ref(t, "team", "team_reference")),
    };
  });

  const policyTargetUsers = new Map<string, Set<string>>();
  const policies: PdEscalationPolicy[] = Array.from({ length: scale.policies }, (_, i) => {
    const rules = 1 + Math.floor(rnd() * 4);
    const targetUsers = new Set<string>();
    // ~8 policies include me as a target so user_ids[]=me scoping returns a set.
    if (i < 8) targetUsers.add(me.id);
    for (let r = 0; r < rules; r++) targetUsers.add(pick(users).id);
    policyTargetUsers.set(`PEP${i}`, targetUsers);
    return {
      id: `PEP${i}`,
      type: "escalation_policy",
      name: `Escalation Policy ${i}`,
      summary: `Escalation Policy ${i}`,
      description: `Escalation policy ${i}`,
      escalation_rules: Array.from({ length: rules }, (_, r) => ({
        id: `PEP${i}-R${r}`,
        escalation_delay_in_minutes: 30,
        targets: [ref(pick(users).id, "user", "user_reference")],
      })),
    };
  });

  // On-call rows: PagerDuty returns one per (policy × level × user), which is
  // what used to explode. Plus a handful for `me` pointing at 5 schedules.
  const oncalls: PdOnCall[] = [];
  for (let p = 0; p < scale.policies; p++) {
    for (let lvl = 1; lvl <= scale.oncallLevels; lvl++) {
      for (let u = 0; u < scale.oncallUsersPerLevel; u++) {
        const user = pick(users);
        oncalls.push({
          user: ref(user.id, user.name, "user_reference"),
          schedule: rnd() > 0.3 ? ref(pick(schedules).id, "sched", "schedule_reference") : null,
          escalation_policy: ref(`PEP${p}`, "policy", "escalation_policy_reference"),
          escalation_level: lvl,
        });
      }
    }
  }
  for (let s = 0; s < 5; s++) {
    oncalls.push({
      user: ref(me.id, me.name, "user_reference"),
      schedule: ref(`PS${s}`, `Schedule ${s} Rotation`, "schedule_reference"),
      escalation_policy: ref(`PEP${s}`, "policy", "escalation_policy_reference"),
      escalation_level: 1,
    });
  }

  const now = Date.now();
  const statuses = ["triggered", "acknowledged", "resolved"];
  const incidents: PdIncident[] = Array.from({ length: scale.incidents }, (_, i) => ({
    id: `PINC${i}`,
    type: "incident",
    incident_number: scale.incidents - i,
    title: `Incident ${scale.incidents - i}: elevated error rate`,
    status: i < 40 ? statuses[i % 2] : "resolved",
    urgency: rnd() > 0.5 ? "high" : "low",
    created_at: new Date(now - i * 3_600_000).toISOString(),
    service: ref(pick(services).id, "svc", "service_reference"),
    assignments: [{ assignee: ref(pick(users).id, pick(users).name, "user_reference") }],
  }));

  return { me, users, teams, schedules, services, policies, oncalls, incidents, policyTargetUsers, scale };
}

// --- Mock HTTP layer --------------------------------------------------------

function jsonOk(body: unknown) {
  return {
    status: 200,
    ok: true,
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: { get: () => null },
  };
}

function intersects(a: string[], b: string[]): boolean {
  return a.some((x) => b.includes(x));
}

function paginate<T>(items: T[], key: string, offset: number, limit: number) {
  return jsonOk({ [key]: items.slice(offset, offset + limit), more: offset + limit < items.length });
}

/** 21 days of hourly rendered entries rotating between four users — a heavy
 *  schedule to stress the timeline transform. */
function renderedEntries(ds: Dataset, since: string, until: string): PdRenderedEntry[] {
  const start = new Date(since).getTime();
  const end = new Date(until || new Date(start + 21 * 864e5).toISOString()).getTime();
  const out: PdRenderedEntry[] = [];
  const rotation = ds.users.slice(1, 5);
  let cursor = start;
  let idx = 0;
  while (cursor < end && out.length < 2000) {
    const next = cursor + 3_600_000;
    const u = rotation[idx % rotation.length];
    out.push({
      start: new Date(cursor).toISOString(),
      end: new Date(Math.min(next, end)).toISOString(),
      user: ref(u.id, u.name, "user_reference"),
    });
    cursor = next;
    idx++;
  }
  return out;
}

/** A `fetch` replacement backed by the dataset. Returns a vi.fn so callers can
 *  inspect `.mock.calls` to count requests. */
export function makeFetchMock(ds: Dataset) {
  return vi.fn((input: unknown) => {
    const url = new URL(String(input));
    const seg = url.pathname.split("/").filter(Boolean); // e.g. ["schedules","PS1"]
    const sp = url.searchParams;
    const limit = Number(sp.get("limit") ?? "25");
    const offset = Number(sp.get("offset") ?? "0");
    const query = (sp.get("query") ?? "").toLowerCase();
    const userIds = sp.getAll("user_ids[]");
    const teamIds = sp.getAll("team_ids[]");
    const serviceIds = sp.getAll("service_ids[]");
    const statuses = sp.getAll("statuses[]");

    const [root, id] = seg;

    if (root === "abilities") return Promise.resolve(jsonOk({ abilities: [] }));

    if (root === "users" && id === "me") return Promise.resolve(jsonOk({ user: ds.me }));

    if (root === "users") {
      if (id) return Promise.resolve(jsonOk({ user: ds.users.find((u) => u.id === id) ?? ds.me }));
      let items = ds.users;
      if (teamIds.length) items = items.filter((u) => intersects((u.teams ?? []).map((t) => t.id), teamIds));
      if (query) items = items.filter((u) => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query));
      return Promise.resolve(paginate(items, "users", offset, limit));
    }

    if (root === "teams") {
      if (id) return Promise.resolve(jsonOk({ team: ds.teams.find((t) => t.id === id) ?? ds.teams[0] }));
      let items = ds.teams;
      if (query) items = items.filter((t) => t.name.toLowerCase().includes(query));
      return Promise.resolve(paginate(items, "teams", offset, limit));
    }

    if (root === "services") {
      if (id) return Promise.resolve(jsonOk({ service: ds.services.find((s) => s.id === id) ?? ds.services[0] }));
      let items = ds.services;
      if (teamIds.length) items = items.filter((s) => intersects((s.teams ?? []).map((t) => t.id), teamIds));
      if (query) items = items.filter((s) => s.name.toLowerCase().includes(query));
      return Promise.resolve(paginate(items, "services", offset, limit));
    }

    if (root === "escalation_policies") {
      if (id)
        return Promise.resolve(
          jsonOk({ escalation_policy: ds.policies.find((p) => p.id === id) ?? ds.policies[0] }),
        );
      let items = ds.policies;
      if (userIds.length)
        items = items.filter((p) => userIds.some((uid) => ds.policyTargetUsers.get(p.id)?.has(uid)));
      if (query) items = items.filter((p) => p.name.toLowerCase().includes(query));
      return Promise.resolve(paginate(items, "escalation_policies", offset, limit));
    }

    if (root === "schedules") {
      if (id) {
        const base = ds.schedules.find((s) => s.id === id) ?? ds.schedules[0];
        const entries = renderedEntries(ds, sp.get("since") ?? "", sp.get("until") ?? "");
        const schedule: PdSchedule = {
          ...base,
          time_zone: "UTC",
          users: ds.users.slice(1, 5).map((u) => ref(u.id, u.name, "user_reference")),
          final_schedule: { rendered_schedule_entries: entries },
          overrides: [],
        };
        return Promise.resolve(jsonOk({ schedule }));
      }
      let items = ds.schedules;
      if (query) items = items.filter((s) => s.name.toLowerCase().includes(query));
      return Promise.resolve(paginate(items, "schedules", offset, limit));
    }

    if (root === "oncalls") {
      let items = ds.oncalls;
      if (userIds.length) items = items.filter((o) => userIds.includes(o.user.id));
      return Promise.resolve(paginate(items, "oncalls", offset, limit));
    }

    if (root === "incidents") {
      if (id) return Promise.resolve(jsonOk({ incident: ds.incidents.find((x) => x.id === id) ?? ds.incidents[0] }));
      let items = ds.incidents;
      if (statuses.length) items = items.filter((x) => statuses.includes(x.status));
      if (serviceIds.length) items = items.filter((x) => x.service && serviceIds.includes(x.service.id));
      // Already generated newest-first; honour sort_by=created_at:desc.
      return Promise.resolve(paginate(items, "incidents", offset, limit));
    }

    return Promise.resolve(jsonOk({}));
  });
}
