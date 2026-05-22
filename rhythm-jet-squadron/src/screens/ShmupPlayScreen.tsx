import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type PlayerPosition = {
  x: number;
  y: number;
};

type ArenaBounds = {
  width: number;
  height: number;
};

type PlayerBullet = {
  id: number;
  x: number;
  y: number;
};

type Enemy = {
  id: number;
  x: number;
  y: number;
  radius: number;
  hp: number;
};

const PLAYER_RADIUS = 26;
const HORIZONTAL_MARGIN = 16;
const TOP_PLAY_AREA_RATIO = 0.45;
const TOP_MARGIN = 24;
const BOTTOM_MARGIN = 24;
const FOLLOW_LERP = 0.22;
const FIRE_INTERVAL_MS = 180;
const ENEMY_SPAWN_INTERVAL_MS = 900;
const BULLET_SPEED = 760;
const ENEMY_SPEED = 150;
const BULLET_RADIUS = 4;
const BULLET_DESPAWN_PADDING = 40;
const ENEMY_RADIUS = 22;
const ENEMY_DESPAWN_PADDING = 50;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distance(aX: number, aY: number, bX: number, bY: number) {
  return Math.hypot(aX - bX, aY - bY);
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
  const lastFrameTimeRef = useRef<number | null>(null);
  const lastShotAtRef = useRef(0);
  const lastEnemySpawnAtRef = useRef(0);
  const bulletIdRef = useRef(0);
  const enemyIdRef = useRef(0);
  const bulletsRef = useRef<PlayerBullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const targetRef = useRef<PlayerPosition>({ x: 0, y: 0 });
  const positionRef = useRef<PlayerPosition>({ x: 0, y: 0 });
  const [arenaBounds, setArenaBounds] = useState<ArenaBounds>({ width: 390, height: 844 });
  const [playerPosition, setPlayerPosition] = useState<PlayerPosition>(() => createStartPosition({ width: 390, height: 844 }));
  const [bullets, setBullets] = useState<PlayerBullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);

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
    const tick = (timestamp: number) => {
      const previousTime = lastFrameTimeRef.current ?? timestamp;
      const deltaSeconds = Math.min((timestamp - previousTime) / 1000, 0.05);
      lastFrameTimeRef.current = timestamp;

      const current = positionRef.current;
      const target = targetRef.current;

      // Smooth follow keeps drag responsive without feeling jittery on touch.
      const nextPosition = {
        x: current.x + (target.x - current.x) * FOLLOW_LERP,
        y: current.y + (target.y - current.y) * FOLLOW_LERP,
      };
      positionRef.current = nextPosition;
      setPlayerPosition(nextPosition);

      // Auto-fire is time-based so it stays steady on both fast and slow devices.
      if (timestamp - lastShotAtRef.current >= FIRE_INTERVAL_MS) {
        lastShotAtRef.current = timestamp;
        bulletsRef.current = [
          ...bulletsRef.current,
          {
            id: bulletIdRef.current++,
            x: nextPosition.x,
            y: nextPosition.y - PLAYER_RADIUS,
          },
        ];
      }

      // Spawn simple enemies from the top so we can validate the core loop first.
      if (timestamp - lastEnemySpawnAtRef.current >= ENEMY_SPAWN_INTERVAL_MS) {
        lastEnemySpawnAtRef.current = timestamp;
        enemiesRef.current = [
          ...enemiesRef.current,
          {
            id: enemyIdRef.current++,
            x: clamp(
              HORIZONTAL_MARGIN + ENEMY_RADIUS + Math.random() * (arenaBounds.width - (HORIZONTAL_MARGIN + ENEMY_RADIUS) * 2),
              ENEMY_RADIUS + HORIZONTAL_MARGIN,
              arenaBounds.width - ENEMY_RADIUS - HORIZONTAL_MARGIN,
            ),
            y: -ENEMY_RADIUS,
            radius: ENEMY_RADIUS,
            hp: 3,
          },
        ];
      }

      bulletsRef.current = bulletsRef.current
        .map((bullet) => ({
          ...bullet,
          y: bullet.y - BULLET_SPEED * deltaSeconds,
        }))
        .filter((bullet) => bullet.y > -BULLET_DESPAWN_PADDING);

      enemiesRef.current = enemiesRef.current
        .map((enemy) => ({
          ...enemy,
          y: enemy.y + ENEMY_SPEED * deltaSeconds,
        }))
        .filter((enemy) => enemy.y < arenaBounds.height + ENEMY_DESPAWN_PADDING);

      const bulletsAfterHits: PlayerBullet[] = [];
      const enemiesAfterHits = enemiesRef.current.map((enemy) => ({ ...enemy }));

      // Bullet collision is isolated here so damage, crits, and secondary effects can plug in later.
      for (const bullet of bulletsRef.current) {
        const hitEnemy = enemiesAfterHits.find(
          (enemy) => enemy.hp > 0 && distance(bullet.x, bullet.y, enemy.x, enemy.y) <= enemy.radius + BULLET_RADIUS,
        );

        if (hitEnemy) {
          hitEnemy.hp -= 1;
          continue;
        }

        bulletsAfterHits.push(bullet);
      }

      bulletsRef.current = bulletsAfterHits;
      enemiesRef.current = enemiesAfterHits.filter((enemy) => enemy.hp > 0);

      setBullets(bulletsRef.current);
      setEnemies(enemiesRef.current);
      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (animationRef.current != null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [arenaBounds.height, arenaBounds.width]);

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
          <h1>Combat Slice</h1>
          <p className="shmup-slice-copy">
            Drag to move, auto-fire to shoot, and clear simple enemies dropping in from the top.
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

        {bullets.map((bullet) => (
          <div
            key={bullet.id}
            className="player-bullet"
            style={{
              transform: `translate(${bullet.x - BULLET_RADIUS}px, ${bullet.y - 16}px)`,
            }}
          >
            <div className="player-bullet-core" />
          </div>
        ))}

        {enemies.map((enemy) => (
          <div
            key={enemy.id}
            className="enemy-drone"
            style={{
              width: enemy.radius * 2,
              height: enemy.radius * 2,
              transform: `translate(${enemy.x - enemy.radius}px, ${enemy.y - enemy.radius}px)`,
            }}
          >
            <div className="enemy-drone-core" />
            <div className="enemy-drone-wing enemy-drone-wing-left" />
            <div className="enemy-drone-wing enemy-drone-wing-right" />
          </div>
        ))}

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
