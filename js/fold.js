// Fold state machine + desk tilt.
// Stage 0: folded twice (front page top showing). Stage 1: front page. Stage 2: spread open.

export class Fold {
  constructor(paper, cfg, { onStage, onOpenProgress } = {}) {
    this.paper = paper; this.cfg = cfg; this.stage = 0; this.busy = false;
    this.onStage = onStage || (() => {}); this.onOpenProgress = onOpenProgress || (() => {});
    paper.style.setProperty('--unfold', `${cfg.unfoldSpeed}ms`);
    paper.style.setProperty('--open', `${cfg.openSpeed}ms`);
    paper.addEventListener('click', () => this.next());
    paper.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.next(); } });
    paper.tabIndex = 0;
  }
  next() { this.set((this.stage + 1) % 3); }
  set(stage) {
    if (this.busy || stage === this.stage) return;
    const from = this.stage; this.stage = stage; this.busy = true;
    const p = this.paper;
    p.classList.remove('stage-0', 'stage-1', 'stage-2');
    p.classList.toggle('closing', stage < from);
    // force style flush so the transition-delay changes apply before the class swap
    void p.offsetWidth;
    p.classList.add(`stage-${stage}`);
    let total = 0;
    if (from === 1 && stage === 2) { total = this.cfg.openSpeed; this.onOpenProgress('open', this.cfg.openSpeed); }
    else if (from === 0 && stage === 1) total = this.cfg.unfoldSpeed;
    else if (from === 2 && stage === 0) { total = this.cfg.openSpeed + this.cfg.unfoldSpeed; this.onOpenProgress('close', this.cfg.openSpeed); }
    else total = Math.max(this.cfg.openSpeed, this.cfg.unfoldSpeed);
    this.onStage(stage, from);
    clearTimeout(this._t);
    this._t = setTimeout(() => { this.busy = false; }, total + 50);
  }
}

export function attachTilt(desk, tiltEl, { max = 7, enabled = true } = {}) {
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  const apply = () => {
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
    tiltEl.style.transform = `rotateX(${cy.toFixed(3)}deg) rotateY(${cx.toFixed(3)}deg)`;
    if (Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01) raf = requestAnimationFrame(apply); else raf = 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(apply); };
  if (!enabled) { tiltEl.style.transform = 'rotateX(0deg) rotateY(0deg)'; return; }
  desk.addEventListener('pointermove', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const r = desk.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
    tx = nx * 2 * max; ty = -ny * 2 * max; kick();
  });
  desk.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
}
