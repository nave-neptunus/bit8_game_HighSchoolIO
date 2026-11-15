# Immune Response

A tiny 8-bit adventure inside a patient named Maya. Shrink down, lead a team of immune cells, and fight germs across three infections:
a scraped knee, the flu, and an antibiotic-resistant superbug in her stitches.

Made for middle schoolers to learn how the immune system works and why antibiotics only work on bacteria.

## Play
**Play online:** https://nave-neptunus.github.io/bit8_game_HighSchoolIO/

Or open `index.html` in any modern browser. No install or build step.

- **Move:** arrow keys or WASD
- **A (talk, confirm):** Z, Enter or Space
- **B (back, menu):** X or Esc
- On phones and tablets, use the on-screen D-pad and A/B buttons.

## Optional camera attacks

Choose **CAMERA ATTACKS: OFF** on the title screen or in the in-game menu to turn camera controls on. Allow camera access; a small mirrored preview opens. Hold a gesture in the guide square for about 600 ms. During battle, gestures select the active cell's first four move slots:

| Gesture | Move slot |
| --- | ---: |
| Fist | 1 |
| Peace | 2 |
| OK sign | 3 |
| Thumbs-up | 4 |

The preview shows the move names for the active cell. Background frames do nothing. Press **1–4** for the same move shortcuts, or use the original menus, arrows/WASD, Z/Enter, X/Esc, and touch buttons at any time. **OFF** stops the camera stream.

Camera mode needs HTTPS or `http://localhost`; the regular game still opens directly from disk. To run locally:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. TensorFlow.js and the trained model are stored in `vendor/` and `gesture_model/`, with no external model requests. The camera controller uses a centered mirrored 224×224 crop and MobileNetV2 scaling, matching training.

## What's in it
- 3 areas, each with a clinic hub, wild germs in the grass, germ captains to beat, hidden items, and a boss
- 5 immune cells that level up and learn new moves
- 10 germs to collect in the Germ Journal, each with a real science fact
- A choice in Area 2 that changes the final boss
- Original chiptune music and sound effects
- Saves in your browser so you can come back later
- Level Select on the title screen to jump straight to any area

## Tests
```bash
node test_balance.js
```
```bash
node test_world.js
```
