import type { MapConfig } from "./types";

export function worldToPixel(
  x: number,
  z: number,
  cfg: MapConfig,
  imageWidth: number,
  imageHeight: number
): [number, number] {
  const u = (x - cfg.originX) / cfg.scale;
  const v = (z - cfg.originZ) / cfg.scale;
  return [u * imageWidth, (1 - v) * imageHeight];
}
