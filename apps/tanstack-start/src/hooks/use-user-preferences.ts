import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

import type { ThemeMode } from "@fitzindustries/ui/theme";

import { apiFetch } from "~/lib/api";

interface UserPreferencesResponse {
  preferences: {
    themeMode: ThemeMode;
  };
}

export function useUserPreferences() {
  const { session, userId } = useRouteContext({ from: "/_authenticated" });
  const queryClient = useQueryClient();
  const queryKey = ["user-preferences", userId] as const;

  const preferencesQuery = useQuery({
    queryKey,
    queryFn: () => apiFetch<UserPreferencesResponse>("/api/preferences"),
    staleTime: 30_000,
  });

  const updatePreferences = useMutation({
    mutationFn: (payload: { themeMode: ThemeMode }) =>
      apiFetch<UserPreferencesResponse>("/api/preferences", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKey, data);
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    ...preferencesQuery,
    session,
    isSessionPending: false,
    updatePreferences,
    preferences: preferencesQuery.data?.preferences ?? null,
  };
}
