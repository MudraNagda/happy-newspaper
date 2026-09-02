// Weekly object ("tomato" in the spec): mounted at stage 2 only, drops out of the spine and floats.
// All motion is CSS keyframes (see paper.css). A .glb is rendered once into a small canvas by three.js;
// a .png/.jpg is used as-is. Hover leans, click spins, caption rises in under it.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const IMG_RE = /\.(png|jpe?g|webp|gif|svg)(\?|$)/i;

export class WeeklyObject {
  constructor(slot, { speed = 0.95 } = {}) {
    this.slot = slot; this.speed = speed; this.spec = null; this.el = null; this.spin = 0;
    this.visual = null; // Promise<HTMLElement|null>
  }

  // Preload when an issue is shown so mounting at stage 2 is instant.
  prepare(spec) {
    this.spec = spec; this.unmount();
    if (!spec || !spec.url) { this.visual = Promise.resolve(null); return; }
    if (IMG_RE.test(spec.url)) { this.visual = this.makeImg(spec.url); return; }
    this.visual = this.renderGlb(spec.url).catch((err) => {
      console.warn('GLB failed → fallback', err);
      return spec.fallback ? this.makeImg(spec.fallback) : null;
    });
  }

  makeImg(url) {
    return new Promise((resolve) => {
      const img = new Image(); img.decoding = 'async'; img.alt = '';
      img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = url;
    });
  }

  async renderGlb(url) {
    const size = 200, dpr = Math.min(devicePixelRatio || 1, 2);
    const canvas = document.createElement('canvas'); canvas.width = size * dpr; canvas.height = size * dpr;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); }
    catch (e) { throw new Error('WebGL unavailable'); }
    renderer.setClearColor(0x000000, 0); renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x4a3a2c, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-2, 4, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffe0b0, 0.8); rim.position.set(3, 2, -2); scene.add(rim);
    const gltf = await new GLTFLoader().loadAsync(url);
    const obj = gltf.scene;
    obj.traverse((m) => { if (m.isMesh && m.geometry.attributes.color && m.material) m.material.vertexColors = true; });
    const box = new THREE.Box3().setFromObject(obj); const c = new THREE.Vector3(); box.getCenter(c);
    const s = new THREE.Vector3(); box.getSize(s); obj.position.sub(c); scene.add(obj);
    const radius = s.length() / 2;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
    const dist = radius / Math.sin(THREE.MathUtils.degToRad(15)) * 0.92;
    camera.position.set(dist * 0.55, dist * 0.55, dist * 0.62); camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    // keep as a static image so the WebGL context can be released
    const img = new Image(); img.alt = ''; img.src = canvas.toDataURL('image/png');
    renderer.dispose(); renderer.forceContextLoss?.();
    await img.decode().catch(() => {});
    return img;
  }

  async mount() {
    if (!this.spec || this.el) return;
    const visual = await this.visual; if (!visual || this.el || !this.spec) return;
    const el = document.createElement('div'); el.className = 'weekly';
    el.style.setProperty('--speed', `${this.speed}s`);
    el.style.setProperty('--obj-scale', String(this.spec.scale || 1));
    el.innerHTML = `<div class="weekly-shadow"></div>
      <div class="weekly-drop"><div class="weekly-float"><div class="weekly-lean"></div></div></div>
      <div class="weekly-caption"></div>`;
    el.querySelector('.weekly-lean').appendChild(visual);
    const cap = el.querySelector('.weekly-caption'); cap.textContent = this.spec.caption || ''; cap.hidden = !this.spec.caption;
    const lean = el.querySelector('.weekly-lean'), hit = el.querySelector('.weekly-drop');
    const setLean = (ox, oy) => { lean.style.transform = `rotateY(${ox * 28}deg) rotateX(${-oy * 22}deg) translate(${ox * 6}px, ${oy * 4}px) rotateY(${this.spin}deg)`; };
    hit.addEventListener('pointermove', (e) => {
      const r = hit.getBoundingClientRect();
      setLean(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    });
    hit.addEventListener('pointerleave', () => setLean(0, 0));
    hit.addEventListener('click', (e) => { e.stopPropagation(); this.spin += 360; setLean(0, 0); });
    setLean(0, 0);
    this.el = el; this.slot.appendChild(el);
  }

  unmount() { if (this.el) { this.el.remove(); this.el = null; } this.spin = 0; }
}
