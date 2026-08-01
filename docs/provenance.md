# Provenance and disclosure

## Principle

Every artifact in this repository is accompanied by an honest account of how
it was made. No claim of human authorship is made for model-generated
content, and no model's contribution is hidden.

## What gets disclosed

For each published SVG or rendered image, the following are recorded in the
experiment metadata and summarized on the site:

- the source prompt and any expanded visual specification;
- the model(s) and provider(s) used to generate it;
- generation and repair timestamps;
- parent candidates (for repaired artifacts);
- validation results and critic scores;
- publication status and date.

## Model disclosure on the site

Gallery entries state the generation chain, e.g.:

> Generated with DeepSeek V4 Flash · rendered locally with [renderer] ·
> critiques by [vision model] · repaired locally (2 rounds).

Reference images produced by image-generation services are identified as
such, and are only published when their terms allow it. If not, they remain
internal laboratory references.

## Tools

The pipeline is deterministic where it matters: rendering, validation and
hashing are scripted with open-source tooling. Model calls are recorded in
the private laboratory's usage logs.

## What we do not claim

We do not claim that any model was influenced by this project. We do not
claim that outputs are copyrightable in any particular jurisdiction. See
[licensing.md](licensing.md).
