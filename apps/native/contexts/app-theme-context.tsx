import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Uniwind, useUniwind } from "uniwind";

import { colorsFor, type ThemeColors, type ThemeName } from "@/lib/theme";

const THEME_KEY = "sentinel360.theme";

type AppThemeContextType = {
  currentTheme: ThemeName;
  isLight: boolean;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextType | undefined>(undefined);

function applyTheme(theme: ThemeName) {
  Uniwind.setTheme(theme);
  Appearance.setColorScheme(theme);
  void SecureStore.setItemAsync(THEME_KEY, theme);
}

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useUniwind();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(THEME_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored === "dark" || stored === "light") {
          Uniwind.setTheme(stored);
          Appearance.setColorScheme(stored);
        }
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentTheme: ThemeName = theme === "dark" ? "dark" : "light";
  const isLight = currentTheme === "light";
  const isDark = currentTheme === "dark";
  const colors = useMemo(() => colorsFor(currentTheme), [currentTheme]);

  const setTheme = useCallback((newTheme: ThemeName) => {
    applyTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(currentTheme === "light" ? "dark" : "light");
  }, [currentTheme]);

  const value = useMemo(
    () => ({
      currentTheme,
      isLight,
      isDark,
      colors,
      setTheme,
      toggleTheme,
    }),
    [currentTheme, isLight, isDark, colors, setTheme, toggleTheme],
  );

  if (!hydrated) return null;

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
};

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return context;
}
