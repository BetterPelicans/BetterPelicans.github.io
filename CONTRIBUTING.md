# Contributing to Better Pelicans

Thanks for considering a contribution. This is a small, low-budget, open
experiment; we keep the process light but explicit.

## What belongs here

The public repository contains the website, documentation, methodology, and
**selected, publication-checked** SVGs and renders.

Raw generations, prompts, critiques, failed candidates and experiment logs
live in the private `betterpelicans-lab` repository. They are not
automatically copied here, and contributors should not paste raw model output
into issues or PRs.

## Publication checks

Any SVG or render that enters the public repository must pass the
[publication checklist](docs/publication-checklist.md), including:

- no credentials or personal information;
- no embedded raster images;
- no external URLs inside the SVG;
- no unsafe constructs (scripts, event handlers, external fetches);
- no unlicensed source assets;
- accurate disclosure of which models and tools contributed;
- valid rendering in at least two rendering engines where practical.

## Process

1. Open an issue describing the change (small typo fixes can skip this).
2. Create a branch, make changes, run the local checks that apply.
3. Open a pull request against `main` and reference the issue.
4. Substantial changes require review; the default branch is protected.

## Conduct

Contributions are governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
