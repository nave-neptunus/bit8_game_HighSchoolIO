# Immune Response: sprite list for redrawing

Every sprite in the game, with its size, what it shows, and where it's used. Make new art as **PNG files with transparent backgrounds**
and save them under `assets/sprites/` with the exact file names below. The game will load a PNG if it exists and fall back to the
current code-drawn art if it doesn't, so you can replace sprites one at a time.

**After adding or removing PNGs, run `node make_manifest.js`** so the game knows which files exist (this also makes it work when
`index.html` is opened straight from disk). A wrongly named file shows a warning in the browser console.
Higher-resolution art works too: a 96×96 cell still draws at cell size, just sharper. Keep the same proportions as listed.

## Style rules (apply to every sprite)
- **Pixel art**, hard edges, no anti-aliasing, no blur, no gradients. Transparent background.
- **Outline:** 1 px dark outline in `#1b1428` around every character and creature.
- **Light from the top-left:** highlight on the upper-left, shadow on the lower-right, 3–4 shades per color.
- **Look:** cute, friendly, readable at small size, for middle schoolers. Germs are mischievous, never gross or scary.
- **Original designs only.** Don't copy or imitate any existing game's characters, creatures or UI.
- **Exact pixel sizes** as listed. Bigger art must stay on the same grid (for example 48×48), never a resized small sprite.
- **Fill the canvas:** keep about 1–2 px of empty space around the edge, and stand the subject on the bottom of the canvas (feet or base at the bottom).

## Prompt template for Codex
> Create a [SIZE] pixel art sprite, transparent PNG, 1px #1b1428 outline, top-left lighting, 3–4 shades per color,
> crisp pixels, no anti-aliasing, cute style for a middle school educational game. Subject: [DESCRIPTION].
> Main colors: [COLORS]. Save as assets/sprites/[FILE].

---

## 1. Immune cells (your team)
**48×48 each.** Drawn big in battle (bottom-left, facing **right** toward the enemies) and on the title, team and ending screens.
Each one needs a face (eyes + mouth) so it reads as a character.

| File | Cell | Description | Main colors |
| --- | --- | --- | --- |
| `cell_neutrophil.png` | Neutrophil | Round, pale lavender-white cell with a **3-lobed purple nucleus** (three connected beads) visible inside. Small speckles (granules) in the cytoplasm. Energetic, determined face. The fast first responder. | `#ece5f8`, `#c3b6e0`, nucleus `#8a63c7` / `#5e3f99` |
| `cell_macrophage.png` | Macrophage | Big, wide, blobby cream-yellow cell with **3–4 stubby arm-like pseudopods** reaching out, a brown oval nucleus off-center. Friendly, hungry grin. Big eater, tanky. | `#f0d9a8`, `#c9a96e`, nucleus `#b07a3a` |
| `cell_nk.png` | NK Cell | Round green cell with a **ring of short spikes** all around it, small dark granules inside. Narrowed, focused hunter eyes, small smile. Hunts cells that are hiding. | `#9fdc8c`, `#6bb05a`, spikes `#4f9a44` |
| `cell_killer_t.png` | Killer T Cell | Round blue cell with **2 antenna-like receptors** (Y shapes) on top and a **dark visor band** across the eyes (yellow glint). Cool, special-agent look. | `#6fb3f2`, `#3f7fc0`, visor `#22324a`, glint `#ffe066` |
| `cell_b.png` | B Cell | Round orange cell with **4–5 small pink Y-shaped antibodies** sticking out of its surface, brown nucleus. Cheerful face. Fires antibodies. | `#f5b971`, `#c98a3e`, antibodies `#d84a8a` |

