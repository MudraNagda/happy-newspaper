// "Highlight of the week": a .glb that tumbles out of the fold when the spread opens.
// Keyframed easing + small randomness (no physics engine). Presets: tumble | roll | flutter | splat.
// The camera looks down at the desk (the screen plane), so "falling" = toward the desk + down the screen.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeInQuad = (x) => x * x;
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
const easeOutBounce = (x) => { const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x; if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375; return n1 * (x -= 2.625 / d1) * x + 0.984375; };
// height above desk for a gravity fall with two damped bounces (1 at t=0 → 0 at t=1)
const bounceHeight = (t) => 1 - easeOutBounce(t);

export class Drop {
  constructor(layer, canvas, fallbackImg, splatEl, captionEl, hoverSurface) {
    Object.assign(this, { layer, canvas, fallbackImg, splatEl, captionEl });
    this.pointer = new THREE.Vector2(2, 2); this.raycaster = new THREE.Raycaster();
    this.spec = null; this.model = null; this.ready = Promise.resolve(null); this.anim = null; this.webgl = false; this.hover = false;
    this.loader = new GLTFLoader();
    try { this.initThree(); } catch (e) { console.warn('WebGL unavailable → PNG fallback', e); this.webgl = false; }
    // canvas is pointer-events:none so clicks reach the paper; hover is found by raycasting instead
    (hoverSurface || canvas).addEventListener('pointermove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    });
    (hoverSurface || canvas).addEventListener('pointerleave', () => this.pointer.set(2, 2));
  }

  initThree() {
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
    this.scene.add(new THREE.HemisphereLight(0xfff1dc, 0x4a3a2c, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-3, 7, 2.5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 5; key.shadow.bias = -0.0006;
    Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 30 });
    this.scene.add(key); this.key = key;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.42 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.scene.add(ground);
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.webgl = true;
    this.resize(); addEventListener('resize', () => this.resize());
  }

  // 1 world unit = 100 CSS px on the desk plane. Camera tilted ~20° off vertical so a fall reads as "down".
  resize() {
    if (!this.webgl) return;
    const r = this.layer.getBoundingClientRect(); const w = r.width, h = r.height;
    if (w < 50 || h < 50) { requestAnimationFrame(() => this.resize()); return; } // layout not ready yet
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const dist = (h / 200) / Math.tan(THREE.MathUtils.degToRad(15));
    this.camera.position.set(0, dist * Math.cos(0.35), dist * Math.sin(0.35)); this.camera.lookAt(0, 0, 0);
    this.desk = { w: w / 100, h: h / 100 };
    this.render();
  }

  // Called when an issue is shown; loads the object so the drop is instant.
  prepare(spec) {
    this.stop(); this.spec = spec; this.model = null; this.hideCaption();
    if (this.root) { this.root.clear(); this.render(); }
    this.fallbackImg.hidden = true; this.splatEl.hidden = true; this.fallbackImg.className = 'drop-fallback'; this.splatEl.classList.remove('in');
    if (!spec || !spec.url) { this.ready = Promise.resolve(null); return; }
    if (spec.drop === 'splat') { this.ready = Promise.resolve('splat'); return; }
    if (!this.webgl || /\.(png|jpe?g|webp|svg)(\?|$)/i.test(spec.url)) { this.ready = Promise.resolve('fallback'); return; }
    this.ready = new Promise((resolve) => {
      this.loader.load(spec.url, (gltf) => {
        const obj = gltf.scene;
        const box = new THREE.Box3().setFromObject(obj); const size = new THREE.Vector3(); box.getSize(size);
        const s = (1.0 / Math.max(size.x, size.y, size.z)) * (spec.scale || 1);
        obj.scale.setScalar(s); box.setFromObject(obj); box.getSize(size);
        const c = new THREE.Vector3(); box.getCenter(c); obj.position.set(-c.x, -c.y, -c.z); // pivot = centre
        obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; if (m.geometry.attributes.color && m.material) m.material.vertexColors = true; } });
        const pivot = new THREE.Group(); pivot.add(obj);
        this.model = pivot; this.size = size.clone();
        resolve('glb');
      }, undefined, (err) => { console.warn('GLB failed → fallback', err); resolve(spec.fallback ? 'fallback' : null); });
    });
  }

  scheduleDrop(delayMs) { clearTimeout(this._t); this._t = setTimeout(() => this.drop(), delayMs); }

  async drop() {
    if (!this.spec) return;
    const kind = await this.ready; if (!kind) return;
    this.stop(); this.resize(); // desk size may have changed since load
    const { w, h } = this.desk || { w: 10, h: 7 };
    const preset = this.spec.drop || 'tumble';
    // spawn at the spine at the mid-fold line, "tucked in the fold"; rest lower-right in front of the paper
    const start = { x: 0, y: 2.4, z: 0 };
    const rest = { x: Math.min(w * 0.31, 4.2 + 0.2 * w), y: 0, z: Math.min(h * 0.28, 2.2) };
    if (kind === 'splat') return this.splat(rest);
    if (kind === 'fallback') return this.fallback(preset, rest);
    this.root.clear(); this.root.add(this.model);
    const f = Math.min(1, Math.max(0.55, w / 10)); // smaller objects on narrow desks (mobile)
    const m = this.model; m.scale.setScalar(f); const sz = this.size.clone().multiplyScalar(f);
    const seed = { spin: rand(0.85, 1.15), lean: rand(-0.3, 0.3), dir: Math.random() < 0.5 ? -1 : 1, side: rand(-0.4, 0.4) };
    const restY = { tumble: sz.y / 2, roll: Math.max(sz.x, sz.z) / 2, flutter: sz.y / 2 }[preset] ?? sz.y / 2;
    const t0 = performance.now();
    const presets = {
      // falls ~250px with gravity ease, one 1.5-turn rotation, 2 damped bounces, settles slightly rotated. ~1.4 s
      tumble: { dur: 1400, step: (t) => {
        const k = easeOutCubic(t);
        m.position.set(start.x + (rest.x - start.x) * k + seed.side * Math.sin(t * Math.PI), restY + start.y * bounceHeight(t), start.z + (rest.z - start.z) * k);
        m.rotation.set(seed.lean * k, 1.5 * seed.spin * Math.PI * 2 * k * seed.dir, (1 - k) * 0.6 * seed.dir + seed.lean * 0.5);
      } },
      // falls, one bounce, rolls 150–300px along the desk with rotation matching distance, decelerates
      roll: { dur: 2000, step: (t) => {
        const fT = clamp01(t / 0.38), rT = clamp01((t - 0.3) / 0.7);
        const dist = (1.5 + Math.abs(seed.side) * 3.5) * easeOutCubic(rT);
        const bounce = fT > 0.72 ? Math.sin((fT - 0.72) / 0.28 * Math.PI) * 0.35 : 0;
        const y = restY + (fT < 1 ? start.y * (1 - easeInQuad(Math.min(fT / 0.72, 1))) + bounce : 0);
        m.position.set(start.x + (rest.x - dist - start.x) * easeOutCubic(fT) + dist, y, start.z + (rest.z - start.z) * easeOutCubic(fT));
        m.rotation.set(Math.PI / 2 * easeOutCubic(fT), 0, -(dist / restY) + seed.lean, 'ZXY');
      } },
      // slow fall with lateral sway, 2–3 s, lands flat
      flutter: { dur: 2700, step: (t) => {
        const k = easeOutCubic(t), fall = 1 - t * t;
        m.position.set(start.x + (rest.x - start.x) * k + Math.sin(t * Math.PI * 3.2) * 0.55 * (1 - t), restY + start.y * fall, start.z + (rest.z - start.z) * k);
        m.rotation.set(Math.sin(t * Math.PI * 3.2) * 0.55 * (1 - t), t * Math.PI * 2 * seed.spin * seed.dir, Math.cos(t * Math.PI * 2.4) * 0.5 * (1 - t));
      } },
    };
    const p = presets[preset] || presets.tumble;
    const tick = (now) => {
      const t = clamp01((now - t0) / p.dur); p.step(t); this.render();
      if (t < 1) this.anim = requestAnimationFrame(tick); else this.settled(m);
    };
    this.anim = requestAnimationFrame(tick);
  }

  settled(m) {
    setTimeout(() => this.showCaption(), 300);
    const base = m.rotation.y; let a = 0, last = performance.now();
    const idle = (now) => { // hover → slow spin
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (this.webgl && this.pointer.x < 1.5) {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        this.hover = this.raycaster.intersectObject(m, true).length > 0;
      } else this.hover = false;
      if (this.hover) { a += dt * 1.2; m.rotation.y = base + a; this.render(); }
      this.anim = requestAnimationFrame(idle);
    };
    this.anim = requestAnimationFrame(idle);
  }

  place(el, rest) {
    const { w, h } = this.desk || { w: 10, h: 7 };
    el.style.setProperty('--x', `${50 + rest.x / w * 100}%`); el.style.setProperty('--y', `${50 + rest.z / h * 100}%`);
  }
  splat(rest) {
    const el = this.splatEl; this.place(el, rest); el.hidden = false;
    el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    setTimeout(() => this.showCaption(), 900);
  }
  fallback(preset, rest) {
    const img = this.fallbackImg; img.src = this.spec.fallback || this.spec.url; this.place(img, rest);
    img.style.setProperty('--scale', String(this.spec.scale || 1)); img.hidden = false;
    img.className = `drop-fallback ${preset}`; void img.offsetWidth; img.classList.add('in');
    setTimeout(() => this.showCaption(), 1700);
  }

  // Re-fold: object slides off-screen; re-opening drops it again.
  dismiss(immediate = false) {
    clearTimeout(this._t); this.hideCaption();
    if (this.model && this.root && this.root.children.length) {
      this.stop();
      if (immediate) { this.root.clear(); this.render(); }
      else {
        const m = this.model, t0 = performance.now(), from = m.position.clone(), rz = m.rotation.z;
        const tick = (now) => { const t = clamp01((now - t0) / 480), k = easeInQuad(t);
          m.position.set(from.x + k * 7, from.y + Math.sin(t * Math.PI) * 0.4, from.z + k * 3); m.rotation.z = rz + t * 1.2;
          this.render(); if (t < 1) this.anim = requestAnimationFrame(tick); else { this.root.clear(); this.render(); } };
        this.anim = requestAnimationFrame(tick);
      }
    }
    this.fallbackImg.classList.remove('in'); this.splatEl.classList.remove('in');
    setTimeout(() => { if (!this.fallbackImg.classList.contains('in')) this.fallbackImg.hidden = true; if (!this.splatEl.classList.contains('in')) this.splatEl.hidden = true; }, 500);
  }

  showCaption() {
    const c = this.captionEl; if (!this.spec?.caption) return;
    c.textContent = this.spec.caption; c.hidden = false; c.classList.add('in');
    c.getAnimations().forEach(a => a.cancel());
    c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease', fill: 'forwards' });
  }
  hideCaption() {
    const c = this.captionEl; if (c.hidden) return;
    c.classList.remove('in'); c.getAnimations().forEach(a => a.cancel());
    const a = c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: 'ease', fill: 'forwards' });
    a.onfinish = () => { if (!c.classList.contains('in')) c.hidden = true; };
  }
  stop() { if (this.anim) cancelAnimationFrame(this.anim); this.anim = null; }
  render() { if (this.webgl) this.renderer.render(this.scene, this.camera); }
}
