"use client";

import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delayMs` of no
 * changes. Used by search inputs so we hit the PagerDuty API once the user
 * pauses typing instead of on every keystroke. Setting state inside a timeout
 * (rather than synchronously in the effect body) keeps it lint-safe.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
