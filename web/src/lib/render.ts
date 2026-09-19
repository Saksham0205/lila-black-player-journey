import type { PathPoint, EventCategory } from "./types";

/** Linear-interpolates a player's world position at time `t` (seconds). */
export function interpolatePosition(path: PathPoint[], t: number): [number, number] | null {
  if (path.length === 0) return null;
  if (t < path[0][0]) return null; // not spawned / not visible yet
  if (t >= path[path.length - 1][0]) {
    const last = path[path.length - 1];
    return [last[1], last[2]];
  }
  // path is sorted by t; find surrounding segment.
  let lo = 0;
  let hi = path.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (path[mid][0] <= t) lo = mid;
    else hi = mid;
  }
  const [t0, x0, z0] = path[lo];
  const [t1, x1, z1] = path[hi];
  const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
  return [x0 + (x1 - x0) * f, z0 + (z1 - z0) * f];
}

/** Draws the glyph for a combat/loot event category at (px, py). */
export function drawEventGlyph(
  ctx: CanvasRenderingContext2D,
  cat: EventCategory,
  px: number,
  py: number,
  color: string,
  size = 7
) {
  ctx.save();
  ctx.translate(px, py);

  // Dark backing disc so a bright glyph still reads against light terrain art.
  ctx.beginPath();
  ctx.arc(0, 0, size + 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fill();

  ctx.lineWidth = 1.6;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  switch (cat) {
    case "kill": {
      // crosshair
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size - 3, 0);
      ctx.lineTo(-size + 3, 0);
      ctx.moveTo(size - 3, 0);
      ctx.lineTo(size + 3, 0);
      ctx.moveTo(0, -size - 3);
      ctx.lineTo(0, -size + 3);
      ctx.moveTo(0, size - 3);
      ctx.lineTo(0, size + 3);
      ctx.stroke();
      break;
    }
    case "death": {
      // X mark
      ctx.beginPath();
      ctx.moveTo(-size, -size);
      ctx.lineTo(size, size);
      ctx.moveTo(size, -size);
      ctx.lineTo(-size, size);
      ctx.stroke();
      break;
    }
    case "storm": {
      // spiral-ish swirl (two nested arcs)
      ctx.beginPath();
      ctx.arc(0, 0, size, 0.3, Math.PI * 1.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.5, Math.PI, Math.PI * 2.7);
      ctx.stroke();
      break;
    }
    case "loot": {
      // diamond
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size, 0);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}
