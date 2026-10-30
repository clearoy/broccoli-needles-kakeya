# Fractional dimension → Kakeya

An interactive single-page dashboard for a 10-minute talk introducing fractional
dimension on the way to the Kakeya problem.

A single page that you simply scroll; each section fills one screen and its
animation starts when it scrolls into view.

**Part I · Dimension**

| # | Section | What it shows |
|---|---------|---------------|
| 01 | Integer dimension | basis definition; scaling by 2 gives 2^d copies |
| 02 | Koch snowflake | iterations (length → ∞, area → 8/5) and a self-similar zoom |
| 03 | Two definitions | Hausdorff and Minkowski (box-counting) dimension |
| 04 | Box decay | ε-box covers of a line, a square and the Koch curve; A(ε) ~ ε^(2−d) |
| 05 | Your guess | Romanesco broccoli; guess the surface dimension, then reveal |

**Part II · Kakeya**

| # | Section | What it shows |
|---|---------|---------------|
| 06 | Turn a needle | U-turns in a disk, triangle and deltoid; short history 1917–2025 |
| 07 | Translation | moving to a parallel line costs area θ, so the problem becomes a Kakeya set |
| 08 | Perron tree | 2ⁿ triangles slid together; area of the tree → 0 |
| 09 | Dimension 2 | δ-tubes, multiplicity m(x), and the Cauchy–Schwarz argument |

`T` toggles light/dark (light is often better on projectors), `F` is fullscreen.
KaTeX and fonts are self-hosted in `site/vendor/`, so the page works offline.

## Run locally

```sh
cd site && python3 -m http.server 8000   # open http://localhost:8000
```

## Deploy on Render

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, pick this repo. `render.yaml` creates a static
   site that publishes `./site` (no build step).

Or manually: **New → Static Site**, publish directory `site`, build command empty.
