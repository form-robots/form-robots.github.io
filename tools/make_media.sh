#!/usr/bin/env bash
# Rebuild everything under media/ from a local FORM checkout.
#
#   tools/make_media.sh [path/to/FORM]      (default: ../FORM)
#
# Needs ffmpeg (libx264) and Python with Pillow. Sources are the rendered video
# (presentation/outputs), the presentation assets, and the paper figure PNGs.
set -euo pipefail

FORM=$(cd "${1:-../FORM}" && pwd)
SITE=$(cd "$(dirname "$0")/.." && pwd)
P="$FORM/presentation"
A="$P/assets"
FIGS="$FORM/2027_ICRA_Manipulating_Materials/figs"
FONT="$A/fonts/Lato-Bold.ttf"
OUT="$SITE/media"
mkdir -p "$OUT/video" "$OUT/results" "$OUT/teaser" "$OUT/figures"

# H.264 for the web: no audio, progressive download, even sizes.
encode() { # src dst [crf] [filter]
  ffmpeg -v error -y -i "$1" ${4:+-vf "$4"} -an -c:v libx264 -preset slow \
    -crf "${3:-23}" -pix_fmt yuv420p -movflags +faststart "$2"
}
poster() { # video jpg seconds
  ffmpeg -v error -y -ss "$3" -i "$1" -frames:v 1 -q:v 3 "$2"
}

# Narrated overview video, already H.264 with faststart; copied as is.
cp "$P/outputs/ICRA2027_video.mp4" "$OUT/video/form.mp4"
poster "$OUT/video/form.mp4" "$OUT/video/form_poster.jpg" 138.5

# Elastic tasks: matched vs. swapped plans for materials A and B.
encode "$A/data/footage/01_insertion_matched_swapped.mp4" "$OUT/results/insertion.mp4" 23 "scale=1280:-2:flags=lanczos"
poster "$OUT/results/insertion.mp4" "$OUT/results/insertion.jpg" 7.8
encode "$A/data/footage/02_golf_matched_swapped.mp4" "$OUT/results/golf.mp4" 23 "scale=1280:-2:flags=lanczos"
poster "$OUT/results/golf.mp4" "$OUT/results/golf.jpg" 5.0

# Simulated X shaping as a 2x2 grid: rows are materials, columns are plans.
H="$A/illustrations/shaping_hand"
label="fontfile=$FONT:fontcolor=0x21333e:fontsize=24"
ffmpeg -v error -y -i "$H/A_plan_A.mp4" -i "$H/A_plan_B.mp4" -i "$H/B_plan_B.mp4" -i "$H/B_plan_A.mp4" \
  -filter_complex "color=c=white:s=1332x936:r=25:d=16[bg];\
[bg][0:v]overlay=44:48:shortest=1[t1];[t1][1:v]overlay=692:48[t2];\
[t2][2:v]overlay=44:496[t3];[t3][3:v]overlay=692:496,\
drawtext=$label:text='Plan using matched ID':x=44+(640-tw)/2:y=14,\
drawtext=$label:text='Plan using swapped ID':x=692+(640-tw)/2:y=14,\
drawtext=fontfile=$FONT:fontsize=30:fontcolor=0x2375aa:text='A':x=(44-tw)/2:y=48+(440-th)/2,\
drawtext=fontfile=$FONT:fontsize=30:fontcolor=0xc96932:text='B':x=(44-tw)/2:y=496+(440-th)/2" \
  -an -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart "$OUT/results/shaping_sim.mp4"
poster "$OUT/results/shaping_sim.mp4" "$OUT/results/shaping_sim.jpg" 15.5

