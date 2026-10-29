import { createContext, useCallback, useContext, useMemo } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";

import { Button } from "./components/button";

export type ThemeMode = "light" | "dark" | "auto";

interface ThemeContextValue {
  themeMode: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_CYCLE: ThemeMode[] = ["light", "dark", "auto"];

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="fitz-theme"
    >
      <ThemeProviderBridge>{children}</ThemeProviderBridge>
    </NextThemesProvider>
  );
}

function ThemeProviderBridge({ children }: { children: React.ReactNode }) {
  const { theme, setTheme: setNextTheme } = useNextTheme();

  const themeMode: ThemeMode =
    theme === "light" || theme === "dark" ? theme : "auto";

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      setNextTheme(mode === "auto" ? "system" : mode);
    },
    [setNextTheme],
  );

  const value = useMemo(() => ({ themeMode, setTheme }), [setTheme, themeMode]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

function ThemeToggle() {
  const { themeMode, setTheme } = useTheme();
  const Icon =
    themeMode === "light" ? Sun : themeMode === "dark" ? Moon : Monitor;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Theme is ${themeMode}. Cycle light, dark, or system.`}
      onClick={() => {
        const index = THEME_CYCLE.indexOf(themeMode);
        const next = THEME_CYCLE[(index + 1) % THEME_CYCLE.length] ?? "auto";
        setTheme(next);
      }}
    >
      <Icon className="size-4" aria-hidden />
    </Button>
  );
}

export { ThemeProvider, ThemeToggle };
