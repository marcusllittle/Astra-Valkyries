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

type EnemyBullet = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

type EnemyKind = "drifter" | "sweeper" | "burst";

type Enemy = {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  originX: number;
  age: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  fireAt: number;
  fireInterval: number;
  scoreValue: number;
  swayAmplitude: number;
  swayFrequency: number;
};

type HitEffect = {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: "blue" | "pink" | "gold";
};

type WaveSpawn = {
  delayMs: number;
  lane: number;
  kind: EnemyKind;
};

type Wave = {
  name: string;
  spawns: WaveSpawn[];
};

const PLAYER_RADIUS = 26;
const PLAYER_MAX_HP = 5;
const PLAYER_INVULNERABLE_MS = 850;
const PLAYER_SECONDARY_MAX = 2;
const PLAYER_SECONDARY_RECHARGE_MS = 6500;
const HORIZONTAL_MARGIN = 16;
const TOP_PLAY_AREA_RATIO = 0.42;
const TOP_MARGIN = 24;
const BOTTOM_MARGIN = 24;
const FOLLOW_LERP = 0.22;
const FIRE_INTERVAL_MS = 180;
const BULLET_SPEED = 760;
const BULLET_RADIUS = 4;
const BULLET_DESPAWN_PADDING = 40;
const ENEMY_DESPAWN_PADDING = 60;
const WAVE_PAUSE_MS = 1500;
const SECONDARY_BLAST_RADIUS = 170;
const SECONDARY_DAMAGE = 3;

