import type { ReactNode } from "react";
import { ACTOR_PATH, type ActorKind } from "../lib/actors";
import { colors } from "../lib/theme";
import type { EventCategory } from "../lib/types";

export function ActorIcon({ kind, size = 16, color }: { kind: ActorKind; size?: number; color?: string }) {
  return (
    <svg
      className={`actor-icon actor-${kind}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color ?? (kind === "human" ? colors.human : colors.bot)}
      fillRule="evenodd"
      aria-hidden="true"
    >
      <path d={ACTOR_PATH[kind]} />
    </svg>
  );
}

// Mirrors drawEventGlyph in render.ts (same geometry, size = 7 on a 24 grid).
export function EventIcon({ cat, size = 16 }: { cat: EventCategory; size?: number }) {
  const color = colors[cat];
  return (
    <svg
      className="event-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="butt"
      aria-hidden="true"
    >
      {cat === "kill" && <path d="M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM2 12h6M16 12h6M12 2v6M12 16v6" />}
      {cat === "death" && <path d="M5 5l14 14M19 5L5 19" />}
      {cat === "storm" && <path d="M18.69 14.07A7 7 0 1 1 14.16 5.34M8.5 12A3.5 3.5 0 1 1 9.94 14.83" />}
      {cat === "loot" && <path d="M12 4l8 8-8 8-8-8z" fill={color} />}
    </svg>
  );
}

/** Dark rounded tile that hosts a map-colored icon, so it looks the same in light and dark UI. */
export function IconTile({ children, size = 28 }: { children: ReactNode; size?: number }) {
  return (
    <span className="icon-tile" style={{ width: size, height: size }}>
      {children}
    </span>
  );
}

function Svg({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const SunIcon = () => (
  <Svg>
    <circle cx="8" cy="8" r="2.8" />
    <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" />
  </Svg>
);

export const MoonIcon = () => (
  <Svg>
    <path d="M13.4 9.6A5.6 5.6 0 0 1 6.4 2.6a5.6 5.6 0 1 0 7 7z" />
  </Svg>
);

export const HeatmapIcon = () => (
  <Svg>
    <circle cx="8" cy="8" r="6" />
    <circle cx="8" cy="8" r="3.4" />
    <circle cx="8" cy="8" r="0.8" fill="currentColor" />
  </Svg>
);

export const PlaybackIcon = () => (
  <Svg>
    <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="2" />
    <path d="M6.7 5.9v4.2L10.2 8z" fill="currentColor" />
  </Svg>
);

export const HelpIcon = () => (
  <Svg>
    <circle cx="8" cy="8" r="6.2" />
    <path d="M6.3 6.3a1.8 1.8 0 1 1 2.5 1.7c-.5.3-.8.6-.8 1.2M8 11.4v.1" />
  </Svg>
);

export const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M3.6 1.9v10.2L12 7z" fill="currentColor" />
  </svg>
);

export const PauseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M3 2h3v10H3zM8 2h3v10H8z" fill="currentColor" />
  </svg>
);
