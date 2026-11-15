# Slice one transparent image of creatures (rows of sprites) into separate square PNGs.
# Usage: python3 tools/slice_creatures.py <image> <outdir> name1,name2,... [size]   (names left-to-right, top-to-bottom)
import sys, numpy as np
from PIL import Image
from scipy import ndimage
src, outdir, names = sys.argv[1], sys.argv[2], sys.argv[3].split(",")
a = np.array(Image.open(src).convert("RGBA"))
fg = a[..., 3] >= 128
lab, n = ndimage.label(ndimage.binary_dilation(fg, iterations=2))
objs = ndimage.find_objects(lab)
comps = [(i + 1, s, (lab[s] == i + 1).sum()) for i, s in enumerate(objs)]
comps = [c for c in comps if c[2] > 30]
mains = sorted(comps, key=lambda c: -c[2])[:len(names)]
# order mains into rows (by y center), then x
cy = lambda s: (s[0].start + s[0].stop) / 2; cx = lambda s: (s[1].start + s[1].stop) / 2
mains.sort(key=lambda c: cy(c[1]))
rows, cur = [], [mains[0]]
for c in mains[1:]:
    if abs(cy(c[1]) - np.mean([cy(x[1]) for x in cur])) < (c[1][0].stop - c[1][0].start) * 0.6: cur.append(c)
    else: rows.append(cur); cur = [c]
rows.append(cur)
order = [c for r in rows for c in sorted(r, key=lambda c: cx(c[1]))]
groups = {c[0]: [c[0]] for c in order}
def dist(s, t):  # gap between two boxes
    dy = max(0, max(s[0].start, t[0].start) - min(s[0].stop, t[0].stop)); dx = max(0, max(s[1].start, t[1].start) - min(s[1].stop, t[1].stop))
    return (dx * dx + dy * dy) ** 0.5
main_ids = set(groups)
for c in comps:
    if c[0] in main_ids: continue
    best = min(order, key=lambda m: dist(c[1], m[1])); groups[best[0]].append(c[0])
size = int(sys.argv[4]) if len(sys.argv) > 4 else 96
for name, m in zip(names, order):
    mask = np.isin(lab, groups[m[0]]) & (a[..., 3] > 0)
    ys, xs = np.nonzero(mask); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = a[y0:y1, x0:x1].copy(); crop[~mask[y0:y1, x0:x1]] = 0
    S = size * 2 if name.startswith("boss_") else size
    im = Image.fromarray(crop).convert("RGBa"); k = (S - 4) / max(crop.shape[:2])
    w, h = max(1, round(crop.shape[1] * k)), max(1, round(crop.shape[0] * k))
    im = im.resize((w, h), Image.LANCZOS).convert("RGBA"); ar = np.array(im); ar[..., 3] = np.where(ar[..., 3] >= 110, 255, 0)
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0)); out.alpha_composite(Image.fromarray(ar), ((S - w) // 2, (S - h) // 2))
    out.save(f"{outdir}/{name}.png"); print(name, f"{x1-x0}x{y1-y0} ->", out.size)
