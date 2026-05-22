import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import "./ShmupPlayScreen.css";

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
  strength: "pulse" | "twin" | "tri" | "lance" | "overdrive";
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

type EnemyKind = "scout" | "striker";

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

type BossPhase = 1 | 2 | 3;

type Boss = {
  x: number;
  y: number;
  targetY: number;
  radius: number;
  hp: number;
  maxHp: number;
  age: number;
  phase: BossPhase;
  introDone: boolean;
  phaseTransitionUntil: number;
  fanFireAt: number;
  aimedFireAt: number;
  sideVolleyAt: number;
};

type HitEffect = {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: "blue" | "pink" | "gold" | "crimson";
};

type WaveSpawn = {
  delayMs: number;
  lane: number;
  kind: EnemyKind;
  drift?: "none" | "left" | "right";
};

type Wave = {
  name: string;
  briefing: string;
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

type TelegraphState = {
  mode: "center" | "fan" | "mixed" | null;
  until: number;
};

const PLAYER_RADIUS = 26;
const PLAYER_MAX_HP = 5;
const PLAYER_INVULNERABLE_MS = 850;
const PLAYER_LANCE_MAX = 2;
const PLAYER_LANCE_RECHARGE_MS = 5200;
const OVERDRIVE_DURATION_MS = 3600;
const OVERDRIVE_COOLDOWN_MS = 14000;
const HORIZONTAL_MARGIN = 16;
const TOP_PLAY_AREA_RATIO = 0.42;
const TOP_MARGIN = 24;
const BOTTOM_MARGIN = 24;
const FOLLOW_LERP = 0.22;
const BULLET_SPEED = 780;
const BULLET_DESPAWN_PADDING = 40;
const ENEMY_DESPAWN_PADDING = 60;
const WAVE_PAUSE_MS = 1500;
const BOSS_SCORE_VALUE = 2000;
const TELEGRAPH_MS = 260;

const SHMUP_ASSET_BASE = "/assets/shmup";
const ASSET_HOOKS = {
  playerShip: `${SHMUP_ASSET_BASE}/player_ship_astra.png`,
  enemyScout: `${SHMUP_ASSET_BASE}/enemy_scout_null.png`,
  enemyStriker: `${SHMUP_ASSET_BASE}/enemy_striker_null.png`,
  bossNullSeraph: `${SHMUP_ASSET_BASE}/boss_null_seraph.png`,
  backgroundDeepSpace: `${SHMUP_ASSET_BASE}/background_deep_space.png`,
  backgroundNebulaLayer: `${SHMUP_ASSET_BASE}/background_nebula_layer.png`,
  backgroundOrbitalSilhouette: `${SHMUP_ASSET_BASE}/background_orbital_silhouette.png`,
  bulletPlayerEnergy: `${SHMUP_ASSET_BASE}/bullet_player_energy.png`,
  bulletEnemyNull: `${SHMUP_ASSET_BASE}/bullet_enemy_null.png`,
  pickupPowerCore: `${SHMUP_ASSET_BASE}/pickup_power_core.png`,
} as const;

const WAVES: Wave[] = [
  {
    name: "Mission 01: Null Incursion",
    briefing: "Straight formation wave",
    spawns: [
      { delayMs: 260, lane: 0.18, kind: "scout" },
      { delayMs: 120, lane: 0.34, kind: "scout" },
      { delayMs: 120, lane: 0.5, kind: "striker" },
      { delayMs: 120, lane: 0.66, kind: "scout" },
      { delayMs: 120, lane: 0.82, kind: "scout" },
      { delayMs: 540, lane: 0.5, kind: "striker" },
    ],
  },
  {
    name: "Mission 01: Null Incursion",
    briefing: "Diagonal sweep wave",
    spawns: [
      { delayMs: 240, lane: 0.16, kind: "scout", drift: "right" },
      { delayMs: 140, lane: 0.28, kind: "scout", drift: "right" },
      { delayMs: 140, lane: 0.4, kind: "scout", drift: "right" },
      { delayMs: 140, lane: 0.52, kind: "striker", drift: "right" },
      { delayMs: 180, lane: 0.64, kind: "scout", drift: "right" },
      { delayMs: 180, lane: 0.76, kind: "striker", drift: "right" },
    ],
  },
  {
    name: "Mission 01: Null Incursion",
    briefing: "Split left/right pressure wave",
    spawns: [
      { delayMs: 220, lane: 0.16, kind: "scout", drift: "left" },
      { delayMs: 110, lane: 0.84, kind: "scout", drift: "right" },
      { delayMs: 180, lane: 0.28, kind: "striker", drift: "left" },
      { delayMs: 110, lane: 0.72, kind: "striker", drift: "right" },
      { delayMs: 180, lane: 0.22, kind: "scout", drift: "left" },
      { delayMs: 110, lane: 0.78, kind: "scout", drift: "right" },
      { delayMs: 340, lane: 0.5, kind: "striker" },
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
  if (spawn.kind === "striker") {
    const x = laneToX(bounds, spawn.lane, 24);
    return {
      id,
      kind: spawn.kind,
      x,
      y: -34,
      originX: x,
      age: 0,
      radius: 24,
      hp: 5,
      maxHp: 5,
      speed: 118,
      fireAt: now + 900,
      fireInterval: 1450,
      scoreValue: 180,
      swayAmplitude: spawn.drift === "left" ? -46 : spawn.drift === "right" ? 46 : 0,
      swayFrequency: 1.2,
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
    speed: 178,
    fireAt: now + 1150,
    fireInterval: 1900,
    scoreValue: 90,
    swayAmplitude: spawn.drift === "left" ? -68 : spawn.drift === "right" ? 68 : 0,
    swayFrequency: 1.7,
  };
}

function createBoss(bounds: ArenaBounds, now: number): Boss {
  return {
    x: bounds.width / 2,
    y: -160,
    targetY: Math.max(108, bounds.height * 0.18),
    radius: 68,
    hp: 100,
    maxHp: 100,
    age: 0,
    phase: 1,
    introDone: false,
    phaseTransitionUntil: 0,
    fanFireAt: now + 1200,
    aimedFireAt: now + 1700,
    sideVolleyAt: now + 2400,
  };
}

function getPrimaryProfile(score: number, overdrive: boolean) {
  if (overdrive) {
    return {
      name: "Valkyrie Overdrive",
      intervalMs: 92,
      offsets: [-24, -10, 0, 10, 24],
      damage: 1,
      radius: 4,
      strength: "overdrive" as const,
    };
  }
  if (score >= 3600) {
    return {
      name: "Astra Tri-Lance",
      intervalMs: 132,
      offsets: [-18, 0, 18],
      damage: 1,
      radius: 4,
      strength: "tri" as const,
    };
  }
  if (score >= 1400) {
    return {
      name: "Twin Lance",
      intervalMs: 154,
      offsets: [-10, 10],
      damage: 1,
      radius: 4,
      strength: "twin" as const,
    };
  }
  return {
    name: "Pulse Lance",
    intervalMs: 178,
    offsets: [0],
    damage: 1,
    radius: 4,
    strength: "pulse" as const,
  };
}

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function computeGrade(summary: Omit<RunSummary, "grade">) {
  if (summary.bossDefeated && summary.score >= 6200) return "S";
  if (summary.bossDefeated) return "A";
  if (summary.score >= 3200) return "B";
  if (summary.score >= 1500) return "C";
  return "D";
}

export default function ShmupPlayScreen() {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number; at: number } | null>(null);
  const tapTimesRef = useRef<number[]>([]);
  const pendingDoubleTapTimeoutRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const lastShotAtRef = useRef(0);
  const nextLanceChargeAtRef = useRef(0);
  const overdriveUntilRef = useRef(0);
  const nextOverdriveReadyAtRef = useRef(0);
  const bulletIdRef = useRef(0);
  const enemyBulletIdRef = useRef(0);
  const enemyIdRef = useRef(0);
  const effectIdRef = useRef(0);
  const waveIndexRef = useRef(0);
  const waveSpawnIndexRef = useRef(0);
  const nextWaveSpawnAtRef = useRef(0);
  const runPhaseRef = useRef<RunPhase>("waves");
  const bossRef = useRef<Boss | null>(null);
  const telegraphRef = useRef<TelegraphState>({ mode: null, until: 0 });
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
  const lanceChargesRef = useRef(PLAYER_LANCE_MAX);
  const defeatedRef = useRef(false);

  const [arenaBounds, setArenaBounds] = useState<ArenaBounds>({ width: 390, height: 844 });
  const [playerPosition, setPlayerPosition] = useState<PlayerPosition>(() => createStartPosition({ width: 390, height: 844 }));
  const [bullets, setBullets] = useState<PlayerBullet[]>([]);
  const [enemyBullets, setEnemyBullets] = useState<EnemyBullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [effects, setEffects] = useState<HitEffect[]>([]);
  const [boss, setBoss] = useState<Boss | null>(null);
  const [telegraph, setTelegraph] = useState<TelegraphState>({ mode: null, until: 0 });
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP);
  const [playerInvulnerable, setPlayerInvulnerable] = useState(false);
  const [isDefeated, setIsDefeated] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [lanceCharges, setLanceCharges] = useState(PLAYER_LANCE_MAX);
  const [waveName, setWaveName] = useState(WAVES[0].name);
  const [waveBriefing, setWaveBriefing] = useState(WAVES[0].briefing);
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [overdriveActive, setOverdriveActive] = useState(false);

  const primaryProfile = getPrimaryProfile(score, overdriveActive);
  const lanceRechargeProgress =
    lanceCharges >= PLAYER_LANCE_MAX || nextLanceChargeAtRef.current === 0
      ? 1
      : clamp(1 - (nextLanceChargeAtRef.current - performance.now()) / PLAYER_LANCE_RECHARGE_MS, 0, 1);
  const overdriveReady = nextOverdriveReadyAtRef.current === 0 || performance.now() >= nextOverdriveReadyAtRef.current;
  const overdriveCooldownProgress =
    overdriveReady || nextOverdriveReadyAtRef.current === 0
      ? 1
      : clamp(1 - (nextOverdriveReadyAtRef.current - performance.now()) / OVERDRIVE_COOLDOWN_MS, 0, 1);

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

  const refreshTelegraph = useCallback((mode: TelegraphState["mode"], until: number) => {
    telegraphRef.current = { mode, until };
    setTelegraph(telegraphRef.current);
  }, []);

  const fireAstraLance = useCallback(() => {
    if (defeatedRef.current || runPhaseRef.current === "victory" || lanceChargesRef.current <= 0) return;
    lanceChargesRef.current -= 1;
    setLanceCharges(lanceChargesRef.current);
    if (lanceChargesRef.current < PLAYER_LANCE_MAX && nextLanceChargeAtRef.current === 0) {
      nextLanceChargeAtRef.current = performance.now() + PLAYER_LANCE_RECHARGE_MS;
    }

    const centerX = positionRef.current.x;
    const lanceBullets: PlayerBullet[] = [
      { id: bulletIdRef.current++, x: centerX - 12, y: positionRef.current.y - PLAYER_RADIUS, radius: 5, damage: 3, strength: "lance" },
      { id: bulletIdRef.current++, x: centerX + 12, y: positionRef.current.y - PLAYER_RADIUS, radius: 5, damage: 3, strength: "lance" },
      { id: bulletIdRef.current++, x: centerX, y: positionRef.current.y - PLAYER_RADIUS - 10, radius: 6, damage: 5, strength: "lance" },
    ];
    bulletsRef.current = [...bulletsRef.current, ...lanceBullets];
    pushEffect(centerX, positionRef.current.y - PLAYER_RADIUS, "blue", 54);
    addShake(10);
    triggerFlash(0.14);
    setBullets(bulletsRef.current);
  }, [addShake, pushEffect, triggerFlash]);

  const activateOverdrive = useCallback(() => {
    if (defeatedRef.current || runPhaseRef.current === "victory" || !overdriveReady) return;
    overdriveUntilRef.current = performance.now() + OVERDRIVE_DURATION_MS;
    nextOverdriveReadyAtRef.current = performance.now() + OVERDRIVE_COOLDOWN_MS;
    setOverdriveActive(true);
    pushEffect(positionRef.current.x, positionRef.current.y, "gold", 120);
    addShake(14);
    triggerFlash(0.22);
  }, [addShake, overdriveReady, pushEffect, triggerFlash]);

  const resetRun = useCallback((bounds: ArenaBounds) => {
    const start = createStartPosition(bounds);
    positionRef.current = start;
    targetRef.current = start;
    bulletsRef.current = [];
    enemyBulletsRef.current = [];
    enemiesRef.current = [];
    effectsRef.current = [];
    bossRef.current = null;
    telegraphRef.current = { mode: null, until: 0 };
    hpRef.current = PLAYER_MAX_HP;
    invulnerableUntilRef.current = 0;
    scoreRef.current = 0;
    killsRef.current = 0;
    lanceChargesRef.current = PLAYER_LANCE_MAX;
    nextLanceChargeAtRef.current = 0;
    overdriveUntilRef.current = 0;
    nextOverdriveReadyAtRef.current = 0;
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
    tapTimesRef.current = [];
    if (pendingDoubleTapTimeoutRef.current != null) {
      window.clearTimeout(pendingDoubleTapTimeoutRef.current);
      pendingDoubleTapTimeoutRef.current = null;
    }
    setPlayerPosition(start);
    setBullets([]);
    setEnemyBullets([]);
    setEnemies([]);
    setEffects([]);
    setBoss(null);
    setTelegraph({ mode: null, until: 0 });
    setPlayerHp(PLAYER_MAX_HP);
    setPlayerInvulnerable(false);
    setIsDefeated(false);
    setIsVictory(false);
    setScore(0);
    setKills(0);
    setLanceCharges(PLAYER_LANCE_MAX);
    setWaveName(WAVES[0].name);
    setWaveBriefing(WAVES[0].briefing);
    setShakeOffset({ x: 0, y: 0 });
    setFlashOpacity(0);
    setSummary(null);
    setOverdriveActive(false);
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
    return () => {
      if (pendingDoubleTapTimeoutRef.current != null) {
        window.clearTimeout(pendingDoubleTapTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        fireAstraLance();
      }
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        event.preventDefault();
        activateOverdrive();
      }
      if (event.code === "KeyR" && (isDefeated || isVictory)) {
        resetRun(arenaBounds);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activateOverdrive, arenaBounds, fireAstraLance, isDefeated, isVictory, resetRun]);

  useEffect(() => {
    const tick = (timestamp: number) => {
      const previousTime = lastFrameTimeRef.current ?? timestamp;
      const deltaSeconds = Math.min((timestamp - previousTime) / 1000, 0.05);
      lastFrameTimeRef.current = timestamp;

      const nowOverdrive = timestamp < overdriveUntilRef.current;
      if (nowOverdrive !== overdriveActive) {
        setOverdriveActive(nowOverdrive);
      }

      const currentTelegraph = timestamp < telegraphRef.current.until ? telegraphRef.current : { mode: null, until: 0 };
      if (currentTelegraph.mode !== telegraph.mode || currentTelegraph.until !== telegraph.until) {
        telegraphRef.current = currentTelegraph;
        setTelegraph(currentTelegraph);
      }

      const currentlyInvulnerable = timestamp < invulnerableUntilRef.current;
      if (currentlyInvulnerable !== playerInvulnerable) setPlayerInvulnerable(currentlyInvulnerable);

      if (lanceChargesRef.current < PLAYER_LANCE_MAX && nextLanceChargeAtRef.current > 0 && timestamp >= nextLanceChargeAtRef.current) {
        lanceChargesRef.current += 1;
        setLanceCharges(lanceChargesRef.current);
        nextLanceChargeAtRef.current = lanceChargesRef.current < PLAYER_LANCE_MAX ? timestamp + PLAYER_LANCE_RECHARGE_MS : 0;
      }

      shakeRef.current = Math.max(0, shakeRef.current - deltaSeconds * 34);
      flashRef.current = Math.max(0, flashRef.current - deltaSeconds * 1.8);
      setShakeOffset({
        x: shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0,
        y: shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0,
      });
      setFlashOpacity(flashRef.current);

      const current = positionRef.current;
      const target = targetRef.current;
      const nextPosition = {
        x: current.x + (target.x - current.x) * FOLLOW_LERP,
        y: current.y + (target.y - current.y) * FOLLOW_LERP,
      };
      positionRef.current = nextPosition;
      setPlayerPosition(nextPosition);

      const activePrimary = getPrimaryProfile(scoreRef.current, nowOverdrive);
      if (!defeatedRef.current && runPhaseRef.current !== "victory" && timestamp - lastShotAtRef.current >= activePrimary.intervalMs) {
        lastShotAtRef.current = timestamp;
        const nextBullets = activePrimary.offsets.map((offset) => ({
          id: bulletIdRef.current++,
          x: nextPosition.x + offset,
          y: nextPosition.y - PLAYER_RADIUS,
          radius: activePrimary.radius,
          damage: activePrimary.damage,
          strength: activePrimary.strength,
        }));
        bulletsRef.current = [...bulletsRef.current, ...nextBullets];
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
          setWaveBriefing(WAVES[waveIndexRef.current].briefing);
          triggerFlash(0.08);
        } else if (enemiesRef.current.length === 0) {
          runPhaseRef.current = "boss";
          bossRef.current = createBoss(arenaBounds, timestamp);
          setBoss(bossRef.current);
          setWaveName("Boss: Null Seraph Prototype");
          setWaveBriefing("Dark ceremonial prototype entering theater");
          addShake(10);
          triggerFlash(0.16);
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
          if (enemy.swayAmplitude !== 0) {
            movedEnemy.x = clamp(
              movedEnemy.originX + Math.sin(movedEnemy.age * movedEnemy.swayFrequency) * movedEnemy.swayAmplitude,
              movedEnemy.radius + HORIZONTAL_MARGIN,
              arenaBounds.width - movedEnemy.radius - HORIZONTAL_MARGIN,
            );
          }

          if (!defeatedRef.current && timestamp >= movedEnemy.fireAt) {
            if (movedEnemy.kind === "striker") {
              const dx = nextPosition.x - movedEnemy.x;
              const dy = nextPosition.y - movedEnemy.y;
              const length = Math.max(Math.hypot(dx, dy), 1);
              spawnedEnemyBullets.push({
                id: enemyBulletIdRef.current++,
                x: movedEnemy.x,
                y: movedEnemy.y + movedEnemy.radius * 0.86,
                vx: (dx / length) * 250,
                vy: (dy / length) * 250,
                radius: 7,
                hostile: "enemy",
              });
            } else {
              spawnedEnemyBullets.push({
                id: enemyBulletIdRef.current++,
                x: movedEnemy.x,
                y: movedEnemy.y + movedEnemy.radius * 0.84,
                vx: 0,
                vy: 290,
                radius: 6,
                hostile: "enemy",
              });
            }
            movedEnemy.fireAt = timestamp + movedEnemy.fireInterval;
          }
          return movedEnemy;
        })
        .filter((enemy) => enemy.y < arenaBounds.height + ENEMY_DESPAWN_PADDING && enemy.hp > 0);

      if (bossRef.current && !defeatedRef.current && runPhaseRef.current === "boss") {
        const nextBoss = { ...bossRef.current, age: bossRef.current.age + deltaSeconds };
        const phase = nextBoss.hp <= nextBoss.maxHp * 0.3 ? 3 : nextBoss.hp <= nextBoss.maxHp * 0.62 ? 2 : 1;
        if (phase !== nextBoss.phase) {
          nextBoss.phase = phase;
          nextBoss.phaseTransitionUntil = timestamp + 620;
          refreshTelegraph(phase === 2 ? "fan" : "mixed", timestamp + 620);
          addShake(18);
          triggerFlash(0.24);
        }

        if (!nextBoss.introDone) {
          nextBoss.y += 180 * deltaSeconds;
          if (nextBoss.y >= nextBoss.targetY) {
            nextBoss.y = nextBoss.targetY;
            nextBoss.introDone = true;
            nextBoss.fanFireAt = timestamp + 900;
            nextBoss.aimedFireAt = timestamp + 1500;
            nextBoss.sideVolleyAt = timestamp + 2200;
          }
        } else {
          nextBoss.x = arenaBounds.width / 2 + Math.sin(nextBoss.age * (nextBoss.phase === 1 ? 1.1 : nextBoss.phase === 2 ? 1.7 : 2.3)) * Math.min(124, arenaBounds.width * 0.22);
          nextBoss.y = nextBoss.targetY + Math.sin(nextBoss.age * 1.8) * 12;

          if (timestamp >= nextBoss.fanFireAt - TELEGRAPH_MS && timestamp < nextBoss.fanFireAt) {
            refreshTelegraph(nextBoss.phase === 1 ? "center" : "fan", nextBoss.fanFireAt);
          }
          if (timestamp >= nextBoss.aimedFireAt - TELEGRAPH_MS && timestamp < nextBoss.aimedFireAt) {
            refreshTelegraph("center", nextBoss.aimedFireAt);
          }
          if (nextBoss.phase === 3 && timestamp >= nextBoss.sideVolleyAt - TELEGRAPH_MS && timestamp < nextBoss.sideVolleyAt) {
            refreshTelegraph("mixed", nextBoss.sideVolleyAt);
          }

          if (timestamp >= nextBoss.fanFireAt) {
            const spreadCount = nextBoss.phase === 1 ? 5 : nextBoss.phase === 2 ? 7 : 8;
            const spreadGap = nextBoss.phase === 1 ? 0.14 : nextBoss.phase === 2 ? 0.12 : 0.1;
            for (let index = 0; index < spreadCount; index += 1) {
              const angle = Math.PI / 2 + (index - (spreadCount - 1) / 2) * spreadGap;
              spawnedEnemyBullets.push({
                id: enemyBulletIdRef.current++,
                x: nextBoss.x,
                y: nextBoss.y + nextBoss.radius * 0.72,
                vx: Math.cos(angle) * (nextBoss.phase === 1 ? 220 : nextBoss.phase === 2 ? 250 : 270),
                vy: Math.sin(angle) * (nextBoss.phase === 1 ? 220 : nextBoss.phase === 2 ? 250 : 270),
                radius: nextBoss.phase === 3 ? 9 : 8,
                hostile: "boss",
              });
            }
            nextBoss.fanFireAt = timestamp + (nextBoss.phase === 1 ? 1200 : nextBoss.phase === 2 ? 860 : 760);
            addShake(8);
          }

          if (timestamp >= nextBoss.aimedFireAt) {
            const dx = nextPosition.x - nextBoss.x;
            const dy = nextPosition.y - nextBoss.y;
            const length = Math.max(Math.hypot(dx, dy), 1);
            const aimedCount = nextBoss.phase === 3 ? 3 : 1;
            for (let index = 0; index < aimedCount; index += 1) {
              const sideOffset = aimedCount === 1 ? 0 : index === 0 ? -18 : index === 1 ? 0 : 18;
              spawnedEnemyBullets.push({
                id: enemyBulletIdRef.current++,
                x: nextBoss.x + sideOffset,
                y: nextBoss.y + nextBoss.radius * 0.74,
                vx: (dx / length) * 320 + sideOffset * 0.5,
                vy: (dy / length) * 320,
                radius: 7,
                hostile: "boss",
              });
            }
            nextBoss.aimedFireAt = timestamp + (nextBoss.phase === 1 ? 1650 : nextBoss.phase === 2 ? 1320 : 980);
            triggerFlash(nextBoss.phase === 3 ? 0.1 : 0.06);
          }

          if (nextBoss.phase === 3 && timestamp >= nextBoss.sideVolleyAt) {
            for (const offset of [-42, 42]) {
              for (const angleOffset of [-0.22, 0.22]) {
                const angle = Math.PI / 2 + angleOffset;
                spawnedEnemyBullets.push({
                  id: enemyBulletIdRef.current++,
                  x: nextBoss.x + offset,
                  y: nextBoss.y + nextBoss.radius * 0.54,
                  vx: Math.cos(angle) * 260 + offset * 0.16,
                  vy: Math.sin(angle) * 260,
                  radius: 7,
                  hostile: "boss",
                });
              }
            }
            nextBoss.sideVolleyAt = timestamp + 1500;
          }
        }
        bossRef.current = nextBoss;
      }

      enemyBulletsRef.current = [...enemyBulletsRef.current, ...spawnedEnemyBullets]
        .map((bullet) => ({ ...bullet, x: bullet.x + bullet.vx * deltaSeconds, y: bullet.y + bullet.vy * deltaSeconds }))
        .filter(
          (bullet) =>
            bullet.x > -BULLET_DESPAWN_PADDING &&
            bullet.x < arenaBounds.width + BULLET_DESPAWN_PADDING &&
            bullet.y > -BULLET_DESPAWN_PADDING &&
            bullet.y < arenaBounds.height + BULLET_DESPAWN_PADDING,
        );

      const remainingBullets: PlayerBullet[] = [];
      const enemiesAfterHits = enemiesRef.current.map((enemy) => ({ ...enemy }));
      let bossAfterHits = bossRef.current ? { ...bossRef.current } : null;

      for (const bullet of bulletsRef.current) {
        const hitEnemy = enemiesAfterHits.find((enemy) => enemy.hp > 0 && distance(bullet.x, bullet.y, enemy.x, enemy.y) <= enemy.radius + bullet.radius);
        if (hitEnemy) {
          hitEnemy.hp -= bullet.damage;
          pushEffect(bullet.x, bullet.y, "blue", bullet.strength === "lance" ? 36 : 24);
          continue;
        }
        if (bossAfterHits && distance(bullet.x, bullet.y, bossAfterHits.x, bossAfterHits.y) <= bossAfterHits.radius + bullet.radius) {
          bossAfterHits.hp = Math.max(0, bossAfterHits.hp - bullet.damage);
          pushEffect(bullet.x, bullet.y, bullet.strength === "overdrive" ? "gold" : "blue", bullet.strength === "lance" ? 42 : 28);
          if (bossAfterHits.phase >= 2) addShake(3);
          continue;
        }
        remainingBullets.push(bullet);
      }

      for (const enemy of enemiesAfterHits.filter((enemy) => enemy.hp <= 0)) {
        registerKill(enemy.scoreValue);
        pushEffect(enemy.x, enemy.y, "crimson", enemy.radius * 2.7);
        addShake(8);
      }

      enemiesRef.current = enemiesAfterHits.filter((enemy) => enemy.hp > 0);
      bulletsRef.current = remainingBullets;

      if (bossAfterHits && bossAfterHits.hp <= 0) {
        registerKill(BOSS_SCORE_VALUE);
        pushEffect(bossAfterHits.x, bossAfterHits.y, "gold", bossAfterHits.radius * 3.5);
        addShake(22);
        triggerFlash(0.34);
        bossAfterHits = null;
        bossRef.current = null;
        runPhaseRef.current = "victory";
        refreshTelegraph(null, 0);
        setIsVictory(true);
        setWaveName("Boss: Null Seraph Prototype");
        setWaveBriefing("Prototype shattered, corridor secured");
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
          if (touchingEnemyBullet) {
            enemyBulletsRef.current = enemyBulletsRef.current.filter((bullet) => bullet.id !== touchingEnemyBullet.id);
          }
          if (hpRef.current <= 0) {
            defeatedRef.current = true;
            setIsDefeated(true);
            finalizeRun(false);
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
      setBoss(bossRef.current);

      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (animationRef.current != null) window.cancelAnimationFrame(animationRef.current);
    };
  }, [
    addShake,
    arenaBounds,
    finalizeRun,
    overdriveActive,
    playerInvulnerable,
    pushEffect,
    refreshTelegraph,
    registerKill,
    telegraph.mode,
    telegraph.until,
    triggerFlash,
  ]);

  const updateTargetFromPointer = useCallback((clientX: number, clientY: number) => {
    const arena = arenaRef.current;
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const playable = getPlayableBounds(arenaBounds);
    targetRef.current = {
      x: clamp(clientX - rect.left, playable.minX, playable.maxX),
      y: clamp(clientY - rect.top, playable.minY, playable.maxY),
    };
  }, [arenaBounds]);

  const registerTapGesture = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current = [...tapTimesRef.current.filter((time) => now - time < 520), now];

    if (tapTimesRef.current.length >= 3) {
      if (pendingDoubleTapTimeoutRef.current != null) {
        window.clearTimeout(pendingDoubleTapTimeoutRef.current);
        pendingDoubleTapTimeoutRef.current = null;
      }
      tapTimesRef.current = [];
      activateOverdrive();
      return;
    }

    if (tapTimesRef.current.length === 2) {
      if (pendingDoubleTapTimeoutRef.current != null) {
        window.clearTimeout(pendingDoubleTapTimeoutRef.current);
      }
      pendingDoubleTapTimeoutRef.current = window.setTimeout(() => {
        fireAstraLance();
        pendingDoubleTapTimeoutRef.current = null;
        tapTimesRef.current = [];
      }, 180);
    }
  }, [activateOverdrive, fireAstraLance]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    dragPointerIdRef.current = event.pointerId;
    pointerDownRef.current = { x: event.clientX, y: event.clientY, at: performance.now() };
    event.currentTarget.setPointerCapture(event.pointerId);
    updateTargetFromPointer(event.clientX, event.clientY);
  }, [updateTargetFromPointer]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    updateTargetFromPointer(event.clientX, event.clientY);
  }, [updateTargetFromPointer]);

  const endPointerDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;

    const down = pointerDownRef.current;
    const moved = down ? distance(down.x, down.y, event.clientX, event.clientY) : 999;
    const heldMs = down ? performance.now() - down.at : 999;
    if (moved < 18 && heldMs < 260) {
      registerTapGesture();
    }

    dragPointerIdRef.current = null;
    pointerDownRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, [registerTapGesture]);

  return (
    <main className="screen shmup-slice-screen premium-shmup-screen">
      <header className="shmup-slice-header">
        <div>
          <p className="shmup-slice-kicker">Astra Valkyries, premium anime sci-fi shmup slice</p>
          <h1>Mission 01, Null Incursion</h1>
          <p className="shmup-slice-copy">
            Clear disciplined Null formations, pierce the corridor with Astra Lance, and trigger Valkyrie Overdrive when the screen turns dangerous.
          </p>
        </div>

        <div className="shmup-hud">
          <p className="shmup-wave-label">{waveName}</p>
          <p className="shmup-briefing-label">{waveBriefing}</p>
          <p className="shmup-score-label">Score {score.toString().padStart(5, "0")}</p>
          <p className="shmup-weapon-label">Primary {primaryProfile.name}</p>
          <div className="shmup-hp-bar">
            <div className="shmup-hp-fill" style={{ width: `${(playerHp / PLAYER_MAX_HP) * 100}%` }} />
          </div>
          <p className="shmup-hp-label">Hull {playerHp}/{PLAYER_MAX_HP}</p>
          <div className="shmup-secondary-meter-shell">
            <div className="shmup-secondary-meter-fill" style={{ width: `${lanceRechargeProgress * 100}%` }} />
          </div>
          <button className="btn btn-secondary shmup-secondary-button" onClick={fireAstraLance} disabled={lanceCharges <= 0 || isDefeated || isVictory}>
            Astra Lance ({lanceCharges})
          </button>
          <div className="shmup-overdrive-row">
            <div className="shmup-overdrive-shell">
              <div className="shmup-overdrive-fill" style={{ width: `${overdriveCooldownProgress * 100}%` }} />
            </div>
            <span className={`shmup-overdrive-label${overdriveActive ? " is-live" : ""}`}>
              {overdriveActive ? "Valkyrie Overdrive Live" : overdriveReady ? "Valkyrie Overdrive Ready" : "Valkyrie Overdrive Cooling"}
            </span>
          </div>
        </div>
      </header>

      <section
        ref={arenaRef}
        className={`shmup-slice-arena premium-shmup-arena${boss ? " shmup-boss-active" : ""}${overdriveActive ? " overdrive-live" : ""}`}
        style={{
          transform: `translate(${shakeOffset.x}px, ${shakeOffset.y}px)`,
          ["--asset-player-ship" as string]: `url(${ASSET_HOOKS.playerShip})`,
          ["--asset-enemy-scout" as string]: `url(${ASSET_HOOKS.enemyScout})`,
          ["--asset-enemy-striker" as string]: `url(${ASSET_HOOKS.enemyStriker})`,
          ["--asset-boss-null-seraph" as string]: `url(${ASSET_HOOKS.bossNullSeraph})`,
          ["--asset-background-deep-space" as string]: `url(${ASSET_HOOKS.backgroundDeepSpace})`,
          ["--asset-background-nebula-layer" as string]: `url(${ASSET_HOOKS.backgroundNebulaLayer})`,
          ["--asset-background-orbital-silhouette" as string]: `url(${ASSET_HOOKS.backgroundOrbitalSilhouette})`,
          ["--asset-bullet-player-energy" as string]: `url(${ASSET_HOOKS.bulletPlayerEnergy})`,
          ["--asset-bullet-enemy-null" as string]: `url(${ASSET_HOOKS.bulletEnemyNull})`,
        } as React.CSSProperties}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointerDrag}
        onPointerCancel={endPointerDrag}
        onPointerLeave={endPointerDrag}
      >
        <div className="shmup-bg-layer shmup-bg-deep-space" aria-hidden="true" />
        <div className="shmup-bg-layer shmup-bg-nebula" aria-hidden="true" />
        <div className="shmup-bg-layer shmup-bg-grid" aria-hidden="true" />
        <div className="shmup-bg-layer shmup-bg-orbitals" aria-hidden="true" />
        <div className="shmup-bg-layer shmup-bg-stars" aria-hidden="true" />
        <div className="shmup-slice-lower-zone" aria-hidden="true" />
        <div className="shmup-hit-flash" style={{ opacity: flashOpacity }} aria-hidden="true" />

        {boss && (
          <>
            <div className="shmup-boss-banner">Boss Encounter, Null Seraph Prototype</div>
            <div className="shmup-boss-hp-shell">
              <div className="shmup-boss-hp-fill" style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }} />
            </div>
          </>
        )}

        {telegraph.mode && (
          <div className={`shmup-boss-telegraph telegraph-${telegraph.mode}`} aria-hidden="true">
            <span className="telegraph-core" />
            <span className="telegraph-wing telegraph-wing-left" />
            <span className="telegraph-wing telegraph-wing-right" />
          </div>
        )}

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
          <div
            key={bullet.id}
            className={`player-bullet player-bullet-${bullet.strength}`}
            style={{ transform: `translate(${bullet.x - bullet.radius}px, ${bullet.y - 18}px)` }}
          >
            <div className="player-bullet-core" />
          </div>
        ))}

        {enemyBullets.map((bullet) => (
          <div
            key={bullet.id}
            className={`enemy-bullet enemy-bullet-${bullet.hostile}`}
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
            <div className="enemy-drone-emitter" />
            <div className="enemy-drone-hp">
              <div className="enemy-drone-hp-fill" style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
            </div>
          </div>
        ))}

        {boss && (
          <div
            className={`shmup-boss${boss.phase === 2 ? " shmup-boss-phase-two" : ""}${boss.phase === 3 ? " shmup-boss-phase-three" : ""}`}
            style={{
              width: boss.radius * 2,
              height: boss.radius * 2,
              transform: `translate(${boss.x - boss.radius}px, ${boss.y - boss.radius}px)`,
            }}
          >
            <div className="shmup-boss-core" />
            <div className="shmup-boss-wing shmup-boss-wing-left" />
            <div className="shmup-boss-wing shmup-boss-wing-right" />
            <div className="shmup-boss-spine" />
            <div className="shmup-boss-cannon" />
            <div className="shmup-boss-weak-core" />
            <div className="shmup-boss-emitter shmup-boss-emitter-left" />
            <div className="shmup-boss-emitter shmup-boss-emitter-right" />
          </div>
        )}

        <div
          className={`player-ship${playerInvulnerable ? " player-ship-invulnerable" : ""}${isDefeated ? " player-ship-defeated" : ""}${overdriveActive ? " player-ship-overdrive" : ""}`}
          style={{ transform: `translate(${playerPosition.x - PLAYER_RADIUS}px, ${playerPosition.y - PLAYER_RADIUS}px)` }}
        >
          <div className="player-ship-core" />
          <div className="player-ship-wing player-ship-wing-left" />
          <div className="player-ship-wing player-ship-wing-right" />
          <div className="player-ship-cannon player-ship-cannon-left" />
          <div className="player-ship-cannon player-ship-cannon-right" />
          <div className="player-ship-engine" />
          <div className="player-ship-engine player-ship-engine-secondary" />
        </div>

        <div className="shmup-mobile-actions">
          <button className="btn btn-secondary shmup-fab-secondary" onClick={fireAstraLance} disabled={lanceCharges <= 0 || isDefeated || isVictory}>
            Astra Lance
            <span>{lanceCharges}</span>
          </button>
          <button className="btn btn-primary shmup-fab-overdrive" onClick={activateOverdrive} disabled={!overdriveReady || isDefeated || isVictory}>
            Overdrive
          </button>
        </div>

        {(isDefeated || isVictory) && summary && (
          <div className="shmup-overlay">
            <div className="shmup-overlay-card shmup-summary-card">
              <div className={`shmup-grade-badge shmup-grade-${summary.grade.toLowerCase()}`}>{summary.grade}</div>
              <h2>{isVictory ? "Null Seraph Prototype Broken" : "Valkyrie Frame Lost"}</h2>
              <p>
                {isVictory
                  ? "Mission 01 is clear. The route finally feels like Astra instead of a placeholder arena."
                  : "The corridor held, but the Null line still has teeth. Reset and tighten the route."}
              </p>
              <div className="shmup-summary-grid">
                <div><span>Score</span><strong>{summary.score.toString().padStart(5, "0")}</strong></div>
                <div><span>Kills</span><strong>{summary.kills}</strong></div>
                <div><span>Time</span><strong>{formatTime(summary.survivalMs)}</strong></div>
                <div><span>Boss</span><strong>{summary.bossDefeated ? "Down" : "Standing"}</strong></div>
              </div>
              <button className="btn btn-primary" onClick={() => resetRun(arenaBounds)}>Restart Mission</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
