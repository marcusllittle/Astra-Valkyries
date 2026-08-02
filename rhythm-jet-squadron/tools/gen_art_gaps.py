#!/usr/bin/env python3
"""
Close the remaining asset gaps in known-missing-assets.json.

Three classes, all image-to-video off art that already ships:

  cutscene  11 outfit card motion clips -> public/assets/outfits/<slug>_cutscene.mp4
            HangarScreen passes cutsceneArtUrl as motionArtUrl on every
            outfit card, and ShopScreen uses it for the premium banner, so
            these 11 outfits currently fall back to a still.

  fever     2 pilot fever cut-ins -> public/assets/cutins/<pilot>_fever.mp4
            nova_fever.mp4 already ships; rex and yuki have never had one.

Existing files set the targets: outfit cutscenes are 360x536 / 5s / 24fps,
fever cut-ins are 784x1168. Generation runs at the model's native
resolution and ffmpeg scales down on the way out, which is both better
quality and the only way to hit sizes LTX will not generate directly.

Usage (from WSL, where the runtime lives):
  python3 tools/gen_art_gaps.py --list
  python3 tools/gen_art_gaps.py --only aurora_borealis
  python3 tools/gen_art_gaps.py --class cutscene
  python3 tools/gen_art_gaps.py --all --skip-existing

The HavnAI node shares this GPU and holds ~10.9 GB of 12 GB while running.
Stop it first or generation will OOM:
  systemctl --user stop havnai-node
  ...
  systemctl --user start havnai-node
"""

import argparse
import json
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

WAN2GP_ROOT = Path("/home/marcus/.havnai/tools/Wan2GP")
REPO_APP = Path(__file__).resolve().parent.parent  # rhythm-jet-squadron/
PUBLIC = REPO_APP / "public/assets"
STAGING = WAN2GP_ROOT / "outputs/astra-art-gaps"
BASELINE = REPO_APP / "known-missing-assets.json"

MODEL = "ltx2_22B_distilled_1_1"
GEN_RESOLUTION = "832x1216"
FALLBACK_RESOLUTION = "720x1280"
STEPS = 8
SEED_BASE = 20260801

# CRF 26 held up on the cut-in batch: ~5.6 MB of raw LTX became ~800 KB
# with no visible difference at playback size. The existing cutscene clips
# that already ship are 424-517 KB, so this lands in the same band.
CRF = 26


@dataclass(frozen=True)
class Job:
    slug: str
    kind: str          # "cutscene" | "fever"
    source: Path       # still to animate
    dest: Path         # final file in public/
    width: int
    height: int
    frames: int
    motion: str


# The colour lock is load-bearing. The first attempt at neon_vanguard used
# the gacha cut-in's flavor line ("magenta and cyan neon reflections") and
# LTX repainted a teal suit magenta — a costume the player owns, rendered
# in the wrong colour on its own card. Naming a hue anywhere in the prompt
# is read as an instruction to apply it, so the flavor lines below describe
# how light *moves* and leave every colour to the source image.
BASE_MOTION = (
    "Keep the exact colours of the source image: do not recolour, retint, or "
    "restyle the suit, hair, skin, or background. The character holds her "
    "pose with subtle natural life: gentle breathing, hair strands drifting, "
    "highlights sliding across the material. The camera makes a very slow "
    "cinematic push forward. Preserve the face, body proportions, outfit "
    "design, palette, and composition exactly. Fluid subtle motion, stable "
    "anatomy, consistent character, no cuts, no pose change, no colour change."
)

