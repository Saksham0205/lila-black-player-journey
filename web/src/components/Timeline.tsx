import type { CSSProperties } from "react";
import { PauseIcon, PlayIcon } from "./Icons";
import { Button } from "./ui";

interface Props {
  currentSec: number;
  durationSec: number;
  isPlaying: boolean;
  speed: number;
  onToggle: () => void;
  onSeek: (sec: number) => void;
  onSetSpeed: (s: number) => void;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Timeline({ currentSec, durationSec, isPlaying, speed, onToggle, onSeek, onSetSpeed }: Props) {
  const clamped = Math.min(currentSec, durationSec);
  const pct = durationSec ? (clamped / durationSec) * 100 : 0;

  return (
    <div className="timeline" data-tour="timeline">
      <Button
        variant="primary"
        iconOnly
        className="play-btn"
        onClick={onToggle}
        aria-label={isPlaying ? "Pause" : "Play"}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </Button>
      <span className="timeline-clock">{fmt(currentSec)}</span>
      <input
        type="range"
        className="timeline-scrubber"
        min={0}
        max={durationSec}
        step={1}
        value={clamped}
        style={{ "--pct": `${pct}%` } as CSSProperties}
        aria-label="Match time"
        onChange={(e) => onSeek(Number(e.target.value))}
      />
      <span className="timeline-clock timeline-clock-total">{fmt(durationSec)}</span>
      <div className="toggle-group" role="group" aria-label="Playback speed">
        {[1, 2, 4, 8].map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={speed === s}
            className={"toggle-btn" + (speed === s ? " active" : "")}
            onClick={() => onSetSpeed(s)}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
