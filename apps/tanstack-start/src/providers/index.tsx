import { useEffect, useRef } from "react";

import type { ThemeMode } from "@fitzindustries/ui/theme";
import { ThemeProvider, useTheme } from "@fitzindustries/ui/theme";
import { mutators, queries } from "@fitzindustries/zero-shared";
import {
  useZero,
  useQuery as useZeroQuery,
} from "@fitzindustries/zero-shared/react";

import { ZeroProvider } from "./zero-provider";

function AppProviders({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  return (
    <ZeroProvider>
      <ThemePreferenceSync />
      {children}
    </ZeroProvider>
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

export { AppProviders, AuthenticatedProviders };
