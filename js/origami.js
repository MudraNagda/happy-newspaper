// Tear-away origami: a square torn from page 3 that folds, click by click, into a random model.
// Flat-fold engine: the paper is a stack of convex faces (bottom → top). A step splits every face
// along a line, swings the faces on one side over (valley) or under (mountain), and re-stacks them.
import { gvizUrl, parseGviz } from './sheet.js';

const H = Math.SQRT1_2; // half-diagonal of the unit square (diamond starts)
const PALETTE = ['#e4572e', '#f2b134', '#2e86ab', '#6a994e', '#c45baa', '#ef8354', '#3d5a80'];
const L = (x1, y1, x2, y2) => [[x1, y1], [x2, y2]];

// Coordinates: centre (0,0), y down, paper side = 1. start: 'square' (corners ±.5) or 'diamond' (points ±H).
export const MODELS = {
  plane: { name: 'a paper plane', start: 'square', finalRotate: 55, steps: [
    { say: 'fold the top-left corner to the centre', line: L(0, -.5, -.5, 0), move: [-.5, -.5] },
    { say: 'and the top-right corner', line: L(0, -.5, .5, 0), move: [.5, -.5] },
    { say: 'fold the left edge in to the centre line', line: L(0, -.5, -.4142, .5), move: [-.5, .2] },
    { say: 'and the right edge', line: L(0, -.5, .4142, .5), move: [.5, .2] },
    { say: 'fold it in half', line: L(0, -1, 0, 1), move: [-.3, 0] },
    { say: 'fold the wing down', line: L(0, -.5, .17, .5), move: [.4, .4] },
  ] },
  tulip: { name: 'a tulip', start: 'diamond', finalRotate: 0, steps: [
    { say: 'fold the bottom corner up to the top', line: L(-1, 0, 1, 0), move: [0, .5] },
    { say: 'fold the right corner up — a petal', line: L(0, 0, .4158, -.2911), move: [.65, -.02] },
    { say: 'and the left petal', line: L(0, 0, -.4158, -.2911), move: [-.65, -.02] },
    { say: 'turn it over', flip: true },
  ] },
  swan: { name: 'a swan', start: 'diamond', finalRotate: 0, steps: [
    { say: 'fold the upper edge to the centre line', line: L(-H, 0, .2929, -.4142), move: [0, -H] },
    { say: 'and the lower edge — a kite', line: L(-H, 0, .2929, .4142), move: [0, H] },
    { say: 'fold the edges in again, narrower', line: L(-H, 0, .4725, -.2346), move: [.2929, -.4142] },
    { say: 'same below', line: L(-H, 0, .4725, .2346), move: [.2929, .4142] },
    { say: 'fold it in half, away from you', line: L(-1, 0, 1, 0), move: [0, -.1], mountain: true },
    { say: 'swing the point up — the neck', line: L(-.1, 0, .088, .158), move: [-.6, .01] },
    { say: 'fold the tip down — the head', line: L(-.179, -.449, .64, .125), move: [-.205, -.598] },
  ] },
  dog: { name: 'a puppy', start: 'diamond', finalRotate: 0,
    deco: '<circle cx="-.15" cy=".17" r=".03"/><circle cx=".15" cy=".17" r=".03"/><ellipse cx="0" cy=".35" rx=".045" ry=".032"/>',
    steps: [
    { say: 'fold the top corner down to the bottom', line: L(-1, 0, 1, 0), move: [0, -.5] },
    { say: 'fold the left corner down — an ear', line: L(-.25, 0, -.4985, .2086), move: [-.65, .02] },
    { say: 'and the other ear', line: L(.25, 0, .4985, .2086), move: [.65, .02] },
    { say: 'fold the tip up — the nose', line: L(-1, .5, 1, .5), move: [0, .7] },
  ] },
};

