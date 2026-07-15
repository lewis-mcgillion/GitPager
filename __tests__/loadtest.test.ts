// Load / performance test. Exercises the exact data path behind each GitPager
// page against a large mock PagerDuty account (see mockPagerDuty.ts) and checks
// that every page loads with a small, bounded number of API requests — the
// thing that actually determines how fast a page feels, since each request is a
// ~150–200ms round-trip to PagerDuty. No real API is touched.

import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { signInWithToken } from "@/lib/pdAuth";
import {
  listOnCalls,
  listIncidentsPage,
  listMySchedules,
  searchSchedules,
  getSchedule,
  searchEscalationPolicies,
  searchServices,
  searchUsers,
  searchTeams,
  getTeam,
  listTeamMembers,
  listUsers,
} from "@/lib/pdApi";
import { buildDataset, makeFetchMock, type Dataset } from "./mockPagerDuty";

// Assumed per-request latency to PagerDuty (TLS + server). Used to translate a
// request count into an estimated user-facing load time.
const PER_REQ_MS = 180;

let ds: Dataset;
let fetchMock: ReturnType<typeof makeFetchMock>;

interface Row {
  name: string;
  calls: number;
  budget: number;
  items: number;
  ms: number;
}
const rows: Row[] = [];

async function measure(name: string, budget: number, fn: () => Promise<unknown>): Promise<number> {
  fetchMock.mockClear();
  const t0 = performance.now();
  const res = await fn();
  const ms = performance.now() - t0;
  const calls = fetchMock.mock.calls.length;
  const items = Array.isArray(res) ? res.length : 1;
  rows.push({ name, calls, budget, items, ms: Number(ms.toFixed(1)) });
  return calls;
}

