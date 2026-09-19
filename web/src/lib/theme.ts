// Dark-mode-only design tokens. Values validated with the data-viz palette
// validator (see ARCHITECTURE.md -> "Color choices"). Five categorical roles
// (human + 4 event types) exceed the safe all-pairs hue budget for a 5-slot
// categorical set, so every marker also carries a distinct glyph shape as a
// secondary, colorblind-safe encoding -- color is reinforcement, not the only signal.

export const colors = {
  pagePlane: "#0d0d0d",
  surface: "#1a1a19",
  surfaceRaised: "#232322",
  textPrimary: "#ffffff",
  textSecondary: "#c3c2b7",
  textMuted: "#898781",
  hairline: "rgba(255,255,255,0.10)",
  gridline: "#2c2c2a",

  human: "#3987e5", // categorical slot 1 (blue)
  bot: "#a9a29b", // deliberately neutral/desaturated -- de-emphasized vs. humans

  kill: "#c98500", // slot 4 (yellow/amber) + crosshair glyph
  death: "#e66767", // slot 8 (red) + X glyph
  storm: "#d55181", // slot 5 (magenta) + spiral glyph
  loot: "#008300", // slot 6 (green) + diamond glyph
} as const;

// Sequential single-hue ramp (blue), light -> dark, for heatmap density.
// Index 0 = lowest nonzero density, last = saturated / highest density.
export const heatRamp = [
  "#cde2fb",
  "#9ec5f4",
  "#6da7ec",
  "#3987e5",
  "#256abf",
  "#184f95",
  "#0d366b",
];

export function eventGlyph(cat: "kill" | "death" | "storm" | "loot") {
  switch (cat) {
    case "kill":
      return { color: colors.kill, label: "Kill" };
    case "death":
      return { color: colors.death, label: "Death" };
    case "storm":
      return { color: colors.storm, label: "Storm Death" };
    case "loot":
      return { color: colors.loot, label: "Loot" };
  }
}
