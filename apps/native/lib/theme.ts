export type ThemeName = "light" | "dark";

export type ThemeColors = {
  sheetBg: string;
  surface: string;
  surfaceMuted: string;
  fieldBg: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  brand: string;
  heroBg: string;
  heroAccent: string;
  cta: string;
  tabBar: string;
  iconMuted: string;
  chip: string;
  dangerBg: string;
  dangerText: string;
  statusBar: "light-content" | "dark-content";
};

export const lightColors: ThemeColors = {
  sheetBg: "#ffffff",
  surface: "#ffffff",
  surfaceMuted: "#f8fafc",
  fieldBg: "#f1f5f9",
  text: "#0f172a",
  textMuted: "#64748b",
  textSubtle: "#94a3b8",
  border: "rgba(15, 23, 42, 0.08)",
  brand: "#1e3a8a",
  heroBg: "#0b1f22",
  heroAccent: "#0e6d7a",
  cta: "#0b2e4a",
  tabBar: "#ffffff",
  iconMuted: "#94a3b8",
  chip: "#e2e8f0",
  dangerBg: "#fee2e2",
  dangerText: "#991b1b",
  statusBar: "dark-content",
};

export const darkColors: ThemeColors = {
  sheetBg: "#0b1220",
  surface: "#111827",
  surfaceMuted: "#1e293b",
  fieldBg: "#1e293b",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  textSubtle: "#64748b",
  border: "rgba(248, 250, 252, 0.10)",
  brand: "#93c5fd",
  heroBg: "#061016",
  heroAccent: "#2dd4bf",
  cta: "#0e7490",
  tabBar: "#0b1220",
  iconMuted: "#64748b",
  chip: "#334155",
  dangerBg: "#7f1d1d",
  dangerText: "#fecaca",
  statusBar: "light-content",
};

export function colorsFor(theme: ThemeName): ThemeColors {
  return theme === "dark" ? darkColors : lightColors;
}
