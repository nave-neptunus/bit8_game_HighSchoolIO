# Immune Response trailer (handoff)

An 80-second (1:20) presentation video for the game, made with [Remotion](https://www.remotion.dev/) from real gameplay.
The finished video is committed at [`immune-response-trailer.mp4`](immune-response-trailer.mp4) (1920x1080, 30 fps, H.264 + AAC).

Look: a sunny classroom. The game's handheld sits on the left; on the right a green chalkboard in a wood frame
"writes" each lesson in chalk, and a yellow sticky note slaps on with the "You learn:" fact. The intro, the
"why it matters" stat and the end card are full chalkboards. The previous dark "tech" look was dropped because it
read as AI-made.

## Story (6 lessons, all in `src/edit.ts`)

Paced slowly on purpose: an earlier cut had 10 short sections and felt rushed, so related clips were merged into
6 longer lessons (5 to 18 s each), chalk writes at 1.7 frames per letter, and the sticky note only lands after the
headline and body have had time to be read. Clips that end on static text hold their last frame (`HOLD` in
`src/edit.ts`). Total is exactly 2,400 frames (1:20).

| # | Gameplay clips | Board headline | Sticky note (the education beat) |
| --- | --- | --- | --- |
| 1 | title | learn how your body fights back | Your immune system is a team of cells, and each one has a job. |
| 2 | grass, battle | real cells, real jobs | Neutrophils rush in first. Pus is mostly dead neutrophils! |
| 3 | captain, journal | meet the germs | About 1 in 3 people carry staph in their nose (CDC). |
| 4 | area2, pharmacist, abx | free antibiotics? | The flu is a virus. Antibiotics do not work on viruses (CDC). |
| 5 | sb_intro, sb_culture, sb_clean, sb_target | think like a doctor | Biofilms shield bacteria, so doctors test before they treat. |
| 6 | end_a, end_b | choices have consequences | Wasting antibiotics helps bacteria become resistant. |

The boss1 / boss2 clips are captured but unused in this cut.

Then the impact board (1.27 million deaths directly caused by drug-resistant infections in 2019, GRAM study,
The Lancet 2022) and the end card (what kids learn, play link). Every fact matches the sourced science notes in the
root `CLAUDE.md`.

## Files

- `src/edit.ts`: the edit decision list. Segments (clips, kicker, headline with `*punch*` words, body, learn line,
  join), lengths of intro / impact / outro, and `timeline()` which computes absolute frame positions.
- `src/Trailer.tsx`: the composition. `Handheld` plays the clip PNG sequences with a small zoom punch on hard cuts,
  `Lesson` is the chalkboard + sticky note, `Intro` / `Impact` / `Outro` are the full boards, and the bottom of the
  file places music and sound effects.
- `src/components/Chalk.tsx`: `Board` (wood frame, slate, eraser smudges, faint old writing, chalk tray),
  `ChalkWrite` (word-by-word chalk writing, `*hot*` words in yellow with a drawn underline), `ChalkStroke`
  (hand-drawn underline / circle / check / arrow), `StickyNote`.
- `src/components/Layers.tsx`: the classroom wall background and the finishing layers (warm grade, grain, vignette).
- `src/theme.ts`: colors, fonts (Cabin Sketch for chalk headlines, Kalam for handwriting, Caveat for red pen,
  Press Start 2P), easing and spring presets.
- `src/clips.json`: frame count of each captured clip (written by `capture/stage.py`).
- `scripts/gen-sfx.mjs`: synthesizes the small SFX kit in `public/sfx` (whoosh, pop, tick, chalk scratch...).
- `public/sprites`: cell and germ PNGs copied from `../assets/sprites`, used as board "magnets".
- `capture/`: the Python pipeline that records gameplay and audio (below).

Not in git (too big, regenerate them): `public/clips` (about 400 MB of PNG frames), `public/audio`, `out/`.

## How the gameplay is captured

Screen recording would drop frames and can't record WebAudio cleanly, so capture is frame-exact and scripted:

1. `capture/rec.py` opens the game in headless Chrome (Playwright), freezes `requestAnimationFrame`, seeds
   `Math.random`, and replaces `audio.js` with a stub that logs every music / jingle / sfx call with its frame number.
   Each video frame runs `__G.debug.run(2)` (60 game ticks/s -> 30 fps) and screenshots the `.shell` element as a
   transparent 1008x952 PNG.
2. `capture/scenes.py` drives the game through each scene with the `__G.debug` hooks (walk, talk, battle, menus) and
   writes `<out>/<clip>/NNNN.png` plus `clips.json` (frame counts + audio logs). Because the game is deterministic,
   `python scenes.py <out> <first_scene_index>` replays earlier scenes without screenshots and only re-shoots from
   that scene on.
3. `capture/render_audio.py` loads the game's real `audio.js` (patched to expose its synth) into an
   `OfflineAudioContext`, replays each clip's logged cues, and writes one WAV per clip, plus `intro.wav` (title
   song) and `outro.wav` (ending song).