# Motion only. Any hue named here would override the card art, so these
# describe behaviour — where light travels, what drifts — and nothing else.
OUTFIT_MOTION = {
    "neon_vanguard": "Reflected signage glints travel slowly along the glossy panel edges.",
    "cloud_walker": "Soft volumetric haze drifts around her like slow cloud.",
    "shadow_pulse": "Thin light seams brighten and fade rhythmically along the suit.",
    "ocean_drift": "Caustic ripples wash slowly across her, as if lit through water.",
    "frost_nova": "Fine crystal motes sparkle and drift; the rim light breathes.",
    # "Electric arcs" pulled the hair from teal to orange on the first pass:
    # the model reads an arc as a light source and repaints around it. A
    # travelling shimmer gets the same read without inventing a colour.
    "thunder_strike": "A faint charge shimmers along the trim; highlights travel slowly.",
    "emerald_gale": "A gentle wind ripples her hair; panels catch travelling light.",
    # A flare "across the frame" washed the whole shot out and buried the
    # character. Keep the bloom on the material and off the camera.
    "solar_flare": "Highlights bloom and settle gently on the armour; the background glow breathes.",
    "starfall_armor": "Faint star streaks pass far behind her; the armour glints in sequence.",
    "aurora_borealis": "Broad ribbons of light drift slowly behind her and across the reflective armour.",
    "void_reaper": "The seams smoulder and pulse; darkness breathes at the frame edges.",
}

# Fever is the overdrive cut-in: the one moment the pilot is allowed to
# look powerful rather than composed. Still no pose change - the source
# art is the pose - but the energy is dialled up.
# Same colour rule as the outfits: describe the surge, not its hue, and let
# each pilot's own palette carry the identity.
FEVER_MOTION = {
    "rex": (
        "Energy surges around him as engines spool up. Heat haze and sparks "
        "rise; his jacket and hair whip in the backwash. Hard rim light "
        "pulses along the metal."
    ),
    "yuki": (
        "Crystals bloom and spiral outward around her as the light builds to "
        "a flare. Her hair and coat drift in the rising chill."
    ),
}

FEVER_SOURCES = {
    "rex": "pilots/rex_thunderbolt.png",
    "yuki": "pilots/yuki_frostweaver.png",
}


def build_jobs() -> list[Job]:
    jobs: list[Job] = []
    for slug, motion in OUTFIT_MOTION.items():
        jobs.append(
            Job(
                slug=slug,
                kind="cutscene",
                source=PUBLIC / f"outfits/{slug}.png",
                dest=PUBLIC / f"outfits/{slug}_cutscene.mp4",
                # Matches the seven cutscene clips already shipping.
                width=360,
                height=536,
                frames=121,  # 5s at 24fps; LTX wants 8n+1
                motion=f"Cinematic character reveal. {motion} {BASE_MOTION}",
            )
        )
    for pilot, motion in FEVER_MOTION.items():
        jobs.append(
            Job(
                slug=f"{pilot}_fever",
                kind="fever",
                source=PUBLIC / FEVER_SOURCES[pilot],
                dest=PUBLIC / f"cutins/{pilot}_fever.mp4",
                # Matches nova_fever.mp4.
                width=784,
                height=1168,
                frames=97,  # 4s; nova's 12s clip is an outlier we are not
                            # matching, a single LTX pass does not reach it
                motion=f"Overdrive activation. {motion} {BASE_MOTION}",
            )
        )
    return jobs


def encode(src: Path, job: Job) -> None:
    """Scale to the shipping size and compress. Silent: the game scores
    these with its own procedural SFX."""
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error", "-i", str(src),
            "-vf", f"scale={job.width}:{job.height}:flags=lanczos",
            "-c:v", "libx264", "-crf", str(CRF), "-preset", "slow",
            "-pix_fmt", "yuv420p",       # Safari/iOS
            "-movflags", "+faststart",   # first frame without full download
            "-an",
            str(job.dest),
        ],
        check=True,
    )


