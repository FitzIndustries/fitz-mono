import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ThemeMode } from "@fitzindustries/ui/theme";

import { authClient } from "~/auth/client";
import { apiFetch } from "~/lib/api";

interface PreferencesResponse {
  preferences: {
    themeMode: ThemeMode;
  };
}

const defaultPreferences = { themeMode: "auto" as ThemeMode };

export function useUserPreferences() {
  const sessionQuery = authClient.useSession();
  const session = sessionQuery.data;
  const queryClient = useQueryClient();
  const queryKey = ["user-preferences", session?.user.id] as const;

  const preferencesQuery = useQuery({
    queryKey,
    queryFn: () => apiFetch<PreferencesResponse>("/api/preferences"),
    enabled: Boolean(session?.user.id),
    staleTime: 30_000,
  });

  const updatePreferences = useMutation({
    mutationFn: (payload: { themeMode: ThemeMode }) =>
      apiFetch<PreferencesResponse>("/api/preferences", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });

  return {
    ...preferencesQuery,
    isSessionPending: sessionQuery.isPending,
    session,
    updatePreferences,
    preferences: preferencesQuery.data?.preferences ?? defaultPreferences,
  };
}