// ---- geometry ------------------------------------------------------------------------------
const EPS = 1e-9;
const side = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
const area = (pts) => { let s = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; s += p[0] * q[1] - q[0] * p[1]; } return Math.abs(s) / 2; };
function clip(pts, a, b, sign) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const sp = side(a, b, p) * sign, sq = side(a, b, q) * sign;
    if (sp >= -EPS) out.push(p);
    if ((sp > EPS && sq < -EPS) || (sp < -EPS && sq > EPS)) { const t = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  return out.length >= 3 && area(out) > 1e-5 ? out : null;
}
// affine "swing about the line by θ", projected flat: A = ddᵀ + cosθ·nnᵀ
function swing(a, b, c) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / len, dy = (b[1] - a[1]) / len, nx = -dy, ny = dx;
  const A = [dx * dx + c * nx * nx, dx * dy + c * nx * ny, dx * dy + c * nx * ny, dy * dy + c * ny * ny];
  return { A, t: [a[0] - (A[0] * a[0] + A[1] * a[1]), a[1] - (A[2] * a[0] + A[3] * a[1])] };
}
const applyPt = (T, p) => [T.A[0] * p[0] + T.A[1] * p[1] + T.t[0], T.A[2] * p[0] + T.A[3] * p[1] + T.t[1]];
const applyM = (T, m) => [T.A[0] * m[0] + T.A[1] * m[1], T.A[2] * m[0] + T.A[3] * m[1], T.A[0] * m[2] + T.A[1] * m[3], T.A[2] * m[2] + T.A[3] * m[3],
  T.A[0] * m[4] + T.A[1] * m[5] + T.t[0], T.A[2] * m[4] + T.A[3] * m[5] + T.t[1]];

// The torn piece is the whole quadrant (430×290). Its square part is centred on the origin; the spare
// strip on the right is folded over first. Diamond models work in a frame turned 45°.
export const RECT_W = 430 / 290, RECT_CX = (RECT_W - 1) / 2;
const turned = (model) => model.start === 'diamond';
const rot = (model, p) => turned(model) ? [H * (p[0] - p[1]), H * (p[0] + p[1])] : p;
export function startFaces(model) {
  const x1 = RECT_W - .5;
  return [{ pts: [[-.5, -.5], [x1, -.5], [x1, .5], [-.5, .5]].map(p => rot(model, p)), up: true, m: turned(model) ? [H, H, -H, H, 0, 0] : [1, 0, 0, 1, 0, 0] }];
}
export function stepsOf(model) {
  return [{ say: 'fold the spare strip over — now it is a square', line: [rot(model, [.5, -1]), rot(model, [.5, 1])], move: rot(model, [.8, 0]), square: true }, ...model.steps];
}
function prep(faces, step) {
  if (step.flip) return { S: [], M: faces, a: [0, -1], b: [0, 1], valley: true };
  const [a, b] = step.line, sign = Math.sign(side(a, b, step.move)) || 1, S = [], M = [];
  for (const f of faces) {
    const stay = clip(f.pts, a, b, -sign), go = clip(f.pts, a, b, sign);
    if (stay) S.push({ ...f, pts: stay }); if (go) M.push({ ...f, pts: go });
  }
  return { S, M, a, b, valley: !step.mountain };
}
function frame(pr, theta, shade = true) {
  const T = swing(pr.a, pr.b, Math.cos(theta)), over = theta > Math.PI / 2;
  let M = pr.M.map(f => ({ pts: f.pts.map(p => applyPt(T, p)), up: over ? !f.up : f.up, m: applyM(T, f.m), shade: shade ? 0.22 * Math.sin(theta) : 0 }));
  if (over) M = M.reverse();
  return pr.valley ? [...pr.S, ...M] : [...M, ...pr.S];
}
export function foldAll(model) { let f = startFaces(model); for (const s of stepsOf(model)) f = frame(prep(f, s), Math.PI, false); return f; }
function bbox(faces) { let x0 = 9, y0 = 9, x1 = -9, y1 = -9; for (const f of faces) for (const p of f.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 }; }

