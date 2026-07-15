"use client";

import React, { useState } from "react";
import { TextInput, Button, Text } from "@primer/react";
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon } from "@primer/octicons-react";
import { PageHeader } from "./PageHeader";
import { Card, CardRow, CardLink, EmptyState, Loading, ErrorState } from "./ui";
import { useAsync } from "@/lib/useAsync";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { PdPage } from "@/lib/pdApi";

/** One rendered row. Pages map their PagerDuty objects to this shape. */
export interface BrowseRow {
  id: string;
  title: string;
  subtitle?: string | null;
  /** Right-aligned content (status label, level count, job title, …). */
  meta?: React.ReactNode;
  href: string;
  /** Leading visual; falls back to the page's `icon` when omitted. */
  leading?: React.ReactNode;
}

interface ResourceBrowserProps {
  title: string;
  description?: string;
  /** Search box placeholder. */
  placeholder: string;
  /** Default leading icon for rows and the empty state. */
  icon: React.ReactNode;
  /** Larger icon for the empty state (defaults to `icon`). */
  emptyIcon?: React.ReactNode;
  /** Fetch one page for the given (debounced) query and offset. */
  fetchPage: (query: string, offset: number) => Promise<PdPage<BrowseRow>>;
  emptyTitle: string;
  emptyDescription?: string;
  /** Hint shown under the search box while no query is entered. */
  defaultHint?: string;
  pageSize?: number;
}

/**
 * A search-first, paginated list. The default (empty) query shows a page scoped
 * to the current user (their teams/schedules); typing runs a server-side
 * `query=` search against the endpoint. Results are paged with Prev/Next so we
 * never crawl an entire account-wide collection in one go.
 */
export function ResourceBrowser({
  title,
  description,
  placeholder,
  icon,
  emptyIcon,
  fetchPage,
  emptyTitle,
  emptyDescription,
  defaultHint,
  pageSize = 25,
}: ResourceBrowserProps) {
  const [term, setTerm] = useState("");
  const [offset, setOffset] = useState(0);
  const debounced = useDebouncedValue(term.trim(), 300);
  // While the debounce is still settling (user just typed), the fetch for the
  // new term hasn't started yet. Treat that as loading so we show a spinner
  // instead of stale results from the previous query.
  const pending = term.trim() !== debounced;

  const { data, loading, error, reload } = useAsync<PdPage<BrowseRow>>(
    () => fetchPage(debounced, offset),
    [debounced, offset],
  );

  const rows = data?.items ?? [];
  const more = data?.more ?? false;

  function onSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTerm(e.target.value);
    setOffset(0);
  }

  const mutedSmall: React.CSSProperties = { fontSize: 12, color: "var(--fgColor-muted, #656d76)" };

  return (
    <div>
      <PageHeader title={title} description={description} />

      <div style={{ marginBottom: 16 }}>
        <TextInput
          block
          leadingVisual={SearchIcon}
          placeholder={placeholder}
          value={term}
          onChange={onSearchChange}
          aria-label={placeholder}
        />
        {!debounced && defaultHint ? <div style={{ marginTop: 6, ...mutedSmall }}>{defaultHint}</div> : null}
      </div>

      {loading || pending ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={emptyIcon ?? icon}
            title={debounced ? `No matches for “${debounced}”` : emptyTitle}
            description={debounced ? "Try a different search term." : emptyDescription}
          />
        </Card>
      ) : (
        <>
          <Card>
            {rows.map((row, i) => (
              <CardRow key={row.id} style={i === 0 ? { borderTop: "none" } : undefined}>
                <span style={{ color: "var(--fgColor-muted, #656d76)", flexShrink: 0, display: "inline-flex" }}>
                  {row.leading ?? icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <CardLink href={row.href}>
                    <Text style={{ fontWeight: 500 }}>{row.title}</Text>
                  </CardLink>
                  {row.subtitle ? <div style={mutedSmall}>{row.subtitle}</div> : null}
                </div>
                {row.meta ? <div style={{ flexShrink: 0, ...mutedSmall }}>{row.meta}</div> : null}
              </CardRow>
            ))}
          </Card>

          {offset > 0 || more ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 12,
              }}
            >
              <Button
                leadingVisual={ChevronLeftIcon}
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - pageSize))}
              >
                Previous
              </Button>
              <Text style={mutedSmall}>
                {offset + 1}–{offset + rows.length}
              </Text>
              <Button
                trailingVisual={ChevronRightIcon}
                disabled={!more}
                onClick={() => setOffset((o) => o + pageSize)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
