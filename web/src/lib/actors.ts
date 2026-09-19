// Shared 2-D shapes for actors and events, defined once as SVG path data on a
// 24x24 grid. The map canvas draws them through Path2D and the React legends
// render the exact same `d` strings, so a figure looks identical everywhere.

export type ActorKind = "human" | "bot";

export const ACTOR_PATH: Record<ActorKind, string> = {
  // Person bust: head + shoulders.
  human: "M12 3a4.2 4.2 0 1 1 0 8.4A4.2 4.2 0 0 1 12 3z M3.8 21.2c0-4.6 3.6-7.6 8.2-7.6s8.2 3 8.2 7.6z",
  // Robot: antenna, boxy head, ear bolts, two eye cut-outs (even-odd holes).
  bot:
    "M11.1 4.6h1.8V8h-1.8z M12 1.6a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4z " +
    "M7 8h10a3 3 0 0 1 3 3v6.6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3z " +
    "M1.6 12.2H3.4v4.2H1.6z M20.6 12.2h1.8v4.2h-1.8z " +
    "M9 12.6a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4z M15 12.6a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4z",
};

const actorPaths = {
  human: new Path2D(ACTOR_PATH.human),
  bot: new Path2D(ACTOR_PATH.bot),
};

/**
 * Draws an actor figure centred on (px, py). A dark outline is stroked first so the
 * fill stays legible over any terrain colour; `ring` adds a highlight for the focused actor.
 */
export function drawActor(
  ctx: CanvasRenderingContext2D,
  kind: ActorKind,
  px: number,
  py: number,
  size: number,
  color: string,
  opts: { ring?: boolean } = {}
) {
  ctx.save();
  ctx.translate(px - size / 2, py - size / 2);
  ctx.scale(size / 24, size / 24);

  if (opts.ring) {
    ctx.beginPath();
    ctx.arc(12, 12, 15.5, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.stroke();
  }

  ctx.lineJoin = "round";
  ctx.lineWidth = 3.6;
  ctx.strokeStyle = "rgba(8,10,14,0.92)";
  ctx.stroke(actorPaths[kind]);
  ctx.fillStyle = color;
  ctx.fill(actorPaths[kind], "evenodd");
  ctx.restore();
}
