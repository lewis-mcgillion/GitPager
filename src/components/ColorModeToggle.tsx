"use client";

import { useSyncExternalStore } from "react";
import { IconButton } from "@primer/react";
import { SunIcon, MoonIcon } from "@primer/octicons-react";

const STORAGE_KEY = "gitpager-color-mode";

type Mode = "light" | "dark";

// Resolves the currently-applied color mode from the <html> data attribute,
// falling back to the OS preference when the app is in "auto" mode.
function currentMode(): Mode {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-color-mode");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const CHANGE_EVENT = "gitpager-color-mode-change";

// Subscribe to OS theme changes (for "auto" mode) and to our own manual toggles,
// so the icon always reflects the applied theme — without a setState-in-effect.
function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    mq.removeEventListener("change", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

// Toggles Primer's color mode by flipping the `data-color-mode` attribute on
// <html> (the single source of truth for theme tokens) and persisting it.
export function ColorModeToggle() {
  const mode = useSyncExternalStore(subscribe, currentMode, () => "light" as Mode);
  const isDark = mode === "dark";

  const toggle = () => {
    const next: Mode = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-color-mode", next);
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return (
    <IconButton
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      icon={isDark ? SunIcon : MoonIcon}
      variant="invisible"
      onClick={toggle}
    />
  );
}
