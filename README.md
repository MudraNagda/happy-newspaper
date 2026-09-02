# The Happy Newspaper

A weekly newspaper that lives on a desk. It arrives folded; click once to unfold it, again to open the spread, and a small object (the **highlight of the week**) tumbles out of the fold and lands on the desk. Every issue is a row in a Google Sheet, filled in with a Google Form. Formatting is fixed in the design; the sheet only supplies words, image URLs and the object.

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
| `Object URL` | the `.glb` that falls out (optional — blank = nothing falls out that week) |
| `Object caption` | monospace label next to the resting object, e.g. "this week: a rose I printed" |
| `Object scale` | number, default 1 |
| `Object drop` | `tumble` (default) · `roll` · `flutter` · `splat` |
| `Object PNG` | optional `.png` used when WebGL is unavailable or the `.glb` fails |

Empty cell → that slot renders blank (photos collapse so text takes the width).

**URLs.** Any public URL works. Google Drive share links are auto-converted (`drive.google.com/file/d/ID` → `lh3.googleusercontent.com/d/ID`; the file itself must be link-shared). A bare filename in an object column (`2026-09-01.glb`) resolves to this repo's `objects/` folder. Google Form's built-in file upload stores files privately, so paste links instead.

## The paper

One sheet, printed both sides, in CSS 3D. Left half `h1` = front page outside / page 2 inside; right half `h2` = back page outside / page 3 inside. Each half is split into top and bottom quadrants so the horizontal fold can cut through the layout.

| Stage | What you see | Transition |
|---|---|---|
| 0 | Quarter-folded: front-page top | — |
| 1 | Full front page | bottom quadrants swing up from behind (`unfoldSpeed`, 900 ms) |
| 2 | Inside spread, pages 2–3 | left leaf swings open on the spine (`openSpeed`, 1100 ms); **object spawns at 40 %** of the swing |
| → 0 | Refold | spine closes first, then the mid fold; the object slides off the desk |

Mouse moves tilt the whole desk (paper, shadow and object share one parent). Newsprint images get grayscale + contrast + slight sepia + a rotated halftone dot overlay, all CSS, so remote images need no CORS. Keyboard: Enter/Space fold, ←/→ older/newer issue. Mobile: paper scales to ~85 vw, no tilt, tap to unfold.

## The drop

[`js/drop.js`](js/drop.js): one transparent three.js canvas over the desk, camera looking down at the desk (fov 30°), one soft key light + hemisphere, contact shadow via a `ShadowMaterial` ground plane. The `.glb` loads when the issue is shown, not on click, so the drop is instant. Presets are keyframed easing with a little randomness (no physics engine):

- **tumble** — falls with gravity ease, 1.5 turns, two damped bounces, settles slightly rotated (1.4 s)
- **roll** — falls, one bounce, rolls along the desk with rotation matched to distance, decelerates
- **flutter** — slow fall with lateral sway, lands flat (2.7 s)
- **splat** — no 3D: a flat coffee-stain decal fades/scales in under the paper edge (0.6 s)

Rest position: in front of the paper, lower-right of the desk. Caption fades in 300 ms after it settles. Hover → slow spin. Fallback without WebGL: the `Object PNG` with the tumble keyframes in CSS.

## Files

```
index.html            page + the four page templates
css/paper.css         fold geometry, newsprint typography, halftone, drop fallbacks
js/config.js          sheetUrl, masthead, timings, default object
js/sheet.js           gviz fetch, header→field matching, Drive URL conversion, cache
js/render.js          issue → four pages (each rendered twice, clipped per quadrant)
js/fold.js            stage machine + desk tilt
js/drop.js            three.js drop
js/sample-issue.js    fallback content
objects/              .glb files (one per week)
setup/create-form.gs  builds the Google Form + Sheet
tools/make-glb.mjs    generates the sample mug .glb without any 3D software
```

## Local preview

```bash
python3 -m http.server 8765
```

then open http://localhost:8765. (The `.glb` and the ES-module imports need http, not `file://`.)

See [PLAN.md](PLAN.md) for the original brief.
