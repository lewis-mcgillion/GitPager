import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInWithToken } from "@/lib/pdAuth";
import { pdList, createOverride, deleteOverride, manageIncident, listIncidents, searchEscalationPolicies, searchServices, pdFetchPage, listIncidentsPage, listTeamMembers } from "@/lib/pdApi";

interface MockCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

function lastCall(fetchMock: ReturnType<typeof vi.fn>): MockCall {
  const [url, opts] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return {
    url: String(url),
    method: opts?.method ?? "GET",
    headers: opts?.headers ?? {},
    body: opts?.body ? JSON.parse(opts.body) : undefined,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return { status, ok: status >= 200 && status < 300, text: () => Promise.resolve(JSON.stringify(body)) };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.localStorage.clear();
  signInWithToken("test-token");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

describe("pdFetch headers", () => {
  it("sends the PagerDuty Accept header and Authorization", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ incidents: [], more: false }));
    await listIncidents();
    const call = lastCall(fetchMock);
    expect(call.headers["Accept"]).toBe("application/vnd.pagerduty+json;version=2");
    expect(call.headers["Authorization"]).toBe("Token token=test-token");
  });
});

describe("pdList pagination", () => {
  it("follows the `more` flag across pages and concatenates results", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ users: [{ id: "1" }, { id: "2" }], more: true }))
      .mockResolvedValueOnce(jsonResponse({ users: [{ id: "3" }], more: false }));

    const users = await pdList<{ id: string }>("/users", "users");
    expect(users.map((u) => u.id)).toEqual(["1", "2", "3"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Second request should advance the offset by the page limit.
    const second = String(fetchMock.mock.calls[1][0]);
    expect(second).toContain("offset=100");
  });
});

describe("listIncidents query building", () => {
  it("serialises array filters as repeated `statuses[]` params", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ incidents: [], more: false }));
    await listIncidents({ "statuses[]": ["triggered", "acknowledged"] });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("statuses%5B%5D=triggered");
    expect(url).toContain("statuses%5B%5D=acknowledged");
    expect(url).toContain("sort_by=created_at%3Adesc");
  });
});

describe("createOverride", () => {
  it("POSTs the correct override payload", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ override: { id: "O1" } }));
    await createOverride("SCHED1", {
      start: "2026-01-01T00:00:00Z",
      end: "2026-01-02T00:00:00Z",
      userId: "PU9",
    });
    const call = lastCall(fetchMock);
    expect(call.url).toContain("/schedules/SCHED1/overrides");
    expect(call.method).toBe("POST");
    expect(call.body).toEqual({
      override: {
        start: "2026-01-01T00:00:00Z",
        end: "2026-01-02T00:00:00Z",
        user: { id: "PU9", type: "user_reference" },
      },
    });
  });
});

describe("deleteOverride", () => {
  it("issues a DELETE to the override resource", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(undefined, 204));
    await deleteOverride("SCHED1", "O1");
    const call = lastCall(fetchMock);
    expect(call.method).toBe("DELETE");
    expect(call.url).toContain("/schedules/SCHED1/overrides/O1");
  });
});

describe("manageIncident", () => {
  it("PUTs the status change with a From header", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ incident: { id: "I1", status: "resolved" } }));
    await manageIncident("I1", "resolved", "on-call@example.com");
    const call = lastCall(fetchMock);
    expect(call.method).toBe("PUT");
    expect(call.url).toContain("/incidents/I1");
    expect(call.headers["From"]).toBe("on-call@example.com");
    expect(call.body).toEqual({ incident: { type: "incident_reference", status: "resolved" } });
  });
});

describe("auth error handling", () => {
  it("throws PdAuthError and clears the session on a 401", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { message: "no" } }, 401));
    await expect(listIncidents()).rejects.toThrow();
    // token should have been cleared by logout()
    expect(window.localStorage.getItem("gitpager.pd.auth")).toBeNull();
  });
});

describe("searchEscalationPolicies scoping", () => {
  it("scopes to the signed-in user when there is no query", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ escalation_policies: [], more: false }));
    await searchEscalationPolicies({ userIds: ["PME"], offset: 0 });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("user_ids%5B%5D=PME");
    expect(url).not.toContain("query=");
    expect(url).toContain("limit=25");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("searches by name account-wide (dropping the user scope) when a query is given", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ escalation_policies: [], more: false }));
    await searchEscalationPolicies({ query: "db", userIds: ["PME"], offset: 25 });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("query=db");
    expect(url).not.toContain("user_ids");
    expect(url).toContain("offset=25");
  });
});

describe("searchServices scoping", () => {
  it("scopes to the user's teams when there is no query", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ services: [], more: false }));
    await searchServices({ teamIds: ["T1", "T2"], offset: 0 });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("team_ids%5B%5D=T1");
    expect(url).toContain("team_ids%5B%5D=T2");
    expect(url).not.toContain("query=");
  });

  it("searches all services by name when a query is given", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ services: [], more: false }));
    await searchServices({ query: "api", teamIds: ["T1"], offset: 0 });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("query=api");
    expect(url).not.toContain("team_ids");
  });
});

describe("pdFetchPage", () => {
  it("returns a single page (more/offset/limit) without crawling", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ teams: [{ id: "T1" }], more: true }));
    const page = await pdFetchPage<{ id: string }>("/teams", "teams", { query: "x" }, 25, 25);
    expect(page.items).toEqual([{ id: "T1" }]);
    expect(page.more).toBe(true);
    expect(page.offset).toBe(25);
    expect(page.limit).toBe(25);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("offset=25");
    expect(url).toContain("limit=25");
  });
});

describe("listIncidentsPage", () => {
  it("requests one page sorted newest first with status and service filters", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ incidents: [{ id: "I1" }], more: false }));
    const page = await listIncidentsPage({ statuses: ["resolved"], serviceIds: ["S1"], limit: 10 });
    expect(page.items).toEqual([{ id: "I1" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("sort_by=created_at%3Adesc");
    expect(url).toContain("statuses%5B%5D=resolved");
    expect(url).toContain("service_ids%5B%5D=S1");
    expect(url).toContain("limit=10");
  });
});

describe("listTeamMembers", () => {
  it("scopes the users query to the given team", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ users: [{ id: "U1" }], more: false }));
    const members = await listTeamMembers("TEAM1");
    expect(members).toEqual([{ id: "U1" }]);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("team_ids%5B%5D=TEAM1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
