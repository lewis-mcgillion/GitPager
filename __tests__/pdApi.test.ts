import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInWithToken } from "@/lib/pdAuth";
import { pdList, createOverride, deleteOverride, manageIncident, listIncidents } from "@/lib/pdApi";

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
