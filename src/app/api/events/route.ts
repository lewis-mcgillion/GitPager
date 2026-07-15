import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  triggerIncident,
  acknowledgeIncident,
  resolveIncident,
  urgencyForSeverity,
} from "@/lib/incidents";
import { OPEN_INCIDENT_STATUSES } from "@/lib/domain";

// PagerDuty Events-v2-style ingestion endpoint. Authorised by the service's
// integration key (`routing_key`) rather than a user session — this is how
// monitoring tools would page GitPager programmatically.
//
//   POST /api/events
//   { "routing_key": "<integrationKey>",
//     "event_action": "trigger" | "acknowledge" | "resolve",
//     "dedup_key": "optional-for-trigger, required-for-ack/resolve",
//     "payload": { "summary": "...", "severity": "critical|error|warning|info", "source": "..." } }
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "error", message: "Invalid JSON body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const routingKey = typeof b.routing_key === "string" ? b.routing_key : "";
  const action = typeof b.event_action === "string" ? b.event_action : "";
  const dedupKeyIn = typeof b.dedup_key === "string" ? b.dedup_key : null;
  const payload = (b.payload ?? {}) as Record<string, unknown>;

  if (!routingKey) {
    return NextResponse.json({ status: "error", message: "routing_key is required" }, { status: 400 });
  }
  if (!["trigger", "acknowledge", "resolve"].includes(action)) {
    return NextResponse.json(
      { status: "error", message: "event_action must be trigger, acknowledge or resolve" },
      { status: 400 },
    );
  }

  const service = await db.service.findUnique({ where: { integrationKey: routingKey } });
  if (!service) {
    return NextResponse.json({ status: "error", message: "Unknown routing_key" }, { status: 404 });
  }

  if (action === "trigger") {
    const summary = typeof payload.summary === "string" && payload.summary.trim().length > 0 ? payload.summary.trim() : "Incident triggered via Events API";
    const source = typeof payload.source === "string" ? payload.source : null;
    const severity = typeof payload.severity === "string" ? payload.severity : null;
    const dedupKey = dedupKeyIn ?? `auto-${randomUUID()}`;

    const result = await triggerIncident({
      service: { id: service.id, name: service.name, escalationPolicyId: service.escalationPolicyId },
      title: summary,
      description: source ? `Source: ${source}` : null,
      urgency: urgencyForSeverity(severity),
      dedupKey,
    });

    return NextResponse.json(
      {
        status: "success",
        message: result.deduped ? "Existing incident found for dedup_key" : "Incident triggered",
        dedup_key: dedupKey,
        incident_number: result.number,
      },
      { status: 202 },
    );
  }

  // acknowledge / resolve require a dedup_key to locate the open incident.
  if (!dedupKeyIn) {
    return NextResponse.json(
      { status: "error", message: "dedup_key is required to acknowledge or resolve" },
      { status: 400 },
    );
  }

  const incident = await db.incident.findFirst({
    where: { serviceId: service.id, dedupKey: dedupKeyIn, status: { in: OPEN_INCIDENT_STATUSES } },
  });
  if (!incident) {
    return NextResponse.json(
      { status: "error", message: "No open incident found for dedup_key" },
      { status: 404 },
    );
  }

  if (action === "acknowledge") {
    await acknowledgeIncident(incident.id, null);
    return NextResponse.json({ status: "success", message: "Incident acknowledged", dedup_key: dedupKeyIn }, { status: 202 });
  }

  await resolveIncident(incident.id, null);
  return NextResponse.json({ status: "success", message: "Incident resolved", dedup_key: dedupKeyIn }, { status: 202 });
}