// ---- drawing --------------------------------------------------------------------------------
let uid = 0;
function facesSvg(faces, color, newsprint) {
  const id = `o${++uid}`; let defs = '', body = '';
  if (newsprint) defs += `<pattern id="${id}b" patternUnits="userSpaceOnUse" width=".3" height=".034"><rect width=".3" height=".034" fill="#f1e9d6"/><rect x=".02" y=".012" width=".26" height=".008" fill="#1b1a17" opacity=".28"/></pattern>`;
  faces.forEach((f, i) => {
    const pts = f.pts.map(p => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join(' ');
    let fill = color;
    if (f.up) {
      if (newsprint) { defs += `<pattern id="${id}p${i}" href="#${id}b" patternTransform="matrix(${f.m.map(n => n.toFixed(5)).join(' ')})"/>`; fill = `url(#${id}p${i})`; }
      else fill = '#efe6d2';
    }
    body += `<polygon points="${pts}" fill="${fill}" stroke="rgba(30,20,10,.5)" stroke-width=".006" stroke-linejoin="round"/>`;
    if (f.shade) body += `<polygon points="${pts}" fill="#000" opacity="${f.shade.toFixed(3)}"/>`;
  });
  return `<defs>${defs}</defs>${body}`;
}
function guideSvg(faces, step) {
  if (step.flip) return '';
  const [a, b] = step.line, len = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  let t0 = Infinity, t1 = -Infinity;
  for (const f of faces) for (let i = 0; i < f.pts.length; i++) {
    const p = f.pts[i], q = f.pts[(i + 1) % f.pts.length], sp = side(a, b, p), sq = side(a, b, q);
    if ((sp > 0) === (sq > 0) && Math.abs(sp) > 1e-7 && Math.abs(sq) > 1e-7) continue;
    const k = Math.abs(sp - sq) < 1e-12 ? 0 : sp / (sp - sq), x = p[0] + (q[0] - p[0]) * k, y = p[1] + (q[1] - p[1]) * k;
    const t = (x - a[0]) * d[0] + (y - a[1]) * d[1]; t0 = Math.min(t0, t); t1 = Math.max(t1, t);
  }
  if (!isFinite(t0)) return '';
  const P = (t) => `${(a[0] + d[0] * t).toFixed(4)} ${(a[1] + d[1] * t).toFixed(4)}`;
  return `<path class="ori-guide" d="M${P(t0 - .03)} L${P(t1 + .03)}"/>`;
}
export function miniSvg(key, color) {
  const model = MODELS[key]; const faces = foldAll(model), b = bbox(faces), r = Math.max(b.w, b.h) / 2 + .06;
  return `<svg viewBox="${(b.cx - r).toFixed(3)} ${(b.cy - r).toFixed(3)} ${(2 * r).toFixed(3)} ${(2 * r).toFixed(3)}" style="transform:rotate(${model.finalRotate}deg)">${facesSvg(faces, color, false)}${model.deco ? `<g fill="#1b1a17">${model.deco}</g>` : ''}</svg>`;
}
// crease pattern printed on the tear-away panel (panel is a square; diamond models are turned 45°)
export function creaseSvg(key) {
  const model = MODELS[key]; let lines = '';
  lines += '<line x1=".5" y1="-3" x2=".5" y2="3"/>';
  for (const s of model.steps) if (s.line) lines += `<line x1="${s.line[0][0] * 3}" y1="${s.line[0][1] * 3}" x2="${s.line[1][0] * 3}" y2="${s.line[1][1] * 3}"/>`;
  return `<clipPath id="tearSq"><rect x="-.5" y="-.5" width="1" height="1"/></clipPath><line x1=".5" y1="-.5" x2=".5" y2=".5"/><g clip-path="url(#tearSq)"><g transform="rotate(${model.start === 'diamond' ? -45 : 0})">${lines.replace('<line x1=".5" y1="-3" x2=".5" y2="3"/>', '')}</g></g>`;
}

// ---- gallery: what other readers folded -------------------------------------------------------
const SEEDS = [['swan', '#2e86ab'], ['plane', '#e4572e'], ['tulip', '#c45baa'], ['dog', '#f2b134'], ['plane', '#6a994e'], ['swan', '#ef8354'],
  ['tulip', '#e4572e'], ['dog', '#3d5a80'], ['swan', '#c45baa'], ['plane', '#f2b134'], ['tulip', '#6a994e'], ['dog', '#ef8354']].map(([model, color]) => ({ model, color }));
const valid = (e) => e && MODELS[e.model] && /^#[0-9a-f]{6}$/i.test(e.color);
const LOCAL_KEY = 'happy-newspaper:origami';
const localPieces = () => { try { return (JSON.parse(localStorage.getItem(LOCAL_KEY)) || []).filter(valid); } catch { return []; } };

async function loadGallery(cfg) {
  if (cfg.gallerySheetUrl) {
    try {
      const { cols, rows } = parseGviz(await (await fetch(gvizUrl(cfg.gallerySheetUrl), { cache: 'no-store' })).text());
      const mi = cols.findIndex(c => /model/i.test(c)), ci = cols.findIndex(c => /colou?r/i.test(c));
      const got = rows.map(r => ({ model: String(r[mi] || '').trim().toLowerCase(), color: String(r[ci] || '').trim() })).filter(valid);
      if (got.length) return got.slice(-24).reverse();
    } catch (e) { console.warn('gallery sheet unreachable', e); }
  }
  return [...localPieces().slice(-6).reverse(), ...SEEDS].slice(0, 18);
}
function savePiece(cfg, piece) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify([...localPieces(), piece].slice(-12))); } catch {}
  if (!cfg.galleryPrefillUrl) return;
  try { // prefilled link carries entry ids: …/viewform?usp=pp_url&entry.111=MODEL&entry.222=COLOR
    const u = new URL(cfg.galleryPrefillUrl), body = new URLSearchParams();
    for (const [k, v] of u.searchParams) { if (v === 'MODEL') body.set(k, piece.model); if (v === 'COLOR') body.set(k, piece.color); }
    fetch(u.origin + u.pathname.replace(/viewform$/, 'formResponse'), { method: 'POST', mode: 'no-cors', body });
  } catch (e) { console.warn('gallery submit failed', e); }
}

