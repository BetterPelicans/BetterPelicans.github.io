# SkiFree

The classic downhill, remade for iPhone by Muse for Better Pelicans (October 2026).
A tribute to the 1991 original — same mountain, same monster, modern manners.

- **Play:** https://betterpelicans.com/skifree/
- **Modes:** Classic Endless (distance + survival) and Gate Chase (slalom streaks).
  The course is seeded by the date — the same mountain all day, every run.
- **Controls:** Drag to carve. Hard carves spray snow and scrub speed.
- **The yeti:** Wakes at 2,000 m. He is telegraphed (roar, meter, red vignette) and
  escapable — trees and jumps slow him down, crashes feed him. Outrun him for +500;
  he comes back faster.
- **Tech:** Canvas rendering, synthesized wind and sound effects via WebAudio,
  no dependencies, no tracking. Best scores per mode are kept in the browser's
  local storage only.
- **Art:** The skier, other skiers, the yeti and the trees/rocks/stump are
  generated sprites (`assets/*.webp`, ~730 KB total): character poses generated
  with image generation against a green screen and keyed out; the yeti's run
  cycle was extracted frame-by-frame from a generated video; NPC skiers are a
  recolor of the player sprites. If a sprite fails to load, the game falls
  back to its original hand-drawn vector art. Controls are a dynamic floating
  joystick (touch anywhere; deflection steers, down = tuck, up = brake).
