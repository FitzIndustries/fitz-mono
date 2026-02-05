import { ThemeProvider } from "@fitzindustries/ui/theme";

import { ZeroProvider } from "./zero-provider";

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ZeroProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </ZeroProvider>
  );
}

export { Providers };
