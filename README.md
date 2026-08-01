# Better Pelicans

> Better Pelicans is an open experiment in compositional SVG generation, iterative visual repair, benchmark contamination and generalization.

The long-running "pelican riding a bicycle" prompt is a well-known probe of text-to-SVG
models: it demands two clearly distinguishable objects, a physically plausible
interaction between them, and correct composition — all in one standalone,
editable vector file. It is easy to *look at* and surprisingly hard to *make well*.

This project builds a transparent, reproducible system that improves text-to-SVG
output for that prompt, one experiment at a time:

1. **Generate** candidates with a fixed, documented prompt and model settings.
2. **Validate** deterministically — XML, safety constraints, size and complexity limits.
3. **Render** at consistent sizes with a local, open-source renderer.
4. **Critique** with specialist rubrics (pelican anatomy, bicycle mechanics, physical
   interaction, composition, editability, efficiency).
5. **Repair** locally and iteratively, keeping every intermediate artifact.
6. **Publish** only what passes explicit publication checks.

Everything is recorded: prompts, responses, hashes, validation results, critic
scores, repair history, and publication status. Nothing is claimed about model
training influence. The work is early; the first experiment is complete,
with a provisional canonical result in the gallery pending owner review.

## Status

- **Experiment 0001** (`canonical-pelican`): complete — provisional
  canonical result published in the [gallery](gallery.html), awaiting owner
  review; see [status](status.html).
- Bulk corpus generation: not started (by design).

## Repository layout

- `index.html`, `status.html`, `gallery.html`, `methodology.html` — the public site
- `docs/` — provenance, licensing and benchmark documentation
- `assets/` — site assets (SVG only; no embedded raster images)

Raw generations, prompts, critiques and failed candidates live in the private
`betterpelicans-lab` repository and are never automatically copied here. Every
public asset passes the [publication checklist](docs/publication-checklist.md).

## Contact

Project contact: see [the site](index.html). Security issues: see [SECURITY.md](SECURITY.md).

## License

- Code and documentation: MIT — see [LICENSE](LICENSE).
- Generated SVGs, renders, annotations and dataset records: see
  [docs/licensing.md](docs/licensing.md) for the recommendation and its caveats.
