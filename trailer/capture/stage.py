"""Copy captured clips + rendered audio into the Remotion project and write src/clips.json."""
import json, shutil, sys
from pathlib import Path
clips_dir, audio_dir, proj = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
clips = json.load(open(clips_dir / "clips.json"))["clips"]
for sub in ("clips", "audio"):
    d = proj / "public" / sub
    if d.exists(): shutil.rmtree(d)
shutil.copytree(clips_dir, proj / "public/clips", ignore=shutil.ignore_patterns("*.json"))
shutil.copytree(audio_dir, proj / "public/audio")
json.dump({"clips": [{"name": c["name"], "frames": c["frames"]} for c in clips]}, open(proj / "src/clips.json", "w"), indent=1)
print(len(clips), "clips staged,", sum(c["frames"] for c in clips), "frames")
