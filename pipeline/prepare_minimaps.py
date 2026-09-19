"""
Downscale + re-encode the source minimap images for the web.

The originals are much larger than the README's reference 1024x1024
(AmbroseValley 4320x4320, GrandRift 2160x2158, Lockdown 9000x9000) and
total ~24MB. Since the world-to-minimap formula operates in a 0-1 UV
space (see build_data.py / src/lib/coords.ts), any resolution works --
we only need enough pixels to look sharp on a large monitor. We cap
the longest edge at 2048px and re-encode as WebP for a much smaller
payload, which matters for a tool that should load fast for a level
designer clicking around.
"""
import os
from PIL import Image

SRC_DIR = os.path.join(os.path.dirname(__file__), "..", "player_data", "minimaps")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "web", "public", "minimaps")

FILES = {
    "AmbroseValley_Minimap.png": "AmbroseValley.webp",
    "GrandRift_Minimap.png": "GrandRift.webp",
    "Lockdown_Minimap.jpg": "Lockdown.webp",
}

MAX_EDGE = 2048


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for src_name, out_name in FILES.items():
        src_path = os.path.join(SRC_DIR, src_name)
        im = Image.open(src_path).convert("RGB")
        w, h = im.size
        scale = MAX_EDGE / max(w, h)
        if scale < 1:
            im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
        out_path = os.path.join(OUT_DIR, out_name)
        im.save(out_path, "WEBP", quality=90, method=6)
        size_kb = os.path.getsize(out_path) / 1024
        print(f"{src_name} {w}x{h} -> {out_name} {im.size[0]}x{im.size[1]} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
