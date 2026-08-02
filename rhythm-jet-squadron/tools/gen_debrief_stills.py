#!/usr/bin/env python3
"""
Generate the two missing post-mission debrief backdrops.

ShmupResultsScreen.DEBRIEF_BACKDROPS wants one plate per zone and only
nebula-runway ships, so Solar Rift and Abyss Crown runs both fall back to
the Nebula plate and debrief on the wrong zone.

Each plate is the mission-ops bridge looking out at that zone. The
briefing plate for the same zone already ships, so these are img2img off
it: same bridge, same viewport, after the fight instead of before.
Keeping the composition is the point — a debrief that does not read as
the same room as the briefing is worse than the fallback.

Strength is deliberately mid-range. Too low and it is the briefing with
noise; too high and it invents a different bridge.

Usage (from WSL, with the HavnAI node stopped so the GPU is free):
  python3 tools/gen_debrief_stills.py
  python3 tools/gen_debrief_stills.py --only solar_rift --strength 0.6
"""

import argparse
import json
import sys
from pathlib import Path

import torch
from diffusers import StableDiffusionXLImg2ImgPipeline
from PIL import Image

REPO_APP = Path(__file__).resolve().parent.parent
SCENES = REPO_APP / "public/assets/cutins/scenes"
BASELINE = REPO_APP / "known-missing-assets.json"

CHECKPOINT = Path(
    "/mnt/havnai-runtime/havnai/models/creator/juggernautXL_ragnarokBy.safetensors"
)

WIDTH, HEIGHT = 1280, 720
STEPS = 34
GUIDANCE = 6.5
STRENGTH = 0.52
SEED = 20260801

SHARED_STYLE = (
    "cinematic sci-fi mission operations bridge interior, wide viewport, "
    "crew silhouettes at consoles, holographic status panels, volumetric "
    "light, anime sci-fi concept art, highly detailed, dramatic lighting"
)

# Aftermath language comes from each zone's own debrief line in
# lib/shmupWaves.ts, so the art and the text agree about what happened.
PLATES = {
    "solar_rift": {
        # "The heat front is broken. Solar control is shifting back."
        "prompt": (
            f"{SHARED_STYLE}, aftermath after a won battle, the raging solar "
            "flare beyond the viewport now dimmed and receding, cooling amber "
            "and deep red tones, alert panels switched from red warning to "
            "calm green standby, drifting embers and settling debris, crew "
            "standing down, quiet relief, warm low light"
        ),
        "negative": (
            "red alarm klaxons, emergency alert, warning triangles, damage, "
            "fire, chaos, text, watermark, blurry, low quality, deformed"
        ),
    },
    "abyss_crown": {
        # "The void finally blinked. Abyss Crown is no longer untouchable."
        "prompt": (
            f"{SHARED_STYLE}, aftermath after a won battle, the vast frozen "
            "world beyond the viewport calm and still, pale cyan and deep "
            "blue tones, alert panels switched from warning to calm green "
            "standby, faint drifting ice particles and settling debris, crew "
            "standing down, cold quiet stillness, subdued light"
        ),
        "negative": (
            "red alarm klaxons, emergency alert, warning triangles, damage, "
            "fire, chaos, text, watermark, blurry, low quality, deformed"
        ),
    },
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", choices=sorted(PLATES))
    parser.add_argument("--strength", type=float, default=STRENGTH)
    args = parser.parse_args()

    targets = [args.only] if args.only else sorted(PLATES)

    if not CHECKPOINT.is_file():
        print(f"checkpoint missing: {CHECKPOINT}", file=sys.stderr)
        return 2

    print(f"loading {CHECKPOINT.name}…", flush=True)
    pipe = StableDiffusionXLImg2ImgPipeline.from_single_file(
        str(CHECKPOINT),
        torch_dtype=torch.float16,
        use_safetensors=True,
    ).to("cuda")
    pipe.set_progress_bar_config(disable=True)

    shipped = []
    for zone in targets:
        source = SCENES / f"{zone}_briefing.png"
        dest = SCENES / f"{zone}_debrief.png"
        if not source.is_file():
            print(f"[{zone}] briefing plate missing at {source}, skipping", flush=True)
            continue

        init = Image.open(source).convert("RGB").resize((WIDTH, HEIGHT), Image.LANCZOS)
        spec = PLATES[zone]
        print(f"[{zone}] generating at strength {args.strength}…", flush=True)
        image = pipe(
            prompt=spec["prompt"],
            negative_prompt=spec["negative"],
            image=init,
            strength=args.strength,
            num_inference_steps=STEPS,
            guidance_scale=GUIDANCE,
            generator=torch.Generator("cuda").manual_seed(SEED),
        ).images[0]

        # The plates that already ship are JPEG bytes under a .png name.
        # Match that rather than shipping a true PNG at several times the size.
        image.save(dest, format="JPEG", quality=88)
        shipped.append(f"/assets/cutins/scenes/{zone}_debrief.png")
        print(f"[{zone}] -> {dest} ({dest.stat().st_size / 1024:.0f} KB)", flush=True)

    if shipped and BASELINE.exists():
        entries = set(json.loads(BASELINE.read_text()))
        remaining = sorted(entries - set(shipped))
        BASELINE.write_text(json.dumps(remaining, indent=2) + "\n")
        print(f"baseline: {len(entries)} -> {len(remaining)} known-missing assets")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
