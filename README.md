# Fractional dimension → Kakeya

An interactive single-page dashboard for a 10-minute talk introducing fractional
dimension on the way to the Kakeya problem.

A single page that you simply scroll; each section fills one screen and its
animation starts when it scrolls into view.

**Part I · Dimension**

| # | Section | What it shows |
|---|---------|---------------|
| 01 | Integer dimension | basis definition; line, plane, space, and two shapes that don't fit: the Koch curve and a broccoli surface |
| 02 | The Koch curve | one curve covered by 3 squares of side 1 and 12 of side 1/3, so (1/3)^-d = 4 |
| 03 | Formal definition | Minkowski (box-counting) dimension, N(ε) ~ ε^-d |

**Part II · Kakeya**

| # | Section | What it shows |
|---|---------|---------------|
| 04 | Turn a needle | U-turns in a disk, triangle and deltoid; short history 1917–2025 |
| 05 | Kakeya set definition | a unit segment in every direction |
| 06 | Perron tree | 2ⁿ triangles slid together; area of the tree → 0 |
| 07 | Dimension 2 | δ-tubes, multiplicity m(x), and the Cauchy–Schwarz argument |

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
