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
  return (
    <div className="timeline">
      <button className="play-btn" onClick={onToggle} aria-label={isPlaying ? "Pause" : "Play"}>
        {isPlaying ? "⏸" : "▶"}
      </button>
      <span className="timeline-clock">{fmt(currentSec)}</span>
      <input
        type="range"
        className="timeline-scrubber"
        min={0}
        max={durationSec}
        step={1}
        value={Math.min(currentSec, durationSec)}
        onChange={(e) => onSeek(Number(e.target.value))}
      />
      <span className="timeline-clock timeline-clock-total">{fmt(durationSec)}</span>
      <div className="speed-picker">
        {[1, 2, 4, 8].map((s) => (
          <button key={s} className={"speed-btn" + (speed === s ? " active" : "")} onClick={() => onSetSpeed(s)}>
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
