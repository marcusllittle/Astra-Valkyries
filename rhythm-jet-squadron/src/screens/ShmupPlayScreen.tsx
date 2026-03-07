/**
 * ShmupPlayScreen - Endless arcade shooter mode with pilot/outfit modifiers.
 */

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { resolveAssetUrl } from "../lib/assetUrl";
import { BASE_SHMUP_HP, buildShmupLoadout } from "../lib/loadout";
import { getSelectedOutfitKit } from "../lib/outfitKits";
import { passiveName, primaryName, secondaryName } from "../lib/kitNames";
import {
  SHMUP_BALANCE,
  resolvePrimaryKey,
  resolveSecondaryKey,
  sanitizePassiveKeys,
  type ShmupPassiveKey,
  type ShmupPrimaryKey,
  type ShmupSecondaryKey,
} from "../lib/shmupBalance";
import { gradeShmupRun, type ShmupRunResult } from "../lib/shmupResults";
import {
  getPrimaryFireInterval,
  spawnPrimaryShots,
} from "../lib/shmupWeapons";
import {
  getShmupMapById,
  getShmupMapForShip,
  type EnemyPattern,
  type ShmupMap,
  type ShmupWaveEnemy,
} from "../lib/shmupWaves";
import type {
  Outfit,
  OwnedOutfit,
  Pilot,
  ShmupKit,
  Ship,
  ShmupGameResult,
} from "../types";
import pilotsData from "../data/pilots.json";
import outfitsData from "../data/outfits.json";
import shipsData from "../data/ships.json";

const WORLD_WIDTH = 480;
const WORLD_HEIGHT = 720;
const HUD_HEIGHT = 120;
const BASE_SHIP_RADIUS = 14;
const PLAYER_INVULNERABLE_MS = 900;
const OVERDRIVE_MAX = 100;
const SHMUP_TRACK_ID = "shmup_arcade";
const MAX_WEAPON_LEVEL = 4;
const BOMB_RADIUS = 190;
const BOMB_ENEMY_DAMAGE = 5;
const BOMB_BOSS_DAMAGE = 22;
const BOMB_PROJECTILE_SPEED = 430;
const BOMB_PROJECTILE_LIFE = 1.15;
const BOMB_PICKUP_SPEED = 108;
const BOMB_PICKUP_CHANCE = 0.1;
const BOMB_OVERFLOW_CHIPS = 3;
const OVERDRIVE_EXTENSION_PER_KILL_MS = 180;
const OVERDRIVE_EXTENSION_PER_BOSS_HIT_MS = 30;
const OVERDRIVE_EXTENSION_CAP_MS = 5000;
const TOUCH_PAD_RADIUS = 54;

interface ShipState {
  x: number;
  y: number;
  hp: number;
  radius: number;
  invulnerableUntil: number;
}

interface PlayerBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxLife: number;
  radius: number;
  damage: number;
  color: string;
  coreColor: string;
  length: number;
  spriteKey?: SpriteKey;
  pierce: number;
  driftVx: number;
  oscillateAmp: number;
  oscillateFreq: number;
  oscillatePhase: number;
  boomerangTurnAt: number;
  boomerangReturnVy: number;
  boomerangReturning: boolean;
  homingTurnRate: number;
  homingRange: number;
}

interface EnemyBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  coreColor: string;
  length: number;
  spriteKey: SpriteKey;
}

interface EnemyState {
  id: number;
  pattern: EnemyPattern;
  x: number;
  y: number;
  originX: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  scoreValue: number;
  fireCooldown: number;
  age: number;
  amplitude: number;
  frequency: number;
}

interface TouchMoveState {
  active: boolean;
  pointerId: number | null;
  x: number;
  y: number;
}

interface BossState {
  name: string;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  age: number;
  phase: 1 | 2;
  fireCooldown: number;
  burstCooldown: number;
}

interface PowerChip {
  x: number;
  y: number;
  vy: number;
  radius: number;
}

interface BombProjectile {
  kind: "bomb" | "crystalBomb";
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
  coreColor: string;
}

