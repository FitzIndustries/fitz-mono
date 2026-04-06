import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

import type { ThemeMode } from "@fitzindustries/ui/theme";
import { ThemeProvider, useTheme } from "@fitzindustries/ui/theme";
import { mutators, queries } from "@fitzindustries/zero-shared";
import {
  useZero,
  useQuery as useZeroQuery,
} from "@fitzindustries/zero-shared/react";

import { authClient } from "~/auth/client";
import { ZeroProvider } from "./zero-provider";

/**
 * ThemeProvider must be OUTSIDE ZeroProvider. The Rocicorp ZeroProvider
 * renders nothing until its internal useEffect creates the Zero instance,
 * so anything nested inside it (including ThemeProvider) is blocked from
 * rendering on first paint — causing FOUC / always-light theme.
 */
function Providers({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  if (pathname === "/login") {
    return children;
  }

  if (isSessionPending || !session) {
    return null;
  }

  return (
    <ThemeProvider>
      <ZeroProvider>
        <ThemePreferenceSync />
        {children}
      </ZeroProvider>
    </ThemeProvider>
  );
}

function ThemePreferenceSync() {
  const { themeMode, setTheme } = useTheme();
  const zero = useZero();
  const [currentUser] = useZeroQuery(queries.preferences.currentUser());
  const hasAppliedRemoteTheme = useRef(false);
  const lastSyncedTheme = useRef(themeMode);

  useEffect(() => {
    if (!currentUser) {
      hasAppliedRemoteTheme.current = false;
      lastSyncedTheme.current = themeMode;
      return;
    }

    const remoteTheme = (currentUser.themeMode ?? "auto") as ThemeMode;

    if (!hasAppliedRemoteTheme.current) {
      hasAppliedRemoteTheme.current = true;
      lastSyncedTheme.current = remoteTheme;

      if (remoteTheme !== themeMode) {
        setTheme(remoteTheme);
      }
      return;
    }

    if (remoteTheme !== themeMode && themeMode === lastSyncedTheme.current) {
      lastSyncedTheme.current = remoteTheme;
      setTheme(remoteTheme);
      return;
    }

    if (themeMode === lastSyncedTheme.current) {
      return;
    }

    lastSyncedTheme.current = themeMode;
    void zero
      .mutate(mutators.preferences.updateTheme({ themeMode }))
      .server.catch(() => {
        lastSyncedTheme.current = remoteTheme;
        setTheme(remoteTheme);
      });
  }, [currentUser, setTheme, themeMode, zero]);

  return null;
}

export { Providers };
