import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ThemeMode } from "@fitzindustries/ui/theme";

import { authClient } from "~/auth/client";
import { apiFetch } from "~/lib/api";

interface UserPreferencesResponse {
  preferences: {
    themeMode: ThemeMode;
  };
}

export function useUserPreferences() {
  const sessionState = authClient.useSession();
  const queryClient = useQueryClient();
  const queryKey = ["user-preferences", sessionState.data?.user.id] as const;

  const preferencesQuery = useQuery({
    queryKey,
    enabled: !!sessionState.data?.user.id,
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
    session: sessionState.data,
    isSessionPending: sessionState.isPending,
    updatePreferences,
    preferences: preferencesQuery.data?.preferences ?? null,
  };
}
