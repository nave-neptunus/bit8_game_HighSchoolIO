# Slice one image holding the 6 people sheets (3 across, 2 down, each 4x4 frames) into assets/sprites/person_*.png.
# Usage: python3 tools/slice_people.py <image> assets/sprites   (needs: pip install pillow numpy scipy)
# Order in the image: hero, nurse, pharm (top row); tech, sam, jo (bottom row). Each output frame is 64x64.
import sys, numpy as np
from PIL import Image
from scipy import ndimage
src, outdir = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA"); a = np.array(im).astype(int)
rgb = a[..., :3]
# background: transparent pixels (or near-white ones touching the border, for images without alpha)
if (a[..., 3] < 128).mean() > 0.2:
    bg = a[..., 3] < 128
else:
    light = (rgb.min(axis=2) > 200) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 40)
    lab, _ = ndimage.label(light)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
fg = ~bg
# split each sheet (3 across, 2 down) into a 4x4 grid at the emptiest rows/columns
H, W = a.shape[:2]
def splits(prof, lo, hi):
    occ = np.nonzero(prof[lo:hi] > 0)[0]; s0, s1 = lo + occ[0], lo + occ[-1] + 1
    cuts = [s0]
    for k in (1, 2, 3):
        e = s0 + (s1 - s0) * k / 4; w0, w1 = int(e - (s1 - s0) / 10), int(e + (s1 - s0) / 10)
        cuts.append(w0 + int(np.argmin(prof[w0:w1])))
    return cuts + [s1]
sheets = {}
for R in range(2):
    for C in range(3):
        y0, y1, x0, x1 = R * H // 2, (R + 1) * H // 2, C * W // 3, (C + 1) * W // 3
        ry = splits(fg[:, x0:x1].sum(axis=1), y0, y1)
        bs = []
        for r in range(4):
            cx = splits(fg[ry[r]:ry[r + 1], :].sum(axis=0), x0, x1)
            for c in range(4):
                m = fg[ry[r]:ry[r + 1], cx[c]:cx[c + 1]]; ys, xs = np.nonzero(m)
                bs.append((cx[c] + xs.min(), ry[r] + ys.min(), cx[c] + xs.max() + 1, ry[r] + ys.max() + 1))
        sheets[(R, C)] = bs
boxes = [b for v in sheets.values() for b in v]
print("sprites found:", len(boxes))
alpha = np.where(bg, 0, 255).astype(np.uint8)
clean = np.dstack([a[..., :3].astype(np.uint8), alpha])
names = {(0, 0): "hero", (0, 1): "nurse", (0, 2): "pharm", (1, 0): "tech", (1, 1): "sam", (1, 2): "jo"}
maxh = max(b[3] - b[1] for b in boxes); maxw = max(b[2] - b[0] for b in boxes)
FR = 64; s = min((FR - 3) / maxh, (FR - 2) / maxw)
print("max sprite", maxw, "x", maxh, "scale", round(s, 3))
for key, bs in sorted(sheets.items()):
    rows = [bs[r * 4:(r + 1) * 4] for r in range(4)]
    colc = [np.median([(rows[r][c][0] + rows[r][c][2]) / 2 for r in range(4)]) for c in range(4)]
    sheet = Image.new("RGBA", (FR * 4, FR * 4), (0, 0, 0, 0))
    for r in range(4):
        for c in range(4):
            x0, y0, x1, y1 = rows[r][c]
            crop = Image.fromarray(clean[y0:y1, x0:x1]).convert("RGBa")
            w, h = max(1, round((x1 - x0) * s)), max(1, round((y1 - y0) * s))
            crop = crop.resize((w, h), Image.LANCZOS).convert("RGBA")
            ca = np.array(crop); ca[..., 3] = np.where(ca[..., 3] >= 110, 255, 0); crop = Image.fromarray(ca)
            dx = round(FR / 2 + (x0 - colc[c]) * s)
            sheet.alpha_composite(crop, (c * FR + max(0, min(FR - w, dx)), r * FR + FR - 1 - h))
    sheet.save(f"{outdir}/person_{names[key]}.png")
    print("wrote", names[key])
