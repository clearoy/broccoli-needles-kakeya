# Fractional dimension → Kakeya

An interactive single-page dashboard for a 10-minute talk introducing fractional
dimension on the way to the Kakeya problem.

**Part I · Dimension**

| # | Panel | What it shows |
|---|-------|---------------|
| 01 | Integer | dimension as the size of a basis; scaling by 2 gives 2^d copies |
| 02 | Snowflake | Koch iterations (length → ∞, area → 8/5) and a self-similar infinite zoom |
| 03 | Definitions | Hausdorff and Minkowski (box-counting) dimension |
| 04 | Box decay | live ε-box covers of a line, a square and the Koch curve; area A(ε) ~ ε^(2−d) on a log–log plot |
| 05 | Guess | a recursive Romanesco broccoli; the audience guesses the dimension of its surface |

## Presenting

| Key | Action |
|-----|--------|
| `→` / `Space` / `PageDown` | next reveal, then next panel (works with clickers) |
| `←` / `PageUp` | back |
| `1`–`5` | jump to panel |
| `F` | fullscreen |
| `T` | light / dark theme (light is often better on projectors) |

The timer in the top-right counts down 10:00 (click to start/pause, double-click to reset).

Everything, including KaTeX and fonts, is self-hosted in `site/vendor/`, so the page works offline.

## Run locally

```sh
cd site && python3 -m http.server 8000   # open http://localhost:8000
```

## Deploy on Render

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, pick this repo. `render.yaml` creates a static
   site that publishes `./site` (no build step).

Or manually: **New → Static Site**, publish directory `site`, build command empty.
