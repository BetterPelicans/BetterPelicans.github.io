# Experiment 0002 — direction-transfer: report

**Status: complete — owner-approved 2026-08-02.** Recommended winner:
`0002-direction-transfer-d1-c001`.

## Goal and design

Translate the owner-approved AI raster directions (1-spec-canonical,
2-bold-mascot, 3-geometric-logo) into SVG candidates, then select one
candidate as the new provisional canonical for the public gallery.

9 candidates (3 per direction, temperatures 0.80/0.90/1.00) generated with
deepseek-v4-flash, each grounded by a text direction brief extracted from the
approved reference (vision pass, hex palette, line treatment, composition,
readability notes).

## Hypothesis result

**Supported.** Text-described transfer of the approved directions produced
stronger candidates than 0001's unguided generation: the d1 row scored 5/5
on recognizability, mechanics, interaction, and readability across all three
candidates, and the winner needed no repair rounds.

## Results by direction

| Direction | Candidates | Verdict |
|---|---|---|
| 1-spec-canonical | c001, c002, c003 | **Strong.** c001 clean 5/5s; c002 comparable; c003 helmet detail slightly detached |
| 2-bold-mascot | c001, c002, c003 | Good character (5/5 recognizability) but mechanics and gallery suitability weaker; c002 disproportioned wheels; 256px two-engine DIFF (renderer variance) |
| 3-geometric-logo | c001, c002, c003 | Weakest transfer: bike frame barely reads, c002 bike too small; minimalism fights the rubric's mechanical plausibility |

## Repairs (1 round, 2 finalists)

- `d2-c001-r1` — lowered seat post + saddle for standard frame proportions
  (parent d2-c001).
- `d3-c003-r1` — added frame joint dots so junctions read connected in the
  minimal style (parent d3-c003).
- `d1-c001` — no repair required (no defects found).

All repairs validated; d3-r1 NEAR both sizes, d2-r1 unchanged 256px variance.

## Head-to-head (vision, 2026-08-02)

| Finalist | Recognizability | Mechanics | Interaction | Aesthetic | Canonical suitability |
|---|---|---|---|---|---|
| **d1-c001** | 5 | 5 | 5 | 4 | **5** |
| d2-c001-r1 | 5 | 4 | 4 | 4 | 3 |
| d3-c003-r1 | 3 | 3 | 3 | 4 | 2 |

**Winner: d1-c001** — accurate pelican morphology, mechanically precise road
bicycle, dynamic riding posture, complete uncropped composition; ideal for
gallery display. No defects.

## Budget

- Image generation: 0 used (4 remain carried forward).
- Vision: 7 of 20.
- Premium: 0.
- Flash: ~33k tokens total (9 generations).

## Owner decision requested

Publish `0002-direction-transfer-d1-c001` to the public gallery as the new
provisional canonical (CC0, full provenance)? Publication proceeds only on
owner sign-off, via the publish stage.
