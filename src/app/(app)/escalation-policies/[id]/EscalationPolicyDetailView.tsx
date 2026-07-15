"use client";

import { Avatar, Button, Heading, Text, Label } from "@primer/react";
import { PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, PersonIcon, CalendarIcon } from "@primer/octicons-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, EmptyState, avatarSrc } from "@/components/ui";
import { addRule, deleteRule, updateRuleDelay, moveRule, addTarget, deleteTarget } from "../actions";

interface TargetVM {
  id: string;
  type: "user" | "schedule";
  label: string;
  avatarUrl: string | null;
  resolvesTo: string | null;
}

interface RuleVM {
  id: string;
  position: number;
  index: number;
  delayLabel: string;
  delayMinutes: number;
  targets: TargetVM[];
}

const border = "1px solid var(--borderColor-default, #d0d7de)";
const inputStyle: React.CSSProperties = {
  padding: "5px 8px",
  border,
  borderRadius: 6,
  background: "var(--bgColor-default, #fff)",
  color: "inherit",
  font: "inherit",
  fontSize: 13,
};

export function EscalationPolicyDetailView({
  policyId,
  name,
  description,
  teamName,
  repeatCount,
  services,
  rules,
  ruleCount,
  users,
  schedules,
  canEdit,
}: {
  policyId: string;
  name: string;
  description: string | null;
  teamName: string | null;
  repeatCount: number;
  services: { id: string; name: string }[];
  rules: RuleVM[];
  ruleCount: number;
  users: { id: string; name: string }[];
  schedules: { id: string; name: string }[];
  canEdit: boolean;
}) {
  return (
    <>
      <PageHeader
        title={name}
        description={description ?? undefined}
        actions={<Label variant="secondary">{teamName ?? "No team"}</Label>}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <Label variant="accent">{repeatCount > 0 ? `Repeats ${repeatCount}×` : "No repeat"}</Label>
        {services.length > 0 ? (
          <Label variant="secondary">Used by {services.map((s) => s.name).join(", ")}</Label>
        ) : (
          <Label variant="secondary">Not attached to a service</Label>
        )}
      </div>

      <Heading as="h2" variant="small" style={{ marginBottom: 8 }}>
        Escalation levels
      </Heading>

      {rules.length === 0 ? (
        <Card style={{ marginBottom: 16 }}>
          <EmptyState title="No levels yet" description="Add a level to decide who gets notified first." icon={<PersonIcon size={24} />} />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          {rules.map((rule) => (
            <Card key={rule.id} padded>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--bgColor-accent-emphasis, #0969da)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {rule.index + 1}
                </div>
                <div style={{ fontWeight: 600 }}>Level {rule.index + 1}</div>
                <Label variant="secondary">{rule.delayLabel}</Label>

                {canEdit ? (
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    {rule.index > 0 ? (
                      <form action={updateRuleDelay} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input type="hidden" name="id" value={rule.id} />
                        <input type="hidden" name="policyId" value={policyId} />
                        <input
                          type="number"
                          name="delayMinutes"
                          min={0}
                          defaultValue={rule.delayMinutes}
                          style={{ ...inputStyle, width: 64 }}
                          aria-label="Escalate after minutes"
                        />
                        <Text size="small" style={{ color: "var(--fgColor-muted)" }}>
                          min
                        </Text>
                        <Button type="submit" size="small" variant="invisible">
                          Save
                        </Button>
                      </form>
                    ) : null}
                    <form action={moveRule}>
                      <input type="hidden" name="id" value={rule.id} />
                      <input type="hidden" name="policyId" value={policyId} />
                      <input type="hidden" name="direction" value="up" />
                      <Button type="submit" size="small" variant="invisible" leadingVisual={ChevronUpIcon} aria-label="Move level up" disabled={rule.index === 0} />
                    </form>
                    <form action={moveRule}>
                      <input type="hidden" name="id" value={rule.id} />
                      <input type="hidden" name="policyId" value={policyId} />
                      <input type="hidden" name="direction" value="down" />
                      <Button type="submit" size="small" variant="invisible" leadingVisual={ChevronDownIcon} aria-label="Move level down" disabled={rule.index === ruleCount - 1} />
                    </form>
                    <form action={deleteRule}>
                      <input type="hidden" name="id" value={rule.id} />
                      <input type="hidden" name="policyId" value={policyId} />
                      <Button type="submit" size="small" variant="invisible" leadingVisual={TrashIcon} aria-label="Delete level" />
                    </form>
                  </div>
                ) : null}
              </div>

              {/* Targets */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {rule.targets.length === 0 ? (
                  <Text size="small" style={{ color: "var(--fgColor-muted)" }}>
                    No targets — nobody will be notified at this level.
                  </Text>
                ) : (
                  rule.targets.map((t) => (
                    <div
                      key={t.id}
                      style={{ display: "flex", alignItems: "center", gap: 6, border, borderRadius: 999, padding: "3px 6px 3px 8px" }}
                    >
                      {t.type === "user" ? (
                        <Avatar src={avatarSrc(t.avatarUrl)} alt="" size={18} />
                      ) : (
                        <CalendarIcon size={14} />
                      )}
                      <span style={{ fontSize: 13 }}>
                        {t.label}
                        {t.type === "schedule" ? (
                          <span style={{ color: "var(--fgColor-muted)" }}> → {t.resolvesTo ?? "no one"}</span>
                        ) : null}
                      </span>
                      {canEdit ? (
                        <form action={deleteTarget} style={{ display: "flex" }}>
                          <input type="hidden" name="id" value={t.id} />
                          <input type="hidden" name="policyId" value={policyId} />
                          <button
                            type="submit"
                            aria-label={`Remove ${t.label}`}
                            style={{ border: "none", background: "none", cursor: "pointer", color: "var(--fgColor-muted)", padding: 0, display: "flex", alignItems: "center" }}
                          >
                            <TrashIcon size={14} />
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ))
                )}
              </div>

              {/* Add target */}
              {canEdit ? (
                <form action={addTarget} style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="hidden" name="ruleId" value={rule.id} />
                  <input type="hidden" name="policyId" value={policyId} />
                  <select name="target" defaultValue="" style={inputStyle} aria-label="Add target">
                    <option value="" disabled>
                      Add a target…
                    </option>
                    <optgroup label="People">
                      {users.map((u) => (
                        <option key={u.id} value={`user:${u.id}`}>
                          {u.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Schedules">
                      {schedules.map((s) => (
                        <option key={s.id} value={`schedule:${s.id}`}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <Button type="submit" size="small" leadingVisual={PlusIcon}>
                    Add
                  </Button>
                </form>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      {canEdit ? (
        <form action={addRule}>
          <input type="hidden" name="policyId" value={policyId} />
          <Button type="submit" leadingVisual={PlusIcon} variant="primary">
            Add escalation level
          </Button>
        </form>
      ) : null}
    </>
  );
}
