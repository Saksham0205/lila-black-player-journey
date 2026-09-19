import type { MapConfig } from "./types";

/**
 * World (x, z) -> minimap pixel space, per the README's documented formula:
 *   u = (x - originX) / scale
 *   v = (z - originZ) / scale
 *   pixelX = u * imageWidth
 *   pixelY = (1 - v) * imageHeight   (image origin is top-left, world Z grows "up")
 *
 * The README's worked example uses a 1024x1024 reference image, but u/v are
 * resolution-independent fractions -- we multiply by the *actual* rendered
 * minimap size (which may be scaled to fit the viewport, or a re-encoded
 * image with different native dimensions) rather than hardcoding 1024.
 */
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
