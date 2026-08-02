#!/usr/bin/env python3
"""Generate gallery.html and dataset.html from assets/dataset/index.jsonl.

Keeps the refocused site's data-driven pages in sync with the dataset index.
Run from the repo root:  python3 scripts/gen-site-pages.py
Reads:  s/<slug>/assets/dataset/index.jsonl
Writes: s/<slug>/gallery.html, s/<slug>/dataset.html
"""
import json
import os
import sys

SLUG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "s")
# Locate the gated site dir (contains assets/dataset/index.jsonl)
SITE = None
INDEX = None
for name in os.listdir(SLUG_DIR):
    cand = os.path.join(SLUG_DIR, name, "assets", "dataset", "index.jsonl")
    if os.path.exists(cand):
        SITE = os.path.join(SLUG_DIR, name)
        INDEX = cand
        break
if SITE is None:
    sys.exit("index.jsonl not found under s/<slug>/assets/dataset/")
assert SITE is not None and INDEX is not None

NAV = """  <header class="site-header">
    <nav aria-label="Main">
      <a class="brand" href="index.html">Better Pelicans</a>
      <ul>
        <li><a href="gallery.html"{g}>Gallery</a></li>
        <li><a href="dataset.html"{d}>Dataset</a></li>
        <li><a href="how-they-are-made.html"{h}>How They Are Made</a></li>
        <li><a href="download.html"{dl}>Download</a></li>
        <li><a href="contribute.html"{c}>Contribute</a></li>
        <li><a href="about.html"{a}>About</a></li>
      </ul>
    </nav>
  </header>"""

FOOTER = """  <footer>
    <p>Better Pelicans · code MIT · assets <a href="../../docs/licensing.md">CC0</a> · <a href="../../docs/provenance.md">provenance &amp; disclosure</a></p>
    <p>No actual pelicans were harmed. Several SVGs did not make it.</p>
  </footer>"""


def header(active):
    return NAV.format(
        g=' aria-current="page"' if active == "gallery" else "",
        d=' aria-current="page"' if active == "dataset" else "",
        h=' aria-current="page"' if active == "made" else "",
        dl=' aria-current="page"' if active == "download" else "",
        c=' aria-current="page"' if active == "contribute" else "",
        a=' aria-current="page"' if active == "about" else "",
    )


def page_head(title, description):
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="css/site.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
"""


def kb(n):
    return f"{round(n / 1024):,} KB"


def fmt_paths(n):
    return f"{n:,}"


def load_rows():
    rows = []
    with open(INDEX) as f:
        for line in f:
            if line.strip():
                rows.append(json.loads(line))
    return rows


def style_label(row):
    cap = row["caption"].lower()
    if "poster" in cap:
        return "Graphic poster"
    if "golden hour" in cap or "near-photorealistic" in cap:
        return "Photoreal showcase"
    if "three-quarter" in cap:
        return "Flat editorial, three-quarter"
    return "Flat editorial, side profile"


def gallery(rows):
    parts = [page_head(
        "Gallery — Better Pelicans",
        "The approved collection: four pelicans on bicycles, each in two editions — a Visual Master and a Teaching Vector.",
    )]
    parts.append(header("gallery"))
    parts.append("""
  <main id="main">
    <h1>Gallery</h1>
    <p class="lead">Four pelicans passed review in the pilot release
    (<a href="dataset.html">pilot-0003</a>). Each one comes in two editions:
    a <strong>Visual Master</strong> that keeps every bit of shading the source
    earned, and a <strong>Teaching Vector</strong> that strips down to tidy,
    well-grouped shapes. The SVG you see <em>is</em> the file — no screenshot
    pretending to be a vector.</p>
""")
    for i, row in enumerate(rows):
        bp = row["id"]
        cap = row["caption"]
        alt = cap[:140].rstrip(".,;: ") + "."
        parts.append(f"""
    <section class="item" id="{bp.lower()}">
      <h2>{bp} <span class="tag">approved</span></h2>
      <p class="caption">{cap}</p>
      <div class="pair">
        <article class="card">
          <picture>
            <source srcset="assets/dataset/{bp}-visual-master.svg" type="image/svg+xml">
            <img src="assets/dataset/previews/{bp}-visual-master.png" alt="{alt}" loading="lazy">
          </picture>
          <h3>Visual Master</h3>
          <p class="meta">{fmt_paths(row['visual_master_paths'])} paths · {kb(row['visual_master_bytes'])} · spline trace, color precision 128</p>
          <p class="links"><a href="assets/dataset/{bp}-visual-master.svg">SVG</a> ·
          <a href="assets/dataset/previews/{bp}-visual-master.png">PNG</a> ·
          <a href="assets/dataset/{bp}.json">metadata</a></p>
        </article>
        <article class="card">
          <picture>
            <source srcset="assets/dataset/{bp}-teaching-vector.svg" type="image/svg+xml">
            <img src="assets/dataset/previews/{bp}-teaching-vector.png" alt="{alt} (simplified teaching vector)" loading="lazy">
          </picture>
          <h3>Teaching Vector</h3>
          <p class="meta">{fmt_paths(row['teaching_vector_paths'])} paths · {kb(row['teaching_vector_bytes'])} · polygon trace, order-preserving color runs</p>
          <p class="links"><a href="assets/dataset/{bp}-teaching-vector.svg">SVG</a> ·
          <a href="assets/dataset/previews/{bp}-teaching-vector.png">PNG</a> ·
          <a href="assets/dataset/{bp}.json">metadata</a></p>
        </article>
      </div>
    </section>
