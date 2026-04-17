/**
 * ShmupPlayScreen - Endless arcade shooter mode with pilot/outfit modifiers.
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { resolveAssetUrl } from "../lib/assetUrl";
import { BASE_SHMUP_HP, buildShmupLoadout } from "../lib/loadout";
import { getSelectedOutfitKit } from "../lib/outfitKits";
import { passiveName, primaryName, secondaryName } from "../lib/kitNames";
import TutorialOverlay, { hasTutorialBeenSeen } from "../components/TutorialOverlay";
import PauseMenu from "../components/PauseMenu";
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
  type BossArchetype,
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
  GameResult,
} from "../types";
import { syncVolumes } from "../lib/audioEngine";
import { playLevelMusic, playBossMusic, playDeathJingle, playVictoryFanfare, stopMusic } from "../lib/musicGen";
import {
  sfxShoot, sfxEnemyDeath, sfxExplosion, sfxPlayerHit,
  sfxBomb, sfxEmp, sfxShield, sfxDrones, sfxPowerup,
  sfxBossWarning, sfxCrystalBomb, sfxShieldPulse,
} from "../lib/retroSfx";
import pilotsData from "../data/pilots.json";
import outfitsData from "../data/outfits.json";
import shipsData from "../data/ships.json";

const HUD_HEIGHT = 40;
const ENTITY_SCALE = 0.7;
const BASE_SHIP_RADIUS = 10;
const REFERENCE_HEIGHT = 540; // design reference resolution
const PLAYER_INVULNERABLE_MS = 900;
const OVERDRIVE_MAX = 100;
const SHMUP_TRACK_ID = "shmup_arcade";
const MAX_WEAPON_LEVEL = 6;
const BOMB_RADIUS = 140;
const BOMB_ENEMY_DAMAGE = 5;
const BOMB_BOSS_DAMAGE = 22;
const BOMB_PROJECTILE_SPEED = 430;
const BOMB_PROJECTILE_LIFE = 1.15;
const BOMB_PICKUP_SPEED = 108;
const BOMB_PICKUP_CHANCE = 0.18;
const BOMB_OVERFLOW_CHIPS = 2;
const INTRO_FLY_IN_MS = 360;
const INTRO_READY_MS = 240;
const INTRO_TOTAL_MS = INTRO_FLY_IN_MS + INTRO_READY_MS;
const OVERDRIVE_EXTENSION_PER_KILL_MS = 180;
const OVERDRIVE_EXTENSION_PER_BOSS_HIT_MS = 30;
const OVERDRIVE_EXTENSION_CAP_MS = 5000;
const TOUCH_PAD_RADIUS = 52;
const TOUCH_PAD_EDGE_GUTTER = 52;
const TOUCH_PAD_TOP_GUTTER = 86;
const TOUCH_PAD_BOTTOM_GUTTER = 108;
const TOUCH_MOVE_DEADZONE = 0.09;
const TOUCH_MOVE_LINEAR_BLEND = 0.35;
const MOBILE_PLAYER_HORIZONTAL_MARGIN = 10;
const MOBILE_PLAYER_TOP_MARGIN = 20;
const MOBILE_PLAYER_BOTTOM_MARGIN = 80;
const PLAYER_BOTTOM_MARGIN = 100;
const PLAYER_MOBILE_START_RATIO = 0.72;
const PLAYER_DESKTOP_START_RATIO = 0.82;
const MOBILE_CONTROL_SPACE = 88;

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
  elite: boolean;
  // charger state
  chargeState?: "drift" | "pause" | "charge";
  chargeTimer?: number;
  chargeTargetX?: number;
  chargeTargetY?: number;
  // splitter state
  splitOnDeath?: boolean;
  splitGeneration?: number;
  // bomber state
  bombTimer?: number;
  // sniper state
  sniperLocked?: boolean;
  sniperLockX?: number;
  sniperLockY?: number;
  // dreadnought state
  dreadShieldActive?: boolean;
  dreadShieldTimer?: number;
  dreadShieldCooldown?: number;
  dreadAttackPhase?: number; // 0=spread, 1=mines, 2=beam
  dreadAttackTimer?: number;
  dreadBeamCharging?: boolean;
  dreadBeamTimer?: number;
  dreadBeamAngle?: number;
  dreadAnchored?: boolean; // true once it reaches hold position
  dreadMaxHp?: number; // for HP bar
  // tank state
  tankShieldActive?: boolean;
  tankShieldTimer?: number;
  tankShieldCooldown?: number;
  tankMaxHp?: number;
  // miniboss state
  minibossPhase?: number; // 0=normal, 1=enraged (at 50% HP)
  minibossMaxHp?: number;
  minibossEnraged?: boolean;
}

interface TouchMoveState {
  active: boolean;
  pointerId: number | null;
  x: number;
  y: number;
}

interface BossState {
  name: string;
  archetype: BossArchetype;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  age: number;
  phase: 1 | 2 | 3;
  fireCooldown: number;
  burstCooldown: number;
  sweepAngle: number;
  sweepActive: boolean;
  sweepCooldown: number;
  minionCooldown: number;
  phaseTransitionFlash: number;
  lastPhase: 1 | 2 | 3;
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

interface ViewportBounds {
  width: number;
  height: number;
  top: number;
  left: number;
}

interface BomberZone {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  growSpeed: number;
  life: number;
  damage: number;
}

interface DamageNumber {
  x: number;
  y: number;
  vy: number;
  value: number;
  life: number;
  color: string;
}

interface BackgroundDebris {
  x: number;
  y: number;
  vy: number;
  radius: number;
  rotation: number;
  rotSpeed: number;
  alpha: number;
  shape: number; // 0-2 for different shapes
}

interface TrailParticle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
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
  barrelRollActive: boolean;
  vortexActive: boolean;
  mirrorShieldActive: boolean;
  mirrorShieldLayers: number;
  overchargeActive: boolean;
  barrierLayers: number;
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

function getViewportBounds(): ViewportBounds {
  if (typeof window === "undefined") {
    return { width: 1280, height: 720, top: 0, left: 0 };
  }

  const viewport = window.visualViewport;
  return {
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
    top: viewport?.offsetTop ?? 0,
    left: viewport?.offsetLeft ?? 0,
  };
}

function isTouchGameplayDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
}

function getPlayerBounds(canvasWidth: number, canvasHeight: number, radius: number, mobile: boolean) {
  const desktopBounds = {
    minX: radius + 8,
    maxX: canvasWidth - radius - 8,
    minY: radius + 8,
    maxY: canvasHeight - radius - 8,
  };

  if (!mobile) return desktopBounds;

  return {
    minX: radius + MOBILE_PLAYER_HORIZONTAL_MARGIN,
    maxX: canvasWidth - radius - MOBILE_PLAYER_HORIZONTAL_MARGIN,
    minY: radius + MOBILE_PLAYER_TOP_MARGIN,
    maxY: canvasHeight - radius - MOBILE_PLAYER_BOTTOM_MARGIN,
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
    case 5:
      return "Overwing";
    case 6:
      return "Supernova";
    default:
      return "Supernova";
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
    barrelRollActive: false,
    vortexActive: false,
    mirrorShieldActive: false,
    mirrorShieldLayers: 0,
    overchargeActive: false,
    barrierLayers: 0,
    activePassives: modifiers.passiveKeys.map((passive) => passiveName(passive)),
    kitLabel: primaryName(modifiers.primaryKey),
  };
}

export default function ShmupPlayScreen() {
  const navigate = useNavigate();
  const { save, submitResult } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds>(() => getViewportBounds());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(() => isTouchGameplayDevice());
  const [mobileLaunchAccepted, setMobileLaunchAccepted] = useState(true);
  const gateWasVisibleRef = useRef(false);
  const gateRestorePausedRef = useRef(false);
  const mobileGateVisibleRef = useRef(false);

  const lockLandscapeOrientation = useCallback(async () => {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (dir: string) => Promise<void>;
    };

    try {
      if (orientation && typeof orientation.lock === "function") {
        await orientation.lock("landscape");
      }
    } catch {
      // Orientation lock is optional on mobile browsers.
    }
  }, []);

  const unlockLandscapeOrientation = useCallback(() => {
    const orientation = screen.orientation as ScreenOrientation & {
      unlock?: () => void;
    };

    try {
      if (orientation && typeof orientation.unlock === "function") {
        orientation.unlock();
      }
    } catch {
      // ignore
    }
  }, []);

  const requestGameplayFullscreen = useCallback(async () => {
    const fullscreenDocument = document as Document & {
      webkitFullscreenElement?: Element | null;
    };

    if (!containerRef.current || document.fullscreenElement || fullscreenDocument.webkitFullscreenElement) {
      return;
    }

    const fullscreenTarget = containerRef.current as HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };

    try {
      if (typeof containerRef.current.requestFullscreen === "function") {
        try {
          await containerRef.current.requestFullscreen({ navigationUI: "hide" } as FullscreenOptions);
        } catch {
          await containerRef.current.requestFullscreen();
        }
        return;
      }

      if (typeof fullscreenTarget.webkitRequestFullscreen === "function") {
        await Promise.resolve(fullscreenTarget.webkitRequestFullscreen());
      }
    } catch {
      // Fullscreen is best-effort on mobile browsers.
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const fullscreenDocument = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };

    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (typeof fullscreenDocument.webkitExitFullscreen === "function" && fullscreenDocument.webkitFullscreenElement) {
      Promise.resolve(fullscreenDocument.webkitExitFullscreen()).catch(() => {});
    } else {
      void requestGameplayFullscreen();
    }
  }, [requestGameplayFullscreen]);

  useEffect(() => {
    const onFsChange = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
      };
      setIsFullscreen(!!(document.fullscreenElement || doc.webkitFullscreenElement));
    };

    onFsChange();
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange as EventListener);
    };
  }, []);
  const spritesRef = useRef<Record<SpriteKey, HTMLImageElement | null>>(createSpriteStore());
  const playerSpriteLoadedPathRef = useRef<string | null>(null);
  const animationRef = useRef(0);
  const shipRef = useRef<ShipState>({
    x: window.innerWidth / 2,
    y: window.innerHeight - 80,
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
  const bomberZonesRef = useRef<BomberZone[]>([]);
  const damageNumbersRef = useRef<DamageNumber[]>([]);
  const trailParticlesRef = useRef<TrailParticle[]>([]);
  const backgroundDebrisRef = useRef<BackgroundDebris[]>([]);
  const streakDisplayRef = useRef(0);
  const streakDisplayTimerRef = useRef(0);
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
  // New secondaries
  const barrelRollUntilRef = useRef(0);
  const barrelRollDirRef = useRef({ x: 0, y: 0 });
  const phaseShiftUntilRef = useRef(0);
  const phaseShiftGhostRef = useRef<{ x: number; y: number; triggerAtMs: number } | null>(null);
  const vortexRef = useRef<{ x: number; y: number; startMs: number; endMs: number } | null>(null);
  const mirrorShieldUntilRef = useRef(0);
  const mirrorShieldLayersRef = useRef(0);
  const overchargeUntilRef = useRef(0);
  const barrierLayersRef = useRef(0);
  const lastMoveRef = useRef({ x: 0, y: -1 });
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
  const [floatingOrigin, setFloatingOrigin] = useState<{ x: number; y: number } | null>(null);
  const floatingOriginRef = useRef<{ x: number; y: number } | null>(null);
  const [showTutorial, setShowTutorial] = useState(() => !hasTutorialBeenSeen());
  const tutorialActive = !hasTutorialBeenSeen();
  const [paused, setPaused] = useState(tutorialActive);
  const pausedRef = useRef(tutorialActive);
  const pauseTimeRef = useRef(0);
  const touchMoveRef = useRef<TouchMoveState>({
    active: false,
    pointerId: null,
    x: 0,
    y: 0,
  });
  const secondaryQueuedRef = useRef(false);
  const touchPadRadius = TOUCH_PAD_RADIUS;

  const updateTouchVector = (dx: number, dy: number) => {
    const distance = Math.hypot(dx, dy);
    const scale = distance > touchPadRadius ? touchPadRadius / distance : 1;
    const clampedX = dx * scale;
    const clampedY = dy * scale;

    // Normalize to -1..1 with a smaller deadzone and a blended response curve.
    // Pure quadratic felt too sluggish for thumb drags on mobile.
    let normX = clampedX / touchPadRadius;
    let normY = clampedY / touchPadRadius;
    const normDist = Math.hypot(normX, normY);
    if (normDist < TOUCH_MOVE_DEADZONE) {
      normX = 0;
      normY = 0;
    } else {
      const remapped = (normDist - TOUCH_MOVE_DEADZONE) / (1 - TOUCH_MOVE_DEADZONE);
      const curved = remapped * remapped;
      const blended = TOUCH_MOVE_LINEAR_BLEND * remapped + (1 - TOUCH_MOVE_LINEAR_BLEND) * curved;
      const angle = Math.atan2(normY, normX);
      normX = Math.cos(angle) * blended;
      normY = Math.sin(angle) * blended;
    }

    touchMoveRef.current.x = normX;
    touchMoveRef.current.y = normY;
    setTouchKnob({ active: true, x: clampedX, y: clampedY });
  };

  const clearTouchVector = useCallback(() => {
    touchMoveRef.current = { active: false, pointerId: null, x: 0, y: 0 };
    setTouchKnob({ active: false, x: 0, y: 0 });
  }, []);

  const handleMoveZoneDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const minX = TOUCH_PAD_EDGE_GUTTER;
    const maxX = Math.max(minX, rect.width - TOUCH_PAD_EDGE_GUTTER);
    const minY = TOUCH_PAD_TOP_GUTTER;
    const maxY = Math.max(minY, rect.height - TOUCH_PAD_BOTTOM_GUTTER);
    const origin = {
      x: Math.min(Math.max(event.clientX, rect.left + minX), rect.left + maxX),
      y: Math.min(Math.max(event.clientY, rect.top + minY), rect.top + maxY),
    };
    floatingOriginRef.current = origin;
    setFloatingOrigin(origin);
    touchMoveRef.current.active = true;
    touchMoveRef.current.pointerId = event.pointerId;
    updateTouchVector(0, 0);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleMoveZoneMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!touchMoveRef.current.active) return;
    if (touchMoveRef.current.pointerId !== event.pointerId) return;
    event.preventDefault();
    const origin = floatingOriginRef.current;
    if (!origin) return;
    updateTouchVector(event.clientX - origin.x, event.clientY - origin.y);
  };

  const handleMoveZoneUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (touchMoveRef.current.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    floatingOriginRef.current = null;
    setFloatingOrigin(null);
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
      const mobileDevice = isTouchGameplayDevice();
      setIsMobileDevice(mobileDevice);
      if (!mobileDevice) {
        setMobileLaunchAccepted(true);
      }
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
    if (typeof window === "undefined") return;

    const syncViewport = () => {
      setViewportBounds(getViewportBounds());
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    window.visualViewport?.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("scroll", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      window.visualViewport?.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("scroll", syncViewport);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("shmup-active");
    document.body.classList.add("shmup-active");

    return () => {
      document.documentElement.classList.remove("shmup-active");
      document.body.classList.remove("shmup-active");
      unlockLandscapeOrientation();
    };
  }, [unlockLandscapeOrientation]);

  const isPortraitViewport = viewportBounds.height > viewportBounds.width;
  const showMobileRotateGate = isMobileDevice && isPortraitViewport;
  const showMobileLaunchGate = false;
  const mobileGateVisible = showMobileLaunchGate || showMobileRotateGate;

  useEffect(() => {
    mobileGateVisibleRef.current = mobileGateVisible;
  }, [mobileGateVisible]);

  useEffect(() => {
    let frameId = 0;

    if (!mobileGateVisible) {
      if (!gateWasVisibleRef.current) return;
      gateWasVisibleRef.current = false;
      touchMoveRef.current = { active: false, pointerId: null, x: 0, y: 0 };

      if (!gateRestorePausedRef.current && !showTutorial) {
        pausedRef.current = false;
        frameId = window.requestAnimationFrame(() => setPaused(false));
      }
      return () => {
        if (frameId) {
          window.cancelAnimationFrame(frameId);
        }
      };
    }

    if (!gateWasVisibleRef.current) {
      gateWasVisibleRef.current = true;
      gateRestorePausedRef.current = pausedRef.current;

      if (!pausedRef.current) {
        pauseTimeRef.current = performance.now();
      }
    }

    pausedRef.current = true;
    frameId = window.requestAnimationFrame(() => setPaused(true));
    touchMoveRef.current = { active: false, pointerId: null, x: 0, y: 0 };

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [mobileGateVisible, showTutorial]);

  // Sync audio volumes from settings
  useEffect(() => {
    syncVolumes(save.settings.musicVolume, save.settings.sfxVolume);
  }, [save.settings.musicVolume, save.settings.sfxVolume]);

  useEffect(() => {
    if (!pilot) return;

    // Start level music
    const mapId = activeMap?.id ?? "nebula-runway";
    playLevelMusic(mapId);

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
    bomberZonesRef.current = [];
    damageNumbersRef.current = [];
    trailParticlesRef.current = [];
    streakDisplayRef.current = 0;
    streakDisplayTimerRef.current = 0;
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
    barrelRollUntilRef.current = 0;
    barrelRollDirRef.current = { x: 0, y: 0 };
    phaseShiftUntilRef.current = 0;
    phaseShiftGhostRef.current = null;
    vortexRef.current = null;
    mirrorShieldUntilRef.current = 0;
    mirrorShieldLayersRef.current = 0;
    overchargeUntilRef.current = 0;
    barrierLayersRef.current = 0;
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

    // Scale factor: entities render at design-reference size on 540px+ screens,
    // proportionally smaller on mobile so they don't overwhelm the viewport.
    let displayScale = 1;

    const resizeCanvas = () => {
      // Read actual HUD height from DOM (CSS media queries may change it)
      const hudEl = canvas.parentElement?.querySelector(".play-hud") as HTMLElement | null;
      const actualHudH = hudEl ? hudEl.offsetHeight : HUD_HEIGHT;
      const viewportWidth = window.visualViewport?.width
        ?? containerRef.current?.clientWidth
        ?? window.innerWidth;
      const rawViewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const containerHeight = containerRef.current?.clientHeight ?? rawViewportHeight;
      const mobileReservedSpace = showTouchControls ? MOBILE_CONTROL_SPACE : 0;
      const usableViewportHeight = Math.min(containerHeight, rawViewportHeight) - actualHudH - mobileReservedSpace;
      canvas.width = viewportWidth;
      canvas.height = Math.max(0, usableViewportHeight);
      displayScale = Math.min(1, canvas.height / REFERENCE_HEIGHT);
      const playerBounds = getPlayerBounds(canvas.width, canvas.height, ship.radius, isMobileDevice);
      if (showTouchControls) {
        ship.x = canvas.width / 2;
      } else {
        ship.x = clamp(ship.x || canvas.width / 2, playerBounds.minX, playerBounds.maxX);
      }
      const startRatio = isMobileDevice ? PLAYER_MOBILE_START_RATIO : PLAYER_DESKTOP_START_RATIO;
      const preferredStartY = canvas.height * startRatio;
      const preferredBottomY = Math.min(preferredStartY, canvas.height - PLAYER_BOTTOM_MARGIN);
      ship.y = clamp(ship.y || preferredBottomY, playerBounds.minY, playerBounds.maxY);
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
        barrelRollActive: barrelRollUntilRef.current > elapsedMs,
        vortexActive: vortexRef.current !== null && elapsedMs < vortexRef.current.endMs,
        mirrorShieldActive: mirrorShieldUntilRef.current > elapsedMs && mirrorShieldLayersRef.current > 0,
        mirrorShieldLayers: mirrorShieldLayersRef.current,
        overchargeActive: overchargeUntilRef.current > elapsedMs,
        barrierLayers: barrierLayersRef.current,
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

    const addDamageNumber = (x: number, y: number, value: number, color: string = "#ffffff") => {
      damageNumbersRef.current.push({
        x: x + (Math.random() - 0.5) * 16,
        y,
        vy: -80 - Math.random() * 40,
        value,
        life: 0.7,
        color,
      });
    };

    const addTrailParticle = (x: number, y: number, color: string) => {
      trailParticlesRef.current.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + 8 + Math.random() * 4,
        life: 0.15 + Math.random() * 0.1,
        maxLife: 0.25,
        radius: 2 + Math.random() * 2,
        color,
      });
    };

    // Initialize background debris
    if (backgroundDebrisRef.current.length === 0) {
      for (let i = 0; i < 12; i++) {
        backgroundDebrisRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vy: 15 + Math.random() * 30,
          radius: 2 + Math.random() * 5,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 2,
          alpha: 0.1 + Math.random() * 0.15,
          shape: Math.floor(Math.random() * 3),
        });
      }
    }

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
      const w = width * displayScale;
      const h = height * displayScale;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
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
          radius: shot.radius * ENTITY_SCALE,
          damage: shot.damage * weaponDamageMultiplier * (overchargeUntilRef.current > elapsedMs ? SHMUP_BALANCE.effects.overchargeDamageMult : 1),
          color: shot.color,
          coreColor: shot.coreColor,
          length: shot.length * ENTITY_SCALE,
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
      // Progressive difficulty: enemy bullet speed and count scale over time
      const timeDifficultyScale = 1 + Math.min(0.5, elapsedMs / 240_000);
      // Randomize spawn position within ±12% of screen width for variety
      const xJitter = (Math.random() - 0.5) * 0.24;
      const spawnX = clamp((spawn.x + xJitter) * canvas.width, 28, canvas.width - 28);
      const DEFAULTS: Record<string, { radius: number; hp: number; score: number; fireCooldown: number }> = {
        drifter:  { radius: 11, hp: 2, score: 180, fireCooldown: 1.15 },
        sine:     { radius: 13, hp: 3, score: 260, fireCooldown: 0.95 },
        zigzag:   { radius: 13, hp: 3, score: 260, fireCooldown: 0.95 },
        orbiter:  { radius: 13, hp: 4, score: 310, fireCooldown: 0.82 },
        charger:  { radius: 12, hp: 3, score: 300, fireCooldown: 1.5 },
        splitter: { radius: 14, hp: 4, score: 350, fireCooldown: 1.1 },
        bomber:   { radius: 15, hp: 5, score: 400, fireCooldown: 2.5 },
        sniper:   { radius: 11, hp: 3, score: 380, fireCooldown: 2.0 },
        swarm:    { radius: 7, hp: 1, score: 80,  fireCooldown: 3.0 },
        dreadnought: { radius: 27, hp: 120, score: 2000, fireCooldown: 2.0 },
        tank: { radius: 25, hp: 35, score: 800, fireCooldown: 1.8 },
        miniboss: { radius: 20, hp: 18, score: 1200, fireCooldown: 1.2 },
      };
      const def = DEFAULTS[pattern] ?? DEFAULTS.drifter;

      // Randomize velocity ±15% and amplitude/frequency ±20% per spawn
      const velRand = 0.85 + Math.random() * 0.3;
      const ampRand = 0.8 + Math.random() * 0.4;
      const freqRand = 0.8 + Math.random() * 0.4;
      const vxJitter = (Math.random() - 0.5) * 30;
      const isElite = spawn.elite || (spawn.loop >= 2 && Math.random() < 0.12 * spawn.loop);

      const defaultVy: Record<string, number> = {
        drifter: 110, sine: 92, zigzag: 102, orbiter: 84,
        charger: 65, splitter: 85, bomber: 55, sniper: 38, swarm: 170,
        dreadnought: 25, tank: 35, miniboss: 30,
      };

      activeWaveLabelRef.current = spawn.waveLabel;
      enemiesRef.current.push({
        id: enemyIdRef.current++,
        pattern,
        x: spawnX,
        y: spawn.y ?? -24,
        originX: spawnX,
        vx: ((spawn.vx ?? 0) + vxJitter) * loopDifficulty,
        vy: (spawn.vy ?? (defaultVy[pattern] ?? 92)) * loopDifficulty * velRand,
        radius: spawn.radius ?? def.radius,
        hp: Math.max(1, Math.round(((spawn.hp ?? def.hp) + spawn.loop * 0.15) * (isElite ? 1.8 : 1))),
        scoreValue: Math.round(((spawn.scoreValue ?? def.score) * (1 + spawn.loop * 0.12)) * (isElite ? 1.5 : 1)),
        fireCooldown: Math.max(0.3, ((spawn.fireCooldown ?? def.fireCooldown) - spawn.loop * 0.03) / timeDifficultyScale),
        age: 0,
        amplitude: (spawn.amplitude ?? 52) * ampRand,
        frequency: (spawn.frequency ?? 2.2) * freqRand,
        elite: isElite,
        // Pattern-specific init
        chargeState: pattern === "charger" ? "drift" : undefined,
        chargeTimer: pattern === "charger" ? 0.8 + Math.random() * 0.6 : undefined,
        splitOnDeath: pattern === "splitter",
        splitGeneration: 0,
        bombTimer: pattern === "bomber" ? 1.5 + Math.random() * 1.0 : undefined,
        sniperLocked: false,
        // dreadnought init
        dreadShieldActive: false,
        dreadShieldTimer: 0,
        dreadShieldCooldown: pattern === "dreadnought" ? 5.0 : undefined,
        dreadAttackPhase: 0,
        dreadAttackTimer: pattern === "dreadnought" ? 2.0 : undefined,
        dreadBeamCharging: false,
        dreadBeamTimer: 0,
        dreadBeamAngle: 0,
        dreadAnchored: false,
        dreadMaxHp: pattern === "dreadnought" ? Math.max(1, Math.round(((spawn.hp ?? def.hp) + spawn.loop * 0.15) * (isElite ? 1.8 : 1))) : undefined,
        // tank init
        tankShieldActive: false,
        tankShieldTimer: 0,
        tankShieldCooldown: pattern === "tank" ? 4.0 : undefined,
        tankMaxHp: pattern === "tank" ? Math.max(1, Math.round(((spawn.hp ?? def.hp) + spawn.loop * 0.15) * (isElite ? 1.8 : 1))) : undefined,
        // miniboss init
        minibossPhase: pattern === "miniboss" ? 0 : undefined,
        minibossEnraged: false,
        minibossMaxHp: pattern === "miniboss" ? Math.max(1, Math.round(((spawn.hp ?? def.hp) + spawn.loop * 0.15) * (isElite ? 1.8 : 1))) : undefined,
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
      sfxBossWarning();
      playBossMusic();
      bossWarningUntilRef.current = elapsedMs + activeMap.bossWarningMs;
      queuedWaveSpawnsRef.current = [];
      activeWaveLabelRef.current = "Boss Warning";
      enemyBulletsRef.current = [];
    };

    const spawnBoss = () => {
      if (bossRef.current) return;
      bossRef.current = {
        name: activeMap.bossName,
        archetype: activeMap.bossArchetype,
        x: canvas.width / 2,
        y: -96,
        radius: activeMap.bossArchetype === "leviathan" ? 34 : activeMap.bossArchetype === "tyrant" ? 28 : 30,
        hp: activeMap.bossMaxHp,
        maxHp: activeMap.bossMaxHp,
        age: 0,
        phase: 1,
        fireCooldown: 0.65,
        burstCooldown: 1.5,
        sweepAngle: 0,
        sweepActive: false,
        sweepCooldown: 5.0,
        minionCooldown: 8.0,
        phaseTransitionFlash: 0,
        lastPhase: 1,
      };
      activeWaveLabelRef.current = activeMap.bossName;
    };

    const pushEnemyBullet = (b: EnemyBullet) => {
      b.radius *= ENTITY_SCALE;
      b.length *= ENTITY_SCALE;
      enemyBulletsRef.current.push(b);
    };

    const shootEnemyBullets = (enemy: EnemyState) => {
      const enemyShotColor = activeMap.palette.enemyShotColor;
      const enemyShotCore = activeMap.palette.enemyShotCore;

      if (enemy.pattern === "swarm") return; // swarm doesn't shoot

      if (enemy.pattern === "drifter") {
        pushEnemyBullet({
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
          pushEnemyBullet({
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
          pushEnemyBullet({
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

      if (enemy.pattern === "charger") {
        // Charger fires a single aimed shot while drifting (not during charge)
        if (enemy.chargeState === "charge") return;
        const dx = ship.x - enemy.x;
        const dy = ship.y - enemy.y;
        const len = Math.hypot(dx, dy) || 1;
        pushEnemyBullet({
          x: enemy.x,
          y: enemy.y + enemy.radius,
          vx: (dx / len) * 200,
          vy: (dy / len) * 200,
          radius: 5,
          color: "#ff6b6b",
          coreColor: "#ffdeeb",
          length: 14,
          spriteKey: "bulletEnemy",
        });
        return;
      }

      if (enemy.pattern === "splitter") {
        // Splitter fires twin aimed shots
        const dx = ship.x - enemy.x;
        const dy = ship.y - enemy.y;
        const len = Math.hypot(dx, dy) || 1;
        for (const offset of [-40, 40]) {
          pushEnemyBullet({
            x: enemy.x,
            y: enemy.y + enemy.radius,
            vx: (dx / len) * 180 + offset,
            vy: (dy / len) * 180,
            radius: 5,
            color: "#69db7c",
            coreColor: "#d3f9d8",
            length: 12,
            spriteKey: "bulletEnemy",
          });
        }
        return;
      }

      if (enemy.pattern === "bomber") {
        // Bomber fires slow, large shots downward
        pushEnemyBullet({
          x: enemy.x,
          y: enemy.y + enemy.radius,
          vx: (Math.random() - 0.5) * 60,
          vy: 160,
          radius: 8,
          color: "#ffa94d",
          coreColor: "#fff3bf",
          length: 10,
          spriteKey: "bulletEnemy",
        });
        return;
      }

      if (enemy.pattern === "dreadnought") {
        // Dreadnought attack is handled in the movement update (phase-based)
        // Default fire cooldown triggers spread shot
        const dx = ship.x - enemy.x;
        const dy = ship.y - enemy.y;
        const len = Math.hypot(dx, dy) || 1;
        // 5-bullet spread fan
        const fanAngles = [-0.4, -0.2, 0, 0.2, 0.4];
        const baseAngle = Math.atan2(dy, dx);
        for (const offset of fanAngles) {
          const angle = baseAngle + offset;
          pushEnemyBullet({
            x: enemy.x,
            y: enemy.y + enemy.radius * 0.7,
            vx: Math.cos(angle) * 165,
            vy: Math.sin(angle) * 165,
            radius: 7,
            color: "#ff4444",
            coreColor: "#ffaaaa",
            length: 16,
            spriteKey: "bulletBoss",
          });
        }
        return;
      }

      if (enemy.pattern === "tank") {
        // Tank fires 8-bullet 360-degree burst plus area-denial shot aimed at player
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i + enemy.age * 0.3;
          pushEnemyBullet({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * 130,
            vy: Math.sin(angle) * 130,
            radius: 5,
            color: "#66d9ef",
            coreColor: "#c8f0ff",
            length: 10,
            spriteKey: "bulletEnemy",
          });
        }
        // Slow area-denial shot aimed at player
        const dx = ship.x - enemy.x;
        const dy = ship.y - enemy.y;
        const len = Math.hypot(dx, dy) || 1;
        pushEnemyBullet({
          x: enemy.x,
          y: enemy.y + enemy.radius,
          vx: (dx / len) * 100,
          vy: (dy / len) * 100,
          radius: 10,
          color: "#66d9ef",
          coreColor: "#ffffff",
          length: 8,
          spriteKey: "bulletBoss",
        });
        return;
      }

      if (enemy.pattern === "miniboss") {
        // Miniboss: phase-dependent firing pattern
        const dx = ship.x - enemy.x;
        const dy = ship.y - enemy.y;
        const len = Math.hypot(dx, dy) || 1;
        if (enemy.minibossEnraged) {
          // Enraged: 6-way spread + aimed shots
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i + enemy.age * 0.5;
            pushEnemyBullet({
              x: enemy.x, y: enemy.y + enemy.radius * 0.5,
              vx: Math.cos(angle) * 170, vy: Math.sin(angle) * 170,
              radius: 6, color: "#ff4466", coreColor: "#ffccdd",
              length: 14, spriteKey: "bulletBoss",
            });
          }
          // Two aimed shots
          for (const offset of [-0.2, 0.2]) {
            const aimAngle = Math.atan2(dy, dx) + offset;
            pushEnemyBullet({
              x: enemy.x, y: enemy.y + enemy.radius * 0.5,
              vx: Math.cos(aimAngle) * 200, vy: Math.sin(aimAngle) * 200,
              radius: 5, color: "#ff4466", coreColor: "#ffccdd",
              length: 12, spriteKey: "bulletBoss",
            });
          }
        } else {
          // Normal: 3-way aimed fan
          for (const offset of [-0.25, 0, 0.25]) {
            const baseAngle = Math.atan2(dy, dx) + offset;
            pushEnemyBullet({
              x: enemy.x, y: enemy.y + enemy.radius * 0.5,
              vx: Math.cos(baseAngle) * 180, vy: Math.sin(baseAngle) * 180,
              radius: 6, color: "#e040a0", coreColor: "#ffd0e8",
              length: 13, spriteKey: "bulletBoss",
            });
          }
        }
        return;
      }

      if (enemy.pattern === "sniper") {
        // Sniper fires a precise aimed shot with lock-on
        if (!enemy.sniperLocked) {
          // First call: lock on (warning line will be drawn in render)
          enemy.sniperLocked = true;
          enemy.sniperLockX = ship.x;
          enemy.sniperLockY = ship.y;
          // Fire on next cooldown cycle
          return;
        }
        // Second call: fire the shot
        const tx = enemy.sniperLockX ?? ship.x;
        const ty = enemy.sniperLockY ?? ship.y;
        const dx = tx - enemy.x;
        const dy = ty - enemy.y;
        const len = Math.hypot(dx, dy) || 1;
        pushEnemyBullet({
          x: enemy.x,
          y: enemy.y + enemy.radius,
          vx: (dx / len) * 380,
          vy: (dy / len) * 380,
          radius: 4,
          color: "#ff0000",
          coreColor: "#ffffff",
          length: 24,
          spriteKey: "bulletEnemy",
        });
        enemy.sniperLocked = false;
        return;
      }

      // Default: sine — aimed double shot
      const dx = ship.x - enemy.x;
      const dy = ship.y - enemy.y;
      const length = Math.hypot(dx, dy) || 1;
      const baseVx = (dx / length) * 170;
      const baseVy = (dy / length) * 170;

      pushEnemyBullet({
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
      pushEnemyBullet({
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

      if (boss.archetype === "tyrant") {
        const lanceSpread = boss.phase === 1 ? 24 : boss.phase === 2 ? 52 : 78;
        for (const side of [-1, 1]) {
          pushEnemyBullet({
            x: boss.x + side * (18 + boss.phase * 6),
            y: boss.y + boss.radius * 0.45,
            vx: baseVx * 0.42 + side * lanceSpread,
            vy: baseVy + 38,
            radius: boss.phase === 3 ? 8 : 6.5,
            color: boss.phase === 3 ? "#ff6b6b" : activeMap.palette.bossShotColor,
            coreColor: "#fff4e6",
            length: boss.phase === 3 ? 20 : 16,
            spriteKey: "bulletBoss",
          });
        }
        if (boss.phase >= 2) {
          for (const vx of [-140, 0, 140]) {
            pushEnemyBullet({
              x: boss.x,
              y: boss.y + boss.radius * 0.6,
              vx,
              vy: 220 + boss.phase * 12,
              radius: 7,
              color: "#ffa94d",
              coreColor: "#fff4e6",
              length: 18,
              spriteKey: "bulletBoss",
            });
          }
        }
        return;
      }

      if (boss.archetype === "leviathan") {
        const offsets = boss.phase === 1 ? [-90, -30, 30, 90] : boss.phase === 2 ? [-140, -84, -28, 28, 84, 140] : [-180, -126, -72, -18, 18, 72, 126, 180];
        for (const offset of offsets) {
          pushEnemyBullet({
            x: boss.x,
            y: boss.y + boss.radius * 0.55,
            vx: offset,
            vy: 150 + boss.phase * 26,
            radius: boss.phase === 3 ? 7 : 6,
            color: activeMap.palette.bossShotColor,
            coreColor: activeMap.palette.bossShotCore,
            length: boss.phase === 3 ? 16 : 14,
            spriteKey: "bulletBoss",
          });
        }
        return;
      }

      const fanOffsets = boss.phase === 1 ? [-54, -18, 18, 54] : boss.phase === 2 ? [-96, -48, -16, 16, 48, 96] : [-126, -84, -42, 0, 42, 84, 126];
      const shotColor = boss.phase === 1 ? activeMap.palette.enemyShotColor : activeMap.palette.bossShotColor;
      const shotCore = boss.phase === 1 ? activeMap.palette.enemyShotCore : activeMap.palette.bossShotCore;
      const shotRadius = boss.phase === 1 ? 6 : 7;
      const shotLength = boss.phase === 1 ? 14 : 16;

      for (const offset of fanOffsets) {
        pushEnemyBullet({
          x: boss.x,
          y: boss.y + boss.radius * 0.7,
          vx: baseVx + offset,
          vy: baseVy + 26,
          radius: shotRadius,
          color: shotColor,
          coreColor: shotCore,
          length: shotLength,
          spriteKey: "bulletBoss",
        });
      }

      if (boss.phase >= 2) {
        for (const side of [-1, 1]) {
          pushEnemyBullet({
            x: boss.x + side * 30,
            y: boss.y + 12,
            vx: side * 150,
            vy: 210,
            radius: 6,
            color: activeMap.palette.bossShotColor,
            coreColor: activeMap.palette.bossShotCore,
            length: 14,
            spriteKey: "bulletBoss",
          });
        }
      }
    };

    const shootBossBurst = (boss: BossState) => {
      if (boss.archetype === "tyrant") {
        const rings = boss.phase === 3 ? 2 : 1;
        for (let ring = 0; ring < rings; ring++) {
          const bulletCount = boss.phase === 1 ? 6 : boss.phase === 2 ? 8 : 10;
          for (let index = 0; index < bulletCount; index++) {
            const angle = (Math.PI * 0.22) + (Math.PI * 0.56 * index) / Math.max(1, bulletCount - 1) + ring * 0.08;
            pushEnemyBullet({
              x: boss.x,
              y: boss.y + boss.radius * 0.45,
              vx: Math.cos(angle) * (165 + ring * 18),
              vy: Math.sin(angle) * (165 + ring * 18),
              radius: 6,
              color: "#ff922b",
              coreColor: "#fff4e6",
              length: 16,
              spriteKey: "bulletBoss",
            });
          }
        }
        return;
      }

      if (boss.archetype === "leviathan") {
        const bulletCount = boss.phase === 1 ? 8 : boss.phase === 2 ? 12 : 16;
        for (let index = 0; index < bulletCount; index++) {
          const ratio = index / Math.max(1, bulletCount - 1);
          const angle = Math.PI * 0.1 + Math.PI * 0.8 * ratio;
          const speed = boss.phase === 3 ? 225 : 190;
          pushEnemyBullet({
            x: boss.x + Math.sin(ratio * Math.PI) * 12,
            y: boss.y + boss.radius * 0.4,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * (speed * 0.9),
            radius: boss.phase === 3 ? 7 : 6,
            color: activeMap.palette.bossShotColor,
            coreColor: activeMap.palette.bossShotCore,
            length: 15,
            spriteKey: "bulletBoss",
          });
        }
        return;
      }

      const startAngle = boss.phase === 1 ? Math.PI * 0.18 : Math.PI * 0.08;
      const endAngle = Math.PI - startAngle;
      const bulletCount = boss.phase === 1 ? 9 : boss.phase === 2 ? 13 : 18;
      const shotColor = boss.phase === 1 ? activeMap.palette.enemyShotColor : activeMap.palette.bossShotColor;
      const shotCore = boss.phase === 1 ? activeMap.palette.enemyShotCore : activeMap.palette.bossShotCore;

      for (let index = 0; index < bulletCount; index++) {
        const ratio = index / (bulletCount - 1);
        const angle = startAngle + (endAngle - startAngle) * ratio;
        const speed = boss.phase === 3 ? 210 : 185;
        pushEnemyBullet({
          x: boss.x,
          y: boss.y + boss.radius * 0.55,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: boss.phase === 1 ? 5 : 6,
          color: shotColor,
          coreColor: shotCore,
          length: boss.phase === 1 ? 12 : 14,
          spriteKey: "bulletBoss",
        });
      }
    };

    const registerKill = (enemy: EnemyState, elapsedMs: number) => {
      sfxEnemyDeath();
      killsRef.current += 1;
      streakRef.current += 1;
      // Update streak display for on-screen counter
      if (streakRef.current >= 5) {
        streakDisplayRef.current = streakRef.current;
        streakDisplayTimerRef.current = 1.5;
      }
      const totalMultiplier = getScoreMultiplier(elapsedMs);
      bestMultiplierRef.current = Math.max(bestMultiplierRef.current, totalMultiplier);
      scoreRef.current += Math.round((enemy.scoreValue + scoreFlatBonus) * totalMultiplier);
      extendOverdrive(elapsedMs, OVERDRIVE_EXTENSION_PER_KILL_MS);

      // Dreadnought: spawn full mini-wave on death
      if (enemy.pattern === "dreadnought") {
        sfxExplosion();
        shakeTimeRef.current = 0.6;
        shakePowerRef.current = 10;
        addExplosion(enemy.x, enemy.y, "#ff4444", 40, 6);
        addExplosion(enemy.x - 20, enemy.y + 10, "#ff8800", 25, 4);
        addExplosion(enemy.x + 20, enemy.y - 10, "#ffcc00", 25, 4);
        // Spawn 6 enemies: 2 drifters, 2 swarm, 2 chargers
        const spawnDefs: Array<{ pattern: EnemyPattern; hp: number; radius: number; score: number; vx: number; vy: number }> = [
          { pattern: "drifter", hp: 2, radius: 16, score: 180, vx: -60, vy: 120 },
          { pattern: "drifter", hp: 2, radius: 16, score: 180, vx: 60, vy: 120 },
          { pattern: "swarm", hp: 1, radius: 10, score: 80, vx: -40, vy: 170 },
          { pattern: "swarm", hp: 1, radius: 10, score: 80, vx: 40, vy: 170 },
          { pattern: "charger", hp: 3, radius: 17, score: 300, vx: -30, vy: 65 },
          { pattern: "charger", hp: 3, radius: 17, score: 300, vx: 30, vy: 65 },
        ];
        for (const def of spawnDefs) {
          enemiesRef.current.push({
            id: enemyIdRef.current++,
            pattern: def.pattern,
            x: enemy.x + def.vx * 0.3,
            y: enemy.y,
            originX: enemy.x + def.vx * 0.3,
            vx: def.vx,
            vy: def.vy,
            radius: def.radius,
            hp: def.hp,
            scoreValue: def.score,
            fireCooldown: 1.5,
            age: 0,
            amplitude: 40,
            frequency: 2.2,
            elite: false,
            chargeState: def.pattern === "charger" ? "drift" : undefined,
            chargeTimer: def.pattern === "charger" ? 0.8 + Math.random() * 0.6 : undefined,
            splitOnDeath: false,
            splitGeneration: 1,
            sniperLocked: false,
          });
        }
      }

      // Tank: spawn 5 swarm children in a fan on death
      if (enemy.pattern === "tank") {
        sfxExplosion();
        shakeTimeRef.current = 0.4;
        shakePowerRef.current = 7;
        addExplosion(enemy.x, enemy.y, "#66d9ef", 32, 4);
        addExplosion(enemy.x - 15, enemy.y + 8, "#1a5276", 20, 3);
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 0.2) + (Math.PI * 0.6 / 4) * i;
          enemiesRef.current.push({
            id: enemyIdRef.current++,
            pattern: "swarm",
            x: enemy.x + Math.cos(angle) * 20,
            y: enemy.y + Math.sin(angle) * 20,
            originX: enemy.x + Math.cos(angle) * 20,
            vx: Math.cos(angle) * 120,
            vy: Math.sin(angle) * 100 + 80,
            radius: 10,
            hp: 1,
            scoreValue: 60,
            fireCooldown: 99,
            age: 0,
            amplitude: 0,
            frequency: 0,
            elite: false,
            splitOnDeath: false,
            splitGeneration: 1,
            sniperLocked: false,
          });
        }
      }

      // Miniboss: dramatic death explosion
      if (enemy.pattern === "miniboss") {
        sfxExplosion();
        shakeTimeRef.current = 0.5;
        shakePowerRef.current = 8;
        addExplosion(enemy.x, enemy.y, "#e040a0", 36, 5);
        addExplosion(enemy.x + 15, enemy.y - 10, "#ff4466", 24, 3.5);
        addExplosion(enemy.x - 10, enemy.y + 12, "#ffd700", 20, 3);
        addSparkBurst(enemy.x, enemy.y, "#ffffff", 12, 150, [2, 5]);
        // Drop guaranteed power chip
        chipsRef.current.push({ x: enemy.x, y: enemy.y, vy: 90, radius: 12 });
      }

      // Splitter: spawn 2 smaller children on death (up to generation 1)
      if (enemy.splitOnDeath && (enemy.splitGeneration ?? 0) < 1) {
        for (const side of [-1, 1]) {
          enemiesRef.current.push({
            id: enemyIdRef.current++,
            pattern: "splitter",
            x: enemy.x + side * 16,
            y: enemy.y,
            originX: enemy.x + side * 16,
            vx: side * 60,
            vy: enemy.vy * 1.3,
            radius: Math.max(8, enemy.radius * 0.6),
            hp: 1,
            scoreValue: Math.round(enemy.scoreValue * 0.4),
            fireCooldown: 1.5,
            age: 0,
            amplitude: enemy.amplitude * 0.5,
            frequency: enemy.frequency * 1.5,
            elite: false,
            splitOnDeath: false,
            splitGeneration: (enemy.splitGeneration ?? 0) + 1,
          });
        }
      }

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

      const EXPLOSION_COLORS: Record<string, string> = {
        drifter: "#f06595", sine: "#9775fa", zigzag: "#ff922b", orbiter: "#74c0fc",
        charger: "#ff6b6b", splitter: "#69db7c", bomber: "#ffa94d", sniper: "#ff0000", swarm: "#adb5bd",
        dreadnought: "#ff4444", tank: "#66d9ef",
      };
      addExplosion(
        enemy.x,
        enemy.y,
        EXPLOSION_COLORS[enemy.pattern] ?? "#9775fa",
        enemy.radius,
        enemy.elite ? 3.2 : enemy.radius > 16 ? 2.6 : 2
      );
      addOverdrive(12, elapsedMs);
    };

    const registerBossDefeat = (elapsedMs: number, x: number, y: number) => {
      sfxExplosion();
      playVictoryFanfare();
      killsRef.current += 1;
      streakRef.current += 3;
      const totalMultiplier = getScoreMultiplier(elapsedMs);
      bestMultiplierRef.current = Math.max(bestMultiplierRef.current, totalMultiplier);
      scoreRef.current += Math.round((4200 + scoreFlatBonus) * totalMultiplier);
      enemyBulletsRef.current = [];
      bomberZonesRef.current = [];
      // Multi-stage boss death explosion sequence
      addExplosion(x, y, "#ffd43b", 34, 5.4);
      addExplosion(x, y - 26, "#ff922b", 42, 6);
      addExplosion(x + 30, y + 10, "#ff6b6b", 28, 4.5);
      addExplosion(x - 25, y - 15, "#4dabf7", 30, 4.8);
      addSparkBurst(x, y, "#ffffff", 24, 200, [3, 6]);
      addSparkBurst(x, y, "#ffd43b", 16, 160, [2, 5]);
      addPulse(x, y, "#ffd43b", 20, 300, 0.4, 3);
      addPulse(x, y, "#ffffff", 10, 400, 0.3, 2);
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
        // Secondary abilities break dreadnought shield on hit
        if (enemy.pattern === "dreadnought" && enemy.dreadShieldActive) {
          enemy.dreadShieldActive = false;
          enemy.dreadShieldCooldown = 5.0;
          addSparkBurst(enemy.x, enemy.y, "#44aaff", 16, 200, [3, 7]);
          addPulse(enemy.x, enemy.y, "#4488ff", 20, 250, 0.3, 3.0);
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
          if (secondaryKey === "crystalBomb") sfxCrystalBomb(); else sfxBomb();
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
          sfxShieldPulse();
          triggerShieldPulse(elapsedMs);
          startSecondaryCooldown(elapsedMs);
          return;
        case "barrier":
          sfxShield();
          barrierUntilRef.current = elapsedMs + secondaryDurationMs;
          barrierLayersRef.current = 3;
          startSecondaryCooldown(elapsedMs);
          addPulse(ship.x, ship.y, "#8ce99a", 16, 180, 0.16, 2.8);
          addPulse(ship.x, ship.y, "#d3f9d8", 10, 104, 0.1, 1.8);
          addSparkBurst(ship.x, ship.y, "#8ce99a", 14, 150, [2, 5.2]);
          return;
        case "emp":
          sfxEmp();
          empUntilRef.current = elapsedMs + secondaryDurationMs;
          statusFlashUntilRef.current = elapsedMs + 260;
          startSecondaryCooldown(elapsedMs);
          addPulse(ship.x, ship.y, "#4dabf7", 14, 250, 0.18, 3.1);
          addPulse(ship.x, ship.y, "#74c0fc", 8, 130, 0.1, 1.8);
          addScreenShake(1.3, 0.09);
          return;
        case "drones":
          sfxDrones();
          dronesUntilRef.current = elapsedMs + secondaryDurationMs;
          dronesFireTimerRef.current = 0;
          startSecondaryCooldown(elapsedMs);
          addPulse(ship.x, ship.y, "#00e5ff", 15, 150, 0.16, 2.7);
          addPulse(ship.x, ship.y, "#a5f3ff", 9, 84, 0.11, 1.7);
          return;
        case "barrelRoll": {
          sfxShield();
          const rollDir = { ...lastMoveRef.current };
          const mag = Math.sqrt(rollDir.x * rollDir.x + rollDir.y * rollDir.y);
          if (mag > 0.1) { rollDir.x /= mag; rollDir.y /= mag; }
          else { rollDir.x = 0; rollDir.y = -1; }
          barrelRollUntilRef.current = elapsedMs + SHMUP_BALANCE.effects.barrelRollDurationMs;
          barrelRollDirRef.current = rollDir;
          ship.invulnerableUntil = Math.max(ship.invulnerableUntil, elapsedMs + SHMUP_BALANCE.effects.barrelRollDurationMs);
          startSecondaryCooldown(elapsedMs);
          addPulse(ship.x, ship.y, "#74c0fc", 12, 110, 0.14, 2.1);
          addSparkBurst(ship.x, ship.y, "#a5d8ff", 12, 170, [2, 5]);
          return;
        }
        case "phaseShift": {
          sfxEmp();
          const ghostOrigin = { x: ship.x, y: ship.y };
          const dir = { ...lastMoveRef.current };
          const dirMag = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
          if (dirMag > 0.1) { dir.x /= dirMag; dir.y /= dirMag; }
          else { dir.x = 0; dir.y = -1; }
          const dist = SHMUP_BALANCE.effects.phaseShiftDistance;
          ship.x = clamp(ship.x + dir.x * dist, ship.radius + 8, canvas.width - ship.radius - 8);
          ship.y = clamp(ship.y + dir.y * dist, ship.radius + 8, canvas.height - ship.radius - 8);
          ship.invulnerableUntil = Math.max(ship.invulnerableUntil, elapsedMs + 300);
          phaseShiftUntilRef.current = elapsedMs + 180;
          phaseShiftGhostRef.current = { x: ghostOrigin.x, y: ghostOrigin.y, triggerAtMs: elapsedMs + 120 };
          startSecondaryCooldown(elapsedMs);
          addPulse(ghostOrigin.x, ghostOrigin.y, "#d0bfff", 18, 140, 0.18, 2.4);
          addPulse(ship.x, ship.y, "#b494ff", 14, 120, 0.14, 2.1);
          addSparkBurst(ghostOrigin.x, ghostOrigin.y, "#d0bfff", 16, 180, [2.4, 5.8]);
          addSparkBurst(ship.x, ship.y, "#b494ff", 10, 120, [1.8, 4.5]);
          addScreenShake(1.5, 0.08);
          return;
        }
        case "vortex": {
          sfxBomb();
          const vx = ship.x;
          const vy = ship.y - 120;
          vortexRef.current = {
            x: vx,
            y: Math.max(40, vy),
            startMs: elapsedMs,
            endMs: elapsedMs + SHMUP_BALANCE.effects.vortexDurationMs,
          };
          startSecondaryCooldown(elapsedMs);
          addPulse(vx, vy, "#9775fa", 9, 90, 0.24, 2.4);
          addPulse(vx, vy, "#d0bfff", 14, 160, 0.14, 3.2);
          addScreenShake(1.8, 0.1);
          return;
        }
        case "mirrorShield":
          sfxShield();
          mirrorShieldUntilRef.current = elapsedMs + secondaryDurationMs;
          mirrorShieldLayersRef.current = SHMUP_BALANCE.effects.mirrorShieldLayers;
          startSecondaryCooldown(elapsedMs);
          addPulse(ship.x, ship.y, "#4dabf7", 18, 160, 0.16, 2.8);
          addPulse(ship.x, ship.y, "#d0ebff", 12, 96, 0.1, 1.8);
          addSparkBurst(ship.x, ship.y, "#74c0fc", 18, 180, [2.2, 5.6]);
          return;
        case "overcharge":
          sfxDrones();
          overchargeUntilRef.current = elapsedMs + secondaryDurationMs;
          statusFlashUntilRef.current = elapsedMs + 300;
          startSecondaryCooldown(elapsedMs);
          addPulse(ship.x, ship.y, "#ffd43b", 22, 210, 0.2, 3.3);
          addPulse(ship.x, ship.y, "#fff3bf", 14, 130, 0.14, 2.2);
          addSparkBurst(ship.x, ship.y, "#ffd43b", 20, 220, [2.4, 6.2]);
          addScreenShake(1.2, 0.08);
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

      const scoreRecord: GameResult = {
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
        navigate("/shmup-results", { state: { shmupResult, mapId: activeMap?.id } });
      }, bossDefeated ? 650 : 400);
    };

    const handleShipHit = (elapsedMs: number) => {
      if (elapsedMs < ship.invulnerableUntil || runEndedRef.current) return;

      sfxPlayerHit();
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
        sfxExplosion();
        playDeathJingle();
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
        const glowR = ship.radius * 3.8 * displayScale;
        const glow = ctx.createRadialGradient(ship.x, ship.y + 8, 8 * displayScale, ship.x, ship.y + 8, glowR);
        glow.addColorStop(0, overdriveUntilRef.current > elapsedMs ? "rgba(255, 212, 59, 0.42)" : "rgba(69, 199, 255, 0.28)");
        glow.addColorStop(1, "rgba(69, 199, 255, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y + 8, glowR, 0, Math.PI * 2);
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
        ctx.arc(ship.x, ship.y + 3, ship.radius * displayScale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        return;
      }

      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.scale(displayScale, displayScale);
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
      if (pausedRef.current) {
        animationRef.current = requestAnimationFrame(drawLoop);
        return;
      }
      if (!runStartRef.current) runStartRef.current = timestamp;
      if (!lastFrameRef.current) lastFrameRef.current = timestamp;
      // Compensate for time spent paused
      if (pauseTimeRef.current > 0) {
        const pauseDuration = timestamp - pauseTimeRef.current;
        runStartRef.current += pauseDuration;
        lastFrameRef.current = timestamp;
        pauseTimeRef.current = 0;
      }

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

      const introActive = elapsedMs < INTRO_TOTAL_MS;
      const introFlyProgress = Math.min(1, elapsedMs / INTRO_FLY_IN_MS);
      const keyboardMoveX =
        (keysRef.current.has("arrowright") || keysRef.current.has("d") ? 1 : 0) -
        (keysRef.current.has("arrowleft") || keysRef.current.has("a") ? 1 : 0);
      const keyboardMoveY =
        (keysRef.current.has("arrowdown") || keysRef.current.has("s") ? 1 : 0) -
        (keysRef.current.has("arrowup") || keysRef.current.has("w") ? 1 : 0);
      const touchMoveX = touchMoveRef.current.active ? touchMoveRef.current.x : 0;
      const touchMoveY = touchMoveRef.current.active ? touchMoveRef.current.y : 0;
      let moveX = introActive ? 0 : clamp(keyboardMoveX + touchMoveX, -1, 1);
      let moveY = introActive ? 0 : clamp(keyboardMoveY + touchMoveY, -1, 1);

      // Track last nonzero input direction for barrel roll / phase shift
      if (moveX !== 0 || moveY !== 0) {
        const ml = Math.hypot(moveX, moveY);
        lastMoveRef.current = { x: moveX / ml, y: moveY / ml };
      }

      const playerBounds = getPlayerBounds(canvas.width, canvas.height, ship.radius, isMobileDevice);

      // Barrel roll override: dash in roll direction at high speed
      if (barrelRollUntilRef.current > elapsedMs) {
        const rollSpeed = shipSpeed * 3.2;
        const rd = barrelRollDirRef.current;
        ship.x = clamp(ship.x + rd.x * rollSpeed * deltaSeconds, playerBounds.minX, playerBounds.maxX);
        ship.y = clamp(ship.y + rd.y * rollSpeed * deltaSeconds, playerBounds.minY, playerBounds.maxY);
        shipTiltRef.current = rd.x * 0.5;
      } else {
        const moveLength = Math.hypot(moveX, moveY) || 1;
        const velocityScale =
          moveX !== 0 || moveY !== 0 ? shipSpeed * deltaSeconds / moveLength : 0;
        ship.x = clamp(ship.x + moveX * velocityScale, playerBounds.minX, playerBounds.maxX);
        ship.y = clamp(ship.y + moveY * velocityScale, playerBounds.minY, playerBounds.maxY);
        shipTiltRef.current = shipTiltRef.current * 0.82 + moveX * 0.08;
      }

      const introTargetX = canvas.width / 2;
      const introTargetY = clamp(canvas.height * (isMobileDevice ? 0.58 : 0.68), playerBounds.minY, playerBounds.maxY);
      const introStartY = canvas.height + ship.radius * 4;
      if (introActive) {
        ship.x = introTargetX;
        ship.y = introStartY + (introTargetY - introStartY) * introFlyProgress;
      } else {
        fireTimerRef.current -= deltaSeconds;
        let fireInterval = getPrimaryFireInterval(
          primaryKey,
          overdriveUntilRef.current > elapsedMs,
          aggressiveRouteActive
        );
        if (overchargeUntilRef.current > elapsedMs) {
          fireInterval *= SHMUP_BALANCE.effects.overchargeFireRateMult;
        }
        while (fireTimerRef.current <= 0) {
          spawnPlayerBullets(elapsedMs);
          sfxShoot();
          fireTimerRef.current += fireInterval;
        }
      }

      if (dronesUntilRef.current > elapsedMs) {
        droneOrbitRef.current += deltaSeconds * 2.8;
        dronesFireTimerRef.current -= deltaSeconds;
        if (dronesFireTimerRef.current <= 0) {
          dronesFireTimerRef.current += SHMUP_BALANCE.effects.droneFireInterval;
          for (const phase of [0, Math.PI * 0.4, Math.PI * 0.8, Math.PI * 1.2, Math.PI * 1.6]) {
            const orbitX = ship.x + Math.cos(droneOrbitRef.current + phase) * 24;
            const orbitY = ship.y - 10 + Math.sin(droneOrbitRef.current + phase) * 18;
            playerBulletsRef.current.push({
              x: orbitX,
              y: orbitY,
              vx: 0,
              vy: -SHMUP_BALANCE.effects.droneShotSpeed,
              age: 0,
              maxLife: 1.35,
              radius: 3.2 * ENTITY_SCALE,
              damage: SHMUP_BALANCE.effects.droneDamage,
              color: "#00e5ff",
              coreColor: "#b2fff9",
              length: 12 * ENTITY_SCALE,
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

      // Phase shift ghost detonation
      if (phaseShiftGhostRef.current && elapsedMs >= phaseShiftGhostRef.current.triggerAtMs) {
        const ghost = phaseShiftGhostRef.current;
        phaseShiftGhostRef.current = null;
        addExplosion(ghost.x, ghost.y, "#b494ff", 28, 3.2);
        applyAreaBlast(
          ghost.x, ghost.y,
          SHMUP_BALANCE.effects.phaseShiftGhostRadius,
          SHMUP_BALANCE.effects.phaseShiftGhostDamage,
          SHMUP_BALANCE.effects.phaseShiftGhostBossDamage,
          elapsedMs,
          "#d0bfff"
        );
        addOverdrive(10, elapsedMs);
        addScreenShake(2.0, 0.1);
      }

      // Vortex: pull enemies and bullets toward center, then detonate
      if (vortexRef.current) {
        const vt = vortexRef.current;
        if (elapsedMs >= vt.endMs) {
          // Detonate!
          addExplosion(vt.x, vt.y, "#9775fa", 40, 5);
          addExplosion(vt.x, vt.y, "#845ef7", 28, 3.5);
          applyAreaBlast(
            vt.x, vt.y,
            SHMUP_BALANCE.effects.vortexRadius * 1.3,
            SHMUP_BALANCE.effects.vortexDetonateDamage,
            SHMUP_BALANCE.effects.vortexDetonateBossDamage,
            elapsedMs,
            "#9775fa"
          );
          addOverdrive(14, elapsedMs);
          addScreenShake(3.5, 0.15);
          vortexRef.current = null;
        } else {
          // Pull enemies toward vortex center
          const pullR = SHMUP_BALANCE.effects.vortexRadius;
          const pullStr = SHMUP_BALANCE.effects.vortexPullStrength * deltaSeconds;
          for (const enemy of enemiesRef.current) {
            const dx = vt.x - enemy.x;
            const dy = vt.y - enemy.y;
            const dist = Math.hypot(dx, dy);
            if (dist < pullR && dist > 5) {
              const force = pullStr * (1 - dist / pullR);
              enemy.x += (dx / dist) * force;
              enemy.y += (dy / dist) * force;
            }
          }
          // Pull enemy bullets toward vortex
          for (const bullet of enemyBulletsRef.current) {
            const dx = vt.x - bullet.x;
            const dy = vt.y - bullet.y;
            const dist = Math.hypot(dx, dy);
            if (dist < pullR * 1.2 && dist > 5) {
              const force = pullStr * 0.6 * (1 - dist / (pullR * 1.2));
              bullet.vx += (dx / dist) * force * 8;
              bullet.vy += (dy / dist) * force * 8;
            }
          }
          // Absorb enemy bullets that reach vortex center
          for (let i = enemyBulletsRef.current.length - 1; i >= 0; i--) {
            const b = enemyBulletsRef.current[i];
            if (distanceSquared(vt.x, vt.y, b.x, b.y) <= 20 * 20) {
              enemyBulletsRef.current.splice(i, 1);
              addSparkBurst(b.x, b.y, "#9775fa", 2, 60);
            }
          }
        }
      }

      if (!introActive) {
        if (!bossIntroStartedRef.current && elapsedMs >= activeMap.bossTriggerMs) {
          startBossIntro(elapsedMs);
        }

        while (!bossIntroStartedRef.current && elapsedMs + 2200 >= nextWaveStartMsRef.current) {
          queueNextWave();
        }
      }

      while (
        !introActive && queuedWaveSpawnsRef.current.length > 0 &&
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

      // Update damage numbers
      for (const dmg of damageNumbersRef.current) {
        dmg.y += dmg.vy * deltaSeconds;
        dmg.life -= deltaSeconds;
      }
      damageNumbersRef.current = damageNumbersRef.current.filter((d) => d.life > 0);

      // Update trail particles
      for (const trail of trailParticlesRef.current) {
        trail.life -= deltaSeconds;
      }
      trailParticlesRef.current = trailParticlesRef.current.filter((t) => t.life > 0);

      // Spawn trail particles behind player
      if (Math.random() < 0.6) {
        const trailColor = overdriveUntilRef.current > elapsedMs ? "#ffd43b" : "#74c0fc";
        addTrailParticle(ship.x, ship.y, trailColor);
      }

      // Update streak display timer
      if (streakDisplayTimerRef.current > 0) {
        streakDisplayTimerRef.current -= deltaSeconds;
      }

      // Update background debris
      for (const debris of backgroundDebrisRef.current) {
        debris.y += debris.vy * deltaSeconds;
        debris.rotation += debris.rotSpeed * deltaSeconds;
        if (debris.y > canvas.height + 20) {
          debris.y = -20;
          debris.x = Math.random() * canvas.width;
        }
      }

      if (shakeTimeRef.current > 0) {
        shakeTimeRef.current = Math.max(0, shakeTimeRef.current - deltaSeconds);
        if (shakeTimeRef.current === 0) {
          shakePowerRef.current = 0;
        }
      }

      for (const enemy of enemiesRef.current) {
        const enemyDelta = deltaSeconds * enemyTimeScale;
        enemy.age += enemyDelta;

        if (enemy.pattern === "charger") {
          // Charger: drift slowly, pause, then dash at player
          if (enemy.chargeState === "drift") {
            enemy.y += enemy.vy * enemyDelta;
            enemy.x += enemy.vx * enemyDelta;
            enemy.chargeTimer = (enemy.chargeTimer ?? 1.0) - enemyDelta;
            if (enemy.chargeTimer <= 0) {
              enemy.chargeState = "pause";
              enemy.chargeTimer = 0.45;
              enemy.chargeTargetX = ship.x;
              enemy.chargeTargetY = ship.y;
            }
          } else if (enemy.chargeState === "pause") {
            // Pause — vibrate slightly to telegraph
            enemy.x += Math.sin(enemy.age * 40) * 1.5;
            enemy.chargeTimer = (enemy.chargeTimer ?? 0.45) - enemyDelta;
            if (enemy.chargeTimer <= 0) {
              enemy.chargeState = "charge";
              const dx = (enemy.chargeTargetX ?? ship.x) - enemy.x;
              const dy = (enemy.chargeTargetY ?? ship.y) - enemy.y;
              const len = Math.hypot(dx, dy) || 1;
              const chargeSpeed = 520;
              enemy.vx = (dx / len) * chargeSpeed;
              enemy.vy = (dy / len) * chargeSpeed;
            }
          } else {
            // charge — fly straight at target
            enemy.x += enemy.vx * enemyDelta;
            enemy.y += enemy.vy * enemyDelta;
          }
        } else if (enemy.pattern === "splitter") {
          // Splitter moves like sine wave
          enemy.y += enemy.vy * enemyDelta;
          enemy.x = enemy.originX + Math.sin(enemy.age * enemy.frequency) * enemy.amplitude;
        } else if (enemy.pattern === "bomber") {
          // Bomber drifts slowly downward
          enemy.y += enemy.vy * enemyDelta;
          enemy.x += Math.sin(enemy.age * 0.8) * 18 * enemyDelta;
          // Drop area-denial zone on timer
          enemy.bombTimer = (enemy.bombTimer ?? 2.0) - enemyDelta;
          if (enemy.bombTimer <= 0) {
            enemy.bombTimer = 2.2 + Math.random() * 0.8;
            // Create a danger zone at current position
            bomberZonesRef.current.push({
              x: enemy.x, y: enemy.y, radius: 0, maxRadius: 60,
              growSpeed: 120, life: 3.0, damage: 1,
            });
          }
        } else if (enemy.pattern === "dreadnought") {
          // Dreadnought: descend to hold position, then anchor and attack
          const holdY = canvas.height * 0.22;
          if (!enemy.dreadAnchored) {
            enemy.y += enemy.vy * enemyDelta;
            if (enemy.y >= holdY) {
              enemy.y = holdY;
              enemy.dreadAnchored = true;
            }
          } else {
            // Slow lateral sway once anchored
            enemy.x = enemy.originX + Math.sin(enemy.age * 0.4) * 60;
          }

          // Shield phase cycling
          if (enemy.dreadAnchored) {
            if (enemy.dreadShieldActive) {
              enemy.dreadShieldTimer = (enemy.dreadShieldTimer ?? 0) - enemyDelta;
              if (enemy.dreadShieldTimer <= 0) {
                enemy.dreadShieldActive = false;
                enemy.dreadShieldCooldown = 5.0;
              }
            } else {
              enemy.dreadShieldCooldown = (enemy.dreadShieldCooldown ?? 5.0) - enemyDelta;
              if (enemy.dreadShieldCooldown <= 0) {
                enemy.dreadShieldActive = true;
                enemy.dreadShieldTimer = 3.0;
              }
            }

            // Area denial mines (every 4 seconds)
            enemy.dreadAttackTimer = (enemy.dreadAttackTimer ?? 2.0) - enemyDelta;
            if (enemy.dreadAttackTimer <= 0) {
              enemy.dreadAttackTimer = 4.0;
              // Drop slow-moving mine bullets that linger
              for (let i = 0; i < 3; i++) {
                const angle = Math.PI * 0.3 + Math.random() * Math.PI * 0.4;
                pushEnemyBullet({
                  x: enemy.x + (Math.random() - 0.5) * 40,
                  y: enemy.y + enemy.radius,
                  vx: Math.cos(angle) * 45,
                  vy: Math.sin(angle) * 45,
                  radius: 9,
                  color: "#ff6600",
                  coreColor: "#ffcc88",
                  length: 8,
                  spriteKey: "bulletBoss",
                });
              }
            }

            // Beam attack (every 8 seconds, 1s charge + 0.5s fire)
            enemy.dreadBeamTimer = (enemy.dreadBeamTimer ?? 8.0) - enemyDelta;
            if (enemy.dreadBeamTimer <= 0 && !enemy.dreadBeamCharging) {
              enemy.dreadBeamCharging = true;
              enemy.dreadBeamTimer = 1.5; // 1s charge + 0.5s beam
              enemy.dreadBeamAngle = Math.atan2(ship.y - enemy.y, ship.x - enemy.x);
            }
            if (enemy.dreadBeamCharging) {
              enemy.dreadBeamTimer = (enemy.dreadBeamTimer ?? 0) - enemyDelta;
              if (enemy.dreadBeamTimer <= 0) {
                // Fire beam as a line of fast bullets
                const angle = enemy.dreadBeamAngle ?? Math.PI / 2;
                for (let i = 0; i < 8; i++) {
                  pushEnemyBullet({
                    x: enemy.x,
                    y: enemy.y + enemy.radius * 0.5,
                    vx: Math.cos(angle) * (300 + i * 40),
                    vy: Math.sin(angle) * (300 + i * 40),
                    radius: 6,
                    color: "#ff0066",
                    coreColor: "#ffaacc",
                    length: 20,
                    spriteKey: "bulletBoss",
                  });
                }
                enemy.dreadBeamCharging = false;
                enemy.dreadBeamTimer = 8.0;
              }
            }
          }
        } else if (enemy.pattern === "tank") {
          // Tank: slow drift downward with slight sway, shield cycling
          enemy.y += enemy.vy * enemyDelta;
          enemy.x = enemy.originX + Math.sin(enemy.age * 0.5) * 30;
          // Shield cycle
          if (enemy.tankShieldActive) {
            enemy.tankShieldTimer = (enemy.tankShieldTimer ?? 0) - enemyDelta;
            if (enemy.tankShieldTimer <= 0) {
              enemy.tankShieldActive = false;
              enemy.tankShieldCooldown = 6.0;
            }
          } else {
            enemy.tankShieldCooldown = (enemy.tankShieldCooldown ?? 4.0) - enemyDelta;
            if (enemy.tankShieldCooldown <= 0) {
              enemy.tankShieldActive = true;
              enemy.tankShieldTimer = 2.0;
            }
          }
        } else if (enemy.pattern === "sniper") {
          // Sniper stays near top, slight horizontal drift
          enemy.y += enemy.vy * enemyDelta;
          if (enemy.y > 100) { enemy.vy = 0; enemy.y = 100; }
          enemy.x = enemy.originX + Math.sin(enemy.age * 0.6) * 40;
        } else if (enemy.pattern === "swarm") {
          // Swarm — fast straight-line, no shooting
          enemy.y += enemy.vy * enemyDelta;
          enemy.x += enemy.vx * enemyDelta;
        } else if (enemy.pattern === "drifter") {
          enemy.y += enemy.vy * enemyDelta;
          enemy.x += enemy.vx * enemyDelta;
        } else if (enemy.pattern === "sine") {
          enemy.y += enemy.vy * enemyDelta;
          enemy.x = enemy.originX + Math.sin(enemy.age * enemy.frequency) * enemy.amplitude;
        } else if (enemy.pattern === "zigzag") {
          enemy.y += enemy.vy * enemyDelta;
          const base = Math.sin(enemy.age * enemy.frequency);
          const hardTurn = Math.sign(base) * enemy.amplitude * 0.78;
          const jitter = Math.sin(enemy.age * enemy.frequency * 2.6) * enemy.amplitude * 0.22;
          enemy.x = enemy.originX + hardTurn + jitter;
        } else {
          // orbiter
          enemy.y += enemy.vy * enemyDelta;
          enemy.x = enemy.originX + Math.cos(enemy.age * enemy.frequency) * enemy.amplitude;
          enemy.y += Math.sin(enemy.age * enemy.frequency * 0.65) * 22 * enemyDelta;
        }

        // Fire cooldown (swarm and charging chargers don't shoot)
        if (enemy.pattern !== "swarm" && !(enemy.pattern === "charger" && enemy.chargeState === "charge") && !(enemy.pattern === "dreadnought" && !enemy.dreadAnchored)) {
          enemy.fireCooldown -= enemyDelta;
          if (enemy.fireCooldown <= 0) {
            shootEnemyBullets(enemy);
            const FIRE_RATES: Record<string, number> = {
              drifter: 1.2, sine: 1.45, zigzag: 1.05, orbiter: 0.88,
              charger: 1.8, splitter: 1.1, bomber: 2.5, sniper: 2.0,
              dreadnought: 2.0, tank: 1.8,
            };
            enemy.fireCooldown += FIRE_RATES[enemy.pattern] ?? 1.2;
          }
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

        // Determine phase from bossPhases config
        const phases = activeMap.bossPhases;
        const hpRatio = boss.hp / boss.maxHp;
        let newPhase: 1 | 2 | 3 = 1;
        if (phases && phases.length >= 3 && hpRatio <= phases[2].hpThreshold) {
          newPhase = 3;
        } else if (phases && phases.length >= 2 && hpRatio <= phases[1].hpThreshold) {
          newPhase = 2;
        }
        boss.phase = newPhase;

        // Phase transition flash
        if (boss.phase !== boss.lastPhase) {
          boss.phaseTransitionFlash = 0.6;
          boss.lastPhase = boss.phase;
          // Screen shake on phase change
          shakeTimeRef.current = 0.4;
          shakePowerRef.current = 6;
          addExplosion(boss.x, boss.y, "#ffffff", 30, 4);
        }
        if (boss.phaseTransitionFlash > 0) {
          boss.phaseTransitionFlash -= bossDelta;
        }

        const phaseConfig = phases?.[boss.phase - 1];
        const moveSpeed = phaseConfig?.moveSpeed ?? (boss.phase === 1 ? 0.95 : boss.phase === 2 ? 1.35 : 1.8);
        const moveFreq = phaseConfig?.moveFreq ?? (boss.phase === 1 ? 86 : boss.phase === 2 ? 132 : 160);

        const bossTargetY = 118;
        if (boss.y < bossTargetY) {
          boss.y = Math.min(bossTargetY, boss.y + 92 * bossDelta);
        }

        // Boss movement — horizontal sweeps + lunges in later phases
        const baseX = canvas.width / 2 + Math.sin(boss.age * moveSpeed) * moveFreq;
        if (boss.archetype === "tyrant") {
          const pressureX = baseX + Math.sin(boss.age * (boss.phase === 3 ? 4.4 : 3.1)) * (boss.phase === 3 ? 44 : 26);
          boss.x = clamp(pressureX, boss.radius + 12, canvas.width - boss.radius - 12);
        } else if (boss.archetype === "leviathan") {
          const tideX = baseX + Math.sin(boss.age * 1.9) * (boss.phase >= 2 ? 34 : 16);
          boss.x = clamp(tideX, boss.radius + 12, canvas.width - boss.radius - 12);
        } else if (boss.phase === 3) {
          const lungeX = baseX + Math.sin(boss.age * 3.2) * 20;
          boss.x = clamp(lungeX, boss.radius + 12, canvas.width - boss.radius - 12);
        } else {
          boss.x = clamp(baseX, boss.radius + 12, canvas.width - boss.radius - 12);
        }

        boss.fireCooldown -= bossDelta;
        boss.burstCooldown -= bossDelta;

        const fireRate = (phaseConfig?.fireRate ?? (boss.phase === 1 ? 0.85 : 0.58)) * (boss.phase === 1 ? 0.92 : boss.phase === 2 ? 0.84 : 0.76);
        const burstRate = (phaseConfig?.burstRate ?? (boss.phase === 1 ? 2.1 : 1.35)) * (boss.phase === 1 ? 0.9 : boss.phase === 2 ? 0.82 : 0.72);

        if (boss.y >= bossTargetY && boss.fireCooldown <= 0) {
          shootBossBullets(boss);
          boss.fireCooldown += fireRate;
        }
        if (boss.y >= bossTargetY && boss.burstCooldown <= 0) {
          shootBossBurst(boss);
          boss.burstCooldown += burstRate;
        }

        // Sweep laser (dreadnought dominates space, leviathan in late phases)
        if (phaseConfig?.sweepLaser !== false && (boss.archetype === "dreadnought" ? boss.phase >= 2 : boss.archetype === "leviathan" ? boss.phase >= 3 : boss.phase >= 2)) {
          boss.sweepCooldown -= bossDelta;
          if (boss.sweepActive) {
            boss.sweepAngle += (boss.archetype === "dreadnought" ? Math.PI * 0.82 : Math.PI * 0.54) * bossDelta;
            if (boss.sweepAngle > Math.PI * 0.9) {
              boss.sweepActive = false;
              boss.sweepCooldown = boss.archetype === "dreadnought" ? (boss.phase === 3 ? 2.2 : 3.4) : boss.phase === 3 ? 3.6 : 5.0;
            }
          } else if (boss.sweepCooldown <= 0 && boss.y >= bossTargetY) {
            boss.sweepActive = true;
            boss.sweepAngle = boss.archetype === "dreadnought" ? Math.PI * 0.08 : Math.PI * 0.15;
          }
        }

        // Minion summoning, especially aggressive on tyrant and leviathan
        if (phaseConfig?.summonMinions !== false && boss.phase >= (boss.archetype === "tyrant" ? 2 : 3)) {
          boss.minionCooldown -= bossDelta;
          if (boss.minionCooldown <= 0 && boss.y >= bossTargetY) {
            boss.minionCooldown = boss.archetype === "tyrant" ? 3.1 : boss.archetype === "leviathan" ? 3.6 : 4.2;
            const minionCount = boss.archetype === "tyrant" ? 5 : boss.archetype === "leviathan" ? 4 : 4;
            for (let i = 0; i < minionCount; i++) {
              enemiesRef.current.push({
                id: enemyIdRef.current++,
                pattern: "swarm",
                x: boss.x + (i - (minionCount - 1) / 2) * 34,
                y: boss.y + 20,
                originX: boss.x + (i - (minionCount - 1) / 2) * 34,
                vx: (i - (minionCount - 1) / 2) * (boss.archetype === "tyrant" ? 110 : 95),
                vy: boss.archetype === "leviathan" ? 205 : 180,
                radius: 10,
                hp: 1,
                scoreValue: 60,
                fireCooldown: 99,
                age: 0,
                amplitude: 0,
                frequency: 0,
                elite: false,
              });
            }
          }
        }
      }

      // Update bomber danger zones
      for (const zone of bomberZonesRef.current) {
        zone.life -= deltaSeconds;
        if (zone.radius < zone.maxRadius) {
          zone.radius = Math.min(zone.maxRadius, zone.radius + zone.growSpeed * deltaSeconds);
        }
        // Damage player if inside zone
        if (
          elapsedMs > ship.invulnerableUntil &&
          barrierUntilRef.current <= elapsedMs &&
          distanceSquared(ship.x, ship.y, zone.x, zone.y) <= zone.radius * zone.radius
        ) {
          ship.hp -= zone.damage * deltaSeconds;
          if (ship.hp <= 0) {
            finishRun(elapsedMs, false);
          }
        }
      }
      bomberZonesRef.current = bomberZonesRef.current.filter((z) => z.life > 0);

      // Sweep laser collision with player
      if (boss && boss.sweepActive && elapsedMs > ship.invulnerableUntil && barrierUntilRef.current <= elapsedMs) {
        const laserDx = Math.cos(boss.sweepAngle);
        const laserDy = Math.sin(boss.sweepAngle);
        // Point-to-line distance check
        const px = ship.x - boss.x;
        const py = ship.y - boss.y;
        const projLength = px * laserDx + py * laserDy;
        if (projLength > 0) {
          const perpDist = Math.abs(px * laserDy - py * laserDx);
          if (perpDist < ship.radius + 4) {
            ship.hp -= 1;
            ship.invulnerableUntil = elapsedMs + PLAYER_INVULNERABLE_MS;
            addSparkBurst(ship.x, ship.y, "#ff4444", 8, 130);
            shakeTimeRef.current = 0.15;
            shakePowerRef.current = 4;
            if (ship.hp <= 0) {
              finishRun(elapsedMs, false);
            }
          }
        }
      }

      for (let chipIndex = chipsRef.current.length - 1; chipIndex >= 0; chipIndex--) {
        const chip = chipsRef.current[chipIndex];
        const hitDistance = ship.radius + chip.radius + 6;
        if (distanceSquared(ship.x, ship.y, chip.x, chip.y) <= hitDistance * hitDistance) {
          chipsRef.current.splice(chipIndex, 1);
          sfxPowerup();
          if (weaponLevelRef.current < MAX_WEAPON_LEVEL) {
            weaponLevelRef.current = Math.min(MAX_WEAPON_LEVEL, weaponLevelRef.current + 1);
          } else {
            chipOverflowRef.current += 1;
            if (chipOverflowRef.current >= BOMB_OVERFLOW_CHIPS) {
              chipOverflowRef.current = 0;
              addSecondaryCharge(1);
            }
          }
          if (weaponLevelRef.current >= 4) {
            addSecondaryCharge(1);
          }
          addSparkBurst(chip.x, chip.y, "#ffd43b", 8, 92, [2, 4.6]);
          addPulse(chip.x, chip.y, "#ffe066", 8, 78, 0.15, 1.9);
          if (weaponLevelRef.current >= 3) {
            addOverdrive(12, elapsedMs);
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

          // Dreadnought shield reduces damage by 50%
          const shieldMult = (enemy.pattern === "dreadnought" && enemy.dreadShieldActive) ? 0.5 : (enemy.pattern === "tank" && enemy.tankShieldActive) ? 0.5 : 1;
          enemy.hp -= bullet.damage * shieldMult;
          consumePlayerBullet(bulletIndex);
          if (shieldMult < 1) {
            addSparkBurst(bullet.x, bullet.y, "#4488ff", 3, 60);
          } else {
            addSparkBurst(bullet.x, bullet.y, bullet.color, 4, 90);
          }
          addPulse(bullet.x, bullet.y, bullet.color, 4, 42, 0.08, 1.2);
          addDamageNumber(enemy.x, enemy.y - enemy.radius, Math.round(bullet.damage * shieldMult * 10));
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
          addDamageNumber(bullet.x, bullet.y - 10, Math.round(bullet.damage * 10), "#ffd43b");
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
        const distSq = distanceSquared(ship.x, ship.y, bullet.x, bullet.y);

        // Barrel roll: deflect nearby bullets back at enemies
        if (barrelRollUntilRef.current > elapsedMs) {
          const deflectR = SHMUP_BALANCE.effects.barrelRollDeflectRadius;
          if (distSq <= (deflectR + bullet.radius) * (deflectR + bullet.radius)) {
            bullet.vx *= -1.5;
            bullet.vy *= -1.5;
            (bullet as unknown as { deflected?: boolean }).deflected = true;
            playerBulletsRef.current.push({
              x: bullet.x, y: bullet.y,
              vx: bullet.vx, vy: bullet.vy,
              age: 0,
              radius: bullet.radius, length: bullet.length ?? bullet.radius * 2,
              damage: SHMUP_BALANCE.effects.barrelRollDeflectDamage,
              color: "#74c0fc", coreColor: "#e8f4ff",
              maxLife: 1.5,
              spriteKey: bullet.spriteKey,
              pierce: 0, driftVx: 0,
              oscillateAmp: 0, oscillateFreq: 0, oscillatePhase: 0,
              boomerangTurnAt: 0, boomerangReturnVy: 0, boomerangReturning: false,
              homingTurnRate: 0, homingRange: 0,
            });
            enemyBulletsRef.current.splice(bulletIndex, 1);
            addSparkBurst(bullet.x, bullet.y, "#74c0fc", 4, 100);
            continue;
          }
        }

        // Mirror shield: reflect bullets back as damage projectiles, consume layers on side hits
        if (mirrorShieldUntilRef.current > elapsedMs && mirrorShieldLayersRef.current > 0) {
          const mirrorR = ship.radius * 3.2;
          if (distSq <= (mirrorR + bullet.radius) * (mirrorR + bullet.radius)) {
            const dx = bullet.x - ship.x;
            const dy = bullet.y - ship.y;
            const isFront = dy <= ship.radius * 0.5;
            if (isFront) {
              // Front hit: reflect bullet back toward nearest enemy
              const speed = Math.hypot(bullet.vx, bullet.vy) * 1.3;
              let targetAngle = Math.atan2(-bullet.vy, -bullet.vx);
              const nearestEnemy = enemiesRef.current[0];
              if (nearestEnemy) {
                targetAngle = Math.atan2(nearestEnemy.y - bullet.y, nearestEnemy.x - bullet.x);
              }
              playerBulletsRef.current.push({
                x: bullet.x, y: bullet.y,
                vx: Math.cos(targetAngle) * speed,
                vy: Math.sin(targetAngle) * speed,
                age: 0,
                radius: bullet.radius * 1.2, length: (bullet.length ?? bullet.radius * 2) * 1.2,
                damage: SHMUP_BALANCE.effects.mirrorShieldReflectDamage,
                color: "#4dabf7", coreColor: "#d0ebff",
                maxLife: 1.8,
                spriteKey: bullet.spriteKey,
                pierce: 0, driftVx: 0,
                oscillateAmp: 0, oscillateFreq: 0, oscillatePhase: 0,
                boomerangTurnAt: 0, boomerangReturnVy: 0, boomerangReturning: false,
                homingTurnRate: 0, homingRange: 0,
              });
              enemyBulletsRef.current.splice(bulletIndex, 1);
              addSparkBurst(bullet.x, bullet.y, "#4dabf7", 5, 120);
              continue;
            } else {
              // Side/back hit: absorb but lose a layer
              mirrorShieldLayersRef.current -= 1;
              enemyBulletsRef.current.splice(bulletIndex, 1);
              addSparkBurst(bullet.x, bullet.y, "#ff6b6b", 4, 90);
              addScreenShake(0.8, 0.06);
              if (mirrorShieldLayersRef.current <= 0) {
                mirrorShieldUntilRef.current = 0;
                addPulse(ship.x, ship.y, "#ff6b6b", 18, 160, 0.15, 2);
              }
              continue;
            }
          }
        }

        // Barrier with layers: front arc blocks, side hits break layers
        if (barrierUntilRef.current > elapsedMs && barrierLayersRef.current > 0) {
          const dx = bullet.x - ship.x;
          const dy = bullet.y - ship.y;
          const barrierRadius = ship.radius * 2.8;
          if (distSq <= (barrierRadius + bullet.radius) * (barrierRadius + bullet.radius)) {
            const inFrontArc = dy <= ship.radius * 0.7 && Math.abs(dx) <= barrierRadius;
            if (inFrontArc) {
              enemyBulletsRef.current.splice(bulletIndex, 1);
              addSparkBurst(bullet.x, bullet.y, "#8ce99a", 3, 80);
              continue;
            } else {
              // Side hit: break a layer
              barrierLayersRef.current -= 1;
              enemyBulletsRef.current.splice(bulletIndex, 1);
              addSparkBurst(bullet.x, bullet.y, "#ff922b", 4, 90);
              addScreenShake(0.6, 0.05);
              if (barrierLayersRef.current <= 0) {
                barrierUntilRef.current = 0;
                addPulse(ship.x, ship.y, "#ff922b", 16, 140, 0.14, 2);
              }
              continue;
            }
          }
        } else if (barrierUntilRef.current > elapsedMs) {
          // Legacy: no layers but barrier still active (shouldn't happen, but safe fallback)
          const dx = bullet.x - ship.x;
          const dy = bullet.y - ship.y;
          const barrierRadius = ship.radius * 2.8;
          const inFrontArc = dy <= ship.radius * 0.7 && Math.abs(dx) <= barrierRadius;
          if (
            inFrontArc &&
            distSq <= (barrierRadius + bullet.radius) * (barrierRadius + bullet.radius)
          ) {
            enemyBulletsRef.current.splice(bulletIndex, 1);
            addSparkBurst(bullet.x, bullet.y, "#8ce99a", 3, 80);
            continue;
          }
        }

        const hitDistance = ship.radius + bullet.radius;
        if (distSq <= hitDistance * hitDistance) {
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

      // Parallax background debris/asteroids
      for (const debris of backgroundDebrisRef.current) {
        ctx.save();
        ctx.globalAlpha = debris.alpha;
        ctx.translate(debris.x, debris.y);
        ctx.rotate(debris.rotation);
        ctx.fillStyle = "#4a5568";
        ctx.strokeStyle = "#718096";
        ctx.lineWidth = 0.5;
        if (debris.shape === 0) {
          // Irregular polygon
          ctx.beginPath();
          ctx.moveTo(-debris.radius, -debris.radius * 0.5);
          ctx.lineTo(debris.radius * 0.3, -debris.radius);
          ctx.lineTo(debris.radius, -debris.radius * 0.2);
          ctx.lineTo(debris.radius * 0.7, debris.radius * 0.8);
          ctx.lineTo(-debris.radius * 0.5, debris.radius);
          ctx.closePath();
        } else if (debris.shape === 1) {
          // Small circle
          ctx.beginPath();
          ctx.arc(0, 0, debris.radius * 0.7, 0, Math.PI * 2);
        } else {
          // Diamond
          ctx.beginPath();
          ctx.moveTo(0, -debris.radius);
          ctx.lineTo(debris.radius * 0.6, 0);
          ctx.lineTo(0, debris.radius);
          ctx.lineTo(-debris.radius * 0.6, 0);
          ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

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

      const zonePulse = 0.5 + Math.sin(elapsedMs / 520) * 0.5;
      if (activeMap.id === "nebula-runway") {
        ctx.save();
        ctx.strokeStyle = `rgba(150, 220, 255, ${0.08 + zonePulse * 0.12})`;
        ctx.lineWidth = 2;
        for (let i = -2; i < 5; i++) {
          const x = ((elapsedMs * 0.08 + i * 180) % (canvas.width + 220)) - 110;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + 110, canvas.height);
          ctx.stroke();
        }
        ctx.restore();
      } else if (activeMap.id === "solar-rift") {
        ctx.save();
        for (let i = 0; i < 5; i++) {
          const flareX = ((elapsedMs * 0.12 + i * 160) % (canvas.width + 260)) - 130;
          const flare = ctx.createLinearGradient(flareX, 0, flareX + 120, canvas.height);
          flare.addColorStop(0, "rgba(255, 160, 64, 0)");
          flare.addColorStop(0.5, `rgba(255, 140, 40, ${0.05 + zonePulse * 0.06})`);
          flare.addColorStop(1, "rgba(255, 220, 120, 0)");
          ctx.fillStyle = flare;
          ctx.fillRect(flareX, 0, 120, canvas.height);
        }
        ctx.restore();
      } else if (activeMap.id === "abyss-crown") {
        ctx.save();
        ctx.strokeStyle = `rgba(170, 220, 255, ${0.05 + zonePulse * 0.08})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          const y = ((elapsedMs * 0.05 + i * 120) % (canvas.height + 160)) - 80;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.bezierCurveTo(canvas.width * 0.25, y - 30, canvas.width * 0.75, y + 30, canvas.width, y - 10);
          ctx.stroke();
        }
        ctx.restore();
      }

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
        ctx.scale(displayScale, displayScale);
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
        ctx.scale(displayScale, displayScale);
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
        const ENEMY_COLORS: Record<string, string> = {
          drifter: "#f06595", sine: "#845ef7", zigzag: "#ff922b", orbiter: "#74c0fc",
          charger: "#ff6b6b", splitter: "#69db7c", bomber: "#ffa94d", sniper: "#ff0000", swarm: "#adb5bd",
          tank: "#66d9ef",
        };
        const ENEMY_CORE_DARK: Record<string, string> = {
          drifter: "#a03060", sine: "#5030a0", zigzag: "#b06010", orbiter: "#3070a0",
          charger: "#a03030", splitter: "#2b8a3e", bomber: "#b06010", sniper: "#800000", swarm: "#495057",
          tank: "#1a5276",
        };
        const enemyColor = enemy.elite ? "#ffd700" : (ENEMY_COLORS[enemy.pattern] ?? "#845ef7");
        const enemyCoreDark = enemy.elite ? "#b8860b" : (ENEMY_CORE_DARK[enemy.pattern] ?? "#5030a0");
        if (sprite) {
          ctx.save();
          const eGlowR = enemy.radius * 2.4 * displayScale;
          const glow = ctx.createRadialGradient(enemy.x, enemy.y, 4 * displayScale, enemy.x, enemy.y, eGlowR);
          glow.addColorStop(0, `${enemyColor}33`);
          glow.addColorStop(1, "rgba(151, 117, 250, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, eGlowR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          drawSpriteCentered(sprite, enemy.x, enemy.y, enemy.radius * 3.5, enemy.radius * 3.5);
        } else {
          const r = enemy.radius;
          const pulse = 0.92 + Math.sin(enemy.age * 4.5) * 0.08;
          ctx.save();
          ctx.translate(enemy.x, enemy.y);
          ctx.scale(displayScale, displayScale);

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
          } else if (enemy.pattern === "charger") {
            // Charger — arrow-shaped aggressive ship
            const grad = ctx.createLinearGradient(0, -r, 0, r);
            grad.addColorStop(0, enemyColor);
            grad.addColorStop(1, enemyCoreDark);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, -r * 1.2);
            ctx.lineTo(r * 0.7, r * 0.1);
            ctx.lineTo(r * 0.4, r * 0.8);
            ctx.lineTo(0, r * 0.5);
            ctx.lineTo(-r * 0.4, r * 0.8);
            ctx.lineTo(-r * 0.7, r * 0.1);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            // Thrust glow when charging
            if (enemy.chargeState === "charge") {
              ctx.fillStyle = `rgba(255,100,50,${0.8 * pulse})`;
              ctx.beginPath();
              ctx.ellipse(0, r * 0.7, r * 0.3, r * 0.5, 0, 0, Math.PI * 2);
              ctx.fill();
            } else if (enemy.chargeState === "pause") {
              // Warning pulse
              ctx.strokeStyle = `rgba(255,50,50,${0.6 * pulse})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
              ctx.stroke();
            }
          } else if (enemy.pattern === "splitter") {
            // Splitter — hexagonal pod
            const grad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
            grad.addColorStop(0, "#b2f2bb");
            grad.addColorStop(0.5, enemyColor);
            grad.addColorStop(1, enemyCoreDark);
            ctx.fillStyle = grad;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const a = (Math.PI / 3) * i - Math.PI / 2;
              const method = i === 0 ? "moveTo" : "lineTo";
              ctx[method](Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
            }
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            // Inner split line
            ctx.strokeStyle = `rgba(255,255,255,${0.4 * pulse})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -r * 0.7);
            ctx.lineTo(0, r * 0.7);
            ctx.stroke();
          } else if (enemy.pattern === "bomber") {
            // Bomber — wide heavy ship
            const grad = ctx.createLinearGradient(0, -r, 0, r * 1.2);
            grad.addColorStop(0, enemyColor);
            grad.addColorStop(1, enemyCoreDark);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, -r * 0.8);
            ctx.lineTo(r * 1.1, -r * 0.2);
            ctx.lineTo(r * 1.0, r * 0.6);
            ctx.lineTo(r * 0.4, r * 1.0);
            ctx.lineTo(-r * 0.4, r * 1.0);
            ctx.lineTo(-r * 1.0, r * 0.6);
            ctx.lineTo(-r * 1.1, -r * 0.2);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            // Bomb bay indicator
            ctx.fillStyle = `rgba(255,200,50,${0.5 * pulse})`;
            ctx.beginPath();
            ctx.arc(0, r * 0.3, r * 0.2, 0, Math.PI * 2);
            ctx.fill();
          } else if (enemy.pattern === "tank") {
            // Tank — large armored octagonal hull
            const r = enemy.radius;
            const grad = ctx.createLinearGradient(0, -r * 1.1, 0, r * 1.1);
            grad.addColorStop(0, enemyColor);
            grad.addColorStop(0.5, "#2c7fb8");
            grad.addColorStop(1, enemyCoreDark);
            ctx.fillStyle = grad;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
              const a = (Math.PI / 4) * i - Math.PI / 2;
              const method = i === 0 ? "moveTo" : "lineTo";
              ctx[method](Math.cos(a) * r * 1.0, Math.sin(a) * r * 1.0);
            }
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            // Armor cross-plates
            ctx.strokeStyle = `rgba(102,217,239,${0.4 * pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-r * 0.8, 0);
            ctx.lineTo(r * 0.8, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, -r * 0.8);
            ctx.lineTo(0, r * 0.8);
            ctx.stroke();
            // Central reactor
            ctx.fillStyle = `rgba(102,217,239,${0.7 * pulse})`;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
            ctx.fill();
            // HP bar
            if (enemy.tankMaxHp && enemy.tankMaxHp > 0) {
              const barWidth = r * 2.2;
              const barHeight = 4;
              const barY = -r * 1.3;
              const hpRatio = Math.max(0, enemy.hp / enemy.tankMaxHp);
              ctx.fillStyle = "rgba(0,0,0,0.6)";
              ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
              const hpColor = hpRatio > 0.5 ? "#44ff66" : hpRatio > 0.25 ? "#ffaa22" : "#ff3333";
              ctx.fillStyle = hpColor;
              ctx.fillRect(-barWidth / 2, barY, barWidth * hpRatio, barHeight);
              ctx.strokeStyle = "rgba(255,255,255,0.3)";
              ctx.lineWidth = 0.5;
              ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
            }
            // Shield ring when active
            if (enemy.tankShieldActive) {
              ctx.save();
              ctx.strokeStyle = `rgba(102,217,239,${0.6 + Math.sin(enemy.age * 8) * 0.3})`;
              ctx.lineWidth = 3;
              ctx.shadowColor = "#66d9ef";
              ctx.shadowBlur = 15;
              ctx.beginPath();
              ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
              ctx.stroke();
              ctx.strokeStyle = `rgba(150,230,255,${0.3 + Math.sin(enemy.age * 12) * 0.2})`;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }
          } else if (enemy.pattern === "dreadnought") {
            // Dreadnought — massive armored warship
            const r = enemy.radius;
            const grad = ctx.createLinearGradient(0, -r * 1.2, 0, r * 1.2);
            grad.addColorStop(0, "#cc2244");
            grad.addColorStop(0.4, "#881133");
            grad.addColorStop(1, "#440818");
            ctx.fillStyle = grad;
            // Main hull — wide armored body
            ctx.beginPath();
            ctx.moveTo(0, -r * 1.1);
            ctx.lineTo(r * 0.5, -r * 0.8);
            ctx.lineTo(r * 1.3, -r * 0.2);
            ctx.lineTo(r * 1.4, r * 0.3);
            ctx.lineTo(r * 1.1, r * 0.8);
            ctx.lineTo(r * 0.5, r * 1.1);
            ctx.lineTo(-r * 0.5, r * 1.1);
            ctx.lineTo(-r * 1.1, r * 0.8);
            ctx.lineTo(-r * 1.4, r * 0.3);
            ctx.lineTo(-r * 1.3, -r * 0.2);
            ctx.lineTo(-r * 0.5, -r * 0.8);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;

            // Armor plating lines
            ctx.strokeStyle = `rgba(255,100,100,${0.3 * pulse})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-r * 1.0, 0);
            ctx.lineTo(r * 1.0, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-r * 0.7, -r * 0.5);
            ctx.lineTo(r * 0.7, -r * 0.5);
            ctx.stroke();

            // Central reactor core
            ctx.fillStyle = `rgba(255,50,50,${0.7 * pulse})`;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
            ctx.fill();
            // Reactor glow ring
            ctx.strokeStyle = `rgba(255,100,50,${0.5 * pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
            ctx.stroke();

            // Weapon turrets (left and right)
            ctx.fillStyle = "#aa2244";
            ctx.beginPath();
            ctx.arc(-r * 0.9, r * 0.1, r * 0.18, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(r * 0.9, r * 0.1, r * 0.18, 0, Math.PI * 2);
            ctx.fill();

            // HP bar
            if (enemy.dreadMaxHp && enemy.dreadMaxHp > 0) {
              const barWidth = r * 2.4;
              const barHeight = 4;
              const barY = -r * 1.4;
              const hpRatio = Math.max(0, enemy.hp / enemy.dreadMaxHp);
              ctx.fillStyle = "rgba(0,0,0,0.6)";
              ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
              const hpColor = hpRatio > 0.5 ? "#44ff66" : hpRatio > 0.25 ? "#ffaa22" : "#ff3333";
              ctx.fillStyle = hpColor;
              ctx.fillRect(-barWidth / 2, barY, barWidth * hpRatio, barHeight);
              ctx.strokeStyle = "rgba(255,255,255,0.3)";
              ctx.lineWidth = 0.5;
              ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
            }

            // Shield effect (drawn around the ship when active)
            if (enemy.dreadShieldActive) {
              ctx.save();
              ctx.strokeStyle = `rgba(68,136,255,${0.6 + Math.sin(enemy.age * 8) * 0.3})`;
              ctx.lineWidth = 3;
              ctx.shadowColor = "#4488ff";
              ctx.shadowBlur = 15;
              ctx.beginPath();
              ctx.ellipse(0, 0, r * 1.6, r * 1.3, 0, 0, Math.PI * 2);
              ctx.stroke();
              // Inner shimmer
              ctx.strokeStyle = `rgba(100,180,255,${0.3 + Math.sin(enemy.age * 12) * 0.2})`;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.ellipse(0, 0, r * 1.45, r * 1.15, enemy.age * 0.5, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }

            // Beam charge warning
            if (enemy.dreadBeamCharging && enemy.dreadBeamAngle !== undefined) {
              ctx.save();
              const beamAlpha = 0.3 + Math.sin(enemy.age * 20) * 0.2;
              ctx.strokeStyle = `rgba(255,0,102,${beamAlpha})`;
              ctx.lineWidth = 2;
              ctx.setLineDash([8, 4]);
              ctx.beginPath();
              ctx.moveTo(0, 0);
              const beamLen = 600;
              ctx.lineTo(
                Math.cos(enemy.dreadBeamAngle) * beamLen,
                Math.sin(enemy.dreadBeamAngle) * beamLen
              );
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.restore();
            }
          } else if (enemy.pattern === "sniper") {
            // Sniper — thin elongated ship
            const grad = ctx.createLinearGradient(0, -r * 1.3, 0, r);
            grad.addColorStop(0, enemyColor);
            grad.addColorStop(1, enemyCoreDark);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, -r * 1.3);
            ctx.lineTo(r * 0.3, -r * 0.4);
            ctx.lineTo(r * 0.5, r * 0.5);
            ctx.lineTo(r * 0.2, r * 1.0);
            ctx.lineTo(-r * 0.2, r * 1.0);
            ctx.lineTo(-r * 0.5, r * 0.5);
            ctx.lineTo(-r * 0.3, -r * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            // Scope lens
            ctx.fillStyle = `rgba(255,0,0,${0.7 * pulse})`;
            ctx.beginPath();
            ctx.arc(0, -r * 0.6, r * 0.12, 0, Math.PI * 2);
            ctx.fill();
          } else if (enemy.pattern === "swarm") {
            // Swarm — tiny triangle
            const grad = ctx.createLinearGradient(0, -r, 0, r);
            grad.addColorStop(0, enemyColor);
            grad.addColorStop(1, enemyCoreDark);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, -r * 0.9);
            ctx.lineTo(r * 0.7, r * 0.6);
            ctx.lineTo(-r * 0.7, r * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
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

          // Elite glow ring
          if (enemy.elite) {
            ctx.strokeStyle = `rgba(255,215,0,${0.6 * pulse})`;
            ctx.lineWidth = 2;
            ctx.shadowColor = "#ffd700";
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
          }

          ctx.restore();
        }

        // Sniper warning line (drawn outside transform)
        if (enemy.pattern === "sniper" && enemy.sniperLocked) {
          ctx.save();
          ctx.strokeStyle = "rgba(255,0,0,0.3)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(enemy.x, enemy.y + enemy.radius);
          ctx.lineTo(enemy.sniperLockX ?? ship.x, enemy.sniperLockY ?? ship.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      }

      // Bomber danger zones
      for (const zone of bomberZonesRef.current) {
        const alpha = clamp(zone.life / 3.0, 0.1, 0.5);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(255,100,0,0.15)";
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,140,0,${alpha * 1.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (bossRef.current) {
        const boss = bossRef.current;
        // Bosses are rendered procedurally per archetype — distinct designs per zone
        const sprite: HTMLImageElement | null = null;

        // Phase transition flash
        if (boss.phaseTransitionFlash > 0) {
          ctx.save();
          ctx.globalAlpha = boss.phaseTransitionFlash;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        }

        if (sprite) {
          ctx.save();
          const bGlowR = boss.radius * 3.4 * displayScale;
          const glow = ctx.createRadialGradient(boss.x, boss.y + 12, 12 * displayScale, boss.x, boss.y + 12, bGlowR);
          glow.addColorStop(
            0,
            boss.phase === 1 ? `${activeMap.palette.bossPrimary}33` : `${activeMap.palette.bossSecondary}3d`
          );
          glow.addColorStop(1, "rgba(255, 146, 43, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(boss.x, boss.y + 10, bGlowR, 0, Math.PI * 2);
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
          const bossColor = boss.phase === 1
            ? activeMap.palette.bossPrimary
            : boss.phase === 2
              ? activeMap.palette.bossSecondary
              : "#ff2222";
          const bPulse = 0.88 + Math.sin(boss.age * 2.5) * 0.12;
          ctx.save();
          ctx.translate(boss.x, boss.y);
          ctx.scale(displayScale, displayScale);
          ctx.shadowColor = bossColor;
          ctx.shadowBlur = 24;

          if (boss.archetype === "dreadnought") {
            // ─────────────────────────────────────────────────
            // AEGIS DREADNOUGHT — heavy armored patrol fortress
            // Wide flat hull, quad turret batteries, command dome
            // Zone: Nebula Runway — blockade enforcer
            // ─────────────────────────────────────────────────
            const hullGrad = ctx.createLinearGradient(0, -br * 1.0, 0, br * 1.1);
            hullGrad.addColorStop(0, bossColor);
            hullGrad.addColorStop(0.55, "#1a1040");
            hullGrad.addColorStop(1, "#0b0820");
            ctx.fillStyle = hullGrad;
            // Wide armored hull — blocky, fortified, wide/flat ratio
            ctx.beginPath();
            ctx.moveTo(0, -br * 1.0);
            ctx.lineTo(br * 0.55, -br * 0.82);
            ctx.lineTo(br * 1.3, -br * 0.35);
            ctx.lineTo(br * 1.45, br * 0.15);
            ctx.lineTo(br * 1.15, br * 0.65);
            ctx.lineTo(br * 0.5, br * 0.9);
            ctx.lineTo(0, br * 0.75);
            ctx.lineTo(-br * 0.5, br * 0.9);
            ctx.lineTo(-br * 1.15, br * 0.65);
            ctx.lineTo(-br * 1.45, br * 0.15);
            ctx.lineTo(-br * 1.3, -br * 0.35);
            ctx.lineTo(-br * 0.55, -br * 0.82);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;

            // Shoulder armor plates
            const shoulderGrad = ctx.createLinearGradient(0, -br * 0.3, 0, br * 0.4);
            shoulderGrad.addColorStop(0, `${bossColor}88`);
            shoulderGrad.addColorStop(1, `${bossColor}22`);
            ctx.fillStyle = shoulderGrad;
            ctx.beginPath(); // right
            ctx.moveTo(br * 1.15, -br * 0.1);
            ctx.lineTo(br * 1.62, -br * 0.28);
            ctx.lineTo(br * 1.72, br * 0.28);
            ctx.lineTo(br * 1.3, br * 0.55);
            ctx.lineTo(br * 1.1, br * 0.22);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath(); // left
            ctx.moveTo(-br * 1.15, -br * 0.1);
            ctx.lineTo(-br * 1.62, -br * 0.28);
            ctx.lineTo(-br * 1.72, br * 0.28);
            ctx.lineTo(-br * 1.3, br * 0.55);
            ctx.lineTo(-br * 1.1, br * 0.22);
            ctx.closePath();
            ctx.fill();

            // Quad turret batteries
            ctx.fillStyle = `rgba(255,255,255,${0.45 * bPulse})`;
            for (const tx of [-br * 0.72, -br * 0.24, br * 0.24, br * 0.72]) {
              ctx.beginPath();
              ctx.ellipse(tx, -br * 0.45, br * 0.13, br * 0.09, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = `rgba(200,220,255,${0.5 * bPulse})`;
              ctx.fillRect(tx - br * 0.03, -br * 0.65, br * 0.06, br * 0.22);
              ctx.fillStyle = `rgba(255,255,255,${0.45 * bPulse})`;
            }

            // Central command dome
            const domeGrad = ctx.createRadialGradient(0, -br * 0.1, 1, 0, -br * 0.1, br * 0.42);
            domeGrad.addColorStop(0, "#ffffff");
            domeGrad.addColorStop(0.25, bossColor);
            domeGrad.addColorStop(0.7, `${bossColor}55`);
            domeGrad.addColorStop(1, `${bossColor}00`);
            ctx.fillStyle = domeGrad;
            ctx.beginPath();
            ctx.ellipse(0, -br * 0.1, br * 0.42 * bPulse, br * 0.28 * bPulse, 0, 0, Math.PI * 2);
            ctx.fill();

            // Engine exhaust array
            ctx.fillStyle = `rgba(160,200,255,${0.7 * bPulse})`;
            for (const ex of [-br * 0.55, 0, br * 0.55]) {
              ctx.beginPath();
              ctx.ellipse(ex, br * 0.85, br * 0.09, br * 0.18, 0, 0, Math.PI * 2);
              ctx.fill();
            }

            // Hull armor panel lines
            ctx.strokeStyle = `${bossColor}66`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, -br * 0.8); ctx.lineTo(0, br * 0.65);       // spine
            ctx.moveTo(-br * 0.8, -br * 0.2); ctx.lineTo(br * 0.8, -br * 0.2); // cross brace
            ctx.moveTo(-br * 0.55, -br * 0.8); ctx.lineTo(-br * 0.3, br * 0.4); // left rib
            ctx.moveTo(br * 0.55, -br * 0.8); ctx.lineTo(br * 0.3, br * 0.4);   // right rib
            ctx.stroke();

          } else if (boss.archetype === "tyrant") {
            // ─────────────────────────────────────────────────
            // HELIOS TYRANT — solar-powered weapons platform
            // Diamond core, forward-swept wings, twin cannon array
            // Zone: Solar Rift — thermal fortress siege engine
            // ─────────────────────────────────────────────────
            const hullGrad = ctx.createLinearGradient(0, -br * 1.3, 0, br * 1.4);
            hullGrad.addColorStop(0, bossColor);
            hullGrad.addColorStop(0.4, "#2e0c00");
            hullGrad.addColorStop(1, "#140500");
            ctx.fillStyle = hullGrad;
            // Diamond core body — aggressive forward-pointing silhouette
            ctx.beginPath();
            ctx.moveTo(0, -br * 1.3);           // nose
            ctx.lineTo(br * 0.55, -br * 0.5);
            ctx.lineTo(br * 0.65, br * 0.3);
            ctx.lineTo(br * 0.3, br * 0.9);
            ctx.lineTo(0, br * 1.0);
            ctx.lineTo(-br * 0.3, br * 0.9);
            ctx.lineTo(-br * 0.65, br * 0.3);
            ctx.lineTo(-br * 0.55, -br * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;

            // Forward-swept weapon wings
            const wingGrad = ctx.createLinearGradient(0, -br * 0.3, br * 2.0, br * 0.6);
            wingGrad.addColorStop(0, `${bossColor}cc`);
            wingGrad.addColorStop(0.5, `${bossColor}55`);
            wingGrad.addColorStop(1, `${bossColor}11`);
            ctx.fillStyle = wingGrad;
            ctx.beginPath(); // right wing
            ctx.moveTo(br * 0.5, -br * 0.4);
            ctx.lineTo(br * 1.9, -br * 0.9);
            ctx.lineTo(br * 2.0, -br * 0.3);
            ctx.lineTo(br * 1.6, br * 0.5);
            ctx.lineTo(br * 0.6, br * 0.25);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath(); // left wing
            ctx.moveTo(-br * 0.5, -br * 0.4);
            ctx.lineTo(-br * 1.9, -br * 0.9);
            ctx.lineTo(-br * 2.0, -br * 0.3);
            ctx.lineTo(-br * 1.6, br * 0.5);
            ctx.lineTo(-br * 0.6, br * 0.25);
            ctx.closePath();
            ctx.fill();

            // Solar turbine rings on wingtips
            for (const wx of [-br * 1.75, br * 1.75]) {
              ctx.strokeStyle = `rgba(255,200,80,${0.7 * bPulse})`;
              ctx.lineWidth = br * 0.08;
              ctx.shadowColor = "#ffaa00";
              ctx.shadowBlur = 12;
              ctx.beginPath();
              ctx.arc(wx, -br * 0.12, br * 0.32, 0, Math.PI * 2);
              ctx.stroke();
              ctx.fillStyle = `rgba(255,220,120,${0.9 * bPulse})`;
              ctx.shadowBlur = 0;
              ctx.beginPath();
              ctx.arc(wx, -br * 0.12, br * 0.14, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.shadowBlur = 0;

            // Twin cannon barrels pointing down at player
            ctx.fillStyle = `rgba(255,180,60,${0.8 * bPulse})`;
            ctx.beginPath();
            ctx.rect(-br * 0.22, br * 0.6, br * 0.14, br * 0.8);
            ctx.fill();
            ctx.beginPath();
            ctx.rect(br * 0.08, br * 0.6, br * 0.14, br * 0.8);
            ctx.fill();
            // Cannon muzzle glow
            ctx.shadowColor = "#ffff00";
            ctx.shadowBlur = 14;
            ctx.fillStyle = `rgba(255,255,100,${bPulse})`;
            for (const cx of [-br * 0.15, br * 0.15]) {
              ctx.beginPath();
              ctx.arc(cx, br * 1.35, br * 0.1 * bPulse, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.shadowBlur = 0;

            // Targeting array at nose
            ctx.strokeStyle = `rgba(255,220,100,${0.6 * bPulse})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, -br * 1.3); ctx.lineTo(-br * 0.2, -br * 0.9);
            ctx.moveTo(0, -br * 1.3); ctx.lineTo(br * 0.2, -br * 0.9);
            ctx.stroke();
            ctx.fillStyle = `rgba(255,255,100,${bPulse})`;
            ctx.beginPath();
            ctx.arc(0, -br * 1.2, br * 0.07 * bPulse, 0, Math.PI * 2);
            ctx.fill();

            // Hot exhaust vents along stern
            ctx.fillStyle = `rgba(255,120,30,${0.65 * bPulse})`;
            for (const vx of [-br * 0.55, -br * 0.25, br * 0.25, br * 0.55]) {
              ctx.beginPath();
              ctx.ellipse(vx, br * 0.85, br * 0.07, br * 0.14, 0, 0, Math.PI * 2);
              ctx.fill();
            }

            // Wing panel lines
            ctx.strokeStyle = `${bossColor}55`;
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(0, -br * 1.0); ctx.lineTo(0, br * 0.7);
            ctx.moveTo(-br * 0.45, -br * 0.3); ctx.lineTo(-br * 1.4, -br * 0.6);
            ctx.moveTo(br * 0.45, -br * 0.3); ctx.lineTo(br * 1.4, -br * 0.6);
            ctx.stroke();

          } else {
            // ─────────────────────────────────────────────────
            // CRYO LEVIATHAN — ancient deep-void entity
            // Organic body, void wings, crystal spines, multi-eye cluster
            // Zone: Abyss Crown — the void doesn't build ships, it becomes them
            // ─────────────────────────────────────────────────
            const hullGrad = ctx.createLinearGradient(0, -br * 1.6, 0, br * 1.5);
            hullGrad.addColorStop(0, `${bossColor}cc`);
            hullGrad.addColorStop(0.35, "#071528");
            hullGrad.addColorStop(0.75, "#03101f");
            hullGrad.addColorStop(1, bossColor);
            ctx.fillStyle = hullGrad;
            // Elongated organic body — bezier curves, not straight lines
            ctx.beginPath();
            ctx.moveTo(0, -br * 1.6);
            ctx.bezierCurveTo(br * 0.4, -br * 1.3, br * 0.55, -br * 0.5, br * 0.45, br * 0.4);
            ctx.bezierCurveTo(br * 0.35, br * 1.0, br * 0.2, br * 1.4, 0, br * 1.6);
            ctx.bezierCurveTo(-br * 0.2, br * 1.4, -br * 0.35, br * 1.0, -br * 0.45, br * 0.4);
            ctx.bezierCurveTo(-br * 0.55, -br * 0.5, -br * 0.4, -br * 1.3, 0, -br * 1.6);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;

            // Void wings — massive organic manta-ray sweep
            const voidWingGrad = ctx.createLinearGradient(0, -br * 0.3, br * 2.6, br * 1.0);
            voidWingGrad.addColorStop(0, `${bossColor}aa`);
            voidWingGrad.addColorStop(0.4, `${bossColor}44`);
            voidWingGrad.addColorStop(1, `${bossColor}08`);
            ctx.fillStyle = voidWingGrad;
            ctx.beginPath(); // right wing
            ctx.moveTo(br * 0.35, -br * 0.6);
            ctx.bezierCurveTo(br * 1.2, -br * 1.2, br * 2.5, -br * 0.8, br * 2.6, br * 0.1);
            ctx.bezierCurveTo(br * 2.4, br * 0.8, br * 1.4, br * 1.1, br * 0.4, br * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath(); // left wing
            ctx.moveTo(-br * 0.35, -br * 0.6);
            ctx.bezierCurveTo(-br * 1.2, -br * 1.2, -br * 2.5, -br * 0.8, -br * 2.6, br * 0.1);
            ctx.bezierCurveTo(-br * 2.4, br * 0.8, -br * 1.4, br * 1.1, -br * 0.4, br * 0.7);
            ctx.closePath();
            ctx.fill();

            // Crystal spine array along dorsal surface
            ctx.fillStyle = `rgba(160,230,255,${0.85 * bPulse})`;
            ctx.shadowColor = "#a0e8ff";
            ctx.shadowBlur = 10;
            const spineYs = [-br * 1.1, -br * 0.65, -br * 0.2, br * 0.25, br * 0.7, br * 1.1];
            for (let si = 0; si < spineYs.length; si++) {
              const sy = spineYs[si];
              const sh = br * (0.22 + 0.12 * Math.sin(si * 1.4));
              ctx.beginPath();
              ctx.moveTo(0, sy);
              ctx.lineTo(-br * 0.08, sy + sh * 0.6);
              ctx.lineTo(0, sy + sh);
              ctx.lineTo(br * 0.08, sy + sh * 0.6);
              ctx.closePath();
              ctx.fill();
            }
            ctx.shadowBlur = 0;

            // Multi-eye clusters
            const eyePos: [number, number][] = [
              [-br * 0.18, -br * 1.1], [br * 0.18, -br * 1.1],
              [-br * 0.25, -br * 0.4], [br * 0.25, -br * 0.4],
            ];
            for (const [ex, ey] of eyePos) {
              const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, br * 0.13);
              eg.addColorStop(0, "#ffffff");
              eg.addColorStop(0.3, bossColor);
              eg.addColorStop(1, `${bossColor}00`);
              ctx.fillStyle = eg;
              ctx.beginPath();
              ctx.arc(ex, ey, br * 0.13 * bPulse, 0, Math.PI * 2);
              ctx.fill();
            }

            // Central void-mouth weapon port
            const voidGrad = ctx.createRadialGradient(0, br * 0.1, 2, 0, br * 0.1, br * 0.45);
            voidGrad.addColorStop(0, "#000000");
            voidGrad.addColorStop(0.4, `${bossColor}88`);
            voidGrad.addColorStop(0.7, `${bossColor}33`);
            voidGrad.addColorStop(1, `${bossColor}00`);
            ctx.fillStyle = voidGrad;
            ctx.shadowColor = bossColor;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.ellipse(0, br * 0.1, br * 0.45 * bPulse, br * 0.32 * bPulse, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Ice crystal formations at wingtips
            ctx.fillStyle = `rgba(180,240,255,${0.65 * bPulse})`;
            ctx.shadowColor = "#b4f0ff";
            ctx.shadowBlur = 8;
            for (const [wxBase, dir] of [[br * 2.2, 1], [-br * 2.2, -1]] as [number, number][]) {
              for (let ci = 0; ci < 3; ci++) {
                const angle = (ci - 1) * 0.4 + (dir === 1 ? 0.2 : -0.2);
                const cLen = br * (0.25 + ci * 0.08);
                ctx.beginPath();
                ctx.moveTo(wxBase, -br * 0.05);
                ctx.lineTo(wxBase + dir * Math.cos(angle) * cLen, -br * 0.05 + Math.sin(angle) * cLen);
                ctx.lineTo(wxBase + dir * Math.cos(angle) * cLen * 0.4, -br * 0.05 + Math.sin(angle + 0.6) * cLen * 0.3);
                ctx.closePath();
                ctx.fill();
              }
            }
            ctx.shadowBlur = 0;

            // Bio-luminescent wing streaks
            ctx.strokeStyle = `rgba(100,210,255,${0.35 * bPulse})`;
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(br * 0.3, -br * 0.4);
            ctx.bezierCurveTo(br * 0.9, -br * 0.6, br * 1.6, -br * 0.4, br * 2.0, br * 0.2);
            ctx.moveTo(-br * 0.3, -br * 0.4);
            ctx.bezierCurveTo(-br * 0.9, -br * 0.6, -br * 1.6, -br * 0.4, -br * 2.0, br * 0.2);
            ctx.stroke();
          }

          ctx.restore();
        }

        // Sweep laser beam
        if (boss.sweepActive) {
          ctx.save();
          const laserLen = 800;
          const endX = boss.x + Math.cos(boss.sweepAngle) * laserLen;
          const endY = boss.y + Math.sin(boss.sweepAngle) * laserLen;
          // Beam glow
          ctx.strokeStyle = "rgba(255,40,40,0.15)";
          ctx.lineWidth = 20;
          ctx.beginPath();
          ctx.moveTo(boss.x, boss.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          // Core beam
          ctx.strokeStyle = "rgba(255,80,80,0.7)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(boss.x, boss.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          // White core
          ctx.strokeStyle = "rgba(255,255,255,0.8)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(boss.x, boss.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          ctx.restore();
        }

        // Boss health bar with phase markers
        if (boss.y > 0) {
          const barW = 180;
          const barH = 8;
          const barX = canvas.width / 2 - barW / 2;
          const barY = 16;
          const hpRatio = clamp(boss.hp / boss.maxHp, 0, 1);
          ctx.save();
          // Background
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
          // HP fill
          const hpColor = boss.phase === 1 ? "#4dabf7" : boss.phase === 2 ? "#ff922b" : "#ff4444";
          ctx.fillStyle = hpColor;
          ctx.fillRect(barX, barY, barW * hpRatio, barH);
          // Phase markers
          const phases = activeMap.bossPhases;
          if (phases) {
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.lineWidth = 1;
            for (let i = 1; i < phases.length; i++) {
              const markerX = barX + barW * phases[i].hpThreshold;
              ctx.beginPath();
              ctx.moveTo(markerX, barY - 2);
              ctx.lineTo(markerX, barY + barH + 2);
              ctx.stroke();
            }
          }
          // Boss name
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          ctx.fillText(boss.name, canvas.width / 2, barY - 4);
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
          ctx.scale(displayScale, displayScale);
          ctx.fillStyle = "#ffd43b";
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-chip.radius, -chip.radius, chip.radius * 2, chip.radius * 2);
          ctx.restore();
        }
      }

      for (const pickup of bombPickupsRef.current) {
        ctx.save();
        ctx.translate(pickup.x, pickup.y);
        ctx.scale(displayScale, displayScale);
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
        for (const phase of [0, Math.PI * 0.4, Math.PI * 0.8, Math.PI * 1.2, Math.PI * 1.6]) {
          const angle = droneOrbitRef.current + phase;
          const orbitX = ship.x + Math.cos(angle) * 24;
          const orbitY = ship.y - 10 + Math.sin(angle) * 18;
          ctx.save();
          const droneGlow = ctx.createRadialGradient(orbitX, orbitY, 1, orbitX, orbitY, 18);
          droneGlow.addColorStop(0, "rgba(178,255,249,0.95)");
          droneGlow.addColorStop(0.35, "rgba(0,229,255,0.65)");
          droneGlow.addColorStop(1, "rgba(0,229,255,0)");
          ctx.fillStyle = droneGlow;
          ctx.beginPath();
          ctx.arc(orbitX, orbitY, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.96;
          ctx.fillStyle = "#00e5ff";
          ctx.shadowColor = "#00e5ff";
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(orbitX, orbitY - 7);
          ctx.lineTo(orbitX + 6, orbitY + 5);
          ctx.lineTo(orbitX, orbitY + 3);
          ctx.lineTo(orbitX - 6, orbitY + 5);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#b2fff9";
          ctx.beginPath();
          ctx.arc(orbitX, orbitY, 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Trail particles behind player ship
      for (const trail of trailParticlesRef.current) {
        const alpha = clamp(trail.life / trail.maxLife, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = trail.color;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, trail.radius * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      drawShip(elapsedMs);
      // Barrier with layer rings
      if (barrierUntilRef.current > elapsedMs && barrierLayersRef.current > 0) {
        const layers = barrierLayersRef.current;
        for (let i = 0; i < layers; i++) {
          ctx.save();
          const pulse = 1 + Math.sin(elapsedMs / 120 + i * 0.5) * 0.06;
          const r = (ship.radius * 2.4 + i * 6) * pulse * displayScale;
          const alpha = 0.5 + i * 0.15;
          ctx.strokeStyle = `rgba(140, 233, 154, ${alpha})`;
          ctx.lineWidth = 2.5 - i * 0.4;
          ctx.beginPath();
          ctx.arc(ship.x, ship.y, r, Math.PI * 1.12, Math.PI * 1.9);
          ctx.stroke();
          ctx.strokeStyle = `rgba(211, 249, 216, ${alpha * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(ship.x, ship.y, r + 5, Math.PI * 1.08, Math.PI * 1.94);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Barrel roll: spinning motion blur
      if (barrelRollUntilRef.current > elapsedMs) {
        const rollProgress = 1 - (barrelRollUntilRef.current - elapsedMs) / SHMUP_BALANCE.effects.barrelRollDurationMs;
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = "#74c0fc";
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const angle = rollProgress * Math.PI * 4 + i * (Math.PI * 2 / 3);
          const trailR = ship.radius * 2 * displayScale;
          ctx.beginPath();
          ctx.arc(0, 0, trailR, angle, angle + 0.8);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Phase shift: afterimage ghost
      if (phaseShiftGhostRef.current && elapsedMs < phaseShiftGhostRef.current.triggerAtMs) {
        const ghost = phaseShiftGhostRef.current;
        const ghostAlpha = 0.6 * (1 - (elapsedMs - (ghost.triggerAtMs - 120)) / 120);
        if (ghostAlpha > 0) {
          ctx.save();
          ctx.globalAlpha = clamp(ghostAlpha, 0, 0.6);
          const ghostGlow = ctx.createRadialGradient(ghost.x, ghost.y, 4, ghost.x, ghost.y, SHMUP_BALANCE.effects.phaseShiftGhostRadius * 0.5 * displayScale);
          ghostGlow.addColorStop(0, "rgba(180, 148, 255, 0.5)");
          ghostGlow.addColorStop(1, "rgba(180, 148, 255, 0)");
          ctx.fillStyle = ghostGlow;
          ctx.beginPath();
          ctx.arc(ghost.x, ghost.y, SHMUP_BALANCE.effects.phaseShiftGhostRadius * 0.5 * displayScale, 0, Math.PI * 2);
          ctx.fill();
          // Ghost ship silhouette
          ctx.fillStyle = "#d0bfff";
          ctx.beginPath();
          ctx.moveTo(ghost.x, ghost.y - 14 * displayScale);
          ctx.lineTo(ghost.x + 10 * displayScale, ghost.y + 12 * displayScale);
          ctx.lineTo(ghost.x, ghost.y + 7 * displayScale);
          ctx.lineTo(ghost.x - 10 * displayScale, ghost.y + 12 * displayScale);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      // Vortex: swirling black hole
      if (vortexRef.current && elapsedMs < vortexRef.current.endMs) {
        const vt = vortexRef.current;
        const vtProgress = (elapsedMs - vt.startMs) / (vt.endMs - vt.startMs);
        const vtR = SHMUP_BALANCE.effects.vortexRadius * displayScale;
        // Dark core
        ctx.save();
        const coreGrad = ctx.createRadialGradient(vt.x, vt.y, 4, vt.x, vt.y, vtR * 0.4);
        coreGrad.addColorStop(0, "rgba(20, 0, 40, 0.9)");
        coreGrad.addColorStop(0.6, "rgba(50, 20, 80, 0.4)");
        coreGrad.addColorStop(1, "rgba(151, 117, 250, 0)");
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(vt.x, vt.y, vtR * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Spiral arms
        ctx.save();
        ctx.globalAlpha = 0.6 + vtProgress * 0.3;
        for (let arm = 0; arm < 4; arm++) {
          const baseAngle = elapsedMs / 200 + arm * Math.PI / 2;
          ctx.strokeStyle = arm % 2 === 0 ? "#9775fa" : "#845ef7";
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let t = 0; t < 30; t++) {
            const a = baseAngle + t * 0.22;
            const r = 8 + t * (vtR * 0.7 / 30);
            const px = vt.x + Math.cos(a) * r;
            const py = vt.y + Math.sin(a) * r;
            if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.restore();
        // Outer pull ring
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "#9775fa";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(vt.x, vt.y, vtR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = "rgba(208,191,255,0.28)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(vt.x, vt.y, vtR * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Mirror shield: layered hexagonal barrier
      if (mirrorShieldUntilRef.current > elapsedMs && mirrorShieldLayersRef.current > 0) {
        const layers = mirrorShieldLayersRef.current;
        ctx.save();
        ctx.translate(ship.x, ship.y);
        for (let i = 0; i < layers; i++) {
          const r = (ship.radius * 2.6 + i * 7) * displayScale;
          const pulse = 1 + Math.sin(elapsedMs / 100 + i * 0.7) * 0.05;
          const a = 0.4 + i * 0.15;
          ctx.strokeStyle = `rgba(77, 171, 247, ${a})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let s = 0; s < 6; s++) {
            const angle = s * Math.PI / 3 - Math.PI / 2 + elapsedMs * 0.0003;
            const px = Math.cos(angle) * r * pulse;
            const py = Math.sin(angle) * r * pulse;
            if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.fillStyle = `rgba(77, 171, 247, ${a * 0.08})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(208, 235, 255, ${a * 0.45})`;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          for (let s = 0; s < 6; s++) {
            const angle = s * Math.PI / 3 - Math.PI / 2 - elapsedMs * 0.00022;
            const px = Math.cos(angle) * (r * 0.78) * pulse;
            const py = Math.sin(angle) * (r * 0.78) * pulse;
            if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
      }

      // Overcharge: pulsing golden aura
      if (overchargeUntilRef.current > elapsedMs) {
        ctx.save();
        const ocPulse = 1 + Math.sin(elapsedMs / 60) * 0.15;
        const ocR = ship.radius * 3 * displayScale * ocPulse;
        const ocGlow = ctx.createRadialGradient(ship.x, ship.y, ship.radius * displayScale, ship.x, ship.y, ocR);
        ocGlow.addColorStop(0, "rgba(255, 212, 59, 0.35)");
        ocGlow.addColorStop(0.6, "rgba(255, 146, 43, 0.15)");
        ocGlow.addColorStop(1, "rgba(255, 212, 59, 0)");
        ctx.fillStyle = ocGlow;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ocR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 243, 191, 0.65)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ocR * 0.72, 0, Math.PI * 2);
        ctx.stroke();
        // Electric arcs
        ctx.strokeStyle = "rgba(255, 212, 59, 0.6)";
        ctx.lineWidth = 1.5;
        for (let arc = 0; arc < 4; arc++) {
          const a = elapsedMs / 80 + arc * Math.PI / 2;
          const startR = ship.radius * 1.2 * displayScale;
          const endR = ship.radius * 2.5 * displayScale;
          ctx.beginPath();
          ctx.moveTo(ship.x + Math.cos(a) * startR, ship.y + Math.sin(a) * startR);
          const midA = a + (Math.sin(elapsedMs / 30 + arc) * 0.4);
          const midR = (startR + endR) / 2;
          ctx.quadraticCurveTo(
            ship.x + Math.cos(midA) * midR,
            ship.y + Math.sin(midA) * midR,
            ship.x + Math.cos(a + 0.3) * endR,
            ship.y + Math.sin(a + 0.3) * endR
          );
          ctx.stroke();
        }
        ctx.restore();
      }

      // Damage numbers
      for (const dmg of damageNumbersRef.current) {
        const alpha = clamp(dmg.life / 0.7, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = dmg.color;
        ctx.font = `bold ${dmg.value >= 20 ? 14 : 11}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText(String(dmg.value), dmg.x, dmg.y);
        ctx.restore();
      }

      // Kill streak counter
      if (streakDisplayTimerRef.current > 0 && streakDisplayRef.current >= 5) {
        const alpha = clamp(streakDisplayTimerRef.current / 0.5, 0, 1);
        const streak = streakDisplayRef.current;
        const streakColor = streak >= 20 ? "#ffd43b" : streak >= 10 ? "#ff922b" : "#74c0fc";
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = streakColor;
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "right";
        ctx.shadowColor = "#000000";
        ctx.shadowBlur = 4;
        ctx.fillText(`${streak} KILL STREAK!`, canvas.width - 12, canvas.height - 16);
        ctx.shadowBlur = 0;
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
      if (key === "escape" && !event.repeat) {
        event.preventDefault();
        if (runEndedRef.current) return;
        pausedRef.current = !pausedRef.current;
        if (pausedRef.current) {
          pauseTimeRef.current = performance.now();
        }
        setPaused(pausedRef.current);
        return;
      }
      if (pausedRef.current) return;
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
    const startRatio = isMobileDevice ? PLAYER_MOBILE_START_RATIO : PLAYER_DESKTOP_START_RATIO;
    ship.y = clamp(canvas.height * startRatio, ship.radius + 12, canvas.height - ship.radius - 12);

    window.addEventListener("resize", resizeCanvas);
    window.visualViewport?.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    animationRef.current = requestAnimationFrame(drawLoop);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resizeCanvas);
      window.visualViewport?.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      activeKeys.clear();
      touchMoveRef.current = { active: false, pointerId: null, x: 0, y: 0 };
      setTouchKnob({ active: false, x: 0, y: 0 });
      secondaryQueuedRef.current = false;
      stopMusic(0);
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

  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
    if (mobileGateVisibleRef.current) {
      pausedRef.current = true;
      setPaused(true);
      return;
    }

    pausedRef.current = false;
    setPaused(false);
  }, []);

  const handlePauseResume = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
  }, []);

  const handlePauseRestart = useCallback(() => {
    pausedRef.current = false;
    pauseTimeRef.current = 0;
    setPaused(false);
    navigate("/shmup", { replace: true });
    window.location.reload();
  }, [navigate]);

  const handlePauseQuit = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
    stopMusic();
    navigate("/");
  }, [navigate]);

  const handleMobileLaunch = useCallback(async () => {
    await requestGameplayFullscreen();
    await lockLandscapeOrientation();
    setMobileLaunchAccepted(true);
  }, [lockLandscapeOrientation, requestGameplayFullscreen]);

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
    <div
      ref={containerRef}
      className="screen play-screen play-screen--landscape"
      style={{
        top: `${viewportBounds.top}px`,
        left: `${viewportBounds.left}px`,
        width: `${viewportBounds.width}px`,
        height: `${viewportBounds.height}px`,
      }}
    >
      {/* ── Compact top HUD bar (landscape) ──────────── */}
      <div className="play-hud play-hud--landscape">
        <div className="hud-left hud-stat-stack hud-stat-stack--row">
          <div className="hud-score">{hud.score.toLocaleString()}</div>
          <div className="hud-combo">
            <span className="combo-text">{hud.multiplier.toFixed(2)}x</span>
          </div>
        </div>
        <div className="hud-center shmup-hud-center shmup-hud-center--landscape">
          <div className="hp-pips">
            {Array.from({ length: hud.maxHp }).map((_, index) => (
              <span
                key={index}
                className={`hp-pip ${index < hud.hp ? "filled" : ""}`}
              />
            ))}
          </div>
          <div className="shmup-subtitle">
            Lv{hud.weaponLevel} {hud.weaponLabel} &middot; {hud.waveLabel}
          </div>
        </div>

        {/* ── Overdrive meter (inline in HUD) ─────────── */}
        <div className="fever-bar-container fever-bar-container--landscape">
          <div
            className={`fever-bar ${hud.overdriveActive ? "fever-active" : ""}`}
            style={{
              width: `${hud.overdriveActive ? 100 : hud.overdriveMeter}%`,
              boxShadow: hud.overdriveActive
                ? "0 0 12px rgba(255,212,59,0.8), 0 0 24px rgba(255,212,59,0.4)"
                : hud.overdriveMeter >= 80
                  ? "0 0 8px rgba(69,199,255,0.5)"
                  : "none",
              transition: "box-shadow 0.3s ease",
            }}
          />
          <span className="fever-label" style={{
            textShadow: hud.overdriveActive ? "0 0 8px rgba(255,212,59,0.8)" : "none",
          }}>
            {hud.overdriveActive ? "OVERDRIVE" : `OD ${Math.round(hud.overdriveMeter)}%`}
          </span>
        </div>

        <div className="hud-right hud-stat-stack hud-stat-stack--row hud-stat-stack-right">
          <div className="shmup-high-score">Best {highScore.toLocaleString()}</div>
          <div className="hud-top-actions">
            <button
              type="button"
              className="btn btn-icon"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? "⊡" : "⛶"}
            </button>
            <button
              type="button"
              className="btn btn-icon"
              onClick={() => {
                pausedRef.current = true;
                pauseTimeRef.current = performance.now();
                setPaused(true);
              }}
              aria-label="Pause"
            >
              ||
            </button>
            <button className="btn btn-small" onClick={() => navigate("/")}>
              Exit
            </button>
          </div>
        </div>
      </div>

      {/* ── Boss bar (only when boss active) ────────── */}
      {hud.bossWarning ? (
        <div className="boss-warning-banner">Warning: {activeMap.bossName} incoming</div>
      ) : null}

      {hud.bossActive ? (
        <div className="boss-health boss-health--landscape">
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

      {/* ── Secondary cooldown (compact, only when relevant) ─ */}
      {hud.secondaryName !== "None" ? (
        <div className="secondary-compact secondary-compact--landscape">
          <span className="secondary-compact-label">{hud.secondaryName}</span>
          {hud.secondaryUsesCharges ? (
            <span className="secondary-compact-status">{hud.secondaryCharges}/{hud.secondaryMaxCharges}</span>
          ) : (
            <span className={`secondary-compact-status ${hud.secondaryReady ? "ready" : ""}`}>
              {hud.secondaryReady ? "Ready" : "CD"}
            </span>
          )}
          <div className="secondary-compact-bar">
            <div
              className="secondary-compact-fill"
              style={{ width: `${(1 - hud.secondaryCooldownPct) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* ── Game canvas ─────────────────────────────── */}
      <canvas ref={canvasRef} className="play-canvas" />

      {/* ── Touch controls (mobile only) ────────────── */}
      {showTouchControls ? (
        <>
          {/* Left half: move zone — joystick floats where thumb lands */}
          <div
            className="shmup-move-zone"
            onPointerDown={handleMoveZoneDown}
            onPointerMove={handleMoveZoneMove}
            onPointerUp={handleMoveZoneUp}
            onPointerCancel={handleMoveZoneUp}
          >
            {floatingOrigin && (
              <div
                className={`shmup-touch-pad active`}
                style={{
                  position: "absolute",
                  left: floatingOrigin.x,
                  top: floatingOrigin.y,
                  width: touchPadRadius * 2,
                  height: touchPadRadius * 2,
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "none",
                }}
              >
                <div className="shmup-touch-ring" />
                <div
                  className="shmup-touch-knob"
                  style={{
                    transform: `translate(calc(-50% + ${touchKnob.x}px), calc(-50% + ${touchKnob.y}px))`,
                  }}
                />
              </div>
            )}
          </div>
          {/* Right side: ability button */}
          <button
            type="button"
            className="shmup-touch-secondary"
            aria-label="Trigger ability"
            onPointerDown={(event) => {
              event.preventDefault();
              queueSecondary();
            }}
          >
            ABILITY
          </button>
        </>
      ) : null}

      {/* ── Tutorial (pauses game until dismissed) ──── */}
      {showTutorial && (
        <TutorialOverlay onComplete={handleTutorialComplete} />
      )}

      {mobileGateVisible ? (
        <div className="mobile-play-gate" role="dialog" aria-modal="true">
          <div className="mobile-play-gate-card">
            <div className="mobile-play-gate-icon" aria-hidden="true">
              {showMobileRotateGate ? "\u{1F4F1}" : "\u26F6"}
            </div>
            <div className="mobile-play-gate-title">
              {showMobileRotateGate ? "Rotate to landscape" : "Play fullscreen"}
            </div>
            {!showMobileRotateGate ? (
              <button
                type="button"
                className="btn btn-primary btn-large mobile-play-gate-button"
                onClick={() => {
                  void handleMobileLaunch();
                }}
              >
                Play
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── Pause menu ──────────────────────────────── */}
      {paused && !showTutorial && !mobileGateVisible && (
        <PauseMenu
          score={hud.score}
          kills={hud.kills}
          timeMs={hud.timeSurvivedMs}
          weaponLevel={hud.weaponLevel}
          onResume={handlePauseResume}
          onRestart={handlePauseRestart}
          onQuit={handlePauseQuit}
        />
      )}

    </div>
  );
}
