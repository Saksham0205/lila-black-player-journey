import { useEffect, useRef, useState } from "react";

export function usePlayback(durationSec: number) {
  const [currentSec, setCurrentSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(4);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  // Reset when the underlying match changes.
  useEffect(() => {
    setCurrentSec(0);
    setIsPlaying(false);
    lastTsRef.current = null;
  }, [durationSec]);

  useEffect(() => {
    if (!isPlaying) {
      lastTsRef.current = null;
      return;
    }
    const step = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setCurrentSec((prev) => {
        const next = prev + dt * speed;
        if (next >= durationSec) {
          setIsPlaying(false);
          return durationSec;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, speed, durationSec]);

  const seek = (sec: number) => {
    setCurrentSec(Math.max(0, Math.min(durationSec, sec)));
  };

  const toggle = () => {
    setIsPlaying((p) => {
      if (!p && currentSec >= durationSec) setCurrentSec(0);
      return !p;
    });
  };

  return { currentSec, isPlaying, speed, setSpeed, seek, toggle, setIsPlaying };
}
