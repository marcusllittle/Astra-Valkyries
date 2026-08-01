#!/usr/bin/env python3
"""
Generate the 18 outfit gacha cut-in videos with the local LTX-2 runtime.

The gacha reveal has never actually played for anyone: outfits.json points
every outfit at /assets/cutins/outfits/<slug>.mp4 and that directory has
never existed. This script closes the gap using the same Wan2GP session
API as havnai-ltx23-i2v-run.py — image-to-video from each outfit's card
art, with motion language per the ASTRA_PROMPT_BIBLE still→video rules
(subtle hair/fabric drift, glow pulse, slow push — never wild action).

Usage (from WSL, where the runtime lives):
  python3 tools/gen_outfit_cutins.py --only aurora_borealis   # pilot run
  python3 tools/gen_outfit_cutins.py                          # full batch
  python3 tools/gen_outfit_cutins.py --skip-existing          # resume

Outputs land in <repo>/rhythm-jet-squadron/public/assets/cutins/outfits/.
After a batch, remove the shipped slugs from known-missing-assets.json —
the asset-manifest ratchet will fail CI until you do, by design.

NOTE: the HavnAI node shares this GPU. Run the full batch in a quiet
window; each clip is minutes of heavy VRAM use.
"""

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

WAN2GP_ROOT = Path("/home/marcus/.havnai/tools/Wan2GP")
REPO_APP = Path(__file__).resolve().parent.parent  # rhythm-jet-squadron/
ART_DIR = REPO_APP / "public/assets/outfits"
OUT_DIR = REPO_APP / "public/assets/cutins/outfits"
STAGING = WAN2GP_ROOT / "outputs/astra-cutins"

MODEL = "ltx2_22B_distilled_1_1"
RESOLUTION = "832x1216"       # match the card art aspect; falls back below
FALLBACK_RESOLUTION = "720x1280"
STEPS = 8                     # distilled model sweet spot (proven July run)
FRAMES = 97                   # ~4s @ 24fps
SEED_BASE = 20260801

# The raw LTX output is ~5.6 MB for 4 seconds. Eighteen of those would add
# ~100 MB to the repo and to every mobile download, for a clip that plays
# once behind a gacha reveal. CRF 26 lands at ~800 KB with no visible
# difference at playback size. Audio is stripped: these are silent, and the
# game scores them with its own procedural SFX.
CRF = 26


def compress(src: Path, dest: Path) -> None:
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error", "-i", str(src),
            "-c:v", "libx264", "-crf", str(CRF), "-preset", "slow",
            "-pix_fmt", "yuv420p",       # Safari/iOS compatibility
            "-movflags", "+faststart",   # first frame without full download
            "-an",
            str(dest),
        ],
        check=True,
    )

# Per-outfit motion flavor. Base motion is shared; these add identity.
# Written to match the card art: the pilot is already posed — we animate
# atmosphere, fabric, light, and a slow camera push. No pose changes.
BASE_MOTION = (
    "The character holds her pose with subtle natural life: gentle breathing, "
    "hair strands drifting, fabric and suit highlights shifting softly. The "
    "camera makes a very slow cinematic push forward. Background lights pulse "
    "gently. Preserve the face, body proportions, outfit design, and "
    "composition exactly. Fluid subtle motion, stable anatomy, consistent "
    "character, no cuts, no pose change."
)

OUTFIT_MOTION: dict[str, str] = {
    "standard_flight_suit": "Cool hangar light sweeps slowly across the navy suit panels.",
    "neon_vanguard": "Magenta and cyan neon reflections ripple across the glossy suit.",
    "desert_storm": "Warm heat-haze shimmer and drifting sand motes in golden light.",
    "iron_hawk": "Hard metallic glints travel along the gunmetal armor edges.",
    "cloud_walker": "Soft white volumetric light drifts like slow clouds around her.",
    "shadow_pulse": "Violet pulse lines glow and fade rhythmically along the black suit.",
    "ocean_drift": "Caustic aqua light patterns wash slowly over the teal suit.",
    "crimson_wing": "Ember-like red particles rise slowly; shoulder flares catch the light.",
    "frost_nova": "Tiny ice crystals sparkle and drift; cold blue rim light breathes.",
    "thunder_strike": "Faint electric arcs crackle briefly along the gold accents.",
    "emerald_gale": "A gentle wind ripples her hair and the jade panels catch moving light.",
    "violet_tempest": "Swirling lavender mist curls slowly at the edges of frame.",
    "solar_flare": "Blazing orange-gold lens flares bloom and settle softly.",
    "lunar_eclipse": "Pale silver moonlight slides slowly across the midnight suit.",
    "cosmic_surge": "Iridescent nebula colors shift slowly across the suit panels.",
    "starfall_armor": "Faint falling star streaks pass behind her; armor glints in sequence.",
    "aurora_borealis": "Aurora ribbons of green and violet light flow slowly behind and across the reflective armor.",
    "void_reaper": "Deep red seams smolder and pulse; darkness breathes at the frame edges.",
}


