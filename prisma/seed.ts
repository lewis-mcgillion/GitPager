// Seed script: builds a realistic demo org so GitPager is usable immediately and
// the dev-login picker has people to sign in as. Run with `npm run db:seed`.
// Uses a relative import for the generated client because tsx does not resolve
// the "@/" tsconfig path alias.
import { PrismaClient } from "../src/generated/prisma";

const db = new PrismaClient();

// Anchor rotations to Monday 2026-07-13 09:00 UTC so schedules are live "now".
const ANCHOR = new Date("2026-07-13T09:00:00.000Z");
const WEEK = 7 * 24 * 60 * 60;
const DAY = 24 * 60 * 60;
const avatar = (login: string) => `https://github.com/${login}.png`;

async function main() {
  console.log("Clearing existing data…");
  // Delete in FK-safe order.
  await db.notification.deleteMany();
  await db.incidentLogEntry.deleteMany();
  await db.incident.deleteMany();
  await db.override.deleteMany();
  await db.scheduleLayerUser.deleteMany();
  await db.scheduleLayer.deleteMany();
  await db.escalationTarget.deleteMany();
  await db.escalationRule.deleteMany();
  await db.service.deleteMany();
  await db.escalationPolicy.deleteMany();
  await db.schedule.deleteMany();
  await db.teamMembership.deleteMany();
  await db.team.deleteMany();
  await db.user.deleteMany();

  console.log("Creating users…");
  const people = [
    { login: "lewis-mcgillion", name: "Lewis McGillion", role: "admin", tz: "Europe/London" },
    { login: "octocat", name: "Mona Lisa Octocat", role: "member", tz: "America/Los_Angeles" },
    { login: "defunkt", name: "Chris Wanstrath", role: "member", tz: "America/Los_Angeles" },
    { login: "mojombo", name: "Tom Preston-Werner", role: "member", tz: "America/New_York" },
    { login: "pjhyett", name: "PJ Hyett", role: "member", tz: "America/New_York" },
    { login: "kdaigle", name: "Kyle Daigle", role: "member", tz: "America/New_York" },
    { login: "hubot", name: "Hubot", role: "member", tz: "Etc/UTC" },
    { login: "ashley", name: "Ashley Chen", role: "member", tz: "Europe/Berlin" },
  ];
  const users = await Promise.all(
    people.map((p) =>
      db.user.create({
        data: {
          name: p.name,
          email: `${p.login}@github.example`,
          githubLogin: p.login,
          avatarUrl: avatar(p.login),
          role: p.role,
          timeZone: p.tz,
        },
      }),
    ),
  );
  const byLogin = Object.fromEntries(users.map((u) => [u.githubLogin!, u]));

  console.log("Creating teams…");
  const platform = await db.team.create({
    data: { name: "Platform", slug: "platform", description: "Core platform & API infrastructure" },
  });
  const payments = await db.team.create({
    data: { name: "Payments", slug: "payments", description: "Billing and payments systems" },
  });
  const sre = await db.team.create({
    data: { name: "SRE", slug: "sre", description: "Site reliability & incident response" },
  });

  const membership = (teamId: string, login: string, role = "member") =>
    db.teamMembership.create({ data: { teamId, userId: byLogin[login].id, role } });

  await Promise.all([
    membership(platform.id, "lewis-mcgillion", "manager"),
    membership(platform.id, "octocat"),
    membership(platform.id, "defunkt"),
    membership(platform.id, "ashley"),
    membership(payments.id, "mojombo", "manager"),
    membership(payments.id, "pjhyett"),
    membership(payments.id, "kdaigle"),
    membership(sre.id, "hubot"),
    membership(sre.id, "lewis-mcgillion"),
    membership(sre.id, "ashley"),
  ]);

  console.log("Creating schedules…");
  // Platform Primary: weekly rotation across 3 engineers, plus an override this week.
  const platformSchedule = await db.schedule.create({
    data: {
      name: "Platform — Primary",
      description: "Weekly primary on-call for the Platform team",
      timeZone: "Europe/London",
      teamId: platform.id,
      layers: {
        create: [
          {
            name: "Weekly rotation",
            position: 0,
            rotationType: "weekly",
            rotationLengthSeconds: WEEK,
            handoffTime: "10:00",
            startTime: ANCHOR,
            users: {
              create: [
                { userId: byLogin["lewis-mcgillion"].id, position: 0 },
                { userId: byLogin["octocat"].id, position: 1 },
                { userId: byLogin["defunkt"].id, position: 2 },
              ],
            },
          },
        ],
      },
    },
  });
  // "Cover for me" override: Ashley covers a two-day slice starting tomorrow.
  await db.override.create({
    data: {
      scheduleId: platformSchedule.id,
      userId: byLogin["ashley"].id,
      start: new Date(ANCHOR.getTime() + 3 * DAY * 1000),
      end: new Date(ANCHOR.getTime() + 5 * DAY * 1000),
    },
  });

  // Payments Primary: daily rotation across 3 engineers.
  const paymentsSchedule = await db.schedule.create({
    data: {
      name: "Payments — Primary",
      description: "Daily primary on-call for Payments",
      timeZone: "America/New_York",
      teamId: payments.id,
      layers: {
        create: [
          {
            name: "Daily rotation",
            position: 0,
            rotationType: "daily",
            rotationLengthSeconds: DAY,
            handoffTime: "09:00",
            startTime: ANCHOR,
            users: {
              create: [
                { userId: byLogin["mojombo"].id, position: 0 },
                { userId: byLogin["pjhyett"].id, position: 1 },
                { userId: byLogin["kdaigle"].id, position: 2 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log("Creating escalation policies…");
  const platformPolicy = await db.escalationPolicy.create({
    data: {
      name: "Platform Escalation",
      description: "Page the on-call, then the team manager",
      teamId: platform.id,
      repeatCount: 1,
      rules: {
        create: [
          {
            position: 0,
            delayMinutes: 15,
            targets: { create: [{ type: "schedule", scheduleId: platformSchedule.id }] },
          },
          {
            position: 1,
            delayMinutes: 30,
            targets: { create: [{ type: "user", userId: byLogin["lewis-mcgillion"].id }] },
          },
        ],
      },
    },
  });

  const paymentsPolicy = await db.escalationPolicy.create({
    data: {
      name: "Payments Escalation",
      description: "Page the on-call, then the Payments manager",
      teamId: payments.id,
      repeatCount: 0,
      rules: {
        create: [
          {
            position: 0,
            delayMinutes: 10,
            targets: { create: [{ type: "schedule", scheduleId: paymentsSchedule.id }] },
          },
          {
            position: 1,
            delayMinutes: 20,
            targets: { create: [{ type: "user", userId: byLogin["mojombo"].id }] },
          },
        ],
      },
    },
  });

  console.log("Creating services…");
  const apiGateway = await db.service.create({
    data: {
      name: "API Gateway",
      description: "Public REST & GraphQL API edge",
      status: "active",
      teamId: platform.id,
      escalationPolicyId: platformPolicy.id,
    },
  });
  const webApp = await db.service.create({
    data: {
      name: "Web App",
      description: "github.example web frontend",
      status: "active",
      teamId: platform.id,
      escalationPolicyId: platformPolicy.id,
    },
  });
  const paymentsService = await db.service.create({
    data: {
      name: "Payments Service",
      description: "Billing, invoicing and card processing",
      status: "active",
      teamId: payments.id,
      escalationPolicyId: paymentsPolicy.id,
    },
  });
  await db.service.create({
    data: {
      name: "Auth Service",
      description: "Identity, sessions and OAuth",
      status: "maintenance",
      teamId: platform.id,
      escalationPolicyId: platformPolicy.id,
    },
  });

  console.log("Creating incidents…");
  const now = new Date();
  // A triggered incident on the API Gateway, currently paging the on-call.
  const inc1 = await db.incident.create({
    data: {
      number: 1,
      title: "Elevated 5xx errors on API Gateway",
      description: "Error rate above 5% for /graphql over the last 10 minutes.",
      status: "triggered",
      urgency: "high",
      serviceId: apiGateway.id,
      escalationPolicyId: platformPolicy.id,
      currentLevel: 0,
      assignedUserId: byLogin["lewis-mcgillion"].id,
      createdAt: new Date(now.getTime() - 8 * 60 * 1000),
      logEntries: {
        create: [
          {
            type: "triggered",
            message: "Incident triggered by Datadog monitor 'API 5xx rate'.",
            createdAt: new Date(now.getTime() - 8 * 60 * 1000),
          },
          {
            type: "notified",
            actorUserId: byLogin["lewis-mcgillion"].id,
            message: "Notified Lewis McGillion (on-call, level 1).",
            createdAt: new Date(now.getTime() - 8 * 60 * 1000),
          },
        ],
      },
    },
  });
  await db.notification.create({
    data: {
      incidentId: inc1.id,
      userId: byLogin["lewis-mcgillion"].id,
      channel: "inapp",
      message: "🔴 [High] Elevated 5xx errors on API Gateway — you are on call.",
    },
  });

  // An acknowledged incident on Payments.
  await db.incident.create({
    data: {
      number: 2,
      title: "Payment webhook latency",
      description: "Stripe webhook processing p95 latency exceeded 2s.",
      status: "acknowledged",
      urgency: "low",
      serviceId: paymentsService.id,
      escalationPolicyId: paymentsPolicy.id,
      currentLevel: 0,
      assignedUserId: byLogin["mojombo"].id,
      createdAt: new Date(now.getTime() - 40 * 60 * 1000),
      logEntries: {
        create: [
          { type: "triggered", message: "Incident triggered via Events API.", createdAt: new Date(now.getTime() - 40 * 60 * 1000) },
          { type: "acknowledged", actorUserId: byLogin["mojombo"].id, message: "Acknowledged by Tom Preston-Werner.", createdAt: new Date(now.getTime() - 32 * 60 * 1000) },
        ],
      },
    },
  });

  // A resolved incident on the Web App.
  await db.incident.create({
    data: {
      number: 3,
      title: "Web App deploy caused blank page",
      description: "Bad build shipped to production; rolled back.",
      status: "resolved",
      urgency: "high",
      serviceId: webApp.id,
      escalationPolicyId: platformPolicy.id,
      currentLevel: 0,
      assignedUserId: byLogin["octocat"].id,
      createdAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 25 * 60 * 60 * 1000),
      logEntries: {
        create: [
          { type: "triggered", message: "Incident triggered by synthetic check 'Homepage render'.", createdAt: new Date(now.getTime() - 26 * 60 * 60 * 1000) },
          { type: "acknowledged", actorUserId: byLogin["octocat"].id, message: "Acknowledged by Mona Lisa Octocat.", createdAt: new Date(now.getTime() - 25.8 * 60 * 60 * 1000) },
          { type: "resolved", actorUserId: byLogin["octocat"].id, message: "Rolled back deploy; homepage healthy.", createdAt: new Date(now.getTime() - 25 * 60 * 60 * 1000) },
        ],
      },
    },
  });

  console.log("Seed complete:");
  console.log(`  ${users.length} users, 3 teams, 2 schedules, 2 escalation policies, 4 services, 3 incidents.`);
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