const WAVES: Wave[] = [
  {
    name: "Scout Pass",
    spawns: [
      { delayMs: 300, lane: 0.2, kind: "drifter" },
      { delayMs: 260, lane: 0.5, kind: "drifter" },
      { delayMs: 260, lane: 0.8, kind: "drifter" },
      { delayMs: 420, lane: 0.35, kind: "sweeper" },
      { delayMs: 280, lane: 0.65, kind: "sweeper" },
    ],
  },
  {
    name: "Cross Current",
    spawns: [
      { delayMs: 250, lane: 0.18, kind: "sweeper" },
      { delayMs: 220, lane: 0.82, kind: "sweeper" },
      { delayMs: 220, lane: 0.32, kind: "drifter" },
      { delayMs: 220, lane: 0.68, kind: "drifter" },
      { delayMs: 420, lane: 0.5, kind: "burst" },
    ],
  },
  {
    name: "Pressure Wave",
    spawns: [
      { delayMs: 260, lane: 0.25, kind: "burst" },
      { delayMs: 200, lane: 0.75, kind: "burst" },
      { delayMs: 220, lane: 0.5, kind: "sweeper" },
      { delayMs: 220, lane: 0.15, kind: "drifter" },
      { delayMs: 220, lane: 0.85, kind: "drifter" },
      { delayMs: 320, lane: 0.5, kind: "burst" },
    ],
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distance(aX: number, aY: number, bX: number, bY: number) {
  return Math.hypot(aX - bX, aY - bY);
}

function laneToX(bounds: ArenaBounds, lane: number, radius: number) {
  const minX = radius + HORIZONTAL_MARGIN;
  const maxX = bounds.width - radius - HORIZONTAL_MARGIN;
  return clamp(minX + (maxX - minX) * lane, minX, maxX);
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

function createEnemy(bounds: ArenaBounds, spawn: WaveSpawn, id: number, now: number): Enemy {
  if (spawn.kind === "sweeper") {
    return {
      id,
      kind: spawn.kind,
      x: laneToX(bounds, spawn.lane, 20),
      y: -28,
      originX: laneToX(bounds, spawn.lane, 20),
      age: 0,
      radius: 20,
      hp: 3,
      maxHp: 3,
      speed: 140,
      fireAt: now + 800,
      fireInterval: 1450,
      scoreValue: 120,
      swayAmplitude: Math.min(90, bounds.width * 0.16),
      swayFrequency: 2.1,
    };
  }

  if (spawn.kind === "burst") {
    return {
      id,
      kind: spawn.kind,
      x: laneToX(bounds, spawn.lane, 24),
      y: -32,
      originX: laneToX(bounds, spawn.lane, 24),
      age: 0,
      radius: 24,
      hp: 5,
      maxHp: 5,
      speed: 112,
      fireAt: now + 900,
      fireInterval: 1650,
      scoreValue: 220,
      swayAmplitude: Math.min(44, bounds.width * 0.08),
      swayFrequency: 1.5,
    };
  }

  return {
    id,
    kind: spawn.kind,
    x: laneToX(bounds, spawn.lane, 18),
    y: -24,
    originX: laneToX(bounds, spawn.lane, 18),
    age: 0,
    radius: 18,
    hp: 2,
    maxHp: 2,
    speed: 170,
    fireAt: now + 950,
    fireInterval: 1600,
    scoreValue: 80,
    swayAmplitude: 0,
    swayFrequency: 0,
  };
}

export default function ShmupPlayScreen() {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const lastShotAtRef = useRef(0);
  const nextSecondaryChargeAtRef = useRef(0);
  const bulletIdRef = useRef(0);
  const enemyBulletIdRef = useRef(0);
  const enemyIdRef = useRef(0);
  const effectIdRef = useRef(0);
  const waveIndexRef = useRef(0);
  const waveSpawnIndexRef = useRef(0);
  const nextWaveSpawnAtRef = useRef(0);
  const targetRef = useRef<PlayerPosition>({ x: 0, y: 0 });
  const positionRef = useRef<PlayerPosition>({ x: 0, y: 0 });
  const bulletsRef = useRef<PlayerBullet[]>([]);
  const enemyBulletsRef = useRef<EnemyBullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const effectsRef = useRef<HitEffect[]>([]);
  const hpRef = useRef(PLAYER_MAX_HP);
  const invulnerableUntilRef = useRef(0);
  const scoreRef = useRef(0);
  const secondaryChargesRef = useRef(PLAYER_SECONDARY_MAX);
  const defeatedRef = useRef(false);
  const [arenaBounds, setArenaBounds] = useState<ArenaBounds>({ width: 390, height: 844 });
  const [playerPosition, setPlayerPosition] = useState<PlayerPosition>(() => createStartPosition({ width: 390, height: 844 }));
  const [bullets, setBullets] = useState<PlayerBullet[]>([]);
  const [enemyBullets, setEnemyBullets] = useState<EnemyBullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [effects, setEffects] = useState<HitEffect[]>([]);
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP);
  const [playerInvulnerable, setPlayerInvulnerable] = useState(false);
  const [isDefeated, setIsDefeated] = useState(false);
  const [score, setScore] = useState(0);
  const [secondaryCharges, setSecondaryCharges] = useState(PLAYER_SECONDARY_MAX);
  const [waveName, setWaveName] = useState(WAVES[0].name);

  const pushEffect = useCallback((x: number, y: number, color: HitEffect["color"], maxRadius: number) => {
    effectsRef.current = [
      ...effectsRef.current,
      {
        id: effectIdRef.current++,
        x,
        y,
        radius: 12,
        maxRadius,
        life: 0.42,
        maxLife: 0.42,
        color,
      },
    ];
  }, []);

  const resetRun = useCallback((bounds: ArenaBounds) => {
    const start = createStartPosition(bounds);
    positionRef.current = start;
    targetRef.current = start;
    bulletsRef.current = [];
    enemyBulletsRef.current = [];
    enemiesRef.current = [];
    effectsRef.current = [];
    hpRef.current = PLAYER_MAX_HP;
    invulnerableUntilRef.current = 0;
    scoreRef.current = 0;
    secondaryChargesRef.current = PLAYER_SECONDARY_MAX;
    nextSecondaryChargeAtRef.current = 0;
    defeatedRef.current = false;
    lastFrameTimeRef.current = null;
    lastShotAtRef.current = 0;
    waveIndexRef.current = 0;
    waveSpawnIndexRef.current = 0;
    nextWaveSpawnAtRef.current = 400;
    setPlayerPosition(start);
    setBullets([]);
    setEnemyBullets([]);
    setEnemies([]);
    setEffects([]);
    setPlayerHp(PLAYER_MAX_HP);
    setPlayerInvulnerable(false);
    setIsDefeated(false);
    setScore(0);
    setSecondaryCharges(PLAYER_SECONDARY_MAX);
    setWaveName(WAVES[0].name);
  }, []);

  const measureArena = useCallback(() => {
    const arena = arenaRef.current;
    if (!arena) return;

    const rect = arena.getBoundingClientRect();
    const nextBounds = {
      width: Math.max(320, rect.width),
      height: Math.max(520, rect.height),
    };

    const playable = getPlayableBounds(nextBounds);
    const fallback = createStartPosition(nextBounds);
    const nextPosition = {
      x: clamp(positionRef.current.x || fallback.x, playable.minX, playable.maxX),
      y: clamp(positionRef.current.y || fallback.y, playable.minY, playable.maxY),
    };

    setArenaBounds(nextBounds);
    positionRef.current = nextPosition;
    targetRef.current = nextPosition;
    setPlayerPosition(nextPosition);
  }, []);

  const useSecondary = useCallback(() => {
    if (defeatedRef.current || secondaryChargesRef.current <= 0) return;

    secondaryChargesRef.current -= 1;
    setSecondaryCharges(secondaryChargesRef.current);
    if (secondaryChargesRef.current < PLAYER_SECONDARY_MAX && nextSecondaryChargeAtRef.current === 0) {
      nextSecondaryChargeAtRef.current = performance.now() + PLAYER_SECONDARY_RECHARGE_MS;
    }

    pushEffect(positionRef.current.x, positionRef.current.y, "gold", SECONDARY_BLAST_RADIUS);

    const remainingEnemies: Enemy[] = [];
    for (const enemy of enemiesRef.current) {
      const nextEnemy = { ...enemy };
      if (distance(nextEnemy.x, nextEnemy.y, positionRef.current.x, positionRef.current.y) <= SECONDARY_BLAST_RADIUS) {
        nextEnemy.hp -= SECONDARY_DAMAGE;
      }
      if (nextEnemy.hp > 0) {
        remainingEnemies.push(nextEnemy);
      } else {
        scoreRef.current += nextEnemy.scoreValue;
        pushEffect(nextEnemy.x, nextEnemy.y, "pink", nextEnemy.radius * 2.4);
      }
    }

    enemiesRef.current = remainingEnemies;
    enemyBulletsRef.current = enemyBulletsRef.current.filter(
      (bullet) => distance(bullet.x, bullet.y, positionRef.current.x, positionRef.current.y) > SECONDARY_BLAST_RADIUS,
    );
    setEnemies(enemiesRef.current);
    setEnemyBullets(enemyBulletsRef.current);
    setScore(scoreRef.current);
  }, [pushEffect]);

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
    resetRun(arenaBounds);
  }, [arenaBounds, resetRun]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "ShiftLeft" || event.code === "ShiftRight") {
        event.preventDefault();
        useSecondary();
      }
      if (event.code === "KeyR" && isDefeated) {
        resetRun(arenaBounds);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [arenaBounds, isDefeated, resetRun, useSecondary]);

  useEffect(() => {
    const tick = (timestamp: number) => {
      const previousTime = lastFrameTimeRef.current ?? timestamp;
      const deltaSeconds = Math.min((timestamp - previousTime) / 1000, 0.05);
      lastFrameTimeRef.current = timestamp;

      const currentlyInvulnerable = timestamp < invulnerableUntilRef.current;
      if (currentlyInvulnerable !== playerInvulnerable) {
        setPlayerInvulnerable(currentlyInvulnerable);
      }

      if (
        secondaryChargesRef.current < PLAYER_SECONDARY_MAX &&
        nextSecondaryChargeAtRef.current > 0 &&
        timestamp >= nextSecondaryChargeAtRef.current
      ) {
        secondaryChargesRef.current += 1;
        setSecondaryCharges(secondaryChargesRef.current);
        nextSecondaryChargeAtRef.current =
          secondaryChargesRef.current < PLAYER_SECONDARY_MAX ? timestamp + PLAYER_SECONDARY_RECHARGE_MS : 0;
      }

      const current = positionRef.current;
      const target = targetRef.current;

      // Smooth pointer follow keeps desktop and touch drag feeling direct without jitter.
      const nextPosition = {
        x: current.x + (target.x - current.x) * FOLLOW_LERP,
        y: current.y + (target.y - current.y) * FOLLOW_LERP,
      };
      positionRef.current = nextPosition;
      setPlayerPosition(nextPosition);

      if (!defeatedRef.current && timestamp - lastShotAtRef.current >= FIRE_INTERVAL_MS) {
        lastShotAtRef.current = timestamp;
        bulletsRef.current = [
          ...bulletsRef.current,
          { id: bulletIdRef.current++, x: nextPosition.x, y: nextPosition.y - PLAYER_RADIUS },
        ];
      }

      const currentWave = WAVES[waveIndexRef.current];
      if (!defeatedRef.current && timestamp >= nextWaveSpawnAtRef.current) {
        const spawn = currentWave.spawns[waveSpawnIndexRef.current];
        if (spawn) {
          enemiesRef.current = [
            ...enemiesRef.current,
            createEnemy(arenaBounds, spawn, enemyIdRef.current++, timestamp),
          ];
          waveSpawnIndexRef.current += 1;
          nextWaveSpawnAtRef.current = timestamp + spawn.delayMs;
        } else {
          waveIndexRef.current = (waveIndexRef.current + 1) % WAVES.length;
          waveSpawnIndexRef.current = 0;
          nextWaveSpawnAtRef.current = timestamp + WAVE_PAUSE_MS;
          setWaveName(WAVES[waveIndexRef.current].name);
        }
      }

      bulletsRef.current = bulletsRef.current
        .map((bullet) => ({ ...bullet, y: bullet.y - BULLET_SPEED * deltaSeconds }))
        .filter((bullet) => bullet.y > -BULLET_DESPAWN_PADDING);

      const spawnedEnemyBullets: EnemyBullet[] = [];
      enemiesRef.current = enemiesRef.current
        .map((enemy) => {
          const movedEnemy = { ...enemy, age: enemy.age + deltaSeconds };
          if (enemy.kind === "sweeper") {
            movedEnemy.y += movedEnemy.speed * deltaSeconds;
            movedEnemy.x = clamp(
              movedEnemy.originX + Math.sin(movedEnemy.age * movedEnemy.swayFrequency) * movedEnemy.swayAmplitude,
              movedEnemy.radius + HORIZONTAL_MARGIN,
              arenaBounds.width - movedEnemy.radius - HORIZONTAL_MARGIN,
            );
          } else if (enemy.kind === "burst") {
            movedEnemy.y += movedEnemy.speed * deltaSeconds;
            movedEnemy.x = clamp(
              movedEnemy.originX + Math.sin(movedEnemy.age * movedEnemy.swayFrequency) * movedEnemy.swayAmplitude,
              movedEnemy.radius + HORIZONTAL_MARGIN,
              arenaBounds.width - movedEnemy.radius - HORIZONTAL_MARGIN,
            );
          } else {
            movedEnemy.y += movedEnemy.speed * deltaSeconds;
          }

          if (!defeatedRef.current && timestamp >= movedEnemy.fireAt) {
            if (movedEnemy.kind === "burst") {
              const baseAngles = [-0.28, 0, 0.28];
              for (const angleOffset of baseAngles) {
                const angle = Math.PI / 2 + angleOffset;
                spawnedEnemyBullets.push({
                  id: enemyBulletIdRef.current++,
                  x: movedEnemy.x,
                  y: movedEnemy.y + movedEnemy.radius * 0.8,
                  vx: Math.cos(angle) * 230,
                  vy: Math.sin(angle) * 230,
                  radius: 7,
                });
              }
            } else if (movedEnemy.kind === "sweeper") {
              const dx = nextPosition.x - movedEnemy.x;
              const dy = nextPosition.y - movedEnemy.y;
              const length = Math.max(Math.hypot(dx, dy), 1);
              spawnedEnemyBullets.push({
                id: enemyBulletIdRef.current++,
                x: movedEnemy.x,
                y: movedEnemy.y + movedEnemy.radius * 0.8,
                vx: (dx / length) * 250,
                vy: (dy / length) * 250,
                radius: 6,
              });
            } else {
              spawnedEnemyBullets.push({
                id: enemyBulletIdRef.current++,
                x: movedEnemy.x,
                y: movedEnemy.y + movedEnemy.radius * 0.8,
                vx: 0,
                vy: 280,
                radius: 6,
              });
            }

            movedEnemy.fireAt = timestamp + movedEnemy.fireInterval;
          }

          return movedEnemy;
        })
        .filter((enemy) => enemy.y < arenaBounds.height + ENEMY_DESPAWN_PADDING);

      enemyBulletsRef.current = [...enemyBulletsRef.current, ...spawnedEnemyBullets]
        .map((bullet) => ({
          ...bullet,
          x: bullet.x + bullet.vx * deltaSeconds,
          y: bullet.y + bullet.vy * deltaSeconds,
        }))
        .filter(
          (bullet) =>
            bullet.x > -BULLET_DESPAWN_PADDING &&
            bullet.x < arenaBounds.width + BULLET_DESPAWN_PADDING &&
            bullet.y > -BULLET_DESPAWN_PADDING &&
            bullet.y < arenaBounds.height + BULLET_DESPAWN_PADDING,
        );

      const remainingBullets: PlayerBullet[] = [];
      const enemiesAfterHits = enemiesRef.current.map((enemy) => ({ ...enemy }));
      for (const bullet of bulletsRef.current) {
        const hitEnemy = enemiesAfterHits.find(
          (enemy) => enemy.hp > 0 && distance(bullet.x, bullet.y, enemy.x, enemy.y) <= enemy.radius + BULLET_RADIUS,
        );

        if (hitEnemy) {
          hitEnemy.hp -= 1;
          pushEffect(bullet.x, bullet.y, "blue", 24);
          continue;
        }

        remainingBullets.push(bullet);
      }

      const defeatedEnemies = enemiesAfterHits.filter((enemy) => enemy.hp <= 0);
      for (const enemy of defeatedEnemies) {
        scoreRef.current += enemy.scoreValue;
        pushEffect(enemy.x, enemy.y, "pink", enemy.radius * 2.5);
      }

      bulletsRef.current = remainingBullets;
      enemiesRef.current = enemiesAfterHits.filter((enemy) => enemy.hp > 0);

      if (!defeatedRef.current) {
        const touchingEnemy = enemiesRef.current.find(
          (enemy) => distance(enemy.x, enemy.y, nextPosition.x, nextPosition.y) <= enemy.radius + PLAYER_RADIUS - 4,
        );
        const touchingEnemyBullet = enemyBulletsRef.current.find(
          (bullet) => distance(bullet.x, bullet.y, nextPosition.x, nextPosition.y) <= bullet.radius + PLAYER_RADIUS,
        );

        if ((touchingEnemy || touchingEnemyBullet) && timestamp >= invulnerableUntilRef.current) {
          hpRef.current = Math.max(0, hpRef.current - 1);
          invulnerableUntilRef.current = timestamp + PLAYER_INVULNERABLE_MS;
          setPlayerHp(hpRef.current);
          setPlayerInvulnerable(true);
          pushEffect(nextPosition.x, nextPosition.y, "gold", 60);

          if (touchingEnemyBullet) {
            enemyBulletsRef.current = enemyBulletsRef.current.filter((bullet) => bullet.id !== touchingEnemyBullet.id);
          }

          if (touchingEnemy) {
            touchingEnemy.hp = 0;
          }

          if (hpRef.current <= 0) {
            defeatedRef.current = true;
            setIsDefeated(true);
          }
        }
      }

      effectsRef.current = effectsRef.current
        .map((effect) => ({
          ...effect,
          life: effect.life - deltaSeconds,
          radius: effect.radius + ((effect.maxRadius - effect.radius) * deltaSeconds) / Math.max(effect.life, 0.1),
        }))
        .filter((effect) => effect.life > 0);

      setBullets(bulletsRef.current);
      setEnemyBullets(enemyBulletsRef.current);
      setEnemies(enemiesRef.current);
      setEffects(effectsRef.current);
      setScore(scoreRef.current);

      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (animationRef.current != null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [arenaBounds, playerInvulnerable, pushEffect]);

  const updateTargetFromPointer = useCallback((clientX: number, clientY: number) => {
    const arena = arenaRef.current;
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const playable = getPlayableBounds(arenaBounds);

    // Clamp pointer targets so movement stays readable and inside the visible arena.
    targetRef.current = {
      x: clamp(clientX - rect.left, playable.minX, playable.maxX),
      y: clamp(clientY - rect.top, playable.minY, playable.maxY),
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
          <h1>Playable Combat Slice</h1>
          <p className="shmup-slice-copy">
            Drag to move, auto-fire through patterned micro-waves, and use Nova Pulse to clear pressure when the screen gets messy.
          </p>
        </div>

        <div className="shmup-hud">
          <p className="shmup-wave-label">{waveName}</p>
          <p className="shmup-score-label">Score {score.toString().padStart(5, "0")}</p>
          <div className="shmup-hp-bar">
            <div className="shmup-hp-fill" style={{ width: `${(playerHp / PLAYER_MAX_HP) * 100}%` }} />
          </div>
          <p className="shmup-hp-label">Hull {playerHp}/{PLAYER_MAX_HP}</p>
          <button className="btn btn-secondary shmup-secondary-button" onClick={useSecondary} disabled={secondaryCharges <= 0 || isDefeated}>
            Nova Pulse ({secondaryCharges})
          </button>
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

        {effects.map((effect) => (
          <div
            key={effect.id}
            className={`shmup-effect shmup-effect-${effect.color}`}
            style={{
              width: effect.radius * 2,
              height: effect.radius * 2,
              opacity: effect.life / effect.maxLife,
              transform: `translate(${effect.x - effect.radius}px, ${effect.y - effect.radius}px)`,
            }}
          />
        ))}

        {bullets.map((bullet) => (
          <div key={bullet.id} className="player-bullet" style={{ transform: `translate(${bullet.x - BULLET_RADIUS}px, ${bullet.y - 16}px)` }}>
            <div className="player-bullet-core" />
          </div>
        ))}

        {enemyBullets.map((bullet) => (
          <div
            key={bullet.id}
            className="enemy-bullet"
            style={{
              width: bullet.radius * 2,
              height: bullet.radius * 2,
              transform: `translate(${bullet.x - bullet.radius}px, ${bullet.y - bullet.radius}px)`,
            }}
          >
            <div className="enemy-bullet-core" />
          </div>
        ))}

        {enemies.map((enemy) => (
          <div
            key={enemy.id}
            className={`enemy-drone enemy-drone-${enemy.kind}`}
            style={{
              width: enemy.radius * 2,
              height: enemy.radius * 2,
              transform: `translate(${enemy.x - enemy.radius}px, ${enemy.y - enemy.radius}px)`,
            }}
          >
            <div className="enemy-drone-core" />
            <div className="enemy-drone-wing enemy-drone-wing-left" />
            <div className="enemy-drone-wing enemy-drone-wing-right" />
            <div className="enemy-drone-hp">
              <div className="enemy-drone-hp-fill" style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
            </div>
          </div>
        ))}

        <div
          className={`player-ship${playerInvulnerable ? " player-ship-invulnerable" : ""}${isDefeated ? " player-ship-defeated" : ""}`}
          style={{ transform: `translate(${playerPosition.x - PLAYER_RADIUS}px, ${playerPosition.y - PLAYER_RADIUS}px)` }}
        >
          <div className="player-ship-core" />
          <div className="player-ship-wing player-ship-wing-left" />
          <div className="player-ship-wing player-ship-wing-right" />
          <div className="player-ship-engine" />
        </div>

        {isDefeated && (
          <div className="shmup-overlay">
            <div className="shmup-overlay-card">
              <h2>Run Ended</h2>
              <p>You scored {score.toString().padStart(5, "0")}. Tap restart to jump back into the wave loop.</p>
              <button className="btn btn-primary" onClick={() => resetRun(arenaBounds)}>
                Restart Run
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