4. `capture/stage.py` copies frames and audio into `public/` and writes `src/clips.json`.

## Rebuild from scratch

```bash
# 1. serve the game (repo root)
cd .. && python3 -m http.server 8765 --bind 127.0.0.1 &
cd trailer

# 2. python tools
python3 -m venv .venv && . .venv/bin/activate
pip install playwright imageio-ffmpeg pillow numpy && playwright install chromium
# rec.py launches channel="chrome" (installed Google Chrome). Without Chrome, change it to the bundled chromium.

# 3. capture, audio, stage (capture takes a few minutes)
python capture/scenes.py /tmp/ir_clips
python capture/render_audio.py /tmp/ir_clips /tmp/ir_audio
python capture/stage.py /tmp/ir_clips /tmp/ir_audio .

# 4. sound effects + node deps
npm i && node scripts/gen-sfx.mjs

# 5. preview / render
npm run dev      # Remotion Studio
npx remotion render src/index.ts Trailer out/raw.mp4 --codec h264 --crf 17 --timeout 120000 --concurrency 4

# 6. loudness: the raw render peaks around -11 dB, lift it so peaks land between -2 and -5 dB
FF=$(python -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")
$FF -y -i out/raw.mp4 -c:v copy -af volume=7dB -c:a aac -b:a 256k -movflags +faststart immune-response-trailer.mp4

# 7. QA: contact sheet of the frames right after each cut + audio peak and duration
python capture/qa.py immune-response-trailer.mp4 out/qa.jpg
```

Tips:
- Use `--timeout 120000` on renders and stills; the first load of 2,000+ PNGs can time out at the default.
- Check single frames fast: `npx remotion still src/index.ts Trailer out/f.png --frame=600`.
- If you change the game's look or maps, re-capture; if you change only words or timing, edit `src/edit.ts`
  (and the `segs` list in `capture/qa.py`) and re-render.
- After editing captions, re-check that the headline + body fit above the sticky note (the board is 690x640).

## Skills that shaped the edit

- [claude-remotion-skill](https://github.com/haidrrrry/claude-remotion-skill): spring / eased motion only,
  staggered entrances, a layered background stack, one `theme.ts`, SFX a few frames before the visual,
  render -> extract frames -> inspect loop, and `gen-sfx.mjs`.
- [video-edit-skill](https://github.com/tenfoldmarc/video-edit-skill): bold captions with punch words, a small zoom
  punch on cuts, subtle SFX (gain 0.75), audio peaks between -2 and -5 dB, verify every cut from the final render.

## Status and ideas

Done: classroom restyle, slower 6-lesson 1:20 cut, full render with game audio, QA'd cuts and loudness.
Ideas: a vertical 9:16 version for social (stack the handheld above the board), voice-over, re-capture to show
the new camera gesture attacks (added to the game after this capture).