# Hardware: recorded press above the MPM prediction from the identified laws.
tag="fontfile=$FONT:fontsize=22:fontcolor=white:box=1:boxcolor=0x21333e@0.85:boxborderw=8"
ffmpeg -v error -y -i "$A/data/footage/04_pressing_real_red_yellow_gray.mp4" \
  -i "$A/data/footage/05_pressing_simulation_red_yellow_gray.mp4" \
  -filter_complex "[0:v]drawtext=$tag:text='Recorded':x=18:y=40[r];\
[1:v]drawtext=$tag:text='MPM prediction':x=18:y=40[s];\
[r]pad=iw:ih+8:0:0:white[r2];[r2][s]vstack=inputs=2:shortest=1" \
  -an -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart "$OUT/results/pressing.mp4"
poster "$OUT/results/pressing.mp4" "$OUT/results/pressing.jpg" 14.5
encode "$A/illustrations/hardware_execution.mp4" "$OUT/results/shaping_hw.mp4" 20
poster "$OUT/results/shaping_hw.mp4" "$OUT/results/shaping_hw.jpg" 9

# Pouring: identification pour on hardware and its MPM replay.
encode "$A/data/footage/03_pouring_glycerol_real_vs_simulation.mp4" "$OUT/results/pouring.mp4" 25 "scale=1280:-2:flags=lanczos"
poster "$OUT/results/pouring.mp4" "$OUT/results/pouring.jpg" 6

# Stills: teaser photos, figure crops, and the social card.
FORM="$FORM" OUT="$OUT" SITE="$SITE" python3 - <<'EOF'
import os
from pathlib import Path
from PIL import Image

form, out, site = Path(os.environ["FORM"]), Path(os.environ["OUT"]), Path(os.environ["SITE"])
assets = form / "presentation/assets"
figs = form / "2027_ICRA_Manipulating_Materials/figs"

def webp(im, dst, width=None, quality=90):
    im = im.convert("RGB")
    if width and im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.Resampling.LANCZOS)
    im.save(out / dst, "WEBP", quality=quality, method=6)

# Teaser grid, numbered as in presentation/src/opening_layout.py.
src = assets / "opening/source_images"
teaser = {
    "pinch_plasticine": 2, "pinch_playdoh": 1, "pinch_slime": 0,
    "press_plasticine": 5, "press_playdoh": 3, "press_slime": 4,
    "pour_glycerol": 7, "pour_glycerol90": 8, "pour_water": 6,
}
for name, num in teaser.items():
    im = Image.open(src / f"figure1-{num:03d}.jpg").convert("RGB")
    if num >= 6:
        im = im.transpose(Image.Transpose.ROTATE_90)
    im.save(out / "teaser" / f"{name}.jpg", quality=90, optimize=True, progressive=True)

# Method diagram without the slide header.
method = Image.open(assets / "identification/method02_flow_layout.png")
webp(method.crop((0, 240, method.width, method.height)), "figures/method.webp", 2000)

# Simulated shaping: press, pinch, target, and final shapes.
webp(Image.open(figs / "identification_plastic_shaping.png"), "figures/shaping_sim.webp", 2400)

# Hardware shaping scans: bottom row, one image per material.
hw = Image.open(figs / "hardware_pressing_shaping.png")
for name, (x0, x1) in {"playdoh": (0, 651), "slime": (664, 1316), "plasticine": (1329, 1980)}.items():
    webp(hw.crop((x0, 970, x1, hw.height)), f"figures/scan_{name}.webp")

# Pouring: target-volume plot and the six receiver cups.
pour = Image.open(figs / "pouring.png")
webp(pour.crop((1650, 95, pour.width, 945)), "figures/pouring_plot.webp", 1400)
webp(pour.crop((120, 958, pour.width, pour.height)), "figures/pouring_cups.webp", 2400)


# Social card (1200x630) from the opening slide.
card = Image.open(assets / "opening/opening_proposal_720p.png").convert("RGB")
card = card.resize((1200, 675), Image.Resampling.LANCZOS).crop((0, 0, 1200, 630))
card.save(site / "assets/img/social.jpg", quality=88, optimize=True, progressive=True)
EOF

du -sh "$OUT"/* "$SITE/assets/img/social.jpg"