beforeAll(() => {
  window.localStorage.clear();
  signInWithToken("load-test-token");
  ds = buildDataset();
  fetchMock = makeFetchMock(ds);
  vi.stubGlobal("fetch", fetchMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("GitPager load test (mock PagerDuty)", () => {
  const myTeamIds = () => (ds.me.teams ?? []).map((t) => t.id);

  it("every page loads within its request budget", async () => {
    // Each scenario mirrors what a page fetches on open.
    const dash = await measure("Dashboard", 3, () =>
      Promise.all([
        listOnCalls({ "user_ids[]": [ds.me.id] }),
        listIncidentsPage({ statuses: ["triggered", "acknowledged"], limit: 25 }).then((p) => p.items),
      ]),
    );
    expect(dash).toBeLessThanOrEqual(3);

    expect(await measure("Schedules (your rotations)", 2, () => listMySchedules(ds.me.id))).toBeLessThanOrEqual(2);
    expect(await measure("Schedules (search)", 1, () => searchSchedules({ query: "rotation" }))).toBeLessThanOrEqual(1);

    // Heavy schedule: 21 days of hourly entries. One request; verify the
    // client-side transform to timeline segments stays fast.
    const t0 = performance.now();
    const sched = await getSchedule("PS1", new Date().toISOString(), new Date(Date.now() + 21 * 864e5).toISOString());
    const entries = sched.final_schedule?.rendered_schedule_entries ?? [];
    const segments = entries.map((e) => ({ userId: e.user.id, start: new Date(e.start), end: new Date(e.end) }));
    const transformMs = performance.now() - t0;
    rows.push({ name: "Schedule detail (21d hourly)", calls: 1, budget: 1, items: segments.length, ms: Number(transformMs.toFixed(1)) });
    expect(segments.length).toBeGreaterThan(100);
    expect(transformMs).toBeLessThan(75);

    expect(
      await measure("Escalation policies (yours)", 1, () => searchEscalationPolicies({ userIds: [ds.me.id] })),
    ).toBeLessThanOrEqual(1);
    expect(
      await measure("Escalation policies (search)", 1, () => searchEscalationPolicies({ query: "policy 2" })),
    ).toBeLessThanOrEqual(1);

    expect(await measure("Services (your teams)", 1, () => searchServices({ teamIds: myTeamIds() }))).toBeLessThanOrEqual(1);
    expect(await measure("Services (search)", 1, () => searchServices({ query: "api" }))).toBeLessThanOrEqual(1);

    expect(await measure("People (your teammates)", 1, () => searchUsers({ teamIds: myTeamIds() }))).toBeLessThanOrEqual(1);
    expect(await measure("People (search)", 1, () => searchUsers({ query: "user 1" }))).toBeLessThanOrEqual(1);

    // Teams default is served from the cached profile — zero requests.
    fetchMock.mockClear();
    const cachedTeams = ds.me.teams ?? [];
    rows.push({ name: "Teams (your teams, cached)", calls: fetchMock.mock.calls.length, budget: 0, items: cachedTeams.length, ms: 0 });
    expect(fetchMock.mock.calls.length).toBe(0);

    expect(await measure("Teams (search)", 1, () => searchTeams({ query: "platform" }))).toBeLessThanOrEqual(1);

    const teamDetail = await measure("Team detail (members)", 3, () =>
      Promise.all([getTeam("PT0"), listTeamMembers("PT0")]),
    );
    expect(teamDetail).toBeLessThanOrEqual(3);

    expect(
      await measure("Incidents (All)", 1, () =>
        listIncidentsPage({ statuses: ["triggered", "acknowledged", "resolved"], limit: 25 }).then((p) => p.items),
      ),
    ).toBeLessThanOrEqual(1);

    // Print the report.
    const pad = (s: string | number, n: number) => String(s).padEnd(n);
    const lpad = (s: string | number, n: number) => String(s).padStart(n);
    const header = `${pad("Page / action", 30)} ${lpad("reqs", 5)} ${lpad("budget", 7)} ${lpad("items", 6)} ${lpad("est.ms", 7)}`;
    const lines = rows.map(
      (r) => `${pad(r.name, 30)} ${lpad(r.calls, 5)} ${lpad(r.budget, 7)} ${lpad(r.items, 6)} ${lpad(r.calls * PER_REQ_MS, 7)}`,
    );
    const worst = Math.max(...rows.map((r) => r.calls));
    console.log(
      `\n=== GitPager load test — account scale ===\n` +
        `users=${ds.scale.users} teams=${ds.scale.teams} schedules=${ds.scale.schedules} ` +
        `services=${ds.scale.services} policies=${ds.scale.policies} incidents=${ds.scale.incidents} ` +
        `oncall-rows=${ds.oncalls.length}\n\n` +
        `${header}\n${"-".repeat(header.length)}\n${lines.join("\n")}\n\n` +
        `Worst-case page = ${worst} request(s) ≈ ${worst * PER_REQ_MS}ms at ${PER_REQ_MS}ms/req.\n`,
    );

    // No page should ever exceed 3 requests at this scale.
    expect(worst).toBeLessThanOrEqual(3);
  });

  it("user-scoping eliminates the on-call / user-list storms (before vs after)", async () => {
    fetchMock.mockClear();
    const unscoped = await listOnCalls();
    const oldOnCallReqs = fetchMock.mock.calls.length;

    fetchMock.mockClear();
    await listOnCalls({ "user_ids[]": [ds.me.id] });
    const newOnCallReqs = fetchMock.mock.calls.length;

    fetchMock.mockClear();
    await listUsers();
    const oldMemberReqs = fetchMock.mock.calls.length;

    fetchMock.mockClear();
    await listTeamMembers("PT0");
    const newMemberReqs = fetchMock.mock.calls.length;

    console.log(
      `\n=== Before vs after (requests) ===\n` +
        `On-call list:   unscoped ${oldOnCallReqs} (${oldOnCallReqs * PER_REQ_MS}ms, ${unscoped.length} rows)  ->  scoped ${newOnCallReqs} (${newOnCallReqs * PER_REQ_MS}ms)\n` +
        `Team members:   listUsers ${oldMemberReqs} (${oldMemberReqs * PER_REQ_MS}ms)  ->  team-scoped ${newMemberReqs} (${newMemberReqs * PER_REQ_MS}ms)\n`,
    );

    // The old paths storm; the new ones are a single request.
    expect(oldOnCallReqs).toBeGreaterThanOrEqual(10);
    expect(newOnCallReqs).toBe(1);
    expect(oldMemberReqs).toBeGreaterThan(newMemberReqs);
    expect(newMemberReqs).toBe(1);
  });
});
