# Slice the tile sheet: 3 rows (areas 1-3) x 13 framed squares:
# floor, path, grass, wall, water a, water b, hub, decor, lymph, sign, gate, exit, UI icon (item / bubble / badge+sparkle).
# Usage: python3 tools/slice_tiles.py <image> <outdir>
import sys, numpy as np
from PIL import Image
from scipy import ndimage
src, outdir = sys.argv[1], sys.argv[2]
a = np.array(Image.open(src).convert("RGBA"))
rgb = a[..., :3].astype(int)
ink = (a[..., 3] >= 128) & (rgb.min(axis=2) < 225)          # anything that isn't the white page
def runs(prof, minlen):
    on = prof > 0; out = []; i = 0
    while i < len(on):
        if on[i]:
            j = i
            while j < len(on) and on[j]: j += 1
            if j - i >= minlen: out.append((i, j))
            i = j
        else: i += 1
    return out
yr = runs(ink.sum(axis=1) > ink.shape[1] * 0.2, 40)
assert len(yr) == 3, yr
rows = []
for y0, y1 in yr:
    xr = runs(ink[y0:y1].sum(axis=0) > (y1 - y0) * 0.5, 40)   # light tiles can split; use the regular spacing instead
    w = int(np.median([b - a_ for a_, b in xr if b - a_ > 100])); st, en = xr[0][0], xr[-1][1]; pitch = (en - st - w) / 12
    rows.append([(slice(y0, y1), slice(round(st + i * pitch), round(st + i * pitch) + w)) for i in range(13)])
KINDS = ["floor", "path", "grass", "wall", "water_a", "water_b", "hub", "decor", "lymph", "sign", "gate", "exit", "ui"]
UI = {0: ["ui_item"], 1: ["ui_bubble"], 2: ["ui_badge", "ui_sparkle"]}
T = 64
def inner(s):
    h, w = s[0].stop - s[0].start, s[1].stop - s[1].start; m = round(min(h, w) * 0.07)
    return a[s[0].start + m:s[0].stop - m, s[1].start + m:s[1].stop - m].copy()
def cutout(img):  # remove the flat-ish background around an icon (flood fill from the edge)
    rgb = img[..., :3].astype(int); edge = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    ref = np.median(edge, axis=0); close = np.abs(rgb - ref).sum(axis=2) < 70
    lab2, _ = ndimage.label(close); border = set(np.unique(np.concatenate([lab2[0], lab2[-1], lab2[:, 0], lab2[:, -1]]))) - {0}
    bg = np.isin(lab2, list(border)); img[bg] = 0; return img
def save(arr, name, size, fit=False, keep_alpha=False):
    if fit:  # drop stray specks, then trim and centre on a square
        l3, n3 = ndimage.label(arr[..., 3] > 0)
        if n3 > 1:
            sizes = ndimage.sum(np.ones_like(l3), l3, range(1, n3 + 1)); keep = [i + 1 for i, z in enumerate(sizes) if z >= sizes.max() * 0.05]
            arr = arr.copy(); arr[~np.isin(l3, keep)] = 0
        ys, xs = np.nonzero(arr[..., 3] > 0); arr = arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    im = Image.fromarray(arr).convert("RGBa"); k = (size - (2 if fit else 0)) / max(arr.shape[:2]) if fit else None
    w, h = (max(1, round(arr.shape[1] * k)), max(1, round(arr.shape[0] * k))) if fit else (size, size)
    im = im.resize((w, h), Image.LANCZOS).convert("RGBA"); ar = np.array(im)
    if fit or keep_alpha: ar[..., 3] = np.where(ar[..., 3] >= 110, 255, 0)
    else: ar[..., 3] = 255
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0)); out.alpha_composite(Image.fromarray(ar), ((size - w) // 2, (size - h) // 2))
    out.save(f"{outdir}/{name}.png")
for r, row in enumerate(rows):
    for c, s in enumerate(row):
        k = KINDS[c]
        if k == "ui":
            img = cutout(inner(s))
            if len(UI[r]) == 1: save(img, UI[r][0], 64, fit=True)
            else:   # star on the left half, sparkle on the right
                ys, xs = np.nonzero(img[..., 3] > 0); mid = (xs.min() + xs.max()) // 2 + 4
                L, Rr = img.copy(), img.copy(); L[:, mid:] = 0; Rr[:, :mid] = 0
                save(L, UI[r][0], 48, fit=True); save(Rr, UI[r][1], 48, fit=True)
            continue
        name = f"tile_water_{r + 1}_{k[-1]}" if k.startswith("water") else f"tile_{k}_{r + 1}"
        if k in ("lymph", "sign"): save(cutout(inner(s)), name, T, keep_alpha=True)   # drawn over the floor under it
        else: save(inner(s), name, T)
print("done")
