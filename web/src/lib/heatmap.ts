import { heatRamp } from "./theme";

interface HeatmapOptions {
  radius?: number;
  intensity?: number; // per-point alpha contribution before saturation
  opacity?: number; // final layer opacity multiplier
}

let cachedLut: Uint8ClampedArray | null = null;

/** Builds a 256-entry RGBA lookup table from the sequential heat ramp. */
function getLut(): Uint8ClampedArray {
  if (cachedLut) return cachedLut;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  const n = heatRamp.length;
  heatRamp.forEach((hex, i) => grad.addColorStop(i / (n - 1), hex));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 1);
  cachedLut = new Uint8ClampedArray(ctx.getImageData(0, 0, 256, 1).data);
  return cachedLut;
}

/** Builds a soft radial "stamp" used to accumulate point density. */
function buildStamp(radius: number): HTMLCanvasElement {
  const size = radius * 2;
  const stamp = document.createElement("canvas");
  stamp.width = size;
  stamp.height = size;
  const ctx = stamp.getContext("2d")!;
  const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  grad.addColorStop(0, "rgba(0,0,0,1)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return stamp;
}

export function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  width: number,
  height: number,
  opts: HeatmapOptions = {}
) {
  if (points.length === 0 || width <= 0 || height <= 0) return;
  const radius = opts.radius ?? 22;
  const intensity = opts.intensity ?? 0.1;
  const opacity = opts.opacity ?? 0.85;

  const off = document.createElement("canvas");
  off.width = width;
  off.height = height;
  const octx = off.getContext("2d")!;
  octx.globalAlpha = intensity;
  const stamp = buildStamp(radius);
  for (const [x, y] of points) {
    if (x < -radius || y < -radius || x > width + radius || y > height + radius) continue;
    octx.drawImage(stamp, x - radius, y - radius);
  }

  const imgData = octx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const lut = getLut();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;
    const lutIdx = a * 4;
    data[i] = lut[lutIdx];
    data[i + 1] = lut[lutIdx + 1];
    data[i + 2] = lut[lutIdx + 2];
    data[i + 3] = Math.min(255, a * 1.6);
  }
  octx.putImageData(imgData, 0, 0);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(off, 0, 0);
  ctx.restore();
}
