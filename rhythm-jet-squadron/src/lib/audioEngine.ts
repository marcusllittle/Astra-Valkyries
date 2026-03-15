/**
 * Central audio engine — manages AudioContext, volume buses (music/SFX),
 * and coordinates procedural music + SFX playback.
 * Reads musicVolume / sfxVolume from game settings.
 */

let _ctx: AudioContext | null = null;
let _musicGain: GainNode | null = null;
let _sfxGain: GainNode | null = null;

export function getAudioCtx(): AudioContext {
  if (!_ctx) {
    _ctx = new AudioContext();
    _musicGain = _ctx.createGain();
    _musicGain.gain.value = 0.8;
    _musicGain.connect(_ctx.destination);
    _sfxGain = _ctx.createGain();
    _sfxGain.gain.value = 0.8;
    _sfxGain.connect(_ctx.destination);
  }
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}

export function getMusicBus(): GainNode {
  getAudioCtx();
  return _musicGain!;
}

export function getSfxBus(): GainNode {
  getAudioCtx();
  return _sfxGain!;
}

export function setMusicVolume(v: number) {
  getAudioCtx();
  _musicGain!.gain.value = Math.max(0, Math.min(1, v));
}

export function setSfxVolume(v: number) {
  getAudioCtx();
  _sfxGain!.gain.value = Math.max(0, Math.min(1, v));
}

/** Sync volumes from game settings. Call from React effect. */
export function syncVolumes(musicVolume: number, sfxVolume: number) {
  if (!_ctx) return;
  _musicGain!.gain.value = Math.max(0, Math.min(1, musicVolume));
  _sfxGain!.gain.value = Math.max(0, Math.min(1, sfxVolume));
}