def generate(session, job: Job, seed: int) -> Path:
    settings = session.get_default_settings(MODEL)
    for resolution in (GEN_RESOLUTION, FALLBACK_RESOLUTION):
        settings.update({
            "model_type": MODEL,
            "prompt": job.motion,
            "resolution": resolution,
            "num_inference_steps": STEPS,
            "video_length": job.frames,
            "duration_seconds": round(job.frames / 24),
            "force_fps": 24,
            "image_prompt_type": "S",
            "image_start": [str(job.source)],
            "prompt_enhancer": "",
            "seed": seed,
        })
        task = session.submit_task(settings)
        last = None
        for event in task.events.iter(timeout=0.5):
            if event.kind != "progress":
                continue
            state = (event.data.phase, event.data.progress)
            if state != last:
                last = state
                print(f"  [{job.slug}] {event.data.phase} {event.data.progress}%", flush=True)
        result = task.result()
        if result.success and result.generated_files:
            return Path(result.generated_files[0])
        errors = [getattr(e, "message", str(e)) for e in result.errors]
        print(f"  [{job.slug}] attempt at {resolution} failed: {errors}", flush=True)
    raise RuntimeError(f"{job.slug}: generation failed at both resolutions")


def drop_from_baseline(shipped: list[str]) -> None:
    """Shrink the asset ratchet. It only ever shrinks, by design."""
    if not BASELINE.exists() or not shipped:
        return
    entries = set(json.loads(BASELINE.read_text()))
    remaining = sorted(entries - set(shipped))
    BASELINE.write_text(json.dumps(remaining, indent=2) + "\n")
    print(f"baseline: {len(entries)} -> {len(remaining)} known-missing assets")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="single slug")
    parser.add_argument("--class", dest="kind", choices=["cutscene", "fever"])
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--skip-existing", action="store_true")
    args = parser.parse_args()

    jobs = build_jobs()
    if args.only:
        jobs = [j for j in jobs if j.slug == args.only]
        if not jobs:
            print(f"unknown slug: {args.only}", file=sys.stderr)
            return 2
    elif args.kind:
        jobs = [j for j in jobs if j.kind == args.kind]
    elif not args.all and not args.list:
        parser.error("pass --all, --class, --only, or --list")

    if args.list:
        for job in jobs:
            mark = "ok " if job.dest.exists() else "GAP"
            src = "ok " if job.source.is_file() else "NO SOURCE"
            print(f"{mark} {job.kind:9s} {job.slug:22s} {job.width}x{job.height} src={src}")
        return 0

    STAGING.mkdir(parents=True, exist_ok=True)
    sys.path.insert(0, str(WAN2GP_ROOT))
    from shared.api import init  # noqa: E402  (runtime lives outside the repo)

    session = init(
        root=WAN2GP_ROOT,
        output_dir=STAGING,
        console_output=False,
        console_isatty=False,
    )

    done, failed, shipped_paths = [], [], []
    for i, job in enumerate(jobs):
        if args.skip_existing and job.dest.exists():
            print(f"[{job.slug}] exists, skipping", flush=True)
            continue
        if not job.source.is_file():
            print(f"[{job.slug}] source art missing at {job.source}, skipping", flush=True)
            failed.append(job.slug)
            continue

        print(f"[{job.slug}] generating ({i + 1}/{len(jobs)})…", flush=True)
        started = time.time()
        try:
            produced = generate(session, job, SEED_BASE + i)
        except Exception as exc:
            print(f"[{job.slug}] FAILED: {exc}", flush=True)
            failed.append(job.slug)
            continue

        job.dest.parent.mkdir(parents=True, exist_ok=True)
        try:
            encode(produced, job)
        except (subprocess.CalledProcessError, FileNotFoundError) as exc:
            print(f"[{job.slug}] encode unavailable ({exc}); shipping raw", flush=True)
            shutil.copy2(produced, job.dest)

        done.append(job.slug)
        shipped_paths.append("/" + str(job.dest.relative_to(REPO_APP / "public")))
        size_kb = job.dest.stat().st_size / 1024
        print(
            f"[{job.slug}] done in {time.time() - started:.0f}s -> {job.dest} ({size_kb:.0f} KB)",
            flush=True,
        )

    drop_from_baseline(shipped_paths)
    print(json.dumps({"done": done, "failed": failed}))
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
