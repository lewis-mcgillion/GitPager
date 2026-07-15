"use client";

import React from "react";
import { Heading, Text } from "@primer/react";

// Consistent page title block used at the top of each page's client view.
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 20,
        flexWrap: "wrap",
      }}
    >
      <div>
        <Heading as="h1" variant="medium" style={{ marginBottom: description ? 4 : 0 }}>
          {title}
        </Heading>
        {description ? (
          <Text style={{ color: "var(--fgColor-muted)" }}>{description}</Text>
        ) : null}
      </div>
      {actions ? <div style={{ display: "flex", gap: 8 }}>{actions}</div> : null}
    </div>
  );
}
