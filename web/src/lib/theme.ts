// Data colors. The interface chrome is neutral (see styles.css); color is reserved
// for what's on the map so it always means something. Five categorical roles
// (human + 4 event types) exceed the safe all-pairs hue budget for a 5-slot
// categorical set, so every marker also carries a distinct shape -- color is
// reinforcement, not the only signal. Humans and bots differ by figure as well as tint.

export const colors = {
  human: "#4c9aff", // person figure
  bot: "#c9c3b6", // robot figure: neutral so it recedes behind humans, shape carries identity

  kill: "#e0a100", // crosshair
  death: "#ff6b6b", // X
  storm: "#e05c93", // swirl
  loot: "#2fb344", // diamond
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
      return { color: colors.storm, label: "Storm death" };
    case "loot":
      return { color: colors.loot, label: "Loot" };
  }
}
