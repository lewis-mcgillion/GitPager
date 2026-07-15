"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PdAuthError } from "./pdApi";

export interface AsyncState<T> {
  data?: T;
  loading: boolean;
  error?: string;
  reload: () => void;
}

/**
 * Runs an async PagerDuty fetch in a client component, exposing loading/error
 * state and a `reload()` for after mutations. On an auth error it clears the
 * session and sends the user to sign in.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const router = useRouter();
  const [state, setState] = useState<{ data?: T; loading: boolean; error?: string }>({ loading: true });
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    async function load() {
      setState((s) => ({ ...s, loading: true, error: undefined }));
      try {
        const data = await fn();
        if (active) setState({ data, loading: false });
      } catch (err) {
        if (!active) return;
        if (err instanceof PdAuthError) {
          router.replace("/signin/");
          return;
        }
        setState({ loading: false, error: err instanceof Error ? err.message : String(err) });
      }
    }
    load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);

  return { ...state, reload };
}