## 2. Germs (enemies)
**48×48 each.** Drawn in battle (top-right, facing **left** toward your cell), in the Germ Journal, and on the overworld for germ captains
(where they're scaled down, so the silhouette must read at 24×24).

| File | Germ | Type | Description | Main colors |
| --- | --- | --- | --- | --- |
| `germ_staph.png` | Staph Scout | Bacteria | A **cluster of 4–5 round golden balls** stuck together like a bunch of grapes, face on the biggest ball. Cocky grin. | `#f2c94c`, `#c9932b`, `#fff2b0` |
| `germ_strep.png` | Strep Chain | Bacteria | **5 orange balls in a diagonal chain**, like beads on a string, face on the middle ball. Mischievous grin. | `#f29a4c`, `#c0642a`, `#ffd2a6` |
| `germ_virion.png` | Flu Virion | Virus | Round **periwinkle-blue ball** covered in **pink spikes with round tips** (lollipop spikes). Sneaky grin. | `#8d96f2`, `#5c63c4`, spikes `#e05a7a` / `#ff9ab0` |
| `germ_rhino.png` | Cold Virus | Virus | Smaller **teal 20-sided (faceted) ball** with short stubby spikes. Sniffly, cheeky smile. | `#7fd6c4`, `#3f9a8a`, `#4fb0a0` |
| `germ_infected.png` | Hijacked Lung Cell | Infected cell | A **pink oval body cell** that's been taken over: a purple virus blob glowing inside it, tiny virus spikes poking out the top, worried/frowning face. | `#f4a6b8`, `#cf7c92`, virus `#8a4fa0` |
| `germ_rstaph.png` | Resistant Staph (MRSA) | Bacteria | Like Staph Scout but **steel-grey and armored**, with a **red bandana** and angry eyebrows. Tough, resistant look. | `#b8c2cc`, `#7d8894`, bandana `#d84a4a` |
| `germ_pseudo.png` | Slime Rod | Bacteria | A **long rod (capsule) shape**, light blue, with a **wavy tail (flagellum)** on one end and little purple slime drips around it. Goofy grin. | `#6fc7d9`, `#3a8fa3`, slime `#9b6bd6` |

## 3. Bosses
**64×64 each.** One per area. Drawn biggest in battle and standing in front of the exit on the overworld.

| File | Boss | Description | Main colors |
| --- | --- | --- | --- |
| `boss_brewer.png` | Toxin Brewer (Area 1) | A **big orange staph cluster** (6+ balls) with an angry fanged face, **green toxin bubbles** dripping below it like it's brewing poison. | `#f29a4c`, `#c0642a`, toxin `#7bd36a` / `#3f9a3a` |
| `boss_factory.png` | Virus Factory (Area 2) | A **big pink lung cell turned into a factory**: 2–3 small blue viruses popping out of the top like smoke from chimneys, purple core, angry grin. | `#f4a6b8`, `#cf7c92`, viruses `#8d96f2`, core `#8a4fa0` |
| `boss_superbug.png` | Superbug Colony (Area 3) | A **huge purple slime blob (biofilm)** with grey and gold bacteria stuck inside it, a fanged angry face, slime dripping at the base. The final boss. Dark purple outline `#3b1d63`. | `#9b6bd6`, `#6a3fa3`, `#d9c2ff`, bacteria `#b8c2cc` / `#f2c94c` |

## 4. People (overworld characters)
**16×16 per frame.** Shrunk-down humans walking around inside Maya. Chunky, cute top-down RPG proportions (big head, small body).
Each character is **one sprite sheet, 64×64**: 4 columns × 4 rows.

- **Rows (top to bottom):** facing down, facing up, facing left, facing right.
- **Columns (left to right):** standing, left foot forward, standing, right foot forward.

| File | Who | Description | Shirt / accent | Hair / skin |
| --- | --- | --- | --- | --- |
| `person_hero.png` | You (the player) | Kid in a white lab-coat-style top with **teal cap and teal trim**. | teal `#2fb6a8`, white `#f4f4f0` | brown hair `#4a2c1a`, skin `#f0b98a` |
| `person_nurse.png` | Nurse Ada | Nurse in **pink scrubs and pink cap**. | pink `#f28bb3`, light pink `#f7c7da` | dark hair `#2b1a12`, skin `#c98d64` |
| `person_pharm.png` | Pharmacist | Older pharmacist in a **green coat**, grey hair. | green `#5fbf6a`, `#e8f5e8` | grey hair `#c9c9c9`, skin `#f0b98a` |
| `person_tech.png` | Tech Lee | Hospital lab tech in a **purple lab coat**, safety-glasses look. | purple `#8a63c7`, `#e9e1f7` | blond hair `#d9a05b`, skin `#8a5a3c` |
| `person_sam.png` | Medic Sam | Young medic in an **orange vest**. | orange `#f2994a`, `#fff1e0` | black hair `#1b1428`, skin `#8a5a3c` |
| `person_jo.png` | Intern Jo | Intern in **blue scrubs**. | blue `#4a7fd9`, `#e3ecfb` | auburn hair `#a8532b`, skin `#f0b98a` |

Done: all 6 people sheets (sliced from one image with `tools/slice_people.py`).

## 5. Map tiles
**16×16 each, seamless** (tiles sit edge to edge). Every area has its own color set, so each tile needs **3 versions**:
`_1` The Scrape (skin / knee, warm peach and red), `_2` The Cough (lungs, pink and yellow-green), `_3` The Superbug (hospital stitches, cool blue-grey and purple).
Example names: `tile_floor_1.png`, `tile_floor_2.png`, `tile_floor_3.png`.

| File (×3 areas) | Tile | Description | Area 1 / Area 2 / Area 3 colors |
| --- | --- | --- | --- |
| `tile_floor_N` | Floor | Soft tissue ground with a few speckles. Must tile seamlessly without obvious repeats. | `#f2c6a0` / `#f5c6d3` / `#d6e6ee` |
| `tile_path_N` | Path | Lighter, smoother walkway. | `#f8dcc0` / `#fbe3ea` / `#eef3f6` |
| `tile_grass_N` | Tall grass (germs hide here) | Floor with **tufts sticking up**: Area 1 red swollen tissue, Area 2 yellow-green mucus, Area 3 purple biofilm slime. The bottom 6 px are drawn over the player's feet, so tufts should reach the bottom. | `#e0524f` / `#b8d45a` / `#9b6bd6` |
| `tile_wall_N` | Wall | Solid tissue wall made of **packed round cells with nuclei**. Must tile seamlessly in all directions. | `#e7a08a` / `#d98aa3` / `#9fb3c4` |
| `tile_water_N_a`, `tile_water_N_b` | Blood / fluid (2 animation frames) | Red flowing blood with **small red blood cell discs** drifting; frame b is shifted so it ripples. | `#b5303a`, `#d9555c`, `#e8737a` (all areas) |
| `tile_hub_N` | Clinic floor | Clean clinic floor tiles (soft grid). | path color + white shine |
| `tile_decor_N` | Decoration (solid) | Area 1: **yellow fat cells** (bubbly). Area 2: **cilia** (waving hair-like tufts). Area 3: **stitches** (dark blue thread across a healing cut). | see description |
| `tile_lymph_N` | Lymph node (heal spot) | **Green bean-shaped node** with a white plus on it, sitting on the path. | `#5fcf7a`, `#3d9a55` |
| `tile_sign_N` | Sign | Small **wooden signpost** on floor. | `#d9a05b`, `#8a5a2b` |
| `tile_gate_N` | Swollen gate (blocks the boss) | **Puffy red swollen lumps** blocking the way. | `#e0524f`, `#f58a7c` |
| `tile_exit_N` | Exit | **Yellow arrow** pointing right on the path. | `#ffe066` |

## 6. Small UI sprites
| File | Size | Description |
| --- | --- | --- |
| `ui_item.png` | 16×16 | Overworld pickup: small **white first-aid case with a green plus** and a handle (not red, a red cross is a protected symbol). |
| `ui_bubble.png` | 9×9 | **"!" speech bubble**, white with a red "!" and a little tail at the bottom. Shown when a germ captain spots you. |
| `ui_badge.png` | 7×7 | **Gold star badge** shown above germ captains. |
| `ui_sparkle.png` | 7×7 | **White twinkle** (4-point star) that blinks over hidden items. |

## Count
5 cells + 7 germs + 3 bosses + 6 people sheets + 11 tile kinds × 3 areas (water has 2 frames, so 36 tile files) + 4 UI = **61 PNG files**.
Start with the ones players see most: the 5 cells, the 7 germs, the 3 bosses, then `person_hero.png`.
