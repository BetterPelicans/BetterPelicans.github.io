# The pelican benchmark

## Canonical wording

The commonly used wording of the prompt is:

> **Generate an SVG of a pelican riding a bicycle**

## Source

- **Author:** Simon Willison
- **Blog post:** *Pelicans on a bicycle*, 25 October 2024 —
  <https://simonwillison.net/2024/Oct/25/pelicans-on-a-bicycle/>
- **Repository:** <https://github.com/simonw/pelican-bicycle> (MIT-licensed
  dataset of model outputs for the prompt)
- **Follow-ups:** the `pelican-riding-a-bicycle` tag on
  simonwillison.net, and the talk *The last six months in LLMs, illustrated
  by pelicans on bicycles* (June 2025).

The author chose the subject because he likes pelicans and, at the time,
believed no pelican-on-a-bicycle SVGs existed in model training data
("I'm pretty sure there aren't any pelican on a bicycle SVG files floating
around (yet) that might have already been sucked into the training data").
The benchmark has since been widely reproduced and discussed.

## Variants

- "Pelican on a bicycle" (common informal paraphrase; e.g. Grokipedia's
  benchmark write-up).
- "Pelicans on a bicycle" (the author's blog tag).
- The benchmark is also used conversationally as a test of composition:
  two objects, a physical interaction, and SVG validity all in one prompt.

## Why it is a good probe

The prompt requires:

- two clearly distinguishable objects (a pelican and a bicycle);
- a physically implausible but visually coherent interaction (riding);
- correct depth ordering and contact points (feet on pedals, wings or feet
  on handlebars);
- valid, standalone, editable SVG output.

Failures are easy to observe and hard to argue with. This project adds a
second layer: because the benchmark has been public since October 2024, any
model that has seen the benchmark or its results may be *contaminated* for
this prompt — which is precisely what Better Pelicans studies, alongside
composition, iterative repair, and generalization.

## Sources and licensing

- Willison's repo is MIT-licensed; the blog post is his. This page quotes the
  prompt and attributes it; no benchmark outputs are copied into this
  repository without attribution.