// ---- the experience -----------------------------------------------------------------------------
export class Origami {
  constructor({ cfg, fold, fit, panel, guides, root }) {
    Object.assign(this, { cfg, fold, fit, panel, guides, root });
    this.svg = root.querySelector('.ori-paper'); this.stepEl = root.querySelector('.ori-step'); this.hintEl = root.querySelector('.ori-hint');
    this.galleryEl = root.querySelector('.ori-gallery'); this.actions = root.querySelector('.ori-actions');
    this.busy = false; this.active = false;
    this.pick();
    document.addEventListener('click', (e) => {
      if (this.active || fold.stage !== 2 || fold.locked || e.target.closest('.weekly, .hint')) return;
      const r = panel.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      e.stopPropagation(); this.tear();
    }, true);
    root.addEventListener('click', () => this.next());
    root.querySelector('.ori-again').addEventListener('click', (e) => { e.stopPropagation(); this.again(); });
    root.querySelector('.ori-back').addEventListener('click', (e) => { e.stopPropagation(); this.back(); });
  }

  // a different random model each visit (and each time), printed on the panel as fold guides
  pick() {
    const keys = Object.keys(MODELS).filter(k => k !== this.key); let last = null;
    try { last = localStorage.getItem(LOCAL_KEY + ':last'); } catch {}
    const pool = keys.filter(k => k !== last); this.key = (pool.length ? pool : keys)[Math.floor(Math.random() * (pool.length || keys.length))];
    try { localStorage.setItem(LOCAL_KEY + ':last', this.key); } catch {}
    this.model = MODELS[this.key]; this.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    this.guides.innerHTML = creaseSvg(this.key);
  }

  size() { return Math.min(innerWidth * 0.4, innerHeight * 0.5, 400); }
  get steps() { return stepsOf(this.model); }
  rest(S) { return `translate(${-RECT_CX * S}px, 0px) rotate(${turned(this.model) ? -45 : 0}deg)`; }
  draw(faces, extra = '') { this.svg.innerHTML = facesSvg(faces, this.color, true) + extra; }
  begin() {
    this.faces = startFaces(this.model); this.i = 0; this.done = false;
    const S = this.size(); Object.assign(this.svg.style, { width: `${2 * S}px`, height: `${2 * S}px`, margin: `${-S}px 0 0 ${-S}px`, transformOrigin: '50% 50%' });
    this.svg.classList.remove('done'); this.actions.hidden = true; this.galleryEl.innerHTML = ''; this.galleryEl.classList.remove('in');
    this.root.classList.remove('finished');
    return S;
  }
  prompt() {
    const s = this.steps[this.i];
    this.draw(this.faces, guideSvg(this.faces, s));
    this.stepEl.textContent = s.say; this.hintEl.textContent = `click to fold · ${this.i + 1} / ${this.steps.length}`;
  }

