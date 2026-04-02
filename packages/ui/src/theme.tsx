import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "./components/button";

export type ThemeMode = "light" | "dark" | "auto";

interface ThemeContextValue {
  themeMode: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_CYCLE: ThemeMode[] = ["light", "dark", "auto"];

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Applies Tailwind v4 `dark` class on `<html>` and returns the resolved appearance.
 * Call only in the browser (e.g. inside `useEffect`).
 */
function syncDocumentTheme(mode: ThemeMode): "light" | "dark" {
  const resolved: "light" | "dark" =
    mode === "dark"
      ? "dark"
      : mode === "light"
        ? "light"
        : systemPrefersDark()
          ? "dark"
          : "light";
  document.documentElement.classList.toggle("dark", resolved === "dark");
  return resolved;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");

  useEffect(() => {
    syncDocumentTheme(themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== "auto") {
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      syncDocumentTheme("auto");
    };
    mq.addEventListener("change", onSystemChange);
    return () => mq.removeEventListener("change", onSystemChange);
  }, [themeMode]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
  }, []);

  const value = useMemo(
    () => ({
      themeMode,
      setTheme,
    }),
    [setTheme, themeMode],
  );

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
        const next = THEME_CYCLE[(index + 1) % THEME_CYCLE.length]!;
        setTheme(next);
      }}
    >
      <Icon className="size-4" aria-hidden />
    </Button>
  );
}

export { ThemeProvider, ThemeToggle };
