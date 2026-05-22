import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

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
  radius: number;
  damage: number;
};

type EnemyBullet = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hostile: "enemy" | "boss";
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

type Boss = {
  x: number;
  y: number;
  targetY: number;
  radius: number;
  hp: number;
  maxHp: number;
  age: number;
  fireAt: number;
  volleyAt: number;
  phase: 1 | 2;
  introDone: boolean;
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

type RunPhase = "waves" | "boss" | "victory";

type RunSummary = {
  score: number;
  kills: number;
  survivalMs: number;
  bossDefeated: boolean;
  grade: string;
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
const BULLET_SPEED = 760;
const BULLET_DESPAWN_PADDING = 40;
const ENEMY_DESPAWN_PADDING = 60;
const WAVE_PAUSE_MS = 1500;
const SECONDARY_BLAST_RADIUS = 170;
const SECONDARY_DAMAGE = 3;
const BOSS_SCORE_VALUE = 2000;

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
    const x = laneToX(bounds, spawn.lane, 20);
    return {
      id,
      kind: spawn.kind,
      x,
      y: -28,
      originX: x,
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
    const x = laneToX(bounds, spawn.lane, 24);
    return {
      id,
      kind: spawn.kind,
      x,
      y: -32,
      originX: x,
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

  const x = laneToX(bounds, spawn.lane, 18);
  return {
    id,
    kind: spawn.kind,
    x,
    y: -24,
    originX: x,
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

function createBoss(bounds: ArenaBounds, now: number): Boss {
  return {
    x: bounds.width / 2,
    y: -120,
    targetY: Math.max(100, bounds.height * 0.18),
    radius: 64,
    hp: 80,
    maxHp: 80,
    age: 0,
    fireAt: now + 1200,
    volleyAt: now + 1900,
    phase: 1,
    introDone: false,
  };
}

function getPrimaryProfile(score: number) {
  if (score >= 3600) {
    return { name: "Astra Tri-Lance", intervalMs: 135, offsets: [-18, 0, 18], damage: 1, radius: 4 };
  }
  if (score >= 1400) {
    return { name: "Twin Lance", intervalMs: 155, offsets: [-10, 10], damage: 1, radius: 4 };
  }
  return { name: "Pulse Lance", intervalMs: 180, offsets: [0], damage: 1, radius: 4 };
}

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function computeGrade(summary: Omit<RunSummary, "grade">) {
  if (summary.bossDefeated && summary.score >= 5200) return "S";
  if (summary.bossDefeated) return "A";
  if (summary.score >= 2400) return "B";
  if (summary.score >= 1200) return "C";
  return "D";
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
  const runPhaseRef = useRef<RunPhase>("waves");
  const bossRef = useRef<Boss | null>(null);
  const shakeRef = useRef(0);
  const flashRef = useRef(0);
  const runStartedAtRef = useRef(0);
  const killsRef = useRef(0);
  const summaryRef = useRef<RunSummary | null>(null);
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
  const [boss, setBoss] = useState<Boss | null>(null);
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP);
  const [playerInvulnerable, setPlayerInvulnerable] = useState(false);
  const [isDefeated, setIsDefeated] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [secondaryCharges, setSecondaryCharges] = useState(PLAYER_SECONDARY_MAX);
  const [waveName, setWaveName] = useState(WAVES[0].name);
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const primaryProfile = useMemo(() => getPrimaryProfile(score), [score]);
  const secondaryRechargeProgress = secondaryCharges >= PLAYER_SECONDARY_MAX || nextSecondaryChargeAtRef.current === 0
    ? 1
    : clamp(1 - ((nextSecondaryChargeAtRef.current - performance.now()) / PLAYER_SECONDARY_RECHARGE_MS), 0, 1);

  const pushEffect = useCallback((x: number, y: number, color: HitEffect["color"], maxRadius: number) => {
    effectsRef.current = [
      ...effectsRef.current,
      { id: effectIdRef.current++, x, y, radius: 12, maxRadius, life: 0.42, maxLife: 0.42, color },
    ];
  }, []);

  const addShake = useCallback((amount: number) => {
    shakeRef.current = Math.max(shakeRef.current, amount);
  }, []);

  const triggerFlash = useCallback((opacity: number) => {
    flashRef.current = Math.max(flashRef.current, opacity);
  }, []);

  const finalizeRun = useCallback((bossDefeated: boolean) => {
    const base = {
      score: scoreRef.current,
      kills: killsRef.current,
      survivalMs: Math.max(0, performance.now() - runStartedAtRef.current),
      bossDefeated,
    };
    const full = { ...base, grade: computeGrade(base) };
    summaryRef.current = full;
    setSummary(full);
  }, []);

  const registerKill = useCallback((scoreValue: number) => {
    scoreRef.current += scoreValue;
    killsRef.current += 1;
    setScore(scoreRef.current);
    setKills(killsRef.current);
  }, []);

  const resetRun = useCallback((bounds: ArenaBounds) => {
    const start = createStartPosition(bounds);
    positionRef.current = start;
    targetRef.current = start;
    bulletsRef.current = [];
    enemyBulletsRef.current = [];
    enemiesRef.current = [];
    effectsRef.current = [];
    bossRef.current = null;
    hpRef.current = PLAYER_MAX_HP;
    invulnerableUntilRef.current = 0;
    scoreRef.current = 0;
    killsRef.current = 0;
    secondaryChargesRef.current = PLAYER_SECONDARY_MAX;
    nextSecondaryChargeAtRef.current = 0;
    defeatedRef.current = false;
    runPhaseRef.current = "waves";
    shakeRef.current = 0;
    flashRef.current = 0;
    lastFrameTimeRef.current = null;
    lastShotAtRef.current = 0;
    waveIndexRef.current = 0;
    waveSpawnIndexRef.current = 0;
    nextWaveSpawnAtRef.current = 400;
    runStartedAtRef.current = performance.now();
    summaryRef.current = null;
    setPlayerPosition(start);
    setBullets([]);
    setEnemyBullets([]);
    setEnemies([]);
    setEffects([]);
    setBoss(null);
    setPlayerHp(PLAYER_MAX_HP);
    setPlayerInvulnerable(false);
    setIsDefeated(false);
    setIsVictory(false);
    setScore(0);
    setKills(0);
    setSecondaryCharges(PLAYER_SECONDARY_MAX);
    setWaveName(WAVES[0].name);
    setShakeOffset({ x: 0, y: 0 });
    setFlashOpacity(0);
    setSummary(null);
  }, []);

  const measureArena = useCallback(() => {
    const arena = arenaRef.current;
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const nextBounds = { width: Math.max(320, rect.width), height: Math.max(520, rect.height) };
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
    if (defeatedRef.current || runPhaseRef.current === "victory" || secondaryChargesRef.current <= 0) return;
    secondaryChargesRef.current -= 1;
    setSecondaryCharges(secondaryChargesRef.current);
    if (secondaryChargesRef.current < PLAYER_SECONDARY_MAX && nextSecondaryChargeAtRef.current === 0) {
      nextSecondaryChargeAtRef.current = performance.now() + PLAYER_SECONDARY_RECHARGE_MS;
    }
    pushEffect(positionRef.current.x, positionRef.current.y, "gold", SECONDARY_BLAST_RADIUS);
    addShake(12);
    triggerFlash(0.22);

    const remainingEnemies: Enemy[] = [];
    for (const enemy of enemiesRef.current) {
      const nextEnemy = { ...enemy };
      if (distance(nextEnemy.x, nextEnemy.y, positionRef.current.x, positionRef.current.y) <= SECONDARY_BLAST_RADIUS) {
        nextEnemy.hp -= SECONDARY_DAMAGE;
      }
      if (nextEnemy.hp > 0) {
        remainingEnemies.push(nextEnemy);
      } else {
        registerKill(nextEnemy.scoreValue);
        pushEffect(nextEnemy.x, nextEnemy.y, "pink", nextEnemy.radius * 2.4);
      }
    }
    enemiesRef.current = remainingEnemies;

    if (bossRef.current && distance(bossRef.current.x, bossRef.current.y, positionRef.current.x, positionRef.current.y) <= SECONDARY_BLAST_RADIUS + bossRef.current.radius) {
      bossRef.current = { ...bossRef.current, hp: Math.max(0, bossRef.current.hp - 6) };
      pushEffect(bossRef.current.x, bossRef.current.y, "gold", bossRef.current.radius * 1.6);
    }

    enemyBulletsRef.current = enemyBulletsRef.current.filter(
      (bullet) => distance(bullet.x, bullet.y, positionRef.current.x, positionRef.current.y) > SECONDARY_BLAST_RADIUS,
    );
    setEnemies(enemiesRef.current);
    setEnemyBullets(enemyBulletsRef.current);
    setBoss(bossRef.current);
  }, [addShake, pushEffect, registerKill, triggerFlash]);

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
      if (event.code === "KeyR" && (isDefeated || isVictory)) {
        resetRun(arenaBounds);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [arenaBounds, isDefeated, isVictory, resetRun, useSecondary]);

  useEffect(() => {
    const tick = (timestamp: number) => {
      const previousTime = lastFrameTimeRef.current ?? timestamp;
      const deltaSeconds = Math.min((timestamp - previousTime) / 1000, 0.05);
      lastFrameTimeRef.current = timestamp;

      const currentlyInvulnerable = timestamp < invulnerableUntilRef.current;
      if (currentlyInvulnerable !== playerInvulnerable) setPlayerInvulnerable(currentlyInvulnerable);

      if (secondaryChargesRef.current < PLAYER_SECONDARY_MAX && nextSecondaryChargeAtRef.current > 0 && timestamp >= nextSecondaryChargeAtRef.current) {
        secondaryChargesRef.current += 1;
        setSecondaryCharges(secondaryChargesRef.current);
        nextSecondaryChargeAtRef.current = secondaryChargesRef.current < PLAYER_SECONDARY_MAX ? timestamp + PLAYER_SECONDARY_RECHARGE_MS : 0;
      }

      shakeRef.current = Math.max(0, shakeRef.current - deltaSeconds * 34);
      flashRef.current = Math.max(0, flashRef.current - deltaSeconds * 1.8);
      setShakeOffset({ x: shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0, y: shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0 });
      setFlashOpacity(flashRef.current);

      const current = positionRef.current;
      const target = targetRef.current;
      const nextPosition = { x: current.x + (target.x - current.x) * FOLLOW_LERP, y: current.y + (target.y - current.y) * FOLLOW_LERP };
      positionRef.current = nextPosition;
      setPlayerPosition(nextPosition);

      if (!defeatedRef.current && runPhaseRef.current !== "victory" && timestamp - lastShotAtRef.current >= primaryProfile.intervalMs) {
        lastShotAtRef.current = timestamp;
        const nextBullets = primaryProfile.offsets.map((offset) => ({
          id: bulletIdRef.current++,
          x: nextPosition.x + offset,
          y: nextPosition.y - PLAYER_RADIUS,
          radius: primaryProfile.radius,
          damage: primaryProfile.damage,
        }));
        bulletsRef.current = [...bulletsRef.current, ...nextBullets];
        for (const bullet of nextBullets) pushEffect(bullet.x, bullet.y, "blue", 12);
      }

      if (!defeatedRef.current && runPhaseRef.current === "waves" && timestamp >= nextWaveSpawnAtRef.current) {
        const currentWave = WAVES[waveIndexRef.current];
        const spawn = currentWave.spawns[waveSpawnIndexRef.current];
        if (spawn) {
          enemiesRef.current = [...enemiesRef.current, createEnemy(arenaBounds, spawn, enemyIdRef.current++, timestamp)];
          waveSpawnIndexRef.current += 1;
          nextWaveSpawnAtRef.current = timestamp + spawn.delayMs;
        } else if (waveIndexRef.current < WAVES.length - 1) {
          waveIndexRef.current += 1;
          waveSpawnIndexRef.current = 0;
          nextWaveSpawnAtRef.current = timestamp + WAVE_PAUSE_MS;
          setWaveName(WAVES[waveIndexRef.current].name);
          triggerFlash(0.1);
        } else if (enemiesRef.current.length === 0) {
          runPhaseRef.current = "boss";
          bossRef.current = createBoss(arenaBounds, timestamp);
          setBoss(bossRef.current);
          setWaveName("Astra Nemesis");
          addShake(10);
          triggerFlash(0.18);
        }
      }

      bulletsRef.current = bulletsRef.current
        .map((bullet) => ({ ...bullet, y: bullet.y - BULLET_SPEED * deltaSeconds }))
        .filter((bullet) => bullet.y > -BULLET_DESPAWN_PADDING);

      const spawnedEnemyBullets: EnemyBullet[] = [];
      enemiesRef.current = enemiesRef.current
        .map((enemy) => {
          const movedEnemy = { ...enemy, age: enemy.age + deltaSeconds };
          movedEnemy.y += movedEnemy.speed * deltaSeconds;
          if (enemy.kind !== "drifter") {
            movedEnemy.x = clamp(movedEnemy.originX + Math.sin(movedEnemy.age * movedEnemy.swayFrequency) * movedEnemy.swayAmplitude, movedEnemy.radius + HORIZONTAL_MARGIN, arenaBounds.width - movedEnemy.radius - HORIZONTAL_MARGIN);
          }
          if (!defeatedRef.current && timestamp >= movedEnemy.fireAt) {
            if (movedEnemy.kind === "burst") {
              for (const angleOffset of [-0.28, 0, 0.28]) {
                const angle = Math.PI / 2 + angleOffset;
                spawnedEnemyBullets.push({ id: enemyBulletIdRef.current++, x: movedEnemy.x, y: movedEnemy.y + movedEnemy.radius * 0.8, vx: Math.cos(angle) * 230, vy: Math.sin(angle) * 230, radius: 7, hostile: "enemy" });
              }
            } else if (movedEnemy.kind === "sweeper") {
              const dx = nextPosition.x - movedEnemy.x;
              const dy = nextPosition.y - movedEnemy.y;
              const length = Math.max(Math.hypot(dx, dy), 1);
              spawnedEnemyBullets.push({ id: enemyBulletIdRef.current++, x: movedEnemy.x, y: movedEnemy.y + movedEnemy.radius * 0.8, vx: (dx / length) * 250, vy: (dy / length) * 250, radius: 6, hostile: "enemy" });
            } else {
              spawnedEnemyBullets.push({ id: enemyBulletIdRef.current++, x: movedEnemy.x, y: movedEnemy.y + movedEnemy.radius * 0.8, vx: 0, vy: 280, radius: 6, hostile: "enemy" });
            }
            movedEnemy.fireAt = timestamp + movedEnemy.fireInterval;
          }
          return movedEnemy;
        })
        .filter((enemy) => enemy.y < arenaBounds.height + ENEMY_DESPAWN_PADDING && enemy.hp > 0);

      if (bossRef.current && !defeatedRef.current && runPhaseRef.current === "boss") {
        const nextBoss = { ...bossRef.current, age: bossRef.current.age + deltaSeconds };
        if (!nextBoss.introDone) {
          nextBoss.y += 180 * deltaSeconds;
          if (nextBoss.y >= nextBoss.targetY) {
            nextBoss.y = nextBoss.targetY;
            nextBoss.introDone = true;
            nextBoss.fireAt = timestamp + 800;
            nextBoss.volleyAt = timestamp + 1400;
          }
        } else {
          nextBoss.x = arenaBounds.width / 2 + Math.sin(nextBoss.age * (nextBoss.phase === 1 ? 1.2 : 1.8)) * Math.min(120, arenaBounds.width * 0.22);
          nextBoss.y = nextBoss.targetY + Math.sin(nextBoss.age * 1.8) * 12;
          if (nextBoss.hp <= nextBoss.maxHp * 0.45) nextBoss.phase = 2;

          if (timestamp >= nextBoss.fireAt) {
            const spreadCount = nextBoss.phase === 1 ? 5 : 7;
            for (let index = 0; index < spreadCount; index += 1) {
              const angle = Math.PI / 2 + (index - (spreadCount - 1) / 2) * (nextBoss.phase === 1 ? 0.14 : 0.11);
              spawnedEnemyBullets.push({ id: enemyBulletIdRef.current++, x: nextBoss.x, y: nextBoss.y + nextBoss.radius * 0.7, vx: Math.cos(angle) * (nextBoss.phase === 1 ? 210 : 250), vy: Math.sin(angle) * (nextBoss.phase === 1 ? 210 : 250), radius: nextBoss.phase === 1 ? 8 : 9, hostile: "boss" });
            }
            nextBoss.fireAt = timestamp + (nextBoss.phase === 1 ? 1100 : 780);
            addShake(6);
          }

          if (timestamp >= nextBoss.volleyAt) {
            const dx = nextPosition.x - nextBoss.x;
            const dy = nextPosition.y - nextBoss.y;
            const length = Math.max(Math.hypot(dx, dy), 1);
            for (const offset of [-36, 0, 36]) {
              spawnedEnemyBullets.push({ id: enemyBulletIdRef.current++, x: nextBoss.x + offset, y: nextBoss.y + nextBoss.radius * 0.8, vx: (dx / length) * 300 + offset * 0.6, vy: (dy / length) * 300, radius: 7, hostile: "boss" });
            }
            nextBoss.volleyAt = timestamp + (nextBoss.phase === 1 ? 1650 : 1200);
            triggerFlash(nextBoss.phase === 2 ? 0.1 : 0.06);
          }
        }
        bossRef.current = nextBoss;
      }

      enemyBulletsRef.current = [...enemyBulletsRef.current, ...spawnedEnemyBullets]
        .map((bullet) => ({ ...bullet, x: bullet.x + bullet.vx * deltaSeconds, y: bullet.y + bullet.vy * deltaSeconds }))
        .filter((bullet) => bullet.x > -BULLET_DESPAWN_PADDING && bullet.x < arenaBounds.width + BULLET_DESPAWN_PADDING && bullet.y > -BULLET_DESPAWN_PADDING && bullet.y < arenaBounds.height + BULLET_DESPAWN_PADDING);

      const remainingBullets: PlayerBullet[] = [];
      const enemiesAfterHits = enemiesRef.current.map((enemy) => ({ ...enemy }));
      let bossAfterHits = bossRef.current ? { ...bossRef.current } : null;

      for (const bullet of bulletsRef.current) {
        const hitEnemy = enemiesAfterHits.find((enemy) => enemy.hp > 0 && distance(bullet.x, bullet.y, enemy.x, enemy.y) <= enemy.radius + bullet.radius);
        if (hitEnemy) {
          hitEnemy.hp -= bullet.damage;
          pushEffect(bullet.x, bullet.y, "blue", 24);
          continue;
        }
        if (bossAfterHits && distance(bullet.x, bullet.y, bossAfterHits.x, bossAfterHits.y) <= bossAfterHits.radius + bullet.radius) {
          bossAfterHits.hp = Math.max(0, bossAfterHits.hp - bullet.damage);
          pushEffect(bullet.x, bullet.y, "blue", 30);
          if (bossAfterHits.phase === 2) addShake(2);
          continue;
        }
        remainingBullets.push(bullet);
      }

      for (const enemy of enemiesAfterHits.filter((enemy) => enemy.hp <= 0)) {
        registerKill(enemy.scoreValue);
        pushEffect(enemy.x, enemy.y, "pink", enemy.radius * 2.7);
        addShake(6);
      }

      enemiesRef.current = enemiesAfterHits.filter((enemy) => enemy.hp > 0);
      bulletsRef.current = remainingBullets;

      if (bossAfterHits && bossAfterHits.hp <= 0) {
        registerKill(BOSS_SCORE_VALUE);
        pushEffect(bossAfterHits.x, bossAfterHits.y, "gold", bossAfterHits.radius * 3.4);
        addShake(20);
        triggerFlash(0.34);
        bossAfterHits = null;
        bossRef.current = null;
        runPhaseRef.current = "victory";
        setIsVictory(true);
        setWaveName("Boss Defeated");
        finalizeRun(true);
      } else {
        bossRef.current = bossAfterHits;
      }

      if (!defeatedRef.current && runPhaseRef.current !== "victory") {
        const touchingEnemy = enemiesRef.current.find((enemy) => distance(enemy.x, enemy.y, nextPosition.x, nextPosition.y) <= enemy.radius + PLAYER_RADIUS - 4);
        const touchingEnemyBullet = enemyBulletsRef.current.find((bullet) => distance(bullet.x, bullet.y, nextPosition.x, nextPosition.y) <= bullet.radius + PLAYER_RADIUS);
        const touchingBoss = bossRef.current && distance(bossRef.current.x, bossRef.current.y, nextPosition.x, nextPosition.y) <= bossRef.current.radius + PLAYER_RADIUS - 8;

        if ((touchingEnemy || touchingEnemyBullet || touchingBoss) && timestamp >= invulnerableUntilRef.current) {
          hpRef.current = Math.max(0, hpRef.current - 1);
          invulnerableUntilRef.current = timestamp + PLAYER_INVULNERABLE_MS;
          setPlayerHp(hpRef.current);
          setPlayerInvulnerable(true);
          pushEffect(nextPosition.x, nextPosition.y, "gold", 60);
          addShake(16);
          triggerFlash(0.28);
          if (touchingEnemyBullet) enemyBulletsRef.current = enemyBulletsRef.current.filter((bullet) => bullet.id !== touchingEnemyBullet.id);
          if (touchingEnemy) touchingEnemy.hp = 0;
          if (hpRef.current <= 0) {
            defeatedRef.current = true;
            setIsDefeated(true);
            finalizeRun(false);
          }
        }
      }

      effectsRef.current = effectsRef.current
        .map((effect) => ({ ...effect, life: effect.life - deltaSeconds, radius: effect.radius + ((effect.maxRadius - effect.radius) * deltaSeconds) / Math.max(effect.life, 0.1) }))
        .filter((effect) => effect.life > 0);

      setBullets(bulletsRef.current);
      setEnemyBullets(enemyBulletsRef.current);
      setEnemies(enemiesRef.current);
      setEffects(effectsRef.current);
      setBoss(bossRef.current);

      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (animationRef.current != null) window.cancelAnimationFrame(animationRef.current);
    };
  }, [addShake, arenaBounds, finalizeRun, playerInvulnerable, primaryProfile, pushEffect, registerKill, triggerFlash]);

  const updateTargetFromPointer = useCallback((clientX: number, clientY: number) => {
    const arena = arenaRef.current;
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const playable = getPlayableBounds(arenaBounds);
    targetRef.current = { x: clamp(clientX - rect.left, playable.minX, playable.maxX), y: clamp(clientY - rect.top, playable.minY, playable.maxY) };
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
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  return (
    <main className="screen shmup-slice-screen">
      <header className="shmup-slice-header">
        <div>
          <p className="shmup-slice-kicker">Astra Valkyries MVP</p>
          <h1>Premium Run Slice</h1>
          <p className="shmup-slice-copy">
            Clear the micro-waves, break Astra Nemesis, and manage evolving weapons instead of just surviving a rough prototype loop.
          </p>
        </div>

        <div className="shmup-hud">
          <p className="shmup-wave-label">{waveName}</p>
          <p className="shmup-score-label">Score {score.toString().padStart(5, "0")}</p>
          <p className="shmup-weapon-label">Primary {primaryProfile.name}</p>
          <div className="shmup-hp-bar">
            <div className="shmup-hp-fill" style={{ width: `${(playerHp / PLAYER_MAX_HP) * 100}%` }} />
          </div>
          <p className="shmup-hp-label">Hull {playerHp}/{PLAYER_MAX_HP}</p>
          <div className="shmup-secondary-meter-shell">
            <div className="shmup-secondary-meter-fill" style={{ width: `${secondaryRechargeProgress * 100}%` }} />
          </div>
          <button className="btn btn-secondary shmup-secondary-button" onClick={useSecondary} disabled={secondaryCharges <= 0 || isDefeated || isVictory}>
            Nova Pulse ({secondaryCharges})
          </button>
        </div>
      </header>

      <section
        ref={arenaRef}
        className={`shmup-slice-arena${boss ? " shmup-boss-active" : ""}`}
        style={{ transform: `translate(${shakeOffset.x}px, ${shakeOffset.y}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointerDrag}
        onPointerCancel={endPointerDrag}
        onPointerLeave={endPointerDrag}
      >
        <div className="shmup-slice-grid" aria-hidden="true" />
        <div className="shmup-slice-lower-zone" aria-hidden="true" />
        <div className="shmup-hit-flash" style={{ opacity: flashOpacity }} aria-hidden="true" />

        {boss && (
          <>
            <div className="shmup-boss-banner">Boss Encounter</div>
            <div className="shmup-boss-hp-shell">
              <div className="shmup-boss-hp-fill" style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }} />
            </div>
          </>
        )}

        {effects.map((effect) => (
          <div
            key={effect.id}
            className={`shmup-effect shmup-effect-${effect.color}`}
            style={{ width: effect.radius * 2, height: effect.radius * 2, opacity: effect.life / effect.maxLife, transform: `translate(${effect.x - effect.radius}px, ${effect.y - effect.radius}px)` }}
          />
        ))}

        {bullets.map((bullet) => (
          <div key={bullet.id} className="player-bullet" style={{ transform: `translate(${bullet.x - bullet.radius}px, ${bullet.y - 16}px)` }}>
            <div className="player-bullet-core" />
          </div>
        ))}

        {enemyBullets.map((bullet) => (
          <div key={bullet.id} className={`enemy-bullet enemy-bullet-${bullet.hostile}`} style={{ width: bullet.radius * 2, height: bullet.radius * 2, transform: `translate(${bullet.x - bullet.radius}px, ${bullet.y - bullet.radius}px)` }}>
            <div className="enemy-bullet-core" />
          </div>
        ))}

        {enemies.map((enemy) => (
          <div key={enemy.id} className={`enemy-drone enemy-drone-${enemy.kind}`} style={{ width: enemy.radius * 2, height: enemy.radius * 2, transform: `translate(${enemy.x - enemy.radius}px, ${enemy.y - enemy.radius}px)` }}>
            <div className="enemy-drone-core" />
            <div className="enemy-drone-wing enemy-drone-wing-left" />
            <div className="enemy-drone-wing enemy-drone-wing-right" />
            <div className="enemy-drone-hp">
              <div className="enemy-drone-hp-fill" style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
            </div>
          </div>
        ))}

        {boss && (
          <div className={`shmup-boss${boss.phase === 2 ? " shmup-boss-phase-two" : ""}`} style={{ width: boss.radius * 2, height: boss.radius * 2, transform: `translate(${boss.x - boss.radius}px, ${boss.y - boss.radius}px)` }}>
            <div className="shmup-boss-core" />
            <div className="shmup-boss-wing shmup-boss-wing-left" />
            <div className="shmup-boss-wing shmup-boss-wing-right" />
            <div className="shmup-boss-cannon" />
          </div>
        )}

        <div className={`player-ship${playerInvulnerable ? " player-ship-invulnerable" : ""}${isDefeated ? " player-ship-defeated" : ""}`} style={{ transform: `translate(${playerPosition.x - PLAYER_RADIUS}px, ${playerPosition.y - PLAYER_RADIUS}px)` }}>
          <div className="player-ship-core" />
          <div className="player-ship-wing player-ship-wing-left" />
          <div className="player-ship-wing player-ship-wing-right" />
          <div className="player-ship-engine" />
        </div>

        <button className="btn btn-primary shmup-fab-secondary" onClick={useSecondary} disabled={secondaryCharges <= 0 || isDefeated || isVictory}>
          Pulse {secondaryCharges}
        </button>

        {(isDefeated || isVictory) && summary && (
          <div className="shmup-overlay">
            <div className="shmup-overlay-card shmup-summary-card">
              <div className={`shmup-grade-badge shmup-grade-${summary.grade.toLowerCase()}`}>{summary.grade}</div>
              <h2>{isVictory ? "Boss Defeated" : "Run Ended"}</h2>
              <p>{isVictory ? "That feels like a real vertical slice now." : "Solid run, but there’s still room to sharpen the route."}</p>
              <div className="shmup-summary-grid">
                <div><span>Score</span><strong>{summary.score.toString().padStart(5, "0")}</strong></div>
                <div><span>Kills</span><strong>{summary.kills}</strong></div>
                <div><span>Time</span><strong>{formatTime(summary.survivalMs)}</strong></div>
                <div><span>Boss</span><strong>{summary.bossDefeated ? "Down" : "Alive"}</strong></div>
              </div>
              <button className="btn btn-primary" onClick={() => resetRun(arenaBounds)}>Restart Run</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
