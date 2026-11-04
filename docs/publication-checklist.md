# Publication checklist

Every asset moving from the private laboratory into this public repository
must pass **all** of the following checks. The checks are run by
`pipeline/publish/` tooling in `betterpelicans-lab` and reviewed by a human
before merge.

## Checks

1. **No credentials or personal information** — no tokens, keys, emails of
   individuals, addresses, or account identifiers. (Automated secret scan
   runs before every deployment.)
2. **No embedded raster images** — SVG output must be pure vector; no
   `<image>` elements, no base64 data URIs of rasters.
3. **No unlicensed source assets** — nothing copied from third parties
   without a documented license.
4. **No external URLs inside the SVG** — no `href`/`xlink:href` pointing off
   the file, no external stylesheets or fonts.
5. **No suspicious copied logos or signatures** — no recognizable brands,
   watermarks, or human signatures.
6. **No unsafe SVG constructs** — no `<script>`, no event handler
   attributes (`on*`), no foreignObject with executable content.
7. **No unsupported claim of human authorship** — metadata and captions
   accurately state model contribution.
8. **Accurate model/tool disclosure** — provenance record attached (see
   [provenance.md](provenance.md)).
9. **Valid rendering in at least two engines where practical** — e.g. local
   librsvg/resvg render plus a browser-engine render.
10. **Reasonable file size and complexity** — within the pipeline's limits
    (file size, element/path counts) documented in the lab.
11. **Deterministic validation passed** — XML well-formedness, SVG root and
    namespace, no scripts/events/externals, usable viewBox, hash recorded.

## Process

- Assets are copied into the public repo **only** through the explicit
  `publish/` step of the pipeline.
- The private repository is never synced or copied wholesale.
- A secret scan (`git grep` for known patterns + GitHub push protection) runs
  before each deployment.