  tear() {
    this.active = true; this.busy = true; this.fold.disabled = true;
    const r = this.panel.getBoundingClientRect(), S = this.begin(), turn = turned(this.model) ? -45 : 0, k = r.height / S;
    this.draw(this.faces);
    this.root.hidden = false; document.body.dataset.origami = '1';
    const from = `translate(${r.left + r.width / 2 - innerWidth / 2 - RECT_CX * S * k}px, ${r.top + r.height / 2 - innerHeight / 2}px) scale(${k}) rotate(${turn}deg)`;
    this.svg.style.transition = 'none'; this.svg.style.transform = from; void this.svg.getBoundingClientRect();
    this.panel.closest('.half').classList.add('torn-off'); // the whole quadrant leaves the page
    this.svg.style.transition = ''; this.svg.style.transform = this.rest(S);
    this.fit.classList.add('dropped'); // the rest of the paper drops out of frame
    this.stepEl.textContent = ''; this.hintEl.textContent = '';
    setTimeout(() => { this.busy = false; this.prompt(); }, 950);
  }

  next() {
    if (this.busy || this.done || !this.active) return;
    this.busy = true;
    const step = this.steps[this.i], pr = prep(this.faces, step), t0 = performance.now(), dur = 620;
    const ease = (x) => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      if (t < 1) { this.draw(frame(pr, ease(t) * Math.PI)); requestAnimationFrame(tick); return; }
      this.faces = frame(pr, Math.PI, false); this.i++; this.busy = false;
      if (step.square) this.svg.style.transform = 'none'; // square now: centre it (and turn it for diamond models)
      if (this.i >= this.steps.length) this.finish(); else this.prompt();
    };
    requestAnimationFrame(tick);
  }

  async finish() {
    this.done = true;
    const deco = this.model.deco ? `<g class="ori-deco" fill="#1b1a17">${this.model.deco}</g>` : '';
    this.draw(this.faces, deco);
    const b = bbox(this.faces), S = this.size();
    this.svg.style.transformOrigin = `${(b.cx + 1) * S}px ${(b.cy + 1) * S}px`; // centre the finished piece, then glow
    this.svg.style.transform = `translate(${-b.cx * S}px, ${-b.cy * S}px) rotate(${this.model.finalRotate}deg) scale(.82)`;
    this.svg.classList.add('done'); this.root.classList.add('finished');
    this.stepEl.textContent = `${this.model.name}.`; this.hintEl.textContent = 'folded by you — and these, by other readers';
    const piece = { model: this.key, color: this.color };
    const others = await loadGallery(this.cfg); savePiece(this.cfg, piece);
    this.showGallery(others);
    setTimeout(() => { if (this.done) this.actions.hidden = false; }, 1400);
  }

  showGallery(list) {
    const narrow = innerWidth < 720, rx = narrow ? innerWidth * .38 : Math.min(innerWidth * .4, 560), ry = innerHeight * (narrow ? .36 : .33);
    this.galleryEl.innerHTML = list.map((e, i) => {
      const a = i * 2.39996 + .6, rf = .78 + .22 * ((i * 37) % 10) / 10;
      const x = 50 + Math.cos(a) * rx * rf / innerWidth * 100, y = 47 + Math.sin(a) * ry * rf / innerHeight * 100;
      return `<div class="ori-mini" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;--d:${(0.5 + i * 0.09).toFixed(2)}s;--r:${((i * 53) % 40) - 20}deg;--f:${(3.6 + (i % 5) * 0.5).toFixed(1)}s">${miniSvg(e.model, e.color)}</div>`;
    }).join('');
    void this.galleryEl.offsetWidth; this.galleryEl.classList.add('in');
  }

  again() { this.pick(); this.busy = true; const S = this.begin(); this.svg.style.transform = this.rest(S); this.draw(this.faces); setTimeout(() => { this.busy = false; this.prompt(); }, 500); }
  back() {
    this.active = false; this.done = false; this.root.hidden = true; delete document.body.dataset.origami;
    this.fit.classList.remove('dropped'); this.panel.closest('.half').classList.remove('torn-off'); this.pick();
    setTimeout(() => { this.fold.disabled = false; }, 900);
  }
}
