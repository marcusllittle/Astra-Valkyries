import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type PlayerPosition = {
  x: number;
  y: number;
};

type ArenaBounds = {
  width: number;
  height: number;
};

const PLAYER_RADIUS = 26;
const HORIZONTAL_MARGIN = 16;
const TOP_PLAY_AREA_RATIO = 0.45;
const TOP_MARGIN = 24;
const BOTTOM_MARGIN = 24;
const FOLLOW_LERP = 0.22;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getPlayableBounds(bounds: ArenaBounds) {
  const minX = PLAYER_RADIUS + HORIZONTAL_MARGIN;
  const maxX = bounds.width - PLAYER_RADIUS - HORIZONTAL_MARGIN;
  const minY = Math.max(bounds.height * TOP_PLAY_AREA_RATIO, PLAYER_RADIUS + TOP_MARGIN);
  const maxY = bounds.height - PLAYER_RADIUS - BOTTOM_MARGIN;

  return { minX, maxX, minY, maxY };
}

function createStartPosition(bounds: ArenaBounds): PlayerPosition {
  const playable = getPlayableBounds(bounds);
  return {
    x: bounds.width / 2,
    y: clamp(bounds.height * 0.84, playable.minY, playable.maxY),
  };
}

export default function ShmupPlayScreen() {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const targetRef = useRef<PlayerPosition>({ x: 0, y: 0 });
  const positionRef = useRef<PlayerPosition>({ x: 0, y: 0 });
  const [arenaBounds, setArenaBounds] = useState<ArenaBounds>({ width: 390, height: 844 });
  const [playerPosition, setPlayerPosition] = useState<PlayerPosition>(() => createStartPosition({ width: 390, height: 844 }));

  const measureArena = useCallback(() => {
    const arena = arenaRef.current;
    if (!arena) return;

    const rect = arena.getBoundingClientRect();
    const nextBounds = {
      width: Math.max(320, rect.width),
      height: Math.max(520, rect.height),
    };

    const start = createStartPosition(nextBounds);
    const playable = getPlayableBounds(nextBounds);
    const nextPosition = {
      x: clamp(positionRef.current.x || start.x, playable.minX, playable.maxX),
      y: clamp(positionRef.current.y || start.y, playable.minY, playable.maxY),
    };

    setArenaBounds(nextBounds);
    positionRef.current = nextPosition;
    targetRef.current = nextPosition;
    setPlayerPosition(nextPosition);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("shmup-active");
    document.body.classList.add("shmup-active");
    const root = document.getElementById("root");
    root?.classList.add("shmup-active");

    measureArena();
    window.addEventListener("resize", measureArena);

    return () => {
      document.documentElement.classList.remove("shmup-active");
      document.body.classList.remove("shmup-active");
      root?.classList.remove("shmup-active");
      window.removeEventListener("resize", measureArena);
    };
  }, [measureArena]);

  useEffect(() => {
    const tick = () => {
      const current = positionRef.current;
      const target = targetRef.current;

      // Smooth follow keeps drag responsive without feeling jittery on touch.
      const next = {
        x: current.x + (target.x - current.x) * FOLLOW_LERP,
        y: current.y + (target.y - current.y) * FOLLOW_LERP,
      };

      positionRef.current = next;
      setPlayerPosition(next);
      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (animationRef.current != null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const updateTargetFromPointer = useCallback((clientX: number, clientY: number) => {
    const arena = arenaRef.current;
    if (!arena) return;

    const rect = arena.getBoundingClientRect();
    const playable = getPlayableBounds(arenaBounds);
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    // Clamp target position so the ship never leaves the visible play area.
    targetRef.current = {
      x: clamp(localX, playable.minX, playable.maxX),
      y: clamp(localY, playable.minY, playable.maxY),
    };
  }, [arenaBounds]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    dragPointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateTargetFromPointer(event.clientX, event.clientY);
  }, [updateTargetFromPointer]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    updateTargetFromPointer(event.clientX, event.clientY);
  }, [updateTargetFromPointer]);

  const endPointerDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    dragPointerIdRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return (
    <main className="screen shmup-slice-screen">
      <header className="shmup-slice-header">
        <div>
          <p className="shmup-slice-kicker">Astra Valkyries MVP</p>
          <h1>Control Slice</h1>
          <p className="shmup-slice-copy">
            Drag the ship with mouse or touch. This slice is only movement and bounds so shooting and combat can layer in next.
          </p>
        </div>
      </header>

      <section
        ref={arenaRef}
        className="shmup-slice-arena"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointerDrag}
        onPointerCancel={endPointerDrag}
        onPointerLeave={endPointerDrag}
      >
        <div className="shmup-slice-grid" aria-hidden="true" />
        <div className="shmup-slice-lower-zone" aria-hidden="true" />

        <div
          className="player-ship"
          style={{
            transform: `translate(${playerPosition.x - PLAYER_RADIUS}px, ${playerPosition.y - PLAYER_RADIUS}px)`,
          }}
        >
          <div className="player-ship-core" />
          <div className="player-ship-wing player-ship-wing-left" />
          <div className="player-ship-wing player-ship-wing-right" />
          <div className="player-ship-engine" />
        </div>
      </section>
    </main>
  );
}
