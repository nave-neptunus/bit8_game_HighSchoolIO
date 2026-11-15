import sys
from pathlib import Path
from PIL import Image, ImageDraw
d, a, b, step = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
fs = list(range(a, b, step)); cols = 4; W, H = 480, 270
sheet = Image.new("RGB", (cols * W, ((len(fs) + cols - 1) // cols) * H), "black")
for i, f in enumerate(fs):
    p = Path(d) / f"f{f:05d}.jpg"
    if not p.exists(): continue
    im = Image.open(p).resize((W, H)); ImageDraw.Draw(im).text((6, 4), str(f), fill="yellow")
    sheet.paste(im, ((i % cols) * W, (i // cols) * H))
sheet.save(sys.argv[5]); print(sys.argv[5])
