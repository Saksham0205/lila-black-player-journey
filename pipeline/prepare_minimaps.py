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
