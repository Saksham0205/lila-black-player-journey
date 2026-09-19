import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ViewMode } from "../lib/types";
import { ActorIcon } from "./Icons";
import { Button } from "./ui";

const KEY = "lila-tour-seen";

export function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markTourSeen() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* storage unavailable: the tour will show again next visit */
  }
}

type Side = "right" | "left" | "bottom" | "top" | "inside";

interface Step {
  id: string;
  target?: string; // matches a [data-tour="..."] element; omitted for the welcome card
  view?: ViewMode; // view the step needs to be visible
  side?: Side;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  { id: "welcome", title: "Welcome to Player Journey Explorer", body: "See where players move, fight, loot and die on each LILA BLACK map. This 1-minute tour shows what each part does." },
  {
    id: "tabs",
    target: "tabs",
    view: "overview",
    side: "bottom",
    title: "Two ways to look at the data",
    body: "Heatmap shows where things happen across many matches. Match playback replays a single match, second by second.",
  },
  {
    id: "map",
    target: "map",
    view: "overview",
    side: "right",
    title: "Pick a map",
    body: "Each map has its own minimap. The number is how many matches were recorded on it.",
  },
  {
    id: "dates",
    target: "dates",
    view: "overview",
    side: "right",
    title: "Filter by date",
    body: "Everything you see, including the heatmap and the match list, only uses the days you select.",
  },
  {
    id: "layer",
    target: "layer",
    view: "overview",
    side: "right",
    title: "Choose what the heatmap shows",
    body: "Switch between traffic, kills, deaths, storm deaths and loot pickups. Brighter, denser blue means more activity.",
  },
  {
    id: "actors",
    target: "actors",
    view: "overview",
    side: "left",
    title: "Humans and bots",
    body: "Humans appear as blue person icons and bots as pale robots. Untick either to hide it from the map.",
  },
  {
    id: "matches",
    target: "matches",
    view: "playback",
    side: "right",
    title: "Pick a match to replay",
    body: "Each card shows start time, length, and how many humans and bots played. Select one to load it on the map.",
  },
  {
    id: "timeline",
    target: "timeline",
    view: "playback",
    side: "top",
    title: "Play, pause and scrub",
    body: "Press play or drag the bar to any moment. Use 1× to 8× to change speed.",
  },
  {
    id: "events",
    target: "events",
    view: "playback",
    side: "left",
    title: "Kills, deaths, storm and loot",
    body: "These markers appear on the map as they happen. Untick a type to hide it. Hover any figure or marker on the map for details.",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6;
const GAP = 14;
const MARGIN = 12;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function place(rect: Rect, pw: number, ph: number, order: Side[]): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  for (const side of order) {
    if (side === "right") {
      const left = rect.left + rect.width + PAD + GAP;
      if (left + pw <= vw - MARGIN) return { left, top: clamp(rect.top, MARGIN, vh - ph - MARGIN) };
    } else if (side === "left") {
      const left = rect.left - PAD - GAP - pw;
      if (left >= MARGIN) return { left, top: clamp(rect.top, MARGIN, vh - ph - MARGIN) };
    } else if (side === "bottom") {
      const top = rect.top + rect.height + PAD + GAP;
      if (top + ph <= vh - MARGIN)
        return { top, left: clamp(rect.left + rect.width / 2 - pw / 2, MARGIN, vw - pw - MARGIN) };
    } else if (side === "top") {
      const top = rect.top - PAD - GAP - ph;
      if (top >= MARGIN)
        return { top, left: clamp(rect.left + rect.width / 2 - pw / 2, MARGIN, vw - pw - MARGIN) };
    }
  }
  // "inside", or nothing fit: centre over the target, kept on screen.
  return {
    left: clamp(rect.left + rect.width / 2 - pw / 2, MARGIN, vw - pw - MARGIN),
    top: clamp(rect.top + rect.height / 2 - ph / 2, MARGIN, vh - ph - MARGIN),
  };
}

interface Props {
  open: boolean;
  viewMode: ViewMode;
  onSetViewMode: (v: ViewMode) => void;
  onClose: () => void;
}

export default function Tour({ open, viewMode, onSetViewMode, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const startViewRef = useRef<ViewMode>(viewMode);
  const wasOpenRef = useRef(false);

  const step = STEPS[index];
  const isWelcome = !step.target;
  const isLast = index === STEPS.length - 1;
  const tourStepCount = STEPS.length - 1;

  // Reset every time the tour opens, remembering which view to return to.
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setIndex(0);
      setRect(null);
      setPos(null);
      startViewRef.current = viewMode;
    }
    wasOpenRef.current = open;
  }, [open, viewMode]);

  // Switch to the view this step needs.
  useEffect(() => {
    if (open && step.view && step.view !== viewMode) onSetViewMode(step.view);
  }, [open, index]); // eslint-disable-line react-hooks/exhaustive-deps

  // Locate the target (it may not exist until a view switch has rendered) and track it.
  useEffect(() => {
    if (!open) return;
    setPos(null);
    if (!step.target) {
      setRect(null);
      return;
    }
    let cancelled = false;
    let tries = 0;
    let timer: number | undefined;
    let el: Element | null = null;

    const measure = () => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const find = () => {
      if (cancelled) return;
      el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) {
        el.scrollIntoView({ block: "nearest" });
        measure();
      } else if (tries++ < 40) {
        timer = window.setTimeout(find, 50);
      }
    };
    find();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, index, step.target]);

  // Position the popover once its size is known.
  useLayoutEffect(() => {
    if (!open || !popRef.current) return;
    const { offsetWidth: pw, offsetHeight: ph } = popRef.current;
    if (isWelcome) {
      setPos({ left: (window.innerWidth - pw) / 2, top: Math.max(MARGIN, (window.innerHeight - ph) / 2) });
    } else if (rect) {
      const side = step.side ?? "right";
      const order: Side[] = side === "inside" ? ["inside"] : [side, "right", "left", "bottom", "top"];
      setPos(place(rect, pw, ph, order));
    }
  }, [open, rect, index, isWelcome, step.side, pos === null]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && pos) primaryRef.current?.focus();
  }, [open, index, pos !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  function finish() {
    onSetViewMode(startViewRef.current);
    onClose();
  }

  function next() {
    if (isLast) finish();
    else setIndex((i) => i + 1);
  }

  function back() {
    setIndex((i) => Math.max(0, i - 1));
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!open) return null;

  return (
    <div className="tour-layer">
      {rect && !isWelcome ? (
        <div
          className="tour-spot"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
        />
      ) : (
        <div className="tour-dim" />
      )}

      <div
        ref={popRef}
        className={"tour-pop" + (isWelcome ? " tour-pop-welcome" : "")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? "visible" : "hidden" }}
      >
        {isWelcome && (
          <span className="tour-mark" aria-hidden="true">
            <ActorIcon kind="human" size={22} color="#fff" />
          </span>
        )}
        <h2 id="tour-title" className="tour-title">
          {step.title}
        </h2>
        <p className="tour-body">{step.body}</p>
        <div className="tour-footer">
          {!isWelcome && (
            <span className="tour-progress">
              {index} of {tourStepCount}
            </span>
          )}
          <span className="tour-spacer" />
          {isWelcome ? (
            <>
              <Button variant="subtle" onClick={finish}>
                Skip
              </Button>
              <Button variant="primary" ref={primaryRef} onClick={next}>
                Start the tour
              </Button>
            </>
          ) : (
            <>
              {!isLast && (
                <Button variant="subtle" onClick={finish}>
                  Skip tour
                </Button>
              )}
              <Button variant="secondary" onClick={back}>
                Back
              </Button>
              <Button variant="primary" ref={primaryRef} onClick={next}>
                {isLast ? "Done" : "Next"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
