import { useEffect, useRef } from "react";

import { ThemeProvider, useTheme } from "@fitzindustries/ui/theme";

import { useUserPreferences } from "~/hooks/use-user-preferences";
import { ZeroProvider } from "./zero-provider";

/**
 * ThemeProvider must be OUTSIDE ZeroProvider. The Rocicorp ZeroProvider
 * renders nothing until its internal useEffect creates the Zero instance,
 * so anything nested inside it (including ThemeProvider) is blocked from
 * rendering on first paint — causing FOUC / always-light theme.
 */
function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ThemePreferenceSync />
      <ZeroProvider>{children}</ZeroProvider>
    </ThemeProvider>
  );
}

function ThemePreferenceSync() {
  const { themeMode, setTheme } = useTheme();
  const { isFetched, preferences, session, updatePreferences } =
    useUserPreferences();
  const hasAppliedRemoteTheme = useRef(false);
  const lastSyncedTheme = useRef(themeMode);

  useEffect(() => {
    if (!session) {
      hasAppliedRemoteTheme.current = false;
      lastSyncedTheme.current = themeMode;
      return;
    }

    if (!isFetched || !preferences) {
      return;
    }

    if (!hasAppliedRemoteTheme.current) {
      hasAppliedRemoteTheme.current = true;
      lastSyncedTheme.current = preferences.themeMode;

      if (preferences.themeMode !== themeMode) {
        setTheme(preferences.themeMode);
      }
      return;
    }

    if (themeMode === lastSyncedTheme.current || updatePreferences.isPending) {
      return;
    }

    lastSyncedTheme.current = themeMode;
    void updatePreferences.mutateAsync({ themeMode }).catch(() => {
      lastSyncedTheme.current = preferences.themeMode;
      setTheme(preferences.themeMode);
    });
  }, [isFetched, preferences, session, setTheme, themeMode, updatePreferences]);

  return null;
}

export { Providers };
