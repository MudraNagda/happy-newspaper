// Generates a small, baked-colour .glb (a coffee mug) with no dependencies.
// Usage: node tools/make-glb.mjs objects/2026-09-01.glb
import { writeFileSync } from 'node:fs';

const out = process.argv[2] || 'objects/sample-mug.glb';
const P = [], N = [], C = [], I = [];
const push = (p, n, c) => { P.push(...p); N.push(...n); C.push(...c); return P.length / 3 - 1; };
const CREAM = [0.96, 0.93, 0.86], YELLOW = [0.98, 0.76, 0.18], DARK = [0.35, 0.2, 0.1];
const SEG = 40, TAU = Math.PI * 2;

// Cylinder wall (open) from y0..y1 at radius r, normals pointing outward (flip=false) or inward.
function wall(r, y0, y1, flip, col) {
  const base = P.length / 3;
  for (let i = 0; i <= SEG; i++) {
    const a = i / SEG * TAU, x = Math.cos(a), z = Math.sin(a);
    const n = flip ? [-x, 0, -z] : [x, 0, z];
    push([x * r, y0, z * r], n, col); push([x * r, y1, z * r], n, col);
  }
  for (let i = 0; i < SEG; i++) {
    const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3;
    if (flip) I.push(a, c, b, b, c, d); else I.push(a, b, c, b, d, c);
  }
}
// Flat annulus (or disk if r0=0) at height y, normal up or down.
function ring(r0, r1, y, up, col) {
  const base = P.length / 3, n = up ? [0, 1, 0] : [0, -1, 0];
  for (let i = 0; i <= SEG; i++) {
    const a = i / SEG * TAU, x = Math.cos(a), z = Math.sin(a);
    push([x * r0, y, z * r0], n, col); push([x * r1, y, z * r1], n, col);
  }
  for (let i = 0; i < SEG; i++) {
    const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3;
    if (up) I.push(a, c, b, b, c, d); else I.push(a, b, c, b, d, c);
  }
}
// Handle: partial torus in the XY plane, centred cx,cy, major R, minor r.
function handle(cx, cy, R, r, a0, a1, col) {
  const U = 18, V = 12, base = P.length / 3;
  for (let i = 0; i <= U; i++) {
    const t = a0 + (a1 - a0) * i / U, ct = Math.cos(t), st = Math.sin(t);
    for (let j = 0; j <= V; j++) {
      const s = j / V * TAU, cs = Math.cos(s), ss = Math.sin(s);
      const nx = ct * cs, ny = st * cs, nz = ss;
      push([cx + (R + r * cs) * ct, cy + (R + r * cs) * st, r * ss], [nx, ny, nz], col);
    }
  }
  for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) {
    const a = base + i * (V + 1) + j, b = a + V + 1;
    I.push(a, b, a + 1, b, b + 1, a + 1);
  }
}

const H = 1.25, R = 1.0, T = 0.1, FLOOR = 0.14;
wall(R, 0, H, false, YELLOW);          // outer
wall(R - T, FLOOR, H, true, CREAM);    // inner
ring(R - T, R, H, true, CREAM);        // rim
ring(0, R, 0, false, DARK);            // bottom
ring(0, R - T, FLOOR, true, DARK);     // coffee surface (dark = coffee!)
handle(R + 0.02, H * 0.52, 0.42, 0.09, -Math.PI / 2, Math.PI / 2, YELLOW);

// --- GLB packing ---
const pos = new Float32Array(P), nor = new Float32Array(N), col = new Float32Array(C), idx = new Uint32Array(I);
const bufs = [pos, nor, col, idx];
const pad4 = (n) => (n + 3) & ~3;
let bin = Buffer.alloc(bufs.reduce((s, b) => s + pad4(b.byteLength), 0));
const views = []; let off = 0;
for (const b of bufs) { Buffer.from(b.buffer).copy(bin, off); views.push({ buffer: 0, byteOffset: off, byteLength: b.byteLength }); off += pad4(b.byteLength); }
const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], pos[i + k]); mx[k] = Math.max(mx[k], pos[i + k]); }
const json = {
  asset: { version: '2.0', generator: 'happy-newspaper/make-glb' },
  scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'mug' }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, indices: 3, material: 0 }] }],
  materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.45 } }],
  accessors: [
    { bufferView: 0, componentType: 5126, count: pos.length / 3, type: 'VEC3', min: mn, max: mx },
    { bufferView: 1, componentType: 5126, count: nor.length / 3, type: 'VEC3' },
    { bufferView: 2, componentType: 5126, count: col.length / 3, type: 'VEC3' },
    { bufferView: 3, componentType: 5125, count: idx.length, type: 'SCALAR' },
  ],
  bufferViews: views, buffers: [{ byteLength: bin.length }],
};
let jsonBuf = Buffer.from(JSON.stringify(json));
const jpad = pad4(jsonBuf.length) - jsonBuf.length; jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jpad, 0x20)]);
const header = Buffer.alloc(12); header.write('glTF', 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + bin.length, 8);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
writeFileSync(out, Buffer.concat([header, ch(jsonBuf.length, 0x4e4f534a), jsonBuf, ch(bin.length, 0x004e4942), bin]));
console.log(`wrote ${out}: ${P.length / 3} verts, ${I.length / 3} tris, ${(bin.length / 1024).toFixed(1)} KB`);
