"""QA on the final render (video-edit skill: prove cuts from the final render, check audio peaks).
python qa.py <video.mp4> <out.jpg>"""
import json, re, subprocess, sys, tempfile
from pathlib import Path
import imageio_ffmpeg
from PIL import Image, ImageDraw
FF = imageio_ffmpeg.get_ffmpeg_exe()
vid, out = sys.argv[1], sys.argv[2]
proj = Path(__file__).resolve().parents[1]   # the trailer/ Remotion project
f = {c["name"]: c["frames"] for c in json.load(open(f"{proj}/src/clips.json"))["clips"]}
segs = [["title"],["grass"],["battle"],["captain"],["area2","pharmacist"],["abx"],["journal"],["boss1","boss2"],["sb_intro","sb_culture","sb_clean","sb_target"],["end_a","end_b"]]
joins = ["fade","cut","fade","fade","fade","fade","fade","fade","fade","fade"]   # keep in sync with src/edit.ts
t = 105 - 14; marks = [("intro end", t + 14)]
for s, j in zip(segs, joins):
    start = t; acc = 0
    for c in s[1:]:
        acc += f[s[s.index(c) - 1]]; marks.append((f"cut->{c}", start + acc + 2))
    t += sum(f[c] for c in s)
    if j != "cut": t -= 14
    marks.append((f"after {s[-1]} ({j})", t + 14 + 4))
marks.append(("outro", t + 165 - 14 + 30))
W, H = 480, 270; cols = 4
sheet = Image.new("RGB", (cols * W, ((len(marks) + cols - 1) // cols) * H), "black")
for i, (lab, fr) in enumerate(marks):
    p = f"{tempfile.gettempdir()}/qa_{i}.png"
    subprocess.run([FF, "-v", "error", "-y", "-ss", f"{fr / 30:.3f}", "-i", vid, "-frames:v", "1", p], check=True)
    im = Image.open(p).resize((W, H)); ImageDraw.Draw(im).text((6, 4), f"{lab} @{fr}", fill="yellow")
    sheet.paste(im, ((i % cols) * W, (i // cols) * H))
sheet.save(out, quality=85)
r = subprocess.run([FF, "-hide_banner", "-i", vid, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
print(" ".join(re.findall(r"(mean_volume: \S+ dB|max_volume: \S+ dB)", r)))
d = subprocess.run([FF, "-hide_banner", "-i", vid], capture_output=True, text=True).stderr
print(re.search(r"Duration: \S+", d).group(0), re.search(r"Video: .*", d).group(0)[:90])
