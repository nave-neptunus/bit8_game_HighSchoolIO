# Immune Response (hackathon game, "Project Vital Quest" healthcare game track)

Pokemon-style game for middle schoolers: walk a pixel-art kid through 3 areas inside a patient (Maya),
wild germs jump out of "tall grass," and battles are turn-based with immune cells as your team.
Theme: immune system + antibiotic resistance. Design doc: https://claude.ai/artifact/2kx3hGx8ydoXgYH7JG48rp
(the doc describes the original, harder tuning; this code uses the easier middle-school tuning in TUNE).

## Run
Open `index.html` in a browser (no build step). Or `python3 -m http.server` and visit localhost:8000.
Controls: arrows/WASD move, Z/Enter = A, X/Esc = B (back / team screen). On-screen D-pad + A/B for touch.

## Files
- `engine.js`: battle rules + all stats (TUNE block at top), enemy factories, scripted test players. Shared by game and tests.
- `sprites.js`: 8-bit art. People are hand-drawn 16x16 pixel rows (palette-swapped for NPCs); cells/germs are procedural blobs; tiles per area palette.
- `game.js`: overworld (maps, NPCs, grass encounters, lymph node heal, gates/exits), dialog/menu text box, battle UI, title/ending. `window.__G.debug` has test hooks.
- `index.html`: page + CSS + touch controls.
- `test_balance.js`: `node test_balance.js` runs 2,000 fights per case with a "decent" scripted player and a random-button player.
- `sim.py`: original Python balance sim (harder tuning, from the design doc). Reference only.
- `smoke.py`, `shot.py`, `preview.html`: headless-Chrome smoke test and sprite-sheet preview (Playwright).

## Game flow
Area 1 The Scrape (Neutrophil, Macrophage; boss Toxin Brewer) -> Area 2 The Cough (Macrophage, NK, Killer T;
pharmacist offers antibiotics, a trap: they do nothing to viruses; boss Virus Factory) -> Area 3 The Superbug
(Neutrophil, Macrophage, B Cell; Lab Culture -> Debridement -> Targeted Antibiotic; boss Superbug Colony gets
+15 HP and +1 resistance per antibiotic wasted in Area 2). Wild wins give Immune Memory (+5% boss damage, max 3).
Losing sends you back to the lymph node healed (no game over).

## Balance (node test_balance.js, current TUNE)
| Boss | Decent player | Random player |
| --- | --- | --- |
| Area 1 | 100% | 98% |
| Area 2 | 100% | 50% |
| Area 3 (0 / 2 antibiotics wasted) | 100% / 99% | 44% / 27% |

## Status
Done: engine, kid tuning, all sprites, 3 maps, NPC dialog, pharmacist choice, encounters, battle UI with
STRONG!/weak hints, ending. Smoke test passes (title -> intro -> walk -> wild battle, no console errors).

Not yet verified / next steps:
1. Full playthrough of all 3 areas by hand (boss fights, gate opening, area exits, ending, play again).
2. Check the battle screen with 3-4 enemies on screen (labels may overlap; status tags stack under labels).
3. Player walk animation frame logic in drawWorld is convoluted; simplify.
4. The Press Start 2P font loads from Google Fonts; falls back to monospace offline.
5. Optional: sound effects, save to localStorage, publish/share link for judges.
6. Update the design doc with the overworld + kid tuning.

## Science notes (keep claims sourced)
AMR deaths 1.27M direct / 4.95M associated in 2019 (IHME/Lancet GRAM). Antibiotics don't work on viruses (CDC).
NK "missing self" vs MHC-I downregulation (PMC2700287). Pus is mostly dead neutrophils. Biofilms resist drugs
and immune cells. Simplifications: macrophage stands in for dendritic cells as antigen presenter; resistance is
made personal to Maya for clarity.
