# Animation Spec — Folded Newspaper (implement to the letter)

Reference implementation: `Folded Newspaper.dc.html`. All values below are the source of truth; `speed` = the `openSpeed` prop, default **0.95s**. Canvas: paper is **430×580px** (two 290px halves), scene `perspective: 1600px`, all animated wrappers `transform-style: preserve-3d`.

## States
- **stage 0** — folded quarter (front-top visible; bottom flap folded BEHIND; whole paper lifted `translateY(145px)`)
- **stage 1** — half open (front page full; flap unfolded)
- **stage 2** — spread (front sheet swung open on the left spine; inside pages visible; paper shifted `translateX(215px)`)
- Click cycles 0→1→2→0. **2→0 runs in two beats** (see Sequencing).

## Layer tree (structure matters — hinges nest)
```
tilt wrapper (mouse tilt, .55s cubic-bezier(.19,.7,.3,1))
└─ floaty wrapper (idle bob: translateY 0→-7px→0, 5.5s ease-in-out infinite)
   └─ paper 430×580
      ├─ REAR sheet (translateZ(-6px))
      │  ├─ top half (static)
      │  └─ bottom half — FOLD HINGE: origin 50% 0% -3px
      │     └─ flop wrapper — origin 50% 0%
      ├─ FRONT sheet — SPREAD HINGE: origin 0% 50%
      │  └─ spread-flop wrapper — origin 0% 50%
      │     ├─ top half (static)
      │     └─ bottom half — FOLD HINGE: origin 50% 0% -9px
      │        └─ flop wrapper — origin 50% 0%
      └─ weekly object (translateZ(60px), own layer — never inside the fade/animation of the paper)
```
The **-3px / -9px hinge z-offsets are essential**: they make both flaps swing BEHIND their sheet and stack back-to-front when folded (front-top, rear-top, rear-flap, front-flap) with zero intersection.

## Primary transforms
- Fold hinge: `rotateX(-179.5deg)` (folded, stage 0) ↔ `rotateX(0deg)`; transition `transform {speed}s cubic-bezier(.5,.02,.2,1)`. Negative = swings from behind.
- Spread hinge: `rotateY(0)` ↔ `rotateY(-179.4deg)` (stage 2); same duration/easing.
- Tilt wrapper: `translateX(shiftX) translateY(lift) rotateX(-my*tilt*damp) rotateY(mx*tilt*damp)` where mx,my ∈ [-1,1] from cursor, `tilt` = tiltAmount prop (12), damp = 1 / 0.6 / 0.35 at stage 0/1/2; shiftX = 215 at stage 2 else 0; lift = 145 at stage 0 else 0.

## Paper "flop" (the thin-paper feel) — inner wrapper on each hinge
While the hinge turns, the free edge lags; on arrival it settles.
- During motion (`moving` = true, cleared after `speed*0.55` s):
  - fold flap: `rotateX(dir*14deg) rotateZ(dir*0.5deg)` opening (dir=-1), `rotateX(7deg)` closing (dir=+1, gentler — paper is pressed shut)
  - spread: `rotateY(dir*11deg) rotateZ(dir*0.4deg)` opening (dir=+1), `rotateY(-6deg)` closing
  - transition: `{speed*0.5}s cubic-bezier(.3,.6,.4,1)`
- Settle (moving → false):
  - opening: `{speed*1.15}s cubic-bezier(.34,1.9,.5,1)` → overshoots, then rests at a sag: flap `rotateX(-2.5deg)` when open, spread `rotateY(1.8deg)` at stage 2
  - closing: `{speed*0.7}s cubic-bezier(.2,.8,.3,1)` → **NO overshoot** (would clip through the sheet it lands on); rests at 0.

## Sequencing
- 0→1, 1→2: single beat.
- 2→0: **two beats** — go to stage 1 first; after `speed*1.25` s go to stage 0. Input locked during the sequence.
- `moving` flag: set on every beat, cleared after `speed*0.55` s (timer, not transitionend).

## Secondary elements
- Ground shadow: two radial blobs (folded @top 308px, open @top 600px) crossfade `opacity .6s`; open shadow `left` slides `4% → -96%` at stage 2 (`left .9s cubic-bezier(.6,.05,.25,1)`).
- Under-sheets (thickness, stage 0 only): fade `opacity .35s`.
- Corner shade on front flap while moving: overlay opacity 0→0.9, `{speed}s ease`.
- Horizontal crease (both sheets, y≈276–302px): soft 26px gradient band, `opacity 0→1 .6s` when open. Spine: 18px vertical gradient valley, `opacity .9s` at stage 2. (Softer/wider than the spine — horizontal fold ≠ vertical fold.)
- Edge cuts are static clip-paths (sawtooth top ~4px pitch, ragged bottom 0–3px) — copy the polygons verbatim from the DC; both faces of a half share one cut; mirrored faces need x-sorted point order or the polygon self-intersects.

## Weekly object (tomato)
- Mount at stage 2 only, positioned at spine bottom (left:-19px, top:545px relative to paper), `translateZ(60px)`.
- Drop-in: `tomatoDrop 1.7s` delayed `{speed*0.4}s`, fill both — starts at `translate(0,-270px) rotate(-60deg) scale(.45)` opacity 0 (inside the fold), falls with gravity ease `cubic-bezier(.4,0,.9,.5)` to `(6px,28px) rot160°` @55%, decelerates up to `(2px,-10px) rot340°` @78%, eases into `(0,0) rot360°` — **floats, never lands**.
- Idle float: `tomatoFloat 4.2s ease-in-out infinite` — translateY 0/-7px/-2px with rotate -3°/2°/4°.
- Shadow: fades in over the drop (`tomatoShadowIn 1.7s` same delay), then breathes opposite the float (scale .8–1, opacity .26–.42).
- Hover: object leans away — `rotateY(ox*28deg) rotateX(-oy*22deg) translate(ox*6px, oy*4px)`, `.35s cubic-bezier(.2,.7,.3,1)`; ox,oy ∈ [-1,1] within an 80×80 hit area. Click: += 360° rotateY spin (stopPropagation — must not fold the paper).
- Caption fades/rises in `.6s` at `{speed*0.4 + 1.6}s`, centered under the object.

## Acceptance checklist
- [ ] Flap always swings from BEHIND the page (top edge rises first when opening; tucks behind when closing) — never sweeps over the front
- [ ] Nothing clips through anything at any point in any transition, including rapid clicks (input lock)
- [ ] Opening has visible lag + overshoot + sag; closing is gentler with zero overshoot
- [ ] 2→0 closes in two beats (spread shuts fully, then flap tucks)
- [ ] Tomato drops out of the spine and hovers; hover/click interactions work; unmounts on fold
- [ ] Idle: paper bobs, tilt follows cursor with per-stage damping
