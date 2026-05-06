import type { ThemeMode } from "@fitzindustries/ui/theme";

export function useUserPreferences() {
  return {
    data: undefined,
    error: null,
    isError: false,
    isLoading: false,
    isPending: false,
    isSessionPending: false,
    session: undefined,
    updatePreferences: {
      isPending: false,
      mutateAsync: (_payload: { themeMode: ThemeMode }) =>
        Promise.resolve({
          preferences: { themeMode: "auto" as ThemeMode },
        }),
    },
    preferences: { themeMode: "auto" as ThemeMode },
  };
}