def build_prompt(slug: str) -> str:
    flavor = OUTFIT_MOTION.get(slug, "")
    return f"Cinematic character reveal. {flavor} {BASE_MOTION}"


def generate(session, slug: str, source: Path, seed: int) -> Path:
    settings = session.get_default_settings(MODEL)
    for resolution in (RESOLUTION, FALLBACK_RESOLUTION):
        settings.update({
            "model_type": MODEL,
            "prompt": build_prompt(slug),
            "resolution": resolution,
            "num_inference_steps": STEPS,
            "video_length": FRAMES,
            "duration_seconds": 4,
            "force_fps": 24,
            "image_prompt_type": "S",
            "image_start": [str(source)],
            "prompt_enhancer": "",
            "seed": seed,
        })
        job = session.submit_task(settings)
        last = None
        for event in job.events.iter(timeout=0.5):
            if event.kind != "progress":
                continue
            update = event.data
            state = (update.phase, update.progress)
            if state != last:
                last = state
                print(f"  [{slug}] {update.phase} {update.progress}%", flush=True)
        result = job.result()
        if result.success and result.generated_files:
            return Path(result.generated_files[0])
        errors = [getattr(e, "message", str(e)) for e in result.errors]
        print(f"  [{slug}] attempt at {resolution} failed: {errors}", flush=True)
    raise RuntimeError(f"{slug}: generation failed at both resolutions")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="single outfit slug (pilot run)")
    parser.add_argument("--skip-existing", action="store_true")
    parser.add_argument(
        "--compress-only",
        action="store_true",
        help="re-encode already-generated clips in place, no GPU work",
    )
    args = parser.parse_args()

    if args.compress_only:
        total_before = total_after = 0
        for clip in sorted(OUT_DIR.glob("*.mp4")):
            before = clip.stat().st_size
            tmp = clip.with_suffix(".tmp.mp4")
            try:
                compress(clip, tmp)
            except (subprocess.CalledProcessError, FileNotFoundError) as exc:
                print(f"[{clip.stem}] compress failed: {exc}", flush=True)
                tmp.unlink(missing_ok=True)
                continue
            after = tmp.stat().st_size
            if after >= before:
                print(f"[{clip.stem}] already compact, leaving alone", flush=True)
                tmp.unlink(missing_ok=True)
                continue
            tmp.replace(clip)
            total_before += before
            total_after += after
            print(f"[{clip.stem}] {before / 1_048_576:.1f} MB -> {after / 1_048_576:.1f} MB", flush=True)
        if total_before:
            print(
                f"total {total_before / 1_048_576:.1f} MB -> {total_after / 1_048_576:.1f} MB "
                f"({100 * (1 - total_after / total_before):.0f}% smaller)"
            )
        return 0

    slugs = [args.only] if args.only else list(OUTFIT_MOTION)
    for slug in slugs:
        if slug not in OUTFIT_MOTION:
            print(f"unknown outfit slug: {slug}", file=sys.stderr)
            return 2

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    STAGING.mkdir(parents=True, exist_ok=True)

    sys.path.insert(0, str(WAN2GP_ROOT))
    from shared.api import init  # noqa: E402  (runtime lives outside the repo)

    session = init(
        root=WAN2GP_ROOT,
        output_dir=STAGING,
        console_output=False,
        console_isatty=False,
    )

    done, failed = [], []
    for i, slug in enumerate(slugs):
        target = OUT_DIR / f"{slug}.mp4"
        if args.skip_existing and target.exists():
            print(f"[{slug}] exists, skipping", flush=True)
            continue
        source = ART_DIR / f"{slug}.png"
        if not source.is_file():
            print(f"[{slug}] card art missing at {source}, skipping", flush=True)
            failed.append(slug)
            continue
        print(f"[{slug}] generating ({i + 1}/{len(slugs)})…", flush=True)
        started = time.time()
        try:
            produced = generate(session, slug, source, SEED_BASE + i)
        except Exception as exc:
            print(f"[{slug}] FAILED: {exc}", flush=True)
            failed.append(slug)
            continue
        try:
            compress(produced, target)
        except (subprocess.CalledProcessError, FileNotFoundError) as exc:
            print(f"[{slug}] compression unavailable ({exc}); shipping raw", flush=True)
            shutil.copy2(produced, target)
        done.append(slug)
        size_mb = target.stat().st_size / 1_048_576
        print(f"[{slug}] done in {time.time() - started:.0f}s -> {target} ({size_mb:.1f} MB)", flush=True)

    print(json.dumps({"done": done, "failed": failed}))
    if done:
        print(
            "Remember: remove the shipped slugs from known-missing-assets.json "
            "(the asset ratchet fails CI until you do)."
        )
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
