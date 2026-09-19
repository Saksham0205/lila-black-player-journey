import { useCallback, useState } from "react";

export type Theme = "light" | "dark";

const KEY = "lila-theme";

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light"
  );

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* storage unavailable: theme just won't persist */
      }
      return next;
    });
  }, []);

  return [theme, toggle];
}
