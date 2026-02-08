import { ThemeProvider } from "@fitzindustries/ui/theme";

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
      <ZeroProvider>{children}</ZeroProvider>
    </ThemeProvider>
  );
}

export { Providers };
