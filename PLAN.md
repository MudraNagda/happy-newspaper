# Weekly Paper — portfolio home page plan

Three pieces: (1) the folded paper as the landing page, (2) weekly content from a Google Sheet, (3) a "highlight of the week" 3D object that tumbles out when the inner fold opens.

## Split of work

**Design here (this project)**
- `Folded Newspaper.dc.html` — the paper: layout, fold choreography, paper physics, typography, halftone. Treat it as the visual spec; Claude Code ports it.
- 3D objects — one `.glb` per week, built with the 3D-object tool here and exported (`objects/YYYY-MM-DD.glb`). Keep them small: < 1 MB, < 20k tris, baked colours, no textures unless needed.
- Fall-out choreography — I can prototype the drop (timing, bounce, resting spot) in the DC with a placeholder object so Claude Code has a reference.

**Build in Claude Code (the website)**
- Next.js / Astro / plain Vite — any. One page. Port the DC's markup/inline styles ~1:1 into a React component; the transforms and transitions are the spec.
- Sheet fetch (pattern in README.md → "Notes for the Claude Code build"). Cache 5–10 min; fall back to the last good issue on error.
- three.js `<canvas>` layered over the paper for the drop (see below).
- Deploy: Vercel/Netlify. Sheet is public-viewer, so no keys or server needed.

## Weekly workflow (you, ~10 min/week)
1. Make the object (3D tool here, or photograph → not 3D) → export `.glb` → drop into `public/objects/` in the site repo (or a public Drive/GitHub link).
2. Fill the Google Form: articles, image URLs, **Object URL**, **Object caption**.
3. Site picks up the newest row on next load. No deploy needed unless the `.glb` lives in the repo (then `git push`).

## Sheet columns — additions to README schema
| Form question | Used for |
|---|---|
| Object URL | `.glb` for the drop (Drive link auto-converted like images) |
| Object caption | Label shown near the resting object ("this week: a rose I printed") |
| Object scale (optional) | Number, default 1 — quick fix without re-exporting |
| Object drop (optional) | `tumble` \| `roll` \| `flutter` \| `splat` — picks the physics preset |

Empty Object URL → nothing falls out that week (or fall back to a default object).

## The drop — how it should work
- **Trigger**: the transition stage 1 → 2 (spread opens on the spine). Object spawns at the spine, at the fold line, mid-way through the swing (~40% of `openSpeed`) — it was "tucked in the fold".
- **Physics presets** (simple, no physics engine — keyframed easing + small randomness so it never repeats exactly):
  - `tumble` (default; printed objects) — falls ~250px with gravity ease, one 1.5-turn rotation, 2 damped bounces, settles slightly rotated. ~1.4 s.
  - `roll` (round things, cups) — falls, one bounce, rolls 150–300px along the desk with rotation matching distance, decelerates.
  - `flutter` (petals, paper, receipts) — slow fall with lateral sway (sin), 2–3 s, lands flat.
  - `splat` (coffee stain) — no 3D fall; a flat decal fades/scales in on the desk under the paper edge, 0.6 s.
- **Rest position**: in front of the paper, lower-right of the desk, casting a soft contact shadow. Caption fades in 300 ms after it settles, same monospace as the "click to fold" hint.
- **Re-fold** (2 → 0): object slides off-screen or fades; re-opening drops it again.
- **Interaction**: mouse tilt already moves the paper; the object should share the same parent tilt so it feels on the same desk. Optional: hover → slow spin.
- **Fallback**: if the `.glb` fails or WebGL is unavailable, show a `.png` render of the object (export both from the 3D tool) using the `tumble` keyframes in CSS.

## Tech notes for the drop
- One `<canvas>` (three.js) positioned absolutely over the desk, transparent background, same `perspective` camera feel as the CSS (fov ~30°). Load the `.glb` with GLTFLoader on page load (not on click) so the drop is instant.
- Lighting: one soft key + hemisphere; shadow via a `ShadowMaterial` ground plane so the object grounds on the CSS desk.
- Keep the paper in CSS 3D (it's already working); don't rebuild it in three.js.
- Mobile: paper scales to ~85vw; disable tilt, keep tap-to-unfold; object drop still works.

## Open decisions (yours)
- Framework for the site.
- Where `.glb` files live (repo vs Drive). Repo = reliable and fast; Drive = no deploy.
- Whether older issues are browsable (the DC has older/newer nav already) — if yes, each past issue keeps its object.
- Default object for weeks with none.

## Hand-off checklist for Claude Code
- [ ] This file + README.md
- [ ] `Folded Newspaper.dc.html` (visual + motion spec)
- [ ] `objects/` folder with at least one `.glb` + `.png` fallback
- [ ] Sheet URL and the exact form question titles
