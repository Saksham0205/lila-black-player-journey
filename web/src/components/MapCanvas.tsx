import { useEffect, useMemo, useRef, useState } from "react";
import type { EventCategory, MapConfig, MatchDetail } from "../lib/types";
import { worldToPixel } from "../lib/coords";
import { drawHeatmap } from "../lib/heatmap";
import { drawEventGlyph, interpolatePosition } from "../lib/render";
import { drawActor } from "../lib/actors";
import { colors } from "../lib/theme";
import { minimapUrl } from "../lib/api";

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached && cached.complete) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = cached ?? new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    if (!cached) {
      img.src = src;
      imageCache.set(src, img);
    }
  });
}

export interface HoverInfo {
  x: number;
  y: number;
  label: string;
}

interface Props {
  mapConfig: MapConfig;
  mode: "overview" | "playback";
  heatmapPoints?: [number, number][];
  heatmapVisible: boolean;
  match?: MatchDetail | null;
  currentSec?: number;
  showHumans: boolean;
  showBots: boolean;
  visibleCategories: Set<EventCategory>;
  focusedPlayer: number | null;
  onFocusPlayer?: (idx: number | null) => void;
}

export default function MapCanvas({
  mapConfig,
  mode,
  heatmapPoints,
  heatmapVisible,
  match,
  currentSec = 0,
  showHumans,
  showBots,
  visibleCategories,
  focusedPlayer,
  onFocusPlayer,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 800, h: 800 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    setImage(null);
    loadImage(minimapUrl(mapConfig.image)).then((img) => {
      if (!cancelled) setImage(img);
    });
    return () => {
      cancelled = true;
    };
  }, [mapConfig.image]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const box = entries[0].contentRect;
      setSize({ w: box.width, h: box.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fit the (square-ish) minimap image inside the container, letterboxed.
  const layout = useMemo(() => {
    if (!image) return null;
    const scale = Math.min(size.w / image.width, size.h / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    const offX = (size.w - drawW) / 2;
    const offY = (size.h - drawH) / 2;
    return { scale, drawW, drawH, offX, offY };
  }, [image, size]);

  const toPixel = (x: number, z: number): [number, number] => {
    if (!image || !layout) return [0, 0];
    const [px, py] = worldToPixel(x, z, mapConfig, image.width, image.height);
    return [px * layout.scale + layout.offX, py * layout.scale + layout.offY];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || !layout) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);

    ctx.drawImage(image, layout.offX, layout.offY, layout.drawW, layout.drawH);
    // Slight darken so bright markers/heatmap read clearly against the minimap art.
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    ctx.fillRect(layout.offX, layout.offY, layout.drawW, layout.drawH);

    if (heatmapVisible && heatmapPoints && heatmapPoints.length) {
      const pixelPoints = heatmapPoints.map(([x, z]) => toPixel(x, z));
      // Rarer categories (kills, storm deaths) need a strong per-point punch to
      // show up at all; dense ones (raw movement traffic, tens of thousands of
      // samples) saturate the whole map at the same alpha, hiding the contrast
      // between busy and empty areas. Scale per-point alpha down as N grows.
      const intensity = Math.max(0.015, Math.min(0.14, 260 / pixelPoints.length));
      drawHeatmap(ctx, pixelPoints, size.w, size.h, { radius: 20, intensity });
    }

    if (mode === "playback" && match) {
      // Ghost (full) paths, very faint, for spatial context.
      match.players.forEach((p, idx) => {
        if (p.bot && !showBots) return;
        if (!p.bot && !showHumans) return;
        const path = match.paths[idx];
        if (!path || path.length < 2) return;
        const isFocused = focusedPlayer === idx;
        ctx.beginPath();
        path.forEach(([, x, z], i) => {
          const [px, py] = toPixel(x, z);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.strokeStyle = p.bot ? colors.bot : colors.human;
        ctx.globalAlpha = isFocused ? 0.22 : 0.08;
        ctx.setLineDash(p.bot ? [3, 3] : []);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      });

      // Traveled trail + live marker per player, up to currentSec.
      match.players.forEach((p, idx) => {
        if (p.bot && !showBots) return;
        if (!p.bot && !showHumans) return;
        const path = match.paths[idx];
        if (!path || path.length === 0) return;
        const isFocused = focusedPlayer === idx;
        const dim = focusedPlayer !== null && !isFocused;

        const traveled = path.filter(([t]) => t <= currentSec);
        if (traveled.length >= 2) {
          const line = new Path2D();
          traveled.forEach(([, x, z], i) => {
            const [px, py] = toPixel(x, z);
            if (i === 0) line.moveTo(px, py);
            else line.lineTo(px, py);
          });
          const mainWidth = isFocused ? 2.5 : p.bot ? 1.2 : 1.6;
          ctx.setLineDash(p.bot ? [3, 3] : []);
          ctx.globalAlpha = dim ? 0.15 : p.bot ? 0.7 : 0.9;
          // Dark casing first so the line reads against any terrain color underneath.
          ctx.strokeStyle = "rgba(0,0,0,0.6)";
          ctx.lineWidth = mainWidth + 1.4;
          ctx.stroke(line);
          ctx.strokeStyle = p.bot ? colors.bot : colors.human;
          ctx.lineWidth = mainWidth;
          ctx.stroke(line);
          ctx.setLineDash([]);
        }

        const pos = interpolatePosition(path, currentSec);
        if (pos) {
          const [px, py] = toPixel(pos[0], pos[1]);
          ctx.globalAlpha = dim ? 0.3 : 1;
          // Humans are drawn slightly larger than bots so they stay the primary read.
          const size = isFocused ? 26 : p.bot ? 17 : 20;
          drawActor(ctx, p.bot ? "bot" : "human", px, py, size, p.bot ? colors.bot : colors.human, {
            ring: isFocused,
          });
        }
        ctx.globalAlpha = 1;
      });

      // Event markers up to currentSec.
      match.events.forEach(([t, x, z, cat, pidx]) => {
        if (t > currentSec) return;
        if (!visibleCategories.has(cat)) return;
        const p = match.players[pidx];
        if (p) {
          if (p.bot && !showBots) return;
          if (!p.bot && !showHumans) return;
        }
        const [px, py] = toPixel(x, z);
        const glyphColor = cat === "kill" ? colors.kill : cat === "death" ? colors.death : cat === "storm" ? colors.storm : colors.loot;
        drawEventGlyph(ctx, cat, px, py, glyphColor);
      });
    }
  }, [image, layout, size, heatmapVisible, heatmapPoints, mode, match, currentSec, showHumans, showBots, visibleCategories, focusedPlayer]);

  const handleMouseMove: React.MouseEventHandler<HTMLCanvasElement> = (e) => {
    if (mode !== "playback" || !match || !layout) {
      setHover(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let best: { d2: number; label: string; idx: number | null } | null = null;

    match.players.forEach((p, idx) => {
      if (p.bot && !showBots) return;
      if (!p.bot && !showHumans) return;
      const path = match.paths[idx];
      const pos = interpolatePosition(path, currentSec);
      if (!pos) return;
      const [px, py] = toPixel(pos[0], pos[1]);
      const d2 = (px - mx) ** 2 + (py - my) ** 2;
      if (d2 < 196 && (!best || d2 < best.d2)) {
        best = { d2, label: `${p.bot ? "Bot" : "Player"} ${p.id.slice(0, 8)}`, idx };
      }
    });

    match.events.forEach(([t, x, z, cat], _i) => {
      if (t > currentSec) return;
      if (!visibleCategories.has(cat)) return;
      const [px, py] = toPixel(x, z);
      const d2 = (px - mx) ** 2 + (py - my) ** 2;
      if (d2 < 100 && (!best || d2 < best.d2)) {
        best = { d2, label: `${cat[0].toUpperCase()}${cat.slice(1)} @ ${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`, idx: null };
      }
    });

    if (best) {
      setHover({ x: mx, y: my, label: (best as any).label });
      onFocusPlayer?.((best as any).idx);
    } else {
      setHover(null);
      onFocusPlayer?.(null);
    }
  };

  return (
    <div ref={containerRef} className="map-canvas-wrap">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setHover(null);
          onFocusPlayer?.(null);
        }}
      />
      {!image && <div className="map-loading">Loading minimap…</div>}
      {hover && (
        <div className="map-tooltip" style={{ left: hover.x + 16, top: hover.y + 12 }}>
          {hover.label}
        </div>
      )}
    </div>
  );
}
