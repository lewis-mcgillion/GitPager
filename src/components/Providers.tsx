"use client";

import React from "react";
import { ThemeProvider, BaseStyles } from "@primer/react";
import { StyledComponentsRegistry } from "./StyledComponentsRegistry";

// Client-side providers: styled-components SSR registry + Primer theme context.
// The actual color tokens are applied via [data-color-mode] on <html> (see
// layout.tsx), so ThemeProvider runs in `contextOnly` mode to avoid rendering a
// competing themed wrapper that would fight the html-level theme on toggle.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StyledComponentsRegistry>
      <ThemeProvider colorMode="auto" contextOnly>
        <BaseStyles>{children}</BaseStyles>
      </ThemeProvider>
    </StyledComponentsRegistry>
  );
}