interface BombPickup {
  x: number;
  y: number;
  vy: number;
  radius: number;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface PulseEffect {
  x: number;
  y: number;
  radius: number;
  growth: number;
  life: number;
  maxLife: number;
  color: string;
  lineWidth: number;
  spriteKey?: SpriteKey;
}

interface HudState {
  score: number;
  kills: number;
  hp: number;
  maxHp: number;
  weaponLevel: number;
  weaponLabel: string;
  overdriveMeter: number;
  overdriveActive: boolean;
  multiplier: number;
  timeSurvivedMs: number;
  multiplierSaveReady: boolean;
  waveLabel: string;
  mapLabel: string;
  bossActive: boolean;
  bossLabel: string;
  bossHpRatio: number;
  bossWarning: boolean;
  secondaryName: string;
  secondaryReady: boolean;
  secondaryCooldownPct: number;
  secondaryUsesCharges: boolean;
  secondaryCharges: number;
  secondaryMaxCharges: number;
  barrierActive: boolean;
  empActive: boolean;
  dronesActive: boolean;
  activePassives: string[];
  kitLabel: string;
}

interface ShmupModifiers {
  maxHp: number;
  shipSpeed: number;
  overdriveFillMultiplier: number;
  overdriveDurationMs: number;
  hitboxScale: number;
  scoreFlatBonus: number;
  scoreMultBonus: number;
  comboBonus: number;
  hasMultiplierSave: boolean;
  secondaryStartCharges: number;
  secondaryMaxCharges: number;
  secondaryUsesCharges: boolean;
  secondaryCooldownMs: number;
  secondaryDurationMs: number;
  primaryKey: ShmupPrimaryKey;
  secondaryKey: ShmupSecondaryKey;
  passiveKeys: ShmupPassiveKey[];
  bulletSpeedMultiplier: number;
  spreadMultiplier: number;
  weaponDamageMultiplier: number;
  damageTakenMultiplier: number;
  regenPerSecond: number;
  regenDelayMs: number;
  shotColor: string | null;
  outfitKit: ShmupKit | null;
}

interface ScheduledWaveSpawn extends ShmupWaveEnemy {
  loop: number;
  spawnAtMs: number;
  waveLabel: string;
}

type SpriteKey =
  | "backgroundFar"
  | "backgroundNear"
  | "player"
  | "enemyDrifter"
  | "enemySine"
  | "boss"
  | "chip"
  | "bulletPlayer"
  | "bulletEnemy"
  | "bulletBoss"
  | "impactBurst"
  | "pulseRing";

const SPRITE_PATHS: Record<SpriteKey, string> = {
  backgroundFar: "/assets/shmup/background_far.svg",
  backgroundNear: "/assets/shmup/background_near.svg",
  player: "/assets/shmup/player_ship.svg",
  enemyDrifter: "/assets/shmup/enemy_drifter.svg",
  enemySine: "/assets/shmup/enemy_sine.svg",
  boss: "/assets/shmup/boss_dreadnought.svg",
  chip: "/assets/shmup/power_chip.svg",
  bulletPlayer: "/assets/shmup/bullet_player.svg",
  bulletEnemy: "/assets/shmup/bullet_enemy.svg",
  bulletBoss: "/assets/shmup/bullet_boss.svg",
  impactBurst: "/assets/shmup/impact_burst.svg",
  pulseRing: "/assets/shmup/pulse_ring.svg",
};

const PILOT_SHIP_ART_PATHS: Record<string, string> = {
  pilot_nova: "/assets/ships/astra_interceptor.png",
  pilot_rex: "/assets/ships/valkyrie_lancer.png",
  pilot_yuki: "/assets/ships/seraph_guard.png",
};

function getPlayerShipSpritePath(
  pilotId: string | null,
  ship: Ship | undefined
): string {
  if (ship?.spriteUrl) return ship.spriteUrl;
  if (ship?.artUrl) return ship.artUrl;
  if (pilotId && PILOT_SHIP_ART_PATHS[pilotId]) return PILOT_SHIP_ART_PATHS[pilotId];
  return SPRITE_PATHS.player;
}

function createSpriteStore(): Record<SpriteKey, HTMLImageElement | null> {
  return {
    backgroundFar: null,
    backgroundNear: null,
    player: null,
    enemyDrifter: null,
    enemySine: null,
    boss: null,
    chip: null,
    bulletPlayer: null,
    bulletEnemy: null,
    bulletBoss: null,
    impactBurst: null,
    pulseRing: null,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function distanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function formatTimeLabel(timeMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(timeMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getWeaponLabel(level: number): string {
  switch (level) {
    case 1:
      return "Lance";
    case 2:
      return "Split Fan";
    case 3:
      return "Wide Assault";
    case 4:
      return "Nova Array";
    default:
      return "Nova Array";
  }
}

function buildModifiers(
  pilot: Pilot | undefined,
  ship: Ship | undefined,
  outfit: Outfit | undefined,
  ownedOutfit: OwnedOutfit | undefined,
  outfitKit: ShmupKit | null
): ShmupModifiers {
  const loadout = buildShmupLoadout(pilot, ship, outfit, ownedOutfit);
  const primaryKey = resolvePrimaryKey(outfitKit?.primary);
  const secondaryKey = resolveSecondaryKey(outfitKit?.secondary);
  const passiveKeys = sanitizePassiveKeys(outfitKit?.passives);
  const hasSmallerHitbox = passiveKeys.includes("smallerHitbox");
  const hasOverdriveLoop = passiveKeys.includes("overdriveLoop");
  const hasPrecisionRoute = passiveKeys.includes("precisionRoute");
  const hasAggressiveRoute = passiveKeys.includes("aggressiveRoute");
  const hasExtraShield = passiveKeys.includes("extraShield");
  const hasShieldRegen = passiveKeys.includes("shieldRegen");
  const secondaryConfig = SHMUP_BALANCE.secondaries[secondaryKey];
  const shotColor = outfitKit?.visuals?.shotColor ?? null;
  const secondaryStartCharges = secondaryConfig.usesCharges
    ? (secondaryConfig.baseCharges ?? 0) +
      (outfit?.rarity === "SSR" ? secondaryConfig.ssrBonusCharges ?? 0 : 0)
    : 0;
  const secondaryMaxCharges = secondaryConfig.usesCharges
    ? secondaryStartCharges + (secondaryConfig.bonusMaxCharges ?? 0)
    : 0;
  const hpFromPassives =
    (hasExtraShield ? SHMUP_BALANCE.passives.extraShieldHp : 0) -
    (hasAggressiveRoute ? SHMUP_BALANCE.passives.aggressiveRoute.hpPenalty : 0);
  const baseHp = Math.max(1, loadout.shipHp + hpFromPassives);

  return {
    maxHp: baseHp,
    shipSpeed: loadout.shipSpeed,
    overdriveFillMultiplier: loadout.overdriveFillMultiplier,
    overdriveDurationMs: hasOverdriveLoop
      ? Math.round(loadout.overdriveDurationMs * SHMUP_BALANCE.passives.overdriveLoopDurationMult)
      : loadout.overdriveDurationMs,
    hitboxScale: loadout.hitboxScale * (hasSmallerHitbox ? 0.85 : 1),
    scoreFlatBonus: loadout.scoreFlatBonus,
    scoreMultBonus: loadout.scoreMultBonus,
    comboBonus: loadout.comboBonus,
    hasMultiplierSave: loadout.hasComboShield,
    secondaryStartCharges,
    secondaryMaxCharges,
    secondaryUsesCharges: secondaryConfig.usesCharges,
    secondaryCooldownMs: secondaryConfig.cooldownMs,
    secondaryDurationMs: secondaryConfig.durationMs,
    primaryKey,
    secondaryKey,
    passiveKeys,
    bulletSpeedMultiplier: hasPrecisionRoute
      ? SHMUP_BALANCE.passives.precisionRoute.bulletSpeedMult
      : 1,
    spreadMultiplier: hasPrecisionRoute
      ? SHMUP_BALANCE.passives.precisionRoute.spreadMult
      : 1,
    weaponDamageMultiplier:
      (hasPrecisionRoute ? SHMUP_BALANCE.passives.precisionRoute.damageMult : 1) *
      (hasAggressiveRoute ? SHMUP_BALANCE.passives.aggressiveRoute.damageMult : 1),
    damageTakenMultiplier: hasAggressiveRoute
      ? SHMUP_BALANCE.passives.aggressiveRoute.damageTakenMult
      : 1,
    regenPerSecond: hasShieldRegen ? SHMUP_BALANCE.passives.shieldRegen.perSecond : 0,
    regenDelayMs: hasShieldRegen ? SHMUP_BALANCE.passives.shieldRegen.delayMs : 0,
    shotColor,
    outfitKit,
  };
}

function createHudState(modifiers: ShmupModifiers, activeMap: ShmupMap): HudState {
  return {
    score: 0,
    kills: 0,
    hp: modifiers.maxHp,
    maxHp: modifiers.maxHp,
    weaponLevel: 1,
    weaponLabel: getWeaponLabel(1),
    overdriveMeter: 0,
    overdriveActive: false,
    multiplier: 1,
    timeSurvivedMs: 0,
    multiplierSaveReady: modifiers.hasMultiplierSave,
    waveLabel: activeMap.waves[0]?.label ?? activeMap.name,
    mapLabel: activeMap.name,
    bossActive: false,
    bossLabel: "",
    bossHpRatio: 0,
    bossWarning: false,
    secondaryName: secondaryName(modifiers.secondaryKey),
    secondaryReady: true,
    secondaryCooldownPct: 0,
    secondaryUsesCharges: modifiers.secondaryUsesCharges,
    secondaryCharges: modifiers.secondaryStartCharges,
    secondaryMaxCharges: modifiers.secondaryMaxCharges,
    barrierActive: false,
    empActive: false,
    dronesActive: false,
    activePassives: modifiers.passiveKeys.map((passive) => passiveName(passive)),
    kitLabel: primaryName(modifiers.primaryKey),
  };
}

export default function ShmupPlayScreen() {
  const navigate = useNavigate();
  const { save, submitResult } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<Record<SpriteKey, HTMLImageElement | null>>(createSpriteStore());
  const playerSpriteLoadedPathRef = useRef<string | null>(null);
  const animationRef = useRef(0);
  const shipRef = useRef<ShipState>({
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT - 100,
    hp: BASE_SHMUP_HP,
    radius: BASE_SHIP_RADIUS,
    invulnerableUntil: 0,
  });
  const playerBulletsRef = useRef<PlayerBullet[]>([]);
  const enemyBulletsRef = useRef<EnemyBullet[]>([]);
  const enemiesRef = useRef<EnemyState[]>([]);
  const chipsRef = useRef<PowerChip[]>([]);
  const bombsRef = useRef<BombProjectile[]>([]);
  const bombPickupsRef = useRef<BombPickup[]>([]);
  const sparksRef = useRef<SparkParticle[]>([]);
  const pulsesRef = useRef<PulseEffect[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const enemyIdRef = useRef(0);
  const fireTimerRef = useRef(0);
  const queuedWaveSpawnsRef = useRef<ScheduledWaveSpawn[]>([]);
  const waveCursorRef = useRef(0);
  const waveLoopRef = useRef(0);
  const nextWaveStartMsRef = useRef(800);
  const activeWaveLabelRef = useRef("Launch Window");
  const bossRef = useRef<BossState | null>(null);
  const bossIntroStartedRef = useRef(false);
  const bossWarningUntilRef = useRef(0);
  const overdriveMeterRef = useRef(0);
  const overdriveUntilRef = useRef(0);
  const overdriveStartRef = useRef(0);
  const chipOverflowRef = useRef(0);
  const secondaryChargesRef = useRef(0);
  const secondaryCooldownUntilRef = useRef(0);
  const barrierUntilRef = useRef(0);
  const empUntilRef = useRef(0);
  const dronesUntilRef = useRef(0);
  const dronesFireTimerRef = useRef(0);
  const freezeUntilRef = useRef(0);
  const freezeShatterRef = useRef<{ x: number; y: number; triggerAtMs: number } | null>(null);
  const statusFlashUntilRef = useRef(0);
  const lastHitMsRef = useRef(0);
  const regenPoolRef = useRef(0);
  const weaponLevelRef = useRef(1);
  const scoreRef = useRef(0);
  const killsRef = useRef(0);
  const damageTakenRef = useRef(0);
  const streakRef = useRef(0);
  const bestMultiplierRef = useRef(1);
  const multiplierSaveReadyRef = useRef(false);
  const lastFrameRef = useRef(0);
  const runStartRef = useRef(0);
  const hudSyncRef = useRef(0);
  const runEndedRef = useRef(false);
  const shakeTimeRef = useRef(0);
  const shakePowerRef = useRef(0);
  const shipTiltRef = useRef(0);
  const droneOrbitRef = useRef(0);

  const pilots = pilotsData as Pilot[];
  const ships = shipsData as Ship[];
  const outfits = outfitsData as Outfit[];
  const pilot = pilots.find((item) => item.id === save.selectedPilotId);
  const selectedShip = ships.find((item) => item.id === save.selectedShipId);
  const activeMap =
    getShmupMapById(save.selectedMapId) ?? getShmupMapForShip(save.selectedShipId);
  const outfit = outfits.find((item) => item.id === save.selectedOutfitId);
  const ownedOutfit = save.ownedOutfits.find((item) => item.outfitId === save.selectedOutfitId);
  const outfitKit = getSelectedOutfitKit(save.selectedPilotId, save.selectedOutfitId, outfits);
  const playerSpritePath = getPlayerShipSpritePath(save.selectedPilotId, selectedShip);
  const modifiers = buildModifiers(pilot, selectedShip, outfit, ownedOutfit, outfitKit);
  const {
    comboBonus,
    hasMultiplierSave,
    hitboxScale,
    maxHp,
    passiveKeys,
    primaryKey,
    secondaryCooldownMs,
    secondaryDurationMs,
    secondaryKey,
    secondaryMaxCharges,
    secondaryStartCharges,
    secondaryUsesCharges,
    bulletSpeedMultiplier,
    damageTakenMultiplier,
    overdriveDurationMs,
    overdriveFillMultiplier,
    regenDelayMs,
    regenPerSecond,
    scoreFlatBonus,
    scoreMultBonus,
    shipSpeed,
    shotColor,
    spreadMultiplier,
    weaponDamageMultiplier,
  } = modifiers;
  const passiveKeySignature = passiveKeys.join("|");

  const [hud, setHud] = useState<HudState>(() => createHudState(modifiers, activeMap));
  const [showTouchControls, setShowTouchControls] = useState(false);
  const [touchKnob, setTouchKnob] = useState({ active: false, x: 0, y: 0 });
  const touchMoveRef = useRef<TouchMoveState>({
    active: false,
    pointerId: null,
    x: 0,
    y: 0,
  });
  const secondaryQueuedRef = useRef(false);

  const updateTouchVector = (dx: number, dy: number) => {
    const distance = Math.hypot(dx, dy);
    const scale = distance > TOUCH_PAD_RADIUS ? TOUCH_PAD_RADIUS / distance : 1;
    const clampedX = dx * scale;
    const clampedY = dy * scale;

    // Normalize to -1..1 with deadzone and sensitivity curve
    const DEADZONE = 0.12;
    let normX = clampedX / TOUCH_PAD_RADIUS;
    let normY = clampedY / TOUCH_PAD_RADIUS;
    const normDist = Math.hypot(normX, normY);
    if (normDist < DEADZONE) {
      normX = 0;
      normY = 0;
    } else {
      // Remap outside deadzone to 0..1 range with quadratic curve for fine control
      const remapped = ((normDist - DEADZONE) / (1 - DEADZONE));
      const curved = remapped * remapped; // quadratic: gentle at start, fast at edge
      const angle = Math.atan2(normY, normX);
      normX = Math.cos(angle) * curved;
      normY = Math.sin(angle) * curved;
    }

    touchMoveRef.current.x = normX;
    touchMoveRef.current.y = normY;
    setTouchKnob({ active: true, x: clampedX, y: clampedY });
  };

  const clearTouchVector = () => {
    touchMoveRef.current = { active: false, pointerId: null, x: 0, y: 0 };
    setTouchKnob({ active: false, x: 0, y: 0 });
  };

  const handleTouchPadDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    touchMoveRef.current.active = true;
    touchMoveRef.current.pointerId = event.pointerId;
    updateTouchVector(event.clientX - centerX, event.clientY - centerY);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleTouchPadMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!touchMoveRef.current.active) return;
    if (touchMoveRef.current.pointerId !== event.pointerId) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    updateTouchVector(event.clientX - centerX, event.clientY - centerY);
  };

  const handleTouchPadUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (touchMoveRef.current.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    clearTouchVector();
  };

  const queueSecondary = () => {
    secondaryQueuedRef.current = true;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(pointer: coarse)");
    const update = () => {
      setShowTouchControls(media.matches || window.innerWidth <= 900);
    };
    update();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
    } else {
      media.addListener(update);
    }
    window.addEventListener("resize", update);
    return () => {
      if (typeof media.removeEventListener === "function") {
        media.removeEventListener("change", update);
      } else {
        media.removeListener(update);
      }
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (!pilot) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const activePassives = passiveKeySignature.length > 0
      ? (passiveKeySignature.split("|") as ShmupPassiveKey[])
      : [];

    const ship = shipRef.current;
    ship.hp = maxHp;
    ship.radius = BASE_SHIP_RADIUS * hitboxScale;
    ship.invulnerableUntil = 0;

    playerBulletsRef.current = [];
    enemyBulletsRef.current = [];
    enemiesRef.current = [];
    chipsRef.current = [];
    bombsRef.current = [];
    bombPickupsRef.current = [];
    sparksRef.current = [];
    pulsesRef.current = [];
    enemyIdRef.current = 0;
    fireTimerRef.current = 0;
    queuedWaveSpawnsRef.current = [];
    waveCursorRef.current = 0;
    waveLoopRef.current = 0;
    nextWaveStartMsRef.current = 800;
    activeWaveLabelRef.current = activeMap.waves[0]?.label ?? activeMap.name;
    bossRef.current = null;
    bossIntroStartedRef.current = false;
    bossWarningUntilRef.current = 0;
    overdriveMeterRef.current = 0;
    overdriveUntilRef.current = 0;
    overdriveStartRef.current = 0;
    chipOverflowRef.current = 0;
    secondaryChargesRef.current = secondaryStartCharges;
    secondaryCooldownUntilRef.current = 0;
    barrierUntilRef.current = 0;
    empUntilRef.current = 0;
    dronesUntilRef.current = 0;
    dronesFireTimerRef.current = 0;
    freezeUntilRef.current = 0;
    freezeShatterRef.current = null;
    statusFlashUntilRef.current = 0;
    lastHitMsRef.current = 0;
    regenPoolRef.current = 0;
    weaponLevelRef.current = 1;
    scoreRef.current = 0;
    killsRef.current = 0;
    damageTakenRef.current = 0;
    streakRef.current = 0;
    bestMultiplierRef.current = 1;
    multiplierSaveReadyRef.current = hasMultiplierSave;
    lastFrameRef.current = 0;
    hudSyncRef.current = 0;
    runEndedRef.current = false;
    shakeTimeRef.current = 0;
    shakePowerRef.current = 0;
    shipTiltRef.current = 0;
    droneOrbitRef.current = 0;
    secondaryQueuedRef.current = false;
    touchMoveRef.current = { active: false, pointerId: null, x: 0, y: 0 };
    setTouchKnob({ active: false, x: 0, y: 0 });

    const spriteStore = spritesRef.current;
    const resolvedPlayerSpritePath = resolveAssetUrl(playerSpritePath) ?? playerSpritePath;
    if (!spriteStore.player || playerSpriteLoadedPathRef.current !== resolvedPlayerSpritePath) {
      const playerImage = new Image();
      playerImage.src = resolvedPlayerSpritePath;
      spriteStore.player = playerImage;
      playerSpriteLoadedPathRef.current = resolvedPlayerSpritePath;
    }
    for (const key of Object.keys(SPRITE_PATHS) as SpriteKey[]) {
      if (key === "player") continue;
      if (spriteStore[key]) continue;
      const image = new Image();
      image.src = resolveAssetUrl(SPRITE_PATHS[key]) ?? SPRITE_PATHS[key];
      spriteStore[key] = image;
    }

    const resizeCanvas = () => {
      canvas.width = Math.min(window.innerWidth, WORLD_WIDTH);
      canvas.height = Math.min(window.innerHeight - HUD_HEIGHT, WORLD_HEIGHT);
      ship.x = clamp(ship.x || canvas.width / 2, ship.radius + 8, canvas.width - ship.radius - 8);
      ship.y = clamp(ship.y || canvas.height - 80, ship.radius + 12, canvas.height - ship.radius - 12);
    };

    const syncHud = (elapsedMs: number) => {
      const overdriveActive = overdriveUntilRef.current > elapsedMs;
      const boss = bossRef.current;
      const secondaryRemaining = Math.max(0, secondaryCooldownUntilRef.current - elapsedMs);
      const secondaryPct =
        secondaryCooldownMs > 0 ? clamp(secondaryRemaining / secondaryCooldownMs, 0, 1) : 0;
      const streakMultiplier =
        1 + Math.min(2.4, Math.floor(streakRef.current / 4) * (0.15 + comboBonus / 100));
      setHud({
        score: scoreRef.current,
        kills: killsRef.current,
        hp: Math.max(0, Math.ceil(ship.hp)),
        maxHp,
        weaponLevel: weaponLevelRef.current,
        weaponLabel: getWeaponLabel(weaponLevelRef.current),
        overdriveMeter: overdriveMeterRef.current,
        overdriveActive,
        multiplier: Math.max(
          1,
          streakMultiplier *
            (1 + scoreMultBonus / 100) *
            (overdriveActive ? 1.3 : 1)
        ),
        timeSurvivedMs: elapsedMs,
        multiplierSaveReady: multiplierSaveReadyRef.current,
        waveLabel: activeWaveLabelRef.current,
        mapLabel: activeMap.name,
        bossActive: boss !== null,
        bossLabel: boss?.name ?? "",
        bossHpRatio: boss ? clamp(boss.hp / boss.maxHp, 0, 1) : 0,
        bossWarning:
          boss === null &&
          bossIntroStartedRef.current &&
          elapsedMs < bossWarningUntilRef.current,
        secondaryName: secondaryName(secondaryKey),
        secondaryReady: secondaryRemaining <= 0,
        secondaryCooldownPct: secondaryPct,
        secondaryUsesCharges,
        secondaryCharges: secondaryChargesRef.current,
        secondaryMaxCharges,
        barrierActive: barrierUntilRef.current > elapsedMs,
        empActive: empUntilRef.current > elapsedMs || freezeUntilRef.current > elapsedMs,
        dronesActive: dronesUntilRef.current > elapsedMs,
        activePassives: activePassives.map((passive) => passiveName(passive)),
        kitLabel: primaryName(primaryKey),
      });
    };

    const getScoreMultiplier = (elapsedMs: number) => {
      const streakMultiplier =
        1 + Math.min(2.4, Math.floor(streakRef.current / 4) * (0.15 + comboBonus / 100));
      return (
        streakMultiplier *
        (1 + scoreMultBonus / 100) *
        (overdriveUntilRef.current > elapsedMs ? 1.3 : 1)
      );
    };

    const activateOverdriveIfReady = (elapsedMs: number) => {
      if (overdriveMeterRef.current < OVERDRIVE_MAX || overdriveUntilRef.current > elapsedMs) {
        return;
      }
      overdriveMeterRef.current = 0;
      overdriveStartRef.current = elapsedMs;
      overdriveUntilRef.current = elapsedMs + overdriveDurationMs;
    };

    const addOverdrive = (amount: number, elapsedMs: number) => {
      if (overdriveUntilRef.current > elapsedMs) return;
      overdriveMeterRef.current = clamp(
        overdriveMeterRef.current + amount * overdriveFillMultiplier,
        0,
        OVERDRIVE_MAX
      );
      activateOverdriveIfReady(elapsedMs);
    };

    const extendOverdrive = (elapsedMs: number, extensionMs: number) => {
      if (overdriveUntilRef.current <= elapsedMs) return;
      const maxUntil =
        overdriveStartRef.current + overdriveDurationMs + OVERDRIVE_EXTENSION_CAP_MS;
      overdriveUntilRef.current = Math.min(
        maxUntil,
        overdriveUntilRef.current + extensionMs
      );
    };

    const isSecondaryReady = (elapsedMs: number) => {
      if (secondaryCooldownUntilRef.current > elapsedMs) {
        return false;
      }
      if (secondaryUsesCharges && secondaryChargesRef.current <= 0) {
        return false;
      }
      return secondaryKey !== "none";
    };

    const startSecondaryCooldown = (elapsedMs: number) => {
      if (secondaryCooldownMs <= 0) return;
      secondaryCooldownUntilRef.current = elapsedMs + secondaryCooldownMs;
    };

    const addSecondaryCharge = (amount: number) => {
      if (!secondaryUsesCharges) return;
      secondaryChargesRef.current = clamp(
        secondaryChargesRef.current + amount,
        0,
        secondaryMaxCharges
      );
    };

    const addScreenShake = (power: number, duration: number = 0.08) => {
      shakePowerRef.current = Math.max(shakePowerRef.current, power);
      shakeTimeRef.current = Math.max(shakeTimeRef.current, duration);
    };

    const addSparkBurst = (
      x: number,
      y: number,
      color: string,
      count: number,
      speed: number,
      radiusRange: [number, number] = [1.5, 3.4]
    ) => {
      for (let index = 0; index < count; index++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = speed * (0.45 + Math.random() * 0.75);
        sparksRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          radius: radiusRange[0] + Math.random() * (radiusRange[1] - radiusRange[0]),
          life: 0.12 + Math.random() * 0.16,
          maxLife: 0.28,
          color,
        });
      }
    };

    const addPulse = (
      x: number,
      y: number,
      color: string,
      radius: number,
      growth: number,
      life: number,
      lineWidth: number
    ) => {
      pulsesRef.current.push({
        x,
        y,
        radius,
        growth,
        life,
        maxLife: life,
        color,
        lineWidth,
        spriteKey: "pulseRing",
      });
    };

    const addExplosion = (
      x: number,
      y: number,
      color: string,
      size: number,
      intensity: number
    ) => {
      addSparkBurst(x, y, color, Math.round(8 + intensity * 4), 90 + intensity * 28, [2, 4.8]);
      addPulse(x, y, color, size * 0.35, 130 + intensity * 16, 0.22 + intensity * 0.02, 2.4);
      addScreenShake(0.8 + intensity * 0.25, 0.1 + intensity * 0.02);
    };

    const getSprite = (key: SpriteKey) => {
      const sprite = spritesRef.current[key];
      if (!sprite || !sprite.complete || sprite.naturalWidth === 0) return null;
      return sprite;
    };

    const drawSpriteCentered = (
      sprite: HTMLImageElement,
      x: number,
      y: number,
      width: number,
      height: number,
      rotation: number = 0,
      alpha: number = 1
    ) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.drawImage(sprite, -width / 2, -height / 2, width, height);
      ctx.restore();
    };

    const drawTiledBackground = (
      sprite: HTMLImageElement | null,
      elapsedMs: number,
      speed: number,
      alpha: number
    ) => {
      if (!sprite) return;
      const tileWidth = canvas.width;
      const tileHeight = tileWidth * (sprite.naturalHeight / sprite.naturalWidth);
      const offsetY = ((elapsedMs * speed) / 1000) % tileHeight;
      ctx.save();
      ctx.globalAlpha = alpha;
      for (let y = -offsetY - tileHeight; y < canvas.height + tileHeight; y += tileHeight) {
        ctx.drawImage(sprite, 0, y, tileWidth, tileHeight);
      }
      ctx.restore();
    };

    const spawnPlayerBullets = (elapsedMs: number) => {
      const overdriveActive = overdriveUntilRef.current > elapsedMs;
      const weaponLevel = weaponLevelRef.current;
      const spawned = spawnPrimaryShots(
        primaryKey,
        {
          x: ship.x,
          y: ship.y,
          radius: ship.radius,
          weaponLevel,
          overdriveActive,
          shotColorOverride: shotColor,
        },
        elapsedMs
      );
      if (spawned.length === 0) return;

      const leadColor = spawned[0].color;
      addPulse(
        ship.x,
        ship.y - ship.radius - 10,
        leadColor,
        5 + weaponLevel * 1.1,
        58 + weaponLevel * 22,
        0.08,
        1.5
      );
      addScreenShake(overdriveActive ? 0.86 + weaponLevel * 0.18 : 0.28 + weaponLevel * 0.14, 0.045);

      for (const shot of spawned) {
        playerBulletsRef.current.push({
          x: shot.x,
          y: shot.y,
          vx: shot.vx * spreadMultiplier,
          vy: shot.vy * bulletSpeedMultiplier,
          age: 0,
          maxLife: shot.maxLife,
          radius: shot.radius,
          damage: shot.damage * weaponDamageMultiplier,
          color: shot.color,
          coreColor: shot.coreColor,
          length: shot.length,
          spriteKey: undefined,
          pierce: shot.pierce ?? 0,
          driftVx: (shot.driftVx ?? 0) * spreadMultiplier,
          oscillateAmp: shot.oscillateAmp ?? 0,
          oscillateFreq: shot.oscillateFreq ?? 0,
          oscillatePhase: shot.oscillatePhase ?? 0,
          boomerangTurnAt: shot.boomerangTurnAt ?? 0,
          boomerangReturnVy: shot.boomerangReturnVy ?? 0,
          boomerangReturning: false,
          homingTurnRate: shot.homingTurnRate ?? 0,
          homingRange: shot.homingRange ?? 0,
        });
      }
    };

    const spawnEnemyFromWave = (spawn: ScheduledWaveSpawn, elapsedMs: number) => {
      const pattern = spawn.pattern;
      const loopDifficulty = 1 + Math.min(0.45, spawn.loop * 0.08 + elapsedMs / 180_000);
      // Randomize spawn position within ±12% of screen width for variety
      const xJitter = (Math.random() - 0.5) * 0.24;
      const spawnX = clamp((spawn.x + xJitter) * canvas.width, 28, canvas.width - 28);
      const defaultRadius =
        pattern === "drifter"
          ? 16
          : pattern === "orbiter"
            ? 19
            : 18;
      const defaultHp =
        pattern === "drifter"
          ? 2
          : pattern === "orbiter"
            ? 4
            : 3;
      const defaultScore =
        pattern === "drifter"
          ? 180
          : pattern === "orbiter"
            ? 310
            : 260;
      const defaultFireCooldown =
        pattern === "drifter"
          ? 1.15
          : pattern === "orbiter"
            ? 0.82
            : 0.95;

      // Randomize velocity ±15% and amplitude/frequency ±20% per spawn
      const velRand = 0.85 + Math.random() * 0.3;
      const ampRand = 0.8 + Math.random() * 0.4;
      const freqRand = 0.8 + Math.random() * 0.4;
      const vxJitter = (Math.random() - 0.5) * 30;

      activeWaveLabelRef.current = spawn.waveLabel;
      enemiesRef.current.push({
        id: enemyIdRef.current++,
        pattern,
        x: spawnX,
        y: spawn.y ?? -24,
        originX: spawnX,
        vx: ((spawn.vx ?? 0) + vxJitter) * loopDifficulty,
        vy:
          (spawn.vy ??
            (pattern === "drifter"
              ? 110
              : pattern === "zigzag"
                ? 102
                : pattern === "orbiter"
                  ? 84
                  : 92)) * loopDifficulty * velRand,
        radius: spawn.radius ?? defaultRadius,
        hp: Math.max(1, Math.round((spawn.hp ?? defaultHp) + spawn.loop * 0.15)),
        scoreValue: Math.round((spawn.scoreValue ?? defaultScore) * (1 + spawn.loop * 0.12)),
        fireCooldown: Math.max(0.4, (spawn.fireCooldown ?? defaultFireCooldown) - spawn.loop * 0.03),
        age: 0,
        amplitude: (spawn.amplitude ?? 52) * ampRand,
        frequency: (spawn.frequency ?? 2.2) * freqRand,
      });
    };

    const queueNextWave = () => {
      const wave = activeMap.waves[waveCursorRef.current];
      if (!wave) return;

      const waveStartMs = nextWaveStartMsRef.current;
      const loop = waveLoopRef.current;

      queuedWaveSpawnsRef.current.push(
        ...wave.enemies.map((enemy) => ({
          ...enemy,
          loop,
          spawnAtMs: waveStartMs + enemy.delayMs,
          waveLabel: wave.label,
        }))
      );
      queuedWaveSpawnsRef.current.sort((left, right) => left.spawnAtMs - right.spawnAtMs);

      nextWaveStartMsRef.current = waveStartMs + wave.durationMs + 1100;
      waveCursorRef.current += 1;
      if (waveCursorRef.current >= activeMap.waves.length) {
        waveCursorRef.current = 0;
        waveLoopRef.current += 1;
      }
    };

    const startBossIntro = (elapsedMs: number) => {
      if (bossIntroStartedRef.current) return;
      bossIntroStartedRef.current = true;
      bossWarningUntilRef.current = elapsedMs + activeMap.bossWarningMs;
      queuedWaveSpawnsRef.current = [];
      activeWaveLabelRef.current = "Boss Warning";
      enemyBulletsRef.current = [];
    };

    const spawnBoss = () => {
      if (bossRef.current) return;
      bossRef.current = {
        name: activeMap.bossName,
        x: canvas.width / 2,
        y: -96,
        radius: 42,
        hp: activeMap.bossMaxHp,
        maxHp: activeMap.bossMaxHp,
        age: 0,
        phase: 1,
        fireCooldown: 0.65,
        burstCooldown: 1.5,
      };
      activeWaveLabelRef.current = activeMap.bossName;
    };

    const shootEnemyBullets = (enemy: EnemyState) => {
      const enemyShotColor = activeMap.palette.enemyShotColor;
      const enemyShotCore = activeMap.palette.enemyShotCore;

      if (enemy.pattern === "drifter") {
        enemyBulletsRef.current.push({
          x: enemy.x,
          y: enemy.y + enemy.radius,
          vx: 0,
          vy: 220,
          radius: 6,
          color: enemyShotColor,
          coreColor: enemyShotCore,
          length: 14,
          spriteKey: "bulletEnemy",
        });
        return;
      }

      if (enemy.pattern === "zigzag") {
        for (const spread of [-120, 0, 120]) {
          enemyBulletsRef.current.push({
            x: enemy.x,
            y: enemy.y + enemy.radius,
            vx: spread,
            vy: 210,
            radius: 5,
            color: enemyShotColor,
            coreColor: enemyShotCore,
            length: 12,
            spriteKey: "bulletEnemy",
          });
        }
        return;
      }

      if (enemy.pattern === "orbiter") {
        const baseAngle = enemy.age * 1.5;
        for (let index = 0; index < 4; index++) {
          const angle = baseAngle + (Math.PI / 2) * index;
          enemyBulletsRef.current.push({
            x: enemy.x,
            y: enemy.y + enemy.radius * 0.25,
            vx: Math.cos(angle) * 165,
            vy: Math.sin(angle) * 165 + 52,
            radius: 5,
            color: enemyShotColor,
            coreColor: enemyShotCore,
            length: 12,
            spriteKey: "bulletEnemy",
          });
        }
        return;
      }

      const dx = ship.x - enemy.x;
      const dy = ship.y - enemy.y;
      const length = Math.hypot(dx, dy) || 1;
      const baseVx = (dx / length) * 170;
      const baseVy = (dy / length) * 170;

      enemyBulletsRef.current.push({
        x: enemy.x,
        y: enemy.y + enemy.radius,
        vx: baseVx - 36,
        vy: baseVy + 22,
        radius: 5,
        color: enemyShotColor,
        coreColor: enemyShotCore,
        length: 12,
        spriteKey: "bulletEnemy",
      });
      enemyBulletsRef.current.push({
        x: enemy.x,
        y: enemy.y + enemy.radius,
        vx: baseVx + 36,
        vy: baseVy + 22,
        radius: 5,
        color: enemyShotColor,
        coreColor: enemyShotCore,
        length: 12,
        spriteKey: "bulletEnemy",
      });
    };

    const shootBossBullets = (boss: BossState) => {
      const dx = ship.x - boss.x;
      const dy = ship.y - boss.y;
      const length = Math.hypot(dx, dy) || 1;
      const baseVx = (dx / length) * 180;
      const baseVy = (dy / length) * 180;
      const fanOffsets = boss.phase === 1 ? [-36, 0, 36] : [-72, -24, 24, 72];

      for (const offset of fanOffsets) {
        enemyBulletsRef.current.push({
          x: boss.x,
          y: boss.y + boss.radius * 0.7,
          vx: baseVx + offset,
          vy: baseVy + 26,
          radius: boss.phase === 1 ? 6 : 7,
          color:
            boss.phase === 1
              ? activeMap.palette.enemyShotColor
              : activeMap.palette.bossShotColor,
          coreColor:
            boss.phase === 1
              ? activeMap.palette.enemyShotCore
              : activeMap.palette.bossShotCore,
          length: boss.phase === 1 ? 14 : 16,
          spriteKey: "bulletBoss",
        });
      }

      if (boss.phase === 2) {
        enemyBulletsRef.current.push({
          x: boss.x - 30,
          y: boss.y + 12,
          vx: -150,
          vy: 210,
          radius: 6,
          color: activeMap.palette.bossShotColor,
          coreColor: activeMap.palette.bossShotCore,
          length: 14,
          spriteKey: "bulletBoss",
        });
        enemyBulletsRef.current.push({
          x: boss.x + 30,
          y: boss.y + 12,
          vx: 150,
          vy: 210,
          radius: 6,
          color: activeMap.palette.bossShotColor,
          coreColor: activeMap.palette.bossShotCore,
          length: 14,
          spriteKey: "bulletBoss",
        });
      }
    };

    const shootBossBurst = (boss: BossState) => {
      const startAngle = boss.phase === 1 ? Math.PI * 0.22 : Math.PI * 0.1;
      const endAngle = Math.PI - startAngle;
      const bulletCount = boss.phase === 1 ? 7 : 10;

      for (let index = 0; index < bulletCount; index++) {
        const ratio = index / (bulletCount - 1);
        const angle = startAngle + (endAngle - startAngle) * ratio;
        enemyBulletsRef.current.push({
          x: boss.x,
          y: boss.y + boss.radius * 0.55,
          vx: Math.cos(angle) * 185,
          vy: Math.sin(angle) * 185,
          radius: boss.phase === 1 ? 5 : 6,
          color:
            boss.phase === 1
              ? activeMap.palette.enemyShotColor
              : activeMap.palette.bossShotColor,
          coreColor:
            boss.phase === 1
              ? activeMap.palette.enemyShotCore
              : activeMap.palette.bossShotCore,
          length: boss.phase === 1 ? 12 : 14,
          spriteKey: "bulletBoss",
        });
      }
    };

    const registerKill = (enemy: EnemyState, elapsedMs: number) => {
      killsRef.current += 1;
      streakRef.current += 1;
      const totalMultiplier = getScoreMultiplier(elapsedMs);
      bestMultiplierRef.current = Math.max(bestMultiplierRef.current, totalMultiplier);
      scoreRef.current += Math.round((enemy.scoreValue + scoreFlatBonus) * totalMultiplier);
      extendOverdrive(elapsedMs, OVERDRIVE_EXTENSION_PER_KILL_MS);

      if (Math.random() < 0.22) {
        chipsRef.current.push({
          x: enemy.x,
          y: enemy.y,
          vy: 110,
          radius: 10,
        });
      }

      if (
        secondaryUsesCharges &&
        secondaryChargesRef.current < secondaryMaxCharges &&
        Math.random() <
          (enemy.pattern === "orbiter" ? BOMB_PICKUP_CHANCE + 0.05 : BOMB_PICKUP_CHANCE)
      ) {
        bombPickupsRef.current.push({
          x: enemy.x,
          y: enemy.y,
          vy: BOMB_PICKUP_SPEED,
          radius: 9,
        });
      }

      addExplosion(
        enemy.x,
        enemy.y,
        enemy.pattern === "drifter" ? "#f06595" : "#9775fa",
        enemy.radius,
        enemy.pattern === "drifter" ? 2 : 2.6
      );
      addOverdrive(12, elapsedMs);
    };

    const registerBossDefeat = (elapsedMs: number, x: number, y: number) => {
      killsRef.current += 1;
      streakRef.current += 3;
      const totalMultiplier = getScoreMultiplier(elapsedMs);
      bestMultiplierRef.current = Math.max(bestMultiplierRef.current, totalMultiplier);
      scoreRef.current += Math.round((4200 + scoreFlatBonus) * totalMultiplier);
      enemyBulletsRef.current = [];
      addExplosion(x, y, "#ffd43b", 34, 5.4);
      addExplosion(x, y - 26, "#ff922b", 42, 6);
      if (secondaryUsesCharges) {
        addSecondaryCharge(2);
      }
      addOverdrive(36, elapsedMs);
      finishRun(elapsedMs, true);
    };

    const applyAreaBlast = (
      x: number,
      y: number,
      radius: number,
      enemyDamage: number,
      bossDamage: number,
      elapsedMs: number,
      color: string
    ) => {
      const radiusSq = radius * radius;

      enemyBulletsRef.current = enemyBulletsRef.current.filter((bullet) => {
        const inRange = distanceSquared(x, y, bullet.x, bullet.y) <= radiusSq;
        if (inRange) addSparkBurst(bullet.x, bullet.y, color, 3, 110);
        return !inRange;
      });

      for (let enemyIndex = enemiesRef.current.length - 1; enemyIndex >= 0; enemyIndex--) {
        const enemy = enemiesRef.current[enemyIndex];
        const blastDistance = radius + enemy.radius;
        if (distanceSquared(x, y, enemy.x, enemy.y) > blastDistance * blastDistance) {
          continue;
        }
        enemy.hp -= enemyDamage;
        addSparkBurst(enemy.x, enemy.y, color, 8, 130, [2, 5]);
        addPulse(enemy.x, enemy.y, color, 10, 180, 0.16, 2.2);
        if (enemy.hp <= 0) {
          registerKill(enemy, elapsedMs);
          enemiesRef.current.splice(enemyIndex, 1);
        }
      }

      const boss = bossRef.current;
      if (boss) {
        const blastDistance = radius + boss.radius;
        if (distanceSquared(x, y, boss.x, boss.y) <= blastDistance * blastDistance) {
          boss.hp -= bossDamage;
          addSparkBurst(boss.x, boss.y, color, 14, 150, [2.4, 5.8]);
          addPulse(boss.x, boss.y, color, 16, 210, 0.2, 2.8);
          if (boss.hp <= 0) {
            const bossX = boss.x;
            const bossY = boss.y;
            bossRef.current = null;
            registerBossDefeat(elapsedMs, bossX, bossY);
          }
        }
      }
    };

    const detonateBomb = (
      kind: "bomb" | "crystalBomb",
      x: number,
      y: number,
      elapsedMs: number
    ) => {
      if (kind === "crystalBomb") {
        addExplosion(x, y, "#74c0fc", 28, 3.4);
        addPulse(x, y, "#a5d8ff", BOMB_RADIUS * 0.33, 300, 0.24, 2.4);
        statusFlashUntilRef.current = elapsedMs + 220;
        freezeUntilRef.current = Math.max(
          freezeUntilRef.current,
          elapsedMs + SHMUP_BALANCE.effects.crystalFreezeMs
        );
        freezeShatterRef.current = {
          x,
          y,
          triggerAtMs: elapsedMs + SHMUP_BALANCE.effects.crystalFreezeMs,
        };
        applyAreaBlast(x, y, BOMB_RADIUS * 0.65, 2.2, 8, elapsedMs, "#99e9f2");
        addOverdrive(12, elapsedMs);
        return;
      }

      addExplosion(x, y, "#ffd43b", 34, 3.8);
      addExplosion(x, y, "#ff922b", 22, 2.8);
      addPulse(x, y, "#ffe066", BOMB_RADIUS * 0.45, 420, 0.2, 3);
      addScreenShake(3.8, 0.16);
      applyAreaBlast(x, y, BOMB_RADIUS, BOMB_ENEMY_DAMAGE, BOMB_BOSS_DAMAGE, elapsedMs, "#ffd43b");
      addOverdrive(10, elapsedMs);
    };

    const triggerShieldPulse = (elapsedMs: number) => {
      addPulse(
        ship.x,
        ship.y,
        "#9dd7ff",
        SHMUP_BALANCE.effects.shieldPulseRadius * 0.25,
        390,
        0.22,
        2.8
      );
      addExplosion(ship.x, ship.y, "#74c0fc", 16, 2.4);
      applyAreaBlast(
        ship.x,
        ship.y,
        SHMUP_BALANCE.effects.shieldPulseRadius,
        SHMUP_BALANCE.effects.shieldPulseEnemyDamage,
        SHMUP_BALANCE.effects.shieldPulseBossDamage,
        elapsedMs,
        "#74c0fc"
      );
      addOverdrive(8, elapsedMs);
      addScreenShake(1.2, 0.1);
    };

    const triggerSecondary = (elapsedMs: number) => {
      if (!isSecondaryReady(elapsedMs)) return;

      switch (secondaryKey) {
        case "bomb":
        case "crystalBomb": {
          if (!secondaryUsesCharges || secondaryChargesRef.current <= 0) return;
          secondaryChargesRef.current -= 1;
          bombsRef.current.push({
            kind: secondaryKey,
            x: ship.x,
            y: ship.y - ship.radius - 10,
            vx: 0,
            vy: -BOMB_PROJECTILE_SPEED,
            radius: 8,
            life: BOMB_PROJECTILE_LIFE,
            maxLife: BOMB_PROJECTILE_LIFE,
            color: secondaryKey === "bomb" ? "#ffd43b" : "#8ce99a",
            coreColor: secondaryKey === "bomb" ? "#fff3bf" : "#e6fcf5",
          });
          addPulse(ship.x, ship.y - ship.radius - 12, "#ffe066", 9, 110, 0.14, 2);
          addScreenShake(1.1, 0.09);
          startSecondaryCooldown(elapsedMs);
          return;
        }
        case "shieldPulse":
          triggerShieldPulse(elapsedMs);
          startSecondaryCooldown(elapsedMs);
          return;
        case "barrier":
          barrierUntilRef.current = elapsedMs + secondaryDurationMs;
          startSecondaryCooldown(elapsedMs);
          addPulse(ship.x, ship.y, "#8ce99a", 12, 140, 0.12, 2.2);
          return;
        case "emp":
          empUntilRef.current = elapsedMs + secondaryDurationMs;
          statusFlashUntilRef.current = elapsedMs + 260;
          startSecondaryCooldown(elapsedMs);
          addPulse(ship.x, ship.y, "#4dabf7", 10, 200, 0.16, 2.6);
          return;
        case "drones":
          dronesUntilRef.current = elapsedMs + secondaryDurationMs;
          dronesFireTimerRef.current = 0;
          startSecondaryCooldown(elapsedMs);
          addPulse(ship.x, ship.y, "#00e5ff", 11, 120, 0.14, 2.2);
          return;
        case "none":
        default:
          return;
      }
    };

    const triggerCrystalShatter = (elapsedMs: number) => {
      const frozen = freezeShatterRef.current;
      if (!frozen || elapsedMs < frozen.triggerAtMs) return;
      freezeShatterRef.current = null;
      addExplosion(frozen.x, frozen.y, "#74c0fc", 34, 4.3);
      addPulse(frozen.x, frozen.y, "#99e9f2", SHMUP_BALANCE.effects.crystalShatterRadius * 0.4, 350, 0.2, 2.5);
      applyAreaBlast(
        frozen.x,
        frozen.y,
        SHMUP_BALANCE.effects.crystalShatterRadius,
        SHMUP_BALANCE.effects.crystalShatterEnemyDamage,
        SHMUP_BALANCE.effects.crystalShatterBossDamage,
        elapsedMs,
        "#a5d8ff"
      );
      addOverdrive(16, elapsedMs);
      addScreenShake(2.2, 0.12);
    };

    const finishRun = (elapsedMs: number, bossDefeated: boolean = false) => {
      if (runEndedRef.current) return;
      runEndedRef.current = true;

      const shmupResult: ShmupRunResult = {
        score: scoreRef.current,
        kills: killsRef.current,
        timeSurvivedMs: elapsedMs,
        bossDefeated,
        stage: Math.max(1, Math.floor(elapsedMs / 60_000) + 1),
        maxWeaponLevel: weaponLevelRef.current,
      };

      const scoreRecord: ShmupGameResult = {
        mode: "shmup",
        trackId: SHMUP_TRACK_ID,
        score: shmupResult.score,
        grade: gradeShmupRun(shmupResult),
        creditsEarned: 0,
        kills: shmupResult.kills,
        timeSurvivedMs: shmupResult.timeSurvivedMs,
        bestMultiplier: bestMultiplierRef.current,
        weaponLevel: weaponLevelRef.current,
        damageTaken: damageTakenRef.current,
      };

      syncHud(elapsedMs);
      submitResult(scoreRecord);
      window.setTimeout(() => {
        navigate("/shmup-results", { state: { shmupResult } });
      }, bossDefeated ? 650 : 400);
    };

    const handleShipHit = (elapsedMs: number) => {
      if (elapsedMs < ship.invulnerableUntil || runEndedRef.current) return;

      ship.hp = Math.max(0, ship.hp - damageTakenMultiplier);
      damageTakenRef.current += damageTakenMultiplier;
      lastHitMsRef.current = elapsedMs;
      regenPoolRef.current = 0;
      ship.invulnerableUntil = elapsedMs + PLAYER_INVULNERABLE_MS;
      addExplosion(ship.x, ship.y, "#ff8787", 18, 2.4);

      if (multiplierSaveReadyRef.current) {
        multiplierSaveReadyRef.current = false;
      } else {
        streakRef.current = 0;
      }

      if (ship.hp <= 0) {
        finishRun(elapsedMs);
      }
    };

    const drawShip = (elapsedMs: number) => {
      const blink = elapsedMs < ship.invulnerableUntil && Math.floor(elapsedMs / 80) % 2 === 0;
      if (blink) return;

      const sprite = getSprite("player");
      if (sprite) {
        ctx.save();
        ctx.globalAlpha = overdriveUntilRef.current > elapsedMs ? 0.95 : 0.85;
        const glow = ctx.createRadialGradient(ship.x, ship.y + 8, 8, ship.x, ship.y + 8, ship.radius * 3.8);
        glow.addColorStop(0, overdriveUntilRef.current > elapsedMs ? "rgba(255, 212, 59, 0.42)" : "rgba(69, 199, 255, 0.28)");
        glow.addColorStop(1, "rgba(69, 199, 255, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y + 8, ship.radius * 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        drawSpriteCentered(
          sprite,
          ship.x,
          ship.y,
          ship.radius * 5.6,
          ship.radius * 5.6,
          shipTiltRef.current
        );

        ctx.save();
        ctx.strokeStyle = "rgba(167, 231, 255, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y + 3, ship.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        return;
      }

      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.fillStyle = overdriveUntilRef.current > elapsedMs ? "#ffd43b" : "#e8ecff";
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(14, 16);
      ctx.lineTo(0, 10);
      ctx.lineTo(-14, 16);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(120, 180, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 2, ship.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    const findNearestHomingTarget = (
      x: number,
      y: number,
      maxRange: number
    ): { x: number; y: number } | null => {
      const maxRangeSquared = maxRange * maxRange;
      let bestDistance = maxRangeSquared;
      let bestTarget: { x: number; y: number } | null = null;

      for (const enemy of enemiesRef.current) {
        const d2 = distanceSquared(x, y, enemy.x, enemy.y);
        if (d2 <= bestDistance) {
          bestDistance = d2;
          bestTarget = { x: enemy.x, y: enemy.y };
        }
      }

      const boss = bossRef.current;
      if (boss) {
        const d2 = distanceSquared(x, y, boss.x, boss.y);
        if (d2 <= bestDistance) {
          bestTarget = { x: boss.x, y: boss.y };
        }
      }

      return bestTarget;
    };

    const drawLoop = (timestamp: number) => {
      if (runEndedRef.current) return;
      if (!runStartRef.current) runStartRef.current = timestamp;
      if (!lastFrameRef.current) lastFrameRef.current = timestamp;

      const elapsedMs = timestamp - runStartRef.current;
      const deltaSeconds = Math.min(0.033, (timestamp - lastFrameRef.current) / 1000);
      lastFrameRef.current = timestamp;
      triggerCrystalShatter(elapsedMs);
      const aggressiveRouteActive = activePassives.includes("aggressiveRoute");
      const empActive = empUntilRef.current > elapsedMs;
      const freezeActive = freezeUntilRef.current > elapsedMs;
      const enemyTimeScale = freezeActive
        ? 0.06
        : empActive
          ? SHMUP_BALANCE.effects.empEnemyTimeScale
          : 1;
      const enemyBulletTimeScale = freezeActive
        ? 0.05
        : empActive
          ? SHMUP_BALANCE.effects.empBulletSpeedScale
          : 1;

      if (secondaryQueuedRef.current) {
        secondaryQueuedRef.current = false;
        triggerSecondary(elapsedMs);
      }

      if (
        regenPerSecond > 0 &&
        ship.hp < maxHp &&
        elapsedMs - lastHitMsRef.current >= regenDelayMs
      ) {
        regenPoolRef.current += regenPerSecond * deltaSeconds;
        while (regenPoolRef.current >= 1) {
          regenPoolRef.current -= 1;
          ship.hp = Math.min(maxHp, ship.hp + 1);
        }
      }

      const keyboardMoveX =
        (keysRef.current.has("arrowright") || keysRef.current.has("d") ? 1 : 0) -
        (keysRef.current.has("arrowleft") || keysRef.current.has("a") ? 1 : 0);
      const keyboardMoveY =
        (keysRef.current.has("arrowdown") || keysRef.current.has("s") ? 1 : 0) -
        (keysRef.current.has("arrowup") || keysRef.current.has("w") ? 1 : 0);
      const touchMoveX = touchMoveRef.current.active ? touchMoveRef.current.x : 0;
      const touchMoveY = touchMoveRef.current.active ? touchMoveRef.current.y : 0;
      const moveX = clamp(keyboardMoveX + touchMoveX, -1, 1);
      const moveY = clamp(keyboardMoveY + touchMoveY, -1, 1);
      const moveLength = Math.hypot(moveX, moveY) || 1;
      const velocityScale =
        moveX !== 0 || moveY !== 0 ? shipSpeed * deltaSeconds / moveLength : 0;

      ship.x = clamp(ship.x + moveX * velocityScale, ship.radius + 8, canvas.width - ship.radius - 8);
      ship.y = clamp(ship.y + moveY * velocityScale, ship.radius + 8, canvas.height - ship.radius - 8);
      shipTiltRef.current = shipTiltRef.current * 0.82 + moveX * 0.08;

      fireTimerRef.current -= deltaSeconds;
      const fireInterval = getPrimaryFireInterval(
        primaryKey,
        overdriveUntilRef.current > elapsedMs,
        aggressiveRouteActive
      );
      while (fireTimerRef.current <= 0) {
        spawnPlayerBullets(elapsedMs);
        fireTimerRef.current += fireInterval;
      }

      if (dronesUntilRef.current > elapsedMs) {
        droneOrbitRef.current += deltaSeconds * 2.8;
        dronesFireTimerRef.current -= deltaSeconds;
        if (dronesFireTimerRef.current <= 0) {
          dronesFireTimerRef.current += SHMUP_BALANCE.effects.droneFireInterval;
          for (const phase of [0, Math.PI]) {
            const orbitX = ship.x + Math.cos(droneOrbitRef.current + phase) * 24;
            const orbitY = ship.y - 10 + Math.sin(droneOrbitRef.current + phase) * 18;
            playerBulletsRef.current.push({
              x: orbitX,
              y: orbitY,
              vx: 0,
              vy: -SHMUP_BALANCE.effects.droneShotSpeed,
              age: 0,
              maxLife: 1.35,
              radius: 3.2,
              damage: SHMUP_BALANCE.effects.droneDamage,
              color: "#00e5ff",
              coreColor: "#b2fff9",
              length: 12,
              spriteKey: undefined,
              pierce: 0,
              driftVx: 0,
              oscillateAmp: 0,
              oscillateFreq: 0,
              oscillatePhase: 0,
              boomerangTurnAt: 0,
              boomerangReturnVy: 0,
              boomerangReturning: false,
              homingTurnRate: 0,
              homingRange: 0,
            });
          }
        }
      }

      if (!bossIntroStartedRef.current && elapsedMs >= activeMap.bossTriggerMs) {
        startBossIntro(elapsedMs);
      }

      while (!bossIntroStartedRef.current && elapsedMs + 2200 >= nextWaveStartMsRef.current) {
        queueNextWave();
      }

      while (
        queuedWaveSpawnsRef.current.length > 0 &&
        queuedWaveSpawnsRef.current[0].spawnAtMs <= elapsedMs
      ) {
        const spawn = queuedWaveSpawnsRef.current.shift();
        if (spawn) spawnEnemyFromWave(spawn, elapsedMs);
      }

      for (const bullet of playerBulletsRef.current) {
        bullet.age += deltaSeconds;
        if (
          !bullet.boomerangReturning &&
          bullet.boomerangTurnAt > 0 &&
          bullet.age >= bullet.boomerangTurnAt
        ) {
          bullet.boomerangReturning = true;
          // Sweep sideways — never fly back toward the player
          bullet.vx *= -2.4;
          bullet.vy *= 0.08;
        }

        // Despawn boomerang bullets before they reach the player ship
        if (bullet.boomerangReturning && bullet.y >= ship.y - ship.radius * 2) {
          bullet.age = bullet.maxLife + 1;
        }

        if (bullet.homingTurnRate > 0 && bullet.homingRange > 0) {
          const target = findNearestHomingTarget(bullet.x, bullet.y, bullet.homingRange);
          if (target) {
            const velocityMagnitude = Math.max(220, Math.hypot(bullet.vx, bullet.vy));
            const toTargetX = target.x - bullet.x;
            const toTargetY = target.y - bullet.y;
            const toTargetLength = Math.hypot(toTargetX, toTargetY) || 1;
            const desiredVx = (toTargetX / toTargetLength) * velocityMagnitude;
            const desiredVy = (toTargetY / toTargetLength) * velocityMagnitude;
            const steerBlend = clamp(bullet.homingTurnRate * deltaSeconds, 0, 1);
            bullet.vx += (desiredVx - bullet.vx) * steerBlend;
            bullet.vy += (desiredVy - bullet.vy) * steerBlend;
          }
        }

        bullet.vx += bullet.driftVx * deltaSeconds;
        bullet.x += bullet.vx * deltaSeconds;
        if (bullet.oscillateAmp > 0 && bullet.oscillateFreq > 0) {
          bullet.x +=
            Math.sin((bullet.age + bullet.oscillatePhase) * bullet.oscillateFreq) *
            bullet.oscillateAmp *
            deltaSeconds;
        }
        bullet.y += bullet.vy * deltaSeconds;
      }
      playerBulletsRef.current = playerBulletsRef.current.filter(
        (bullet) =>
          bullet.age <= bullet.maxLife &&
          bullet.y > -30 &&
          bullet.y < canvas.height + 30 &&
          bullet.x > -30 &&
          bullet.x < canvas.width + 30
      );

      for (const bullet of enemyBulletsRef.current) {
        bullet.x += bullet.vx * deltaSeconds * enemyBulletTimeScale;
        bullet.y += bullet.vy * deltaSeconds * enemyBulletTimeScale;
      }
      enemyBulletsRef.current = enemyBulletsRef.current.filter(
        (bullet) =>
          bullet.y > -40 &&
          bullet.y < canvas.height + 40 &&
          bullet.x > -40 &&
          bullet.x < canvas.width + 40
      );

      for (const chip of chipsRef.current) {
        chip.y += chip.vy * deltaSeconds;
      }
      chipsRef.current = chipsRef.current.filter((chip) => chip.y < canvas.height + 24);

      for (const pickup of bombPickupsRef.current) {
        pickup.y += pickup.vy * deltaSeconds;
      }
      bombPickupsRef.current = bombPickupsRef.current.filter(
        (pickup) => pickup.y < canvas.height + 24
      );

      for (let bombIndex = bombsRef.current.length - 1; bombIndex >= 0; bombIndex--) {
        const bomb = bombsRef.current[bombIndex];
        bomb.x += bomb.vx * deltaSeconds;
        bomb.y += bomb.vy * deltaSeconds;
        bomb.life -= deltaSeconds;

        let shouldDetonate = bomb.life <= 0 || bomb.y <= 40;
        if (!shouldDetonate) {
          for (const enemy of enemiesRef.current) {
            const hitDistance = enemy.radius + bomb.radius;
            if (
              distanceSquared(enemy.x, enemy.y, bomb.x, bomb.y) <=
              hitDistance * hitDistance
            ) {
              shouldDetonate = true;
              break;
            }
          }
        }
        if (!shouldDetonate && bossRef.current) {
          const hitDistance = bossRef.current.radius + bomb.radius;
          if (
            distanceSquared(bossRef.current.x, bossRef.current.y, bomb.x, bomb.y) <=
            hitDistance * hitDistance
          ) {
            shouldDetonate = true;
          }
        }

        if (shouldDetonate) {
          bombsRef.current.splice(bombIndex, 1);
          detonateBomb(bomb.kind, bomb.x, bomb.y, elapsedMs);
        }
      }

      for (const spark of sparksRef.current) {
        spark.x += spark.vx * deltaSeconds;
        spark.y += spark.vy * deltaSeconds;
        spark.vx *= 0.985;
        spark.vy = spark.vy * 0.985 + 18 * deltaSeconds;
        spark.life -= deltaSeconds;
      }
      sparksRef.current = sparksRef.current.filter((spark) => spark.life > 0);

      for (const pulse of pulsesRef.current) {
        pulse.radius += pulse.growth * deltaSeconds;
        pulse.life -= deltaSeconds;
      }
      pulsesRef.current = pulsesRef.current.filter((pulse) => pulse.life > 0);

      if (shakeTimeRef.current > 0) {
        shakeTimeRef.current = Math.max(0, shakeTimeRef.current - deltaSeconds);
        if (shakeTimeRef.current === 0) {
          shakePowerRef.current = 0;
        }
      }

      for (const enemy of enemiesRef.current) {
        const enemyDelta = deltaSeconds * enemyTimeScale;
        enemy.age += enemyDelta;
        enemy.y += enemy.vy * enemyDelta;
        if (enemy.pattern === "drifter") {
          enemy.x += enemy.vx * enemyDelta;
        } else if (enemy.pattern === "sine") {
          enemy.x = enemy.originX + Math.sin(enemy.age * enemy.frequency) * enemy.amplitude;
        } else if (enemy.pattern === "zigzag") {
          const base = Math.sin(enemy.age * enemy.frequency);
          const hardTurn = Math.sign(base) * enemy.amplitude * 0.78;
          const jitter = Math.sin(enemy.age * enemy.frequency * 2.6) * enemy.amplitude * 0.22;
          enemy.x = enemy.originX + hardTurn + jitter;
        } else {
          enemy.x = enemy.originX + Math.cos(enemy.age * enemy.frequency) * enemy.amplitude;
          enemy.y += Math.sin(enemy.age * enemy.frequency * 0.65) * 22 * enemyDelta;
        }

        enemy.fireCooldown -= enemyDelta;
        if (enemy.fireCooldown <= 0) {
          shootEnemyBullets(enemy);
          const resetCooldown =
            enemy.pattern === "drifter"
              ? 1.2
              : enemy.pattern === "sine"
                ? 1.45
                : enemy.pattern === "zigzag"
                  ? 1.05
                  : 0.88;
          enemy.fireCooldown += resetCooldown;
        }
      }
      enemiesRef.current = enemiesRef.current.filter(
        (enemy) =>
          enemy.y < canvas.height + enemy.radius + 40 &&
          enemy.x > -80 &&
          enemy.x < canvas.width + 80 &&
          enemy.hp > 0
      );

      if (
        bossIntroStartedRef.current &&
        bossRef.current === null &&
        elapsedMs >= bossWarningUntilRef.current &&
        enemiesRef.current.length === 0
      ) {
        spawnBoss();
      }

      const boss = bossRef.current;
      if (boss) {
        const bossDelta = deltaSeconds * enemyTimeScale;
        boss.age += bossDelta;
        boss.phase = boss.hp <= boss.maxHp * 0.45 ? 2 : 1;
        const bossTargetY = 118;
        if (boss.y < bossTargetY) {
          boss.y = Math.min(bossTargetY, boss.y + 92 * bossDelta);
        }
        boss.x = clamp(
          canvas.width / 2 +
            Math.sin(boss.age * (boss.phase === 1 ? 0.95 : 1.35)) *
              (boss.phase === 1 ? 86 : 132),
          boss.radius + 12,
          canvas.width - boss.radius - 12
        );
        boss.fireCooldown -= bossDelta;
        boss.burstCooldown -= bossDelta;

        if (boss.y >= bossTargetY && boss.fireCooldown <= 0) {
          shootBossBullets(boss);
          boss.fireCooldown += boss.phase === 1 ? 0.85 : 0.58;
        }
        if (boss.y >= bossTargetY && boss.burstCooldown <= 0) {
          shootBossBurst(boss);
          boss.burstCooldown += boss.phase === 1 ? 2.1 : 1.35;
        }
      }

      for (let chipIndex = chipsRef.current.length - 1; chipIndex >= 0; chipIndex--) {
        const chip = chipsRef.current[chipIndex];
        const hitDistance = ship.radius + chip.radius + 6;
        if (distanceSquared(ship.x, ship.y, chip.x, chip.y) <= hitDistance * hitDistance) {
          chipsRef.current.splice(chipIndex, 1);
          if (weaponLevelRef.current < MAX_WEAPON_LEVEL) {
            weaponLevelRef.current = Math.min(MAX_WEAPON_LEVEL, weaponLevelRef.current + 1);
          } else {
            chipOverflowRef.current += 1;
            if (chipOverflowRef.current >= BOMB_OVERFLOW_CHIPS) {
              chipOverflowRef.current = 0;
              addSecondaryCharge(1);
            }
          }
          addSparkBurst(chip.x, chip.y, "#ffd43b", 6, 70, [2, 3.8]);
          addPulse(chip.x, chip.y, "#ffe066", 6, 62, 0.12, 1.5);
          if (weaponLevelRef.current >= 3) {
            addOverdrive(8, elapsedMs);
          }
        }
      }

      for (let pickupIndex = bombPickupsRef.current.length - 1; pickupIndex >= 0; pickupIndex--) {
        const pickup = bombPickupsRef.current[pickupIndex];
        const hitDistance = ship.radius + pickup.radius + 8;
        if (
          distanceSquared(ship.x, ship.y, pickup.x, pickup.y) <=
          hitDistance * hitDistance
        ) {
          bombPickupsRef.current.splice(pickupIndex, 1);
          addSecondaryCharge(1);
          addSparkBurst(pickup.x, pickup.y, "#ffe066", 7, 80, [1.8, 4]);
          addPulse(pickup.x, pickup.y, "#ffd43b", 8, 80, 0.16, 1.7);
        }
      }

      const consumePlayerBullet = (bulletIndex: number) => {
        const bullet = playerBulletsRef.current[bulletIndex];
        if (!bullet) return;
        if (bullet.pierce > 0) {
          bullet.pierce -= 1;
          if (bullet.pierce <= 0) {
            playerBulletsRef.current.splice(bulletIndex, 1);
          }
          return;
        }
        playerBulletsRef.current.splice(bulletIndex, 1);
      };

      for (let enemyIndex = enemiesRef.current.length - 1; enemyIndex >= 0; enemyIndex--) {
        const enemy = enemiesRef.current[enemyIndex];
        for (let bulletIndex = playerBulletsRef.current.length - 1; bulletIndex >= 0; bulletIndex--) {
          const bullet = playerBulletsRef.current[bulletIndex];
          const hitDistance = enemy.radius + bullet.radius;
          if (distanceSquared(enemy.x, enemy.y, bullet.x, bullet.y) > hitDistance * hitDistance) {
            continue;
          }

          enemy.hp -= bullet.damage;
          consumePlayerBullet(bulletIndex);
          addSparkBurst(bullet.x, bullet.y, bullet.color, 4, 90);
          addPulse(bullet.x, bullet.y, bullet.color, 4, 42, 0.08, 1.2);
          if (enemy.hp <= 0) {
            registerKill(enemy, elapsedMs);
            enemiesRef.current.splice(enemyIndex, 1);
            break;
          }
        }
      }

      const activeBoss = bossRef.current;
      if (activeBoss) {
        for (let bulletIndex = playerBulletsRef.current.length - 1; bulletIndex >= 0; bulletIndex--) {
          const bullet = playerBulletsRef.current[bulletIndex];
          const hitDistance = activeBoss.radius + bullet.radius;
          if (
            distanceSquared(activeBoss.x, activeBoss.y, bullet.x, bullet.y) >
            hitDistance * hitDistance
          ) {
            continue;
          }

          activeBoss.hp -= bullet.damage;
          consumePlayerBullet(bulletIndex);
          addSparkBurst(bullet.x, bullet.y, activeBoss.phase === 1 ? "#ffa8a8" : "#ffd43b", 5, 96);
          addPulse(
            bullet.x,
            bullet.y,
            activeBoss.phase === 1 ? "#ff8787" : "#ffd43b",
            5,
            54,
            0.1,
            1.5
          );
          addScreenShake(activeBoss.phase === 1 ? 0.35 : 0.55, 0.05);
          extendOverdrive(elapsedMs, OVERDRIVE_EXTENSION_PER_BOSS_HIT_MS);

          if (activeBoss.hp <= 0) {
            const bossX = activeBoss.x;
            const bossY = activeBoss.y;
            bossRef.current = null;
            registerBossDefeat(elapsedMs, bossX, bossY);
            break;
          }
        }
      }

      for (let bulletIndex = enemyBulletsRef.current.length - 1; bulletIndex >= 0; bulletIndex--) {
        const bullet = enemyBulletsRef.current[bulletIndex];
        if (barrierUntilRef.current > elapsedMs) {
          const dx = bullet.x - ship.x;
          const dy = bullet.y - ship.y;
          const barrierRadius = ship.radius * 2.8;
          const inFrontArc = dy <= ship.radius * 0.7 && Math.abs(dx) <= barrierRadius;
          if (
            inFrontArc &&
            distanceSquared(ship.x, ship.y, bullet.x, bullet.y) <=
              (barrierRadius + bullet.radius) * (barrierRadius + bullet.radius)
          ) {
            enemyBulletsRef.current.splice(bulletIndex, 1);
            addSparkBurst(bullet.x, bullet.y, "#8ce99a", 3, 80);
            continue;
          }
        }
        const hitDistance = ship.radius + bullet.radius;
        if (distanceSquared(ship.x, ship.y, bullet.x, bullet.y) <= hitDistance * hitDistance) {
          enemyBulletsRef.current.splice(bulletIndex, 1);
          handleShipHit(elapsedMs);
        }
      }

      if (bossRef.current) {
        const hitDistance = ship.radius + bossRef.current.radius * 0.78;
        if (
          distanceSquared(ship.x, ship.y, bossRef.current.x, bossRef.current.y) <=
          hitDistance * hitDistance
        ) {
          handleShipHit(elapsedMs);
        }
      }

      if (overdriveUntilRef.current <= elapsedMs && overdriveUntilRef.current !== 0) {
        overdriveUntilRef.current = 0;
        overdriveStartRef.current = 0;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
      background.addColorStop(0, activeMap.palette.backgroundTop);
      background.addColorStop(1, activeMap.palette.backgroundBottom);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawTiledBackground(getSprite("backgroundFar"), elapsedMs, 12, 0.8);
      drawTiledBackground(getSprite("backgroundNear"), elapsedMs, 34, 0.64);

      const corridorGlow = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height * 0.32,
        12,
        canvas.width / 2,
        canvas.height * 0.32,
        canvas.width * 0.75
      );
      corridorGlow.addColorStop(0, activeMap.palette.corridorGlow);
      corridorGlow.addColorStop(0.45, "rgba(54, 138, 255, 0.05)");
      corridorGlow.addColorStop(1, "rgba(54, 138, 255, 0)");
      ctx.fillStyle = corridorGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (overdriveUntilRef.current > elapsedMs) {
        ctx.fillStyle = activeMap.palette.overdriveOverlay;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (bossIntroStartedRef.current && bossRef.current === null && elapsedMs < bossWarningUntilRef.current) {
        ctx.fillStyle = activeMap.palette.warningOverlay;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (empUntilRef.current > elapsedMs) {
        ctx.fillStyle = "rgba(77, 171, 247, 0.09)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (freezeUntilRef.current > elapsedMs) {
        ctx.fillStyle = "rgba(165, 216, 255, 0.1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (statusFlashUntilRef.current > elapsedMs) {
        ctx.fillStyle = "rgba(220, 245, 255, 0.12)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.save();
      if (shakeTimeRef.current > 0 && shakePowerRef.current > 0) {
        const damp = shakeTimeRef.current / 0.12;
        const offsetX = (Math.random() * 2 - 1) * shakePowerRef.current * damp;
        const offsetY = (Math.random() * 2 - 1) * shakePowerRef.current * damp;
        ctx.translate(offsetX, offsetY);
      }

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const y = (elapsedMs / 7 + i * 108) % (canvas.height + 120) - 120;
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.08, y);
        ctx.lineTo(canvas.width * 0.92, y);
        ctx.stroke();
      }

      for (const bullet of playerBulletsRef.current) {
        const angle = Math.atan2(bullet.vy, bullet.vx);
        const sprite = bullet.spriteKey ? getSprite(bullet.spriteKey) : null;
        if (sprite) {
          drawSpriteCentered(
            sprite,
            bullet.x,
            bullet.y,
            bullet.length * 2.05,
            bullet.radius * 4.6,
            angle,
            0.94
          );
          continue;
        }
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        ctx.rotate(angle);
        ctx.shadowColor = bullet.color;
        ctx.shadowBlur = 14;
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, bullet.length, bullet.radius, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = bullet.coreColor;
        ctx.beginPath();
        ctx.ellipse(
          bullet.length * 0.18,
          0,
          bullet.length * 0.38,
          Math.max(1.4, bullet.radius * 0.45),
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      }

      for (const bullet of enemyBulletsRef.current) {
        const angle = Math.atan2(bullet.vy, bullet.vx);
        const sprite = getSprite(bullet.spriteKey);
        if (sprite) {
          drawSpriteCentered(
            sprite,
            bullet.x,
            bullet.y,
            bullet.length * 2.1,
            bullet.radius * 4.8,
            angle,
            0.96
          );
          continue;
        }
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        ctx.rotate(angle);
        ctx.shadowColor = bullet.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, bullet.length, bullet.radius, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = bullet.coreColor;
        ctx.beginPath();
        ctx.ellipse(
          bullet.length * 0.12,
          0,
          bullet.length * 0.32,
          Math.max(1.6, bullet.radius * 0.42),
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      }

      for (const bomb of bombsRef.current) {
        const alpha = clamp(bomb.life / bomb.maxLife, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = bomb.color;
        ctx.shadowBlur = 18;
        ctx.fillStyle = bomb.color;
        ctx.beginPath();
        ctx.arc(bomb.x, bomb.y, bomb.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = bomb.coreColor;
        ctx.beginPath();
        ctx.arc(bomb.x, bomb.y, bomb.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      for (const enemy of enemiesRef.current) {
        const sprite = getSprite(enemy.pattern === "drifter" ? "enemyDrifter" : "enemySine");
        const enemyColor =
          enemy.pattern === "drifter"
            ? "#f06595"
            : enemy.pattern === "sine"
              ? "#845ef7"
              : enemy.pattern === "zigzag"
                ? "#ff922b"
                : "#74c0fc";
        const enemyCoreDark =
          enemy.pattern === "drifter"
            ? "#a03060"
            : enemy.pattern === "sine"
              ? "#5030a0"
              : enemy.pattern === "zigzag"
                ? "#b06010"
                : "#3070a0";
        if (sprite) {
          ctx.save();
          const glow = ctx.createRadialGradient(enemy.x, enemy.y, 4, enemy.x, enemy.y, enemy.radius * 2.4);
          glow.addColorStop(0, `${enemyColor}33`);
          glow.addColorStop(1, "rgba(151, 117, 250, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.radius * 2.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          drawSpriteCentered(sprite, enemy.x, enemy.y, enemy.radius * 3.5, enemy.radius * 3.5);
        } else {
          const r = enemy.radius;
          const pulse = 0.92 + Math.sin(enemy.age * 4.5) * 0.08;
          ctx.save();
          ctx.translate(enemy.x, enemy.y);

          // Outer glow
          ctx.shadowColor = enemyColor;
          ctx.shadowBlur = 12;

          if (enemy.pattern === "zigzag") {
            // Angular fighter with swept wings
            const grad = ctx.createLinearGradient(0, -r, 0, r);
            grad.addColorStop(0, enemyColor);
            grad.addColorStop(1, enemyCoreDark);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, -r * 1.1);
            ctx.lineTo(r * 0.4, -r * 0.3);
            ctx.lineTo(r * 1.2, r * 0.1);
            ctx.lineTo(r * 0.5, r * 0.5);
            ctx.lineTo(r * 0.2, r * 0.9);
            ctx.lineTo(0, r * 0.6);
            ctx.lineTo(-r * 0.2, r * 0.9);
            ctx.lineTo(-r * 0.5, r * 0.5);
            ctx.lineTo(-r * 1.2, r * 0.1);
            ctx.lineTo(-r * 0.4, -r * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            // Cockpit
            ctx.fillStyle = `rgba(255,255,255,${0.35 * pulse})`;
            ctx.beginPath();
            ctx.ellipse(0, -r * 0.2, r * 0.18, r * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (enemy.pattern === "orbiter") {
            // Shielded sphere with ring
            const grad = ctx.createRadialGradient(0, -r * 0.3, r * 0.1, 0, 0, r);
            grad.addColorStop(0, "#e0f0ff");
            grad.addColorStop(0.4, enemyColor);
            grad.addColorStop(1, enemyCoreDark);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Orbital ring
            ctx.strokeStyle = `${enemyColor}88`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 1.1, r * 0.35, enemy.age * 1.8, 0, Math.PI * 2);
            ctx.stroke();
            // Core eye
            ctx.fillStyle = `rgba(255,255,255,${0.6 * pulse})`;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
            ctx.fill();
          } else if (enemy.pattern === "sine") {
            // Sleek cruiser with tail fins
            const grad = ctx.createLinearGradient(0, -r, 0, r);
            grad.addColorStop(0, enemyColor);
            grad.addColorStop(1, enemyCoreDark);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, -r * 1.1);
            ctx.lineTo(r * 0.35, -r * 0.4);
            ctx.lineTo(r * 0.7, r * 0.2);
            ctx.lineTo(r * 0.9, r * 0.9);
            ctx.lineTo(r * 0.25, r * 0.5);
            ctx.lineTo(0, r * 0.7);
            ctx.lineTo(-r * 0.25, r * 0.5);
            ctx.lineTo(-r * 0.9, r * 0.9);
            ctx.lineTo(-r * 0.7, r * 0.2);
            ctx.lineTo(-r * 0.35, -r * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            // Cockpit
            ctx.fillStyle = `rgba(255,255,255,${0.3 * pulse})`;
            ctx.beginPath();
            ctx.ellipse(0, -r * 0.35, r * 0.15, r * 0.28, 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Drifter — armored diamond with engine ports
            const grad = ctx.createLinearGradient(0, -r, 0, r * 1.1);
            grad.addColorStop(0, enemyColor);
            grad.addColorStop(1, enemyCoreDark);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, -r * 1.05);
            ctx.lineTo(r * 0.6, -r * 0.15);
            ctx.lineTo(r * 0.8, r * 0.4);
            ctx.lineTo(r * 0.3, r * 1.0);
            ctx.lineTo(0, r * 0.7);
            ctx.lineTo(-r * 0.3, r * 1.0);
            ctx.lineTo(-r * 0.8, r * 0.4);
            ctx.lineTo(-r * 0.6, -r * 0.15);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            // Engine ports
            ctx.fillStyle = `rgba(255,200,150,${0.5 * pulse})`;
            ctx.beginPath();
            ctx.arc(-r * 0.25, r * 0.75, r * 0.1, 0, Math.PI * 2);
            ctx.arc(r * 0.25, r * 0.75, r * 0.1, 0, Math.PI * 2);
            ctx.fill();
            // Cockpit
            ctx.fillStyle = `rgba(255,255,255,${0.35 * pulse})`;
            ctx.beginPath();
            ctx.ellipse(0, -r * 0.3, r * 0.14, r * 0.24, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      if (bossRef.current) {
        const boss = bossRef.current;
        const sprite = getSprite("boss");
        if (sprite) {
          ctx.save();
          const glow = ctx.createRadialGradient(boss.x, boss.y + 12, 12, boss.x, boss.y + 12, boss.radius * 3.4);
          glow.addColorStop(
            0,
            boss.phase === 1 ? `${activeMap.palette.bossPrimary}33` : `${activeMap.palette.bossSecondary}3d`
          );
          glow.addColorStop(1, "rgba(255, 146, 43, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(boss.x, boss.y + 10, boss.radius * 3.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          drawSpriteCentered(
            sprite,
            boss.x,
            boss.y,
            boss.radius * 5.5,
            boss.radius * 4.2,
            Math.sin(boss.age * 0.8) * 0.03
          );
        } else {
          const br = boss.radius;
          const bossColor = boss.phase === 1 ? activeMap.palette.bossPrimary : activeMap.palette.bossSecondary;
          const bPulse = 0.88 + Math.sin(boss.age * 2.5) * 0.12;
          ctx.save();
          ctx.translate(boss.x, boss.y);

          // Outer glow aura
          ctx.shadowColor = bossColor;
          ctx.shadowBlur = 24;

          // Main hull — wide armored dreadnought
          const hullGrad = ctx.createLinearGradient(0, -br * 1.1, 0, br * 1.2);
          hullGrad.addColorStop(0, bossColor);
          hullGrad.addColorStop(0.6, "#2a1535");
          hullGrad.addColorStop(1, "#0d0810");
          ctx.fillStyle = hullGrad;
          ctx.beginPath();
          ctx.moveTo(0, -br * 1.1);
          ctx.lineTo(br * 0.45, -br * 0.7);
          ctx.lineTo(br * 1.1, -br * 0.15);
          ctx.lineTo(br * 1.25, br * 0.4);
          ctx.lineTo(br * 0.7, br * 1.0);
          ctx.lineTo(br * 0.2, br * 1.15);
          ctx.lineTo(0, br * 0.9);
          ctx.lineTo(-br * 0.2, br * 1.15);
          ctx.lineTo(-br * 0.7, br * 1.0);
          ctx.lineTo(-br * 1.25, br * 0.4);
          ctx.lineTo(-br * 1.1, -br * 0.15);
          ctx.lineTo(-br * 0.45, -br * 0.7);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;

          // Wing armor panels
          const panelGrad = ctx.createLinearGradient(-br * 1.2, 0, br * 1.2, 0);
          panelGrad.addColorStop(0, `${bossColor}44`);
          panelGrad.addColorStop(0.5, `${bossColor}22`);
          panelGrad.addColorStop(1, `${bossColor}44`);
          ctx.fillStyle = panelGrad;
          ctx.fillRect(-br * 1.15, -br * 0.1, br * 0.4, br * 0.9);
          ctx.fillRect(br * 0.75, -br * 0.1, br * 0.4, br * 0.9);

          // Central cockpit/eye
          const eyeGrad = ctx.createRadialGradient(0, -br * 0.2, 2, 0, -br * 0.2, br * 0.35);
          eyeGrad.addColorStop(0, "#ffffff");
          eyeGrad.addColorStop(0.3, bossColor);
          eyeGrad.addColorStop(1, `${bossColor}00`);
          ctx.fillStyle = eyeGrad;
          ctx.beginPath();
          ctx.arc(0, -br * 0.2, br * 0.35 * bPulse, 0, Math.PI * 2);
          ctx.fill();

          // Weapon turret mounts
          ctx.fillStyle = `rgba(255,255,255,${0.4 * bPulse})`;
          for (const turretX of [-br * 0.65, -br * 0.3, br * 0.3, br * 0.65]) {
            ctx.beginPath();
            ctx.arc(turretX, br * 0.5, br * 0.09, 0, Math.PI * 2);
            ctx.fill();
          }

          // Engine array
          ctx.fillStyle = `rgba(255,180,100,${0.55 * bPulse})`;
          for (const engX of [-br * 0.4, 0, br * 0.4]) {
            ctx.beginPath();
            ctx.ellipse(engX, br * 1.0, br * 0.08, br * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          // Panel line details
          ctx.strokeStyle = `${bossColor}55`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-br * 0.45, -br * 0.7);
          ctx.lineTo(-br * 0.2, br * 0.3);
          ctx.moveTo(br * 0.45, -br * 0.7);
          ctx.lineTo(br * 0.2, br * 0.3);
          ctx.stroke();

          ctx.restore();
        }
      }

      for (const chip of chipsRef.current) {
        const sprite = getSprite("chip");
        if (sprite) {
          drawSpriteCentered(
            sprite,
            chip.x,
            chip.y,
            chip.radius * 2.8,
            chip.radius * 2.8,
            elapsedMs / 420
          );
        } else {
          ctx.save();
          ctx.translate(chip.x, chip.y);
          ctx.fillStyle = "#ffd43b";
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-chip.radius, -chip.radius, chip.radius * 2, chip.radius * 2);
          ctx.restore();
        }
      }

      for (const pickup of bombPickupsRef.current) {
        ctx.save();
        ctx.translate(pickup.x, pickup.y);
        ctx.fillStyle = "#ffec99";
        ctx.beginPath();
        ctx.moveTo(0, -pickup.radius);
        ctx.lineTo(pickup.radius * 0.92, 0);
        ctx.lineTo(0, pickup.radius);
        ctx.lineTo(-pickup.radius * 0.92, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#f08c00";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-pickup.radius * 0.4, 0);
        ctx.lineTo(pickup.radius * 0.4, 0);
        ctx.moveTo(0, -pickup.radius * 0.4);
        ctx.lineTo(0, pickup.radius * 0.4);
        ctx.stroke();
        ctx.restore();
      }

      for (const pulse of pulsesRef.current) {
        const alpha = clamp(pulse.life / pulse.maxLife, 0, 1);
        const sprite = pulse.spriteKey ? getSprite(pulse.spriteKey) : null;
        if (sprite) {
          drawSpriteCentered(
            sprite,
            pulse.x,
            pulse.y,
            pulse.radius * 2.2,
            pulse.radius * 2.2,
            0,
            alpha * 0.6
          );
          continue;
        }
        ctx.save();
        ctx.globalAlpha = alpha * 0.7;
        ctx.strokeStyle = pulse.color;
        ctx.lineWidth = pulse.lineWidth;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      for (const spark of sparksRef.current) {
        const alpha = clamp(spark.life / spark.maxLife, 0, 1);
        const burst = getSprite("impactBurst");
        if (burst && spark.radius >= 3.4) {
          drawSpriteCentered(
            burst,
            spark.x,
            spark.y,
            spark.radius * 7.2,
            spark.radius * 7.2,
            0,
            alpha * 0.34
          );
        }
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = spark.color;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (dronesUntilRef.current > elapsedMs) {
        for (const phase of [0, Math.PI]) {
          const angle = droneOrbitRef.current + phase;
          const orbitX = ship.x + Math.cos(angle) * 24;
          const orbitY = ship.y - 10 + Math.sin(angle) * 18;
          ctx.save();
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = "#00e5ff";
          ctx.shadowColor = "#00e5ff";
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(orbitX, orbitY, 5.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#b2fff9";
          ctx.beginPath();
          ctx.arc(orbitX, orbitY, 2.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      drawShip(elapsedMs);
      if (barrierUntilRef.current > elapsedMs) {
        ctx.save();
        const barrierPulse = 1 + Math.sin(elapsedMs / 120) * 0.08;
        ctx.strokeStyle = "rgba(140, 233, 154, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.radius * 2.8 * barrierPulse, Math.PI * 1.12, Math.PI * 1.9);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      if (elapsedMs - hudSyncRef.current >= 75) {
        hudSyncRef.current = elapsedMs;
        syncHud(elapsedMs);
      }

      animationRef.current = requestAnimationFrame(drawLoop);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isSecondaryKey =
        event.code === "ShiftLeft" ||
        event.code === "ShiftRight";
      if (isSecondaryKey) {
        event.preventDefault();
        if (!event.repeat) {
          secondaryQueuedRef.current = true;
        }
        return;
      }
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        event.preventDefault();
        keysRef.current.add(key);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
    };
    const activeKeys = keysRef.current;

    resizeCanvas();
    ship.x = canvas.width / 2;
    ship.y = canvas.height - 72;

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    animationRef.current = requestAnimationFrame(drawLoop);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      activeKeys.clear();
      touchMoveRef.current = { active: false, pointerId: null, x: 0, y: 0 };
      setTouchKnob({ active: false, x: 0, y: 0 });
      secondaryQueuedRef.current = false;
    };
  }, [
    comboBonus,
    hasMultiplierSave,
    hitboxScale,
    maxHp,
    passiveKeySignature,
    primaryKey,
    secondaryCooldownMs,
    secondaryDurationMs,
    secondaryKey,
    secondaryMaxCharges,
    secondaryStartCharges,
    secondaryUsesCharges,
    bulletSpeedMultiplier,
    spreadMultiplier,
    weaponDamageMultiplier,
    damageTakenMultiplier,
    overdriveDurationMs,
    overdriveFillMultiplier,
    regenDelayMs,
    regenPerSecond,
    navigate,
    activeMap,
    pilot,
    scoreFlatBonus,
    scoreMultBonus,
    shipSpeed,
    shotColor,
    submitResult,
    playerSpritePath,
  ]);

  if (!pilot) {
    return (
      <div className="screen">
        <p>Select a pilot in the Hangar before launching.</p>
        <button className="btn" onClick={() => navigate("/hangar")}>Hangar</button>
      </div>
    );
  }

  const highScore = save.highScores[SHMUP_TRACK_ID] ?? 0;

  return (
    <div className="screen play-screen">
      <div className="play-hud">
        <div className="hud-left hud-stat-stack">
          <div className="hud-score">{hud.score.toLocaleString()}</div>
          <div className="hud-combo">
            <span className="combo-text">{hud.multiplier.toFixed(2)}x multiplier</span>
          </div>
        </div>
        <div className="hud-center shmup-hud-center">
          <div className="hud-track-title">Arcade Shooter</div>
          <div className="shmup-subtitle">
            {pilot.name}
            {selectedShip ? ` / ${selectedShip.name}` : ""}
            {outfit ? ` / ${outfit.name}` : ""}
          </div>
        </div>
        <div className="hud-right hud-stat-stack hud-stat-stack-right">
          <button className="btn btn-small" onClick={() => navigate("/")}>
            Exit
          </button>
          <div className="shmup-high-score">Best {highScore.toLocaleString()}</div>
        </div>
      </div>

      <div className="fever-bar-container">
        <div
          className={`fever-bar ${hud.overdriveActive ? "fever-active" : ""}`}
          style={{ width: `${hud.overdriveActive ? 100 : hud.overdriveMeter}%` }}
        />
        <span className="fever-label">
          {hud.overdriveActive ? "OVERDRIVE" : `Overdrive ${Math.round(hud.overdriveMeter)}%`}
        </span>
      </div>

      {hud.bossWarning ? (
        <div className="boss-warning-banner">Warning: {activeMap.bossName} incoming</div>
      ) : null}

      {hud.bossActive ? (
        <div className="boss-health">
          <div className="boss-health-top">
            <span>{hud.bossLabel}</span>
            <span>{Math.round(hud.bossHpRatio * 100)}%</span>
          </div>
          <div className="boss-health-track">
            <div
              className="boss-health-fill"
              style={{ width: `${hud.bossHpRatio * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="shmup-status-row">
        <div className="hp-pips">
          {Array.from({ length: hud.maxHp }).map((_, index) => (
            <span
              key={index}
              className={`hp-pip ${index < hud.hp ? "filled" : ""}`}
            />
          ))}
        </div>
        <span>Kills {hud.kills}</span>
        <span>Weapon Lv {hud.weaponLevel} {hud.weaponLabel}</span>
        {hud.secondaryUsesCharges ? (
          <span>Charges {hud.secondaryCharges}/{hud.secondaryMaxCharges}</span>
        ) : null}
        <span>Kit {hud.kitLabel}</span>
        <span>Zone {hud.mapLabel}</span>
        <span>Time {formatTimeLabel(hud.timeSurvivedMs)}</span>
        <span>{hud.waveLabel}</span>
        <span>{hud.multiplierSaveReady ? "Multiplier Save Ready" : "Multiplier Save Used"}</span>
      </div>

      <div className="passive-badges">
        {hud.activePassives.length > 0 ? (
          hud.activePassives.map((passive) => (
            <span key={passive} className="passive-badge">{passive}</span>
          ))
        ) : (
          <span className="passive-badge passive-badge-muted">No passives</span>
        )}
        {hud.barrierActive ? <span className="passive-badge passive-badge-live">Barrier Active</span> : null}
        {hud.empActive ? <span className="passive-badge passive-badge-live">EMP Active</span> : null}
        {hud.dronesActive ? <span className="passive-badge passive-badge-live">Drones Active</span> : null}
      </div>

      <canvas ref={canvasRef} className="play-canvas" />

      {showTouchControls ? (
        <div className="shmup-touch-controls">
          <div
            className={`shmup-touch-pad ${touchKnob.active ? "active" : ""}`}
            onPointerDown={handleTouchPadDown}
            onPointerMove={handleTouchPadMove}
            onPointerUp={handleTouchPadUp}
            onPointerCancel={handleTouchPadUp}
          >
            <div className="shmup-touch-ring" />
            <div
              className="shmup-touch-knob"
              style={{
                transform: `translate(calc(-50% + ${touchKnob.x}px), calc(-50% + ${touchKnob.y}px))`,
              }}
            />
            <span className="shmup-touch-label">Move</span>
          </div>
          <button
            type="button"
            className="shmup-touch-secondary"
            onPointerDown={(event) => {
              event.preventDefault();
              queueSecondary();
            }}
          >
            Secondary
          </button>
        </div>
      ) : null}

      <div className="secondary-indicator">
        <div className="secondary-indicator-title">Secondary: {hud.secondaryName}</div>
        {hud.secondaryUsesCharges ? (
          <div className="secondary-indicator-meta">
            Charges {hud.secondaryCharges}/{hud.secondaryMaxCharges}
          </div>
        ) : (
          <div className="secondary-indicator-meta">
            {hud.secondaryReady ? "Ready" : "Cooling Down"}
          </div>
        )}
        <div className="secondary-cooldown-track">
          <div
            className="secondary-cooldown-fill"
            style={{ width: `${(1 - hud.secondaryCooldownPct) * 100}%` }}
          />
        </div>
      </div>

      <div className="play-help">
        Move with WASD/arrow keys or touch pad. Weapons auto-fire. Secondary: Shift or touch button. Collect chips to level up and extend overdrive uptime.
      </div>
    </div>
  );
}