""")
    parts.append("""
    <section class="item legacy">
      <h2>Benchmark-era</h2>
      <p>Before the raster-first pipeline, one language-model-written SVG earned
      owner approval and a spot on the wall:
      <a href="assets/gallery/0002-direction-transfer-d1-c001.svg">0002-direction-transfer-d1-c001</a> ·
      <a href="assets/gallery/0002-direction-transfer-d1-c001-1024.png">preview</a> ·
      <a href="../../review/0002-d1-c001/report.md">report</a>.
      It is not part of pilot-0003 — it is history, and it is still a pelican
      on a bicycle.</p>
    </section>

    <p class="updated">Release <strong>pilot-0003</strong> · sources generated with
    gpt-image-2-medium (OpenAI/Codex) · traced with VTracer 0.6.12 · validated
    with resvg and librsvg · every item CC0 and SHA-256-hashed. The collection
    is still in preview while it grows.</p>
  </main>
""")
    parts.append(FOOTER)
    parts.append("</body>\n</html>\n")
    return "".join(parts)


def dataset(rows):
    n = len(rows)
    svgs = n * 2
    vm_bytes = sum(r["visual_master_bytes"] for r in rows)
    tv_bytes = sum(r["teaching_vector_bytes"] for r in rows)
    total_kb = round((vm_bytes + tv_bytes) / 1024)

    table_rows = []
    for r in rows:
        bp = r["id"]
        table_rows.append(f"""      <tr>
        <td><a href="gallery.html#{bp.lower()}">{bp}</a></td>
        <td>{style_label(r)}</td>
        <td class="num">{fmt_paths(r['visual_master_paths'])}</td>
        <td class="num">{fmt_paths(r['teaching_vector_paths'])}</td>
        <td class="num">{kb(r['visual_master_bytes'])}</td>
        <td class="num">{kb(r['teaching_vector_bytes'])}</td>
        <td>{r.get('human_review', 'approved')}</td>
      </tr>""")
    table = "\n".join(table_rows)

    parts = [page_head(
        "Dataset — Better Pelicans",
        "pilot-0003: four approved pelican-on-bicycle items, eight standalone SVGs, source rasters, previews, metadata and a machine-readable JSONL index. CC0.",
    )]
    parts.append(header("dataset"))
    parts.append(f"""
  <main id="main">
    <h1>Dataset</h1>
    <p class="lead">The collection is the product. Every pelican ships with its
    source raster, two standalone SVGs, rendered previews, prompts, captions,
    hashes, and exact conversion settings.</p>

    <section class="dataset-card" aria-label="Dataset card">
      <dl class="status-list">
        <dt>Name</dt><dd>Better Pelicans — pilot-0003</dd>
        <dt>Release</dt><dd>pilot-0003 (pilot; bulk release held until the collection clears the bar)</dd>
        <dt>License</dt><dd>CC0-1.0 (public domain dedication)</dd>
        <dt>Items</dt><dd>{n} approved pelicans · {svgs} SVGs · {n} source rasters · {svgs} previews · {n} metadata records · 1 JSONL index</dd>
        <dt>Formats</dt><dd>SVG (standalone, no rasters, no scripts) · PNG previews · JSON metadata · JSONL index</dd>
        <dt>Size</dt><dd>≈ {total_kb:,} KB of SVGs, ≈ 16 MB with rasters and previews</dd>
        <dt>Provenance</dt><dd>Sources: gpt-image-2-medium via OpenAI/Codex · traces: VTracer 0.6.12 · validation: resvg + librsvg · human review: approved (owner, 2026-08-02)</dd>
        <dt>Hashes</dt><dd>SHA-256 for every source and SVG, in the metadata and the index</dd>
        <dt>Index</dt><dd><a href="assets/dataset/index.jsonl">index.jsonl</a> — machine-readable, paths relative to the dataset folder</dd>
      </dl>
    </section>

    <section>
      <h2>Items</h2>
      <div class="table-wrap">
      <table class="stats">
        <thead>
          <tr><th>ID</th><th>Style</th><th>Master paths</th><th>Teaching paths</th><th>Master size</th><th>Teaching size</th><th>Review</th></tr>
        </thead>
        <tbody>
{table}
      </tbody>
      </table>
      </div>
      <p class="updated">Full per-item metadata: <a href="assets/dataset/BP-000001.json">BP-000001.json</a> ·
      <a href="assets/dataset/BP-000002.json">BP-000002.json</a> ·
      <a href="assets/dataset/BP-000003.json">BP-000003.json</a> ·
      <a href="assets/dataset/BP-000005.json">BP-000005.json</a>.
      One pilot candidate (BP-000004) failed human review twice and is retired;
      it is not part of the dataset.</p>
    </section>

    <section>
      <h2>Standards</h2>
      <ul>
        <li>Every SVG is standalone: no embedded rasters, no scripts, no external requests, no fonts.</li>
        <li>Every SVG renders identically in resvg and librsvg before it ships.</li>
        <li>Every file is hashed and every hash is published — if the file changes, you can prove it.</li>
        <li>We make no promises about what any model will do with the dataset. It is openly licensed; the rest is up to the world.</li>
      </ul>
      <p>Licensing details: <a href="../../docs/licensing.md">docs/licensing.md</a> ·
      provenance policy: <a href="../../docs/provenance.md">docs/provenance.md</a>.</p>
    </section>
  </main>
""")
    parts.append(FOOTER)
    parts.append("</body>\n</html>\n")
    return "".join(parts)


def main():
    rows = load_rows()
    with open(os.path.join(SITE, "gallery.html"), "w") as f:
        f.write(gallery(rows))
    with open(os.path.join(SITE, "dataset.html"), "w") as f:
        f.write(dataset(rows))
    print(f"wrote gallery.html + dataset.html ({len(rows)} items) -> {SITE}")


if __name__ == "__main__":
    main()
