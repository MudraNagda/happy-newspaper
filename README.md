# The Happy Newspaper

A weekly newspaper that lives on a desk. It arrives folded; click once to unfold it, again to open the spread, and a small object (the **highlight of the week**) drops out of the spine and hovers over the desk. Every issue is a row in a Google Sheet, filled in with a Google Form. Formatting is fixed in the design; the sheet only supplies words, image URLs and the object.

Live site: **https://mudranagda.github.io/happy-newspaper/** · Repo: https://github.com/MudraNagda/happy-newspaper

No build step, no server, no keys. Plain HTML/CSS/JS, three.js from a CDN, hosted on GitHub Pages.

---

## One-time setup (≈10 minutes)

1. **Create the Form + Sheet** — open https://script.google.com, make a new project, paste [`setup/create-form.gs`](setup/create-form.gs), run `createHappyNewspaperForm`, approve permissions once. The log prints the Form URL (fill weekly) and the Sheet URL.
   *Or* build the Form by hand with the question titles in the table below and link it to a response Sheet.
2. **Share the Sheet** — Share → *Anyone with the link* → *Viewer*. Required: the site reads it through the public `gviz` JSON endpoint, so nothing is private and no API key is needed.
3. **Point the site at it** — in [`js/config.js`](js/config.js) set `sheetUrl` to the Sheet URL and commit. Masthead, price, ears and timings live in the same file.

Until `sheetUrl` is set the site shows the built-in sample issue from [`js/sample-issue.js`](js/sample-issue.js).

## Weekly workflow

1. (Optional) Make the object: export a `.glb` (< 1 MB, < 20k tris, baked colours), drop it in [`objects/`](objects/) as `YYYY-MM-DD.glb`, `git push`. Or host it on Drive/anywhere public and paste the link.
2. Fill the Form: articles, image URLs, **Object URL**, **Object caption**.
3. Done. The site picks up the newest row on next load (responses are cached 10 minutes; if the sheet is unreachable the last good issue is shown).

## Form questions → where they land

Columns are matched by **keyword in the header**, case-insensitive, so the exact wording can vary as long as the key words are there.

| Question | Lands in |
|---|---|
| `Issue date` | dateline (masthead title stays fixed) and sort order, newest first |
| `Issue number` | dateline, left (optional) |
| `Main headline` | front-page banner headline |
| `Main kicker` | one-line italic standfirst (optional) |
| `Main story` | front page, 3 justified columns; blank line = new paragraph |
| `Second headline` / `Second story` | lower front page; the **last paragraph becomes the short note** |
| `Second image` (URL) / `Second caption` | lower front-page photo |
| `Letters headline` / `Letters` | page 2, 2 columns (headline defaults to "Letters to the Editor") |
| `Courts` | page 2, "The Week in the Courts", 2 columns |
| `Arts headline` / `Arts` | page 3 review |
| `Arts image` (URL) / `Arts caption` | review photo |
| `Weather`, `Shipping` | page 3 boxes |
| `Classifieds` | up to 4 ads, one per line or separated by `;` |
| `Object URL` | the `.glb` or image that drops out of the spine (optional — blank = nothing that week) |
| `Object caption` | monospace label next to the resting object, e.g. "this week: a rose I printed" |
| `Object scale` | number, default 1 |
| `Object PNG` | optional image used when WebGL is unavailable or the `.glb` fails |

Empty cell → that slot renders blank (photos collapse so text takes the width).

**URLs.** Any public URL works. Google Drive share links are auto-converted (`drive.google.com/file/d/ID` → `lh3.googleusercontent.com/d/ID`; the file itself must be link-shared). A bare filename in an object column (`2026-09-01.glb`) resolves to this repo's `objects/` folder. Google Form's built-in file upload stores files privately, so paste links instead.

## The paper

Motion and geometry follow [ANIMATION-SPEC.md](ANIMATION-SPEC.md) to the letter; `openSpeed` (0.95 s) in `js/config.js` drives every timing.

One 430×580 paper made of two sheets. The **front sheet** carries the front page (page 2 on its back) and swings open on the left spine; the **rear sheet** sits 6 px behind it with page 3 on its face. Each sheet's bottom half is a flap on a fold hinge whose origin is offset in z (−3 px rear, −9 px front) so both flaps swing *behind* their sheet and stack without touching when folded. An inner "flop" wrapper on every hinge lags while the hinge turns, overshoots and sags on arrival when opening, and settles with no overshoot when closing.

| Stage | What you see | Beat |
|---|---|---|
| 0 | Quarter-folded: front-page top, under-sheets for thickness, paper lifted 145 px | — |
| 1 | Full front page | flap unfolds from behind |
| 2 | Inside spread, pages 2–3, paper shifted 215 px right | front sheet swings open on the spine |
| → 0 | Refold in two beats | spread shuts to stage 1, then after 1.25× speed the flap tucks |

The mouse tilts the whole desk (12° at stage 0, damped to 60 % and 35 % at stages 1 and 2) and the paper bobs idly. Ground shadows crossfade between the folded and open blobs; the open one slides left to cover the spread. Creases fade in when open, the spine valley at stage 2. Edge cuts are static clip-paths generated by `tools/make-edges.mjs` (sawtooth top at 4 px pitch, ragged bottom 0–3 px) since the original DC polygons were not handed off. Keyboard: Enter/Space fold, ←/→ older/newer issue. Mobile: paper scales to ~85 vw, no tilt, tap to unfold.

## The weekly object

[`js/object.js`](js/object.js). Mounted at stage 2 only, at the bottom of the spine, 60 px above the paper. It drops in 0.4× speed after the spread starts opening: from inside the fold (−270 px, rotated −60°, scale .45) with a gravity ease, past the desk, back up, and eases into place spinning a full turn. It never lands: it floats (4.2 s loop) with a breathing shadow. Hover leans it away from the cursor, click spins it 360° without folding the paper, and the caption rises in underneath.

A `.glb` is rendered once by three.js into a small image (so no WebGL context stays alive); a `.png`/`.jpg` URL is used directly. If the `.glb` fails, `Object PNG` is used. No object URL → nothing mounts that week.

## Files

```
index.html            page + the four page templates
css/paper.css         fold geometry + motion (per ANIMATION-SPEC.md), newsprint typography, halftone
css/edges.css         generated edge clip-paths
js/config.js          sheetUrl, masthead, timings, default object
js/sheet.js           gviz fetch, header→field matching, Drive URL conversion, cache
js/render.js          issue → four pages (each rendered twice, clipped per quadrant)
js/fold.js            stage machine, two-beat close, moving flag, desk tilt
js/object.js          weekly object (CSS drop/float, three.js .glb render)
js/sample-issue.js    fallback content
objects/              .glb files (one per week)
setup/create-form.gs  builds the Google Form + Sheet
tools/make-glb.mjs    generates the sample mug .glb without any 3D software
tools/make-edges.mjs  generates css/edges.css
```

## Local preview

```bash
python3 -m http.server 8765
```

then open http://localhost:8765. (The `.glb` and the ES-module imports need http, not `file://`.)

See [PLAN.md](PLAN.md) for the original brief and [ANIMATION-SPEC.md](ANIMATION-SPEC.md) for the motion spec.
