// Fold state machine, sequencing, "moving" flag and desk tilt — per ANIMATION-SPEC.md.
// speed = openSpeed (0.95s). Stage 0 folded quarter, 1 front page, 2 spread. 2→0 runs in two beats.

export class Fold {
  constructor(paper, tiltEl, { speed = 0.95, tilt = 12, onStage } = {}) {
    this.paper = paper; this.tiltEl = tiltEl; this.speed = speed; this.tilt = tilt;
    this.stage = 0; this.locked = false; this.mx = 0; this.my = 0; this.tiltEnabled = true;
    this.onStage = onStage || (() => {});
    paper.style.setProperty('--speed', `${speed}s`);
    paper.addEventListener('click', () => this.next());
    paper.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.next(); } });
    this.applyTilt();
  }

  next() {
    if (this.locked) return;
    if (this.stage === 2) this.closeSequence(); else this.beat(this.stage + 1);
  }

  // one beat: change stage, set moving (cleared after speed*0.55), lock input for the beat
  beat(stage, { lock = true } = {}) {
    const from = this.stage; this.stage = stage;
    const dir = stage > from ? 'open' : 'close';
    const p = this.paper;
    p.dataset.dir = dir;
    p.classList.remove('stage-0', 'stage-1', 'stage-2'); p.classList.add(`stage-${stage}`);
    p.classList.toggle('open-fold', stage >= 1);
    // which hinge turns this beat
    p.classList.remove('moving', 'moving-fold', 'moving-spread');
    p.classList.add('moving', (from === 0 || stage === 0) ? 'moving-fold' : 'moving-spread');
    clearTimeout(this._moveT);
    this._moveT = setTimeout(() => p.classList.remove('moving', 'moving-fold', 'moving-spread'), this.speed * 0.55 * 1000);
    if (lock) this.lock(this.speed * 1.05);
    this.applyTilt();
    this.onStage(stage, from);
  }

  closeSequence() {
    this.lock(this.speed * 1.25 + this.speed * 1.05);
    this.beat(1, { lock: false });
    this._seqT = setTimeout(() => this.beat(0, { lock: false }), this.speed * 1.25 * 1000);
  }

  lock(sec) { this.locked = true; clearTimeout(this._lockT); this._lockT = setTimeout(() => { this.locked = false; }, sec * 1000); }

  // tilt: translateX(shiftX) translateY(lift) rotateX(-my*tilt*damp) rotateY(mx*tilt*damp)
  applyTilt() {
    const damp = [1, 0.6, 0.35][this.stage];
    const shiftX = this.stage === 2 ? 215 : 0, lift = this.stage === 0 ? 145 : 0;
    const mx = this.tiltEnabled ? this.mx : 0, my = this.tiltEnabled ? this.my : 0;
    this.tiltEl.style.transform = `translateX(${shiftX}px) translateY(${lift}px) rotateX(${(-my * this.tilt * damp).toFixed(3)}deg) rotateY(${(mx * this.tilt * damp).toFixed(3)}deg)`;
  }
  attachTilt(surface) {
    surface.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const r = surface.getBoundingClientRect();
      this.mx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      this.my = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      this.applyTilt();
    });
    surface.addEventListener('pointerleave', () => { this.mx = 0; this.my = 0; this.applyTilt(); });
  }
}
