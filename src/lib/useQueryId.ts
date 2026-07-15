"use client";

import { useSyncExternalStore } from "react";

// GitPager is a static export, so detail pages cannot be prerendered per-id.
// Instead we route with a `?id=` query param and read it on the client via
// useSyncExternalStore — the idiomatic way to read a browser-only value without
// a hydration mismatch or a setState-in-effect. `ready` is false during the
// server snapshot (prerender) and true once running in the browser, so callers
// can distinguish "not read yet" from "read but absent".

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

const noopSubscribe = () => () => {};

export function useQueryId(param = "id"): { id: string | null; ready: boolean } {
  const id = useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(param),
    () => null,
  );
  const ready = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  return { id, ready };
}
