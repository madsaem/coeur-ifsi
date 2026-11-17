import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { THEMES, INFO, CIRCUIT_STEPS, REPERES, QUIZ } from './data.js';

/* =========================================================================
   Outils
   ========================================================================= */
const $ = (s) => document.querySelector(s);
const mobileQ = matchMedia('(max-width: 819px)');
const isMobile = () => mobileQ.matches;
const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const UP = new THREE.Vector3(0, 1, 0);
let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/* =========================================================================
   État
   ========================================================================= */
const state = {
  themes: new Set(['coeur']), aller: true, retour: true,
  flow: true, transparent: true, coupe: false, conduction: false, labels: true,
  realistic: false, bloom: true, sound: false,
  bpm: 70, playing: true, slow: false,
  selected: null, hover: null,
};
if (isMobile()) { state.bloom = false; document.querySelector('[data-k="bloom"]').checked = false; }

/* =========================================================================
   Rendu
   ========================================================================= */
const canvas = $('#scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  $('#loader').innerHTML = '<p>WebGL n’est pas disponible sur cet appareil ou ce navigateur.</p>';
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070a12);
const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 300);
camera.position.set(0, 0.5, 9);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0.5, 0);
controls.minDistance = 1.5;
controls.maxDistance = 70;
controls.rotateSpeed = 0.8;

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x2a1418, 0.6));
const key = new THREE.DirectionalLight(0xfff1e6, 1.6); key.position.set(4, 6, 8); scene.add(key);
const rimL = new THREE.DirectionalLight(0x7fa4ff, 1.2); rimL.position.set(-6, 2, -7); scene.add(rimL);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.35, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'labels';
document.body.appendChild(labelRenderer.domElement);

/* =========================================================================
   Matériaux
   ========================================================================= */
// Matériau « organique » : PBR + liseré (rim) + motif rayé optionnel (pour le sang pauvre en O₂,
// lisible sans les couleurs) + surbrillance.
function mat({ color, opacity = 1, rim = 0xffffff, rimStr = 0.35, stripes = 0, rough = 0.5, clear = 0.3, side = THREE.FrontSide }) {
  const m = new THREE.MeshPhysicalMaterial({
    color, roughness: rough, metalness: 0, clearcoat: clear, clearcoatRoughness: 0.35,
    sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.3),
    transparent: opacity < 1, opacity, depthWrite: opacity >= 1, side,
  });
  m.userData.u = { uRim: { value: new THREE.Color(rim) }, uRimStr: { value: rimStr }, uStripes: { value: stripes }, uHi: { value: 0 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPosW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvPosW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPosW;\nuniform vec3 uRim; uniform float uRimStr; uniform float uStripes; uniform float uHi;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float stp = smoothstep(-0.3, 0.3, sin((vPosW.x * 0.6 + vPosW.y + vPosW.z * 0.45) * 26.0));
        diffuseColor.rgb *= mix(1.0, 0.55 + 0.45 * stp, uStripes);`)
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>
        float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
        gl_FragColor.rgb += uRim * fr * uRimStr + mix(uRim, vec3(1.0, 0.97, 0.9), 0.65) * uHi * (0.22 + 0.9 * fr);
        gl_FragColor.a = clamp(gl_FragColor.a + fr * uRimStr * 0.45 + uHi * 0.25, 0.0, 1.0);`);
  };
  return m;
}
function basic(rgb, opacity = 1, onTop = false) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb), transparent: opacity < 1 || onTop, opacity, depthTest: !onTop, depthWrite: !onTop });
  m.userData.base = m.color.clone();
  return m;
}

/* =========================================================================
   Géométries
   ========================================================================= */
function blobGeo(r, { detail = 5, noise = 0.02, freq = 2.2, deform } = {}) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position, u = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    u.fromBufferAttribute(p, i).normalize();
    const n = 1 + noise * (Math.sin(u.x * freq * 3.1 + 1.3) * Math.sin(u.y * freq * 2.7 + 0.4) * Math.sin(u.z * freq * 3.3 + 2.2) + 0.5 * Math.sin(u.x * freq * 6.3 + u.z * 4.1));
    v.set(u.x * r[0] * n, u.y * r[1] * n, u.z * r[2] * n);
    if (deform) deform(v, u);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
function tubeGeo(curve, rf, tubular = 64, radial = 14) {
  const frames = curve.computeFrenetFrames(tubular, false);
  const pos = [], nor = [], idx = [];
  const P = new THREE.Vector3(), N = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular; curve.getPointAt(t, P); const r = rf(t);
    const n = frames.normals[i], b = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2, s = Math.sin(a), c = -Math.cos(a);
      N.set(c * n.x + s * b.x, c * n.y + s * b.y, c * n.z + s * b.z).normalize();
      pos.push(P.x + r * N.x, P.y + r * N.y, P.z + r * N.z); nor.push(N.x, N.y, N.z);
    }
  }
  for (let i = 0; i < tubular; i++) for (let j = 0; j < radial; j++) {
    const a = (radial + 1) * i + j, b = (radial + 1) * (i + 1) + j;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}
const curveOf = (pts) => new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : V3(p))), false, 'centripetal');
const sphereGeo = new THREE.SphereGeometry(1, 16, 12);
const coneGeo = new THREE.ConeGeometry(1, 2, 12);
function nearestT(curve, p) {
  let best = 0, bd = Infinity; const q = new THREE.Vector3();
  for (let i = 0; i <= 300; i++) { curve.getPointAt(i / 300, q); const d = q.distanceToSquared(p); if (d < bd) { bd = d; best = i / 300; } }
  return best;
}

/* =========================================================================
   Registres
   ========================================================================= */
const themeObjs = {}; THEMES.forEach((t) => (themeObjs[t.id] = []));
const pickables = [];
const byInfo = {};
const labels = [];
const SEG = {};
const circuits = [];
const ghosts = { body: [], head: [] };

function registerPick(m, info, prio = 2) {
  m.userData.info = info; m.userData.prio = prio;
  pickables.push(m); (byInfo[info] ||= []).push(m);
}
function addMesh(geo, material, { th, info, pos, rot, prio = 2, parent = scene } = {}) {
  const m = new THREE.Mesh(geo, material);
  if (pos) m.position.copy(V3(pos));
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  parent.add(m);
  if (th) themeObjs[th].push(m);
  if (info) registerPick(m, info, prio);
  return m;
}
function isShown(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
function addLabel(text, pos, { info, cls = '', detail = 1, owner = null, needs = null, prio } = {}) {
  const el = document.createElement('div');
  el.className = 'lbl ' + cls;
  el.textContent = text;
  if (info) el.addEventListener('click', (e) => { e.stopPropagation(); onPick(info, true); });
  const o = new CSS2DObject(el);
  o.position.copy(pos.isVector3 ? pos : V3(pos));
  scene.add(o);
  if (prio === undefined) prio = /small/.test(cls) ? 1 : /pulse/.test(cls) ? 2 : /elec/.test(cls) ? 4 : /rich|poor/.test(cls) ? 3 : 5;
  const L = { o, el, info, detail, owner, needs, prio, w: 0 };
  labels.push(L);
  return L;
}

/* =========================================================================
   Vaisseaux (segments) et circuits du sang
   ========================================================================= */
const DIRC = { int: 0, cap: 0, aller: 1, retour: 2 };
const KIND = {
  rich: { color: 0xd23a44, rim: 0xff7f86, stripes: 0, opacity: 0.5 },
  poor: { color: 0x3f63d6, rim: 0x93b2ff, stripes: 1, opacity: 0.5 },
  air: { color: 0xd8d0bd, rim: 0xfff2d8, stripes: 0.8, opacity: 0.45 },
  uro: { color: 0xd8bb52, rim: 0xffe9a0, stripes: 0, opacity: 0.55 },
};
const arrowMat = { rich: basic([1.3, 0.45, 0.45], 0.6), poor: basic([0.55, 0.7, 1.4], 0.6) };

function pointOn(id, t) {
  const s = SEG[id];
  if (Array.isArray(t)) t = nearestT(s.curve, V3(t));
  return s.curve.getPointAt(t);
}
// def : id, pts, r, o2 (rich|poor|rp|pr), dir (aller|retour|int|cap), th (thèmes), info, label, lt, ld, kind
function seg(def) {
  const pts = def.pts.map((p) => (p.isVector3 ? p : p.from ? pointOn(p.from, p.t) : V3(p)));
  const curve = curveOf(pts);
  const len = curve.getLength();
  const s = { def, curve, len, group: null };
  SEG[def.id] = s;
  const r0 = Array.isArray(def.r) ? def.r[0] : def.r ?? 0.1;
  const r1 = Array.isArray(def.r) ? def.r[1] : def.r ?? 0.1;
  const isTube = def.tube ?? !(def.dir === 'int' || def.dir === 'cap');
  s.rad = (t) => (isTube ? lerp(r0, r1, t) : 0.12);
  if (!isTube) return s;
  const kind = def.kind || def.o2;
  const K = KIND[kind];
  const m = mat({ color: K.color, opacity: K.opacity, rim: K.rim, rimStr: 0.55, stripes: K.stripes, rough: 0.3, clear: 0.6 });
  const g = new THREE.Group(); scene.add(g);
  const mesh = new THREE.Mesh(tubeGeo(curve, s.rad, Math.max(10, Math.ceil(len * 20)), 14), m);
  g.add(mesh);
  for (const [t, r] of [[0, r0], [1, r1]]) {
    const c = new THREE.Mesh(sphereGeo, m); c.scale.setScalar(r); c.position.copy(curve.getPointAt(t)); g.add(c);
  }
  if (def.info) registerPick(mesh, def.info, 3);
  if ((kind === 'rich' || kind === 'poor') && def.arrows !== false) {
    const n = Math.max(1, Math.floor(len / 1.1));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, r = lerp(r0, r1, t);
      const a = new THREE.Mesh(coneGeo, arrowMat[kind]);
      a.scale.set(r * 0.62, r * 0.85, r * 0.62);
      a.position.copy(curve.getPointAt(t));
      a.quaternion.setFromUnitVectors(UP, curve.getTangentAt(t));
      g.add(a);
    }
  }
  s.group = g; s.mesh = mesh;
  if (def.label) s.label = addLabel(def.label, curve.getPointAt(def.lt ?? 0.5), { info: def.info, cls: `${kind === 'rich' || kind === 'poor' ? kind : ''} ${def.ld === 2 ? 'small' : ''}`, detail: def.ld || 1, owner: g });
  return s;
}
function segVisible(s) {
  const d = s.def;
  if (!d.th.some((t) => state.themes.has(t))) return false;
  if (d.dir === 'aller' && !state.aller) return false;
  if (d.dir === 'retour' && !state.retour) return false;
  return true;
}
const circuit = (th, seq, w = 1) => circuits.push({ th, seq, w });
function o2At(k, t) {
  if (k === 'rich') return 1;
  if (k === 'poor') return 0;
  if (k === 'rp') return 1 - smooth(0.1, 0.9, t);
  if (k === 'pr') return smooth(0.1, 0.9, t);
  return 1;
}
const CAPW = 2.6; // les capillaires ralentissent le sang
const DENS = 6.5;
function buildCircuit(c) {
  const raw = [];
  for (const item of c.seq) {
    let id = item, t0 = 0, t1 = 1;
    if (Array.isArray(item)) [id, t0, t1] = item;
    const s = SEG[id];
    if (!s) { console.warn('Segment manquant :', id); continue; }
    if (Array.isArray(t0)) t0 = nearestT(s.curve, V3(t0));
    if (Array.isArray(t1)) t1 = nearestT(s.curve, V3(t1));
    const n = Math.max(2, Math.ceil((s.len * Math.abs(t1 - t0)) / 0.05));
    for (let i = 0; i <= n; i++) {
      const t = t0 + ((t1 - t0) * i) / n;
      raw.push({ p: s.curve.getPointAt(t), o2: o2At(s.def.o2, i / n), dir: DIRC[s.def.dir], r: s.rad(t), w: s.def.dir === 'cap' ? CAPW : 1 });
    }
  }
  const cum = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + raw[i].p.distanceTo(raw[i - 1].p) * (raw[i].w + raw[i - 1].w) / 2);
  const L = cum[cum.length - 1], step = 0.03, N = Math.ceil(L / step) + 1;
  const pos = new Float32Array(N * 3), o2 = new Float32Array(N), dir = new Uint8Array(N), rad = new Float32Array(N);
  let j = 0;
  for (let k = 0; k < N; k++) {
    const s = Math.min(k * step, L);
    while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const f = clamp((s - cum[j]) / (cum[j + 1] - cum[j] || 1), 0, 1);
    const a = raw[j], b = raw[j + 1];
    pos[k * 3] = lerp(a.p.x, b.p.x, f); pos[k * 3 + 1] = lerp(a.p.y, b.p.y, f); pos[k * 3 + 2] = lerp(a.p.z, b.p.z, f);
    o2[k] = lerp(a.o2, b.o2, f); dir[k] = f < 0.5 ? a.dir : b.dir; rad[k] = lerp(a.r, b.r, f);
  }
  Object.assign(c, { L, N, step, pos, o2, dir, rad, count: Math.min(520, Math.round(L * DENS * c.w)) });
}

/* =========================================================================
   LE CŒUR
   ========================================================================= */
const heart = new THREE.Group(); scene.add(heart);
const COL = { rich: 0xc4323d, poor: 0x4558c0, real: 0x9c3b3c, septum: 0xe08f9b };
const bump = (D, amt) => { const d = D.clone().normalize(); return (v, u) => { const k = u.dot(d); if (k > 0.72) { const q = (k - 0.72) / 0.28; v.addScaledVector(d, amt * q * q); } }; };
const CH = {
  od: { c: [-0.95, 0.58, 0.12], r: [0.62, 0.6, 0.58], rot: [0, 0, 0.15], o2: 'poor', lp: [-1.75, 0.95, 0.3], deform: bump(V3([0.55, 0.45, 0.7]), 0.3) },
  vd: { c: [-0.22, -0.34, 0.36], r: [0.8, 0.98, 0.56], rot: [0.08, 0, 0.42], o2: 'poor', lp: [-0.1, -0.8, 1.0],
    deform: (v, u) => { if (u.y < 0) { const k = 1 - 0.38 * Math.pow(-u.y, 1.4); v.x *= k; v.z *= k; } if (u.z < 0) v.z *= 0.65; } },
  og: { c: [0.45, 0.66, -0.58], r: [0.62, 0.46, 0.5], rot: [0, 0, -0.1], o2: 'rich', lp: [1.25, 1.05, -0.6], deform: bump(V3([0.85, 0.15, 0.55]), 0.32) },
  vg: { c: [0.48, -0.38, -0.12], r: [0.74, 1.15, 0.74], rot: [0.05, 0, 0.5], o2: 'rich', lp: [1.45, -0.55, 0.2],
    deform: (v, u) => { if (u.y < 0) { const k = 1 - 0.42 * Math.pow(-u.y, 1.4); v.x *= k; v.z *= k; } } },
};
const NAMES = { od: 'OD', vd: 'VD', og: 'OG', vg: 'VG' };
const heartMats = [];
for (const [id, d] of Object.entries(CH)) {
  const m = mat({ color: COL[d.o2], opacity: 0.36, rim: d.o2 === 'rich' ? 0xff8a8f : 0x9ab4ff, rimStr: 0.45, stripes: d.o2 === 'poor' ? 0.6 : 0, rough: 0.42, clear: 0.5 });
  m.userData.o2 = d.o2; heartMats.push(m);
  d.mesh = addMesh(blobGeo(d.r, { deform: d.deform }), m, { info: id, pos: d.c, rot: d.rot, parent: heart });
  d.label = addLabel(NAMES[id], d.lp, { info: id, cls: d.o2, owner: d.mesh, prio: 4.5 });
}
// Infundibulum (sortie du VD vers le tronc pulmonaire)
const conus = addMesh(tubeGeo(curveOf([[-0.2, -0.15, 0.5], [0.0, 0.25, 0.66], [0.08, 0.56, 0.62]]), (t) => lerp(0.36, 0.19, t), 30, 20), CH.vd.mesh.material, { info: 'vd', parent: heart });
// Septums
const septMats = [];
for (const [id, c, r, rot] of [['septum_iv', [0.1, -0.42, 0.24], [0.07, 0.86, 0.5], [0.12, -0.2, 0.47]], ['septum_ia', [-0.3, 0.66, -0.25], [0.05, 0.42, 0.42], [0, 0.5, 0.1]]]) {
  const m = mat({ color: COL.septum, opacity: 0.5, rim: 0xffc0c8, rimStr: 0.4, rough: 0.5 });
  septMats.push(m);
  const s = addMesh(blobGeo(r, { detail: 4 }), m, { info: id, pos: c, rot, parent: heart });
  addLabel(id === 'septum_iv' ? 'Septum IV' : 'Septum IA', id === 'septum_iv' ? [0.35, -1.25, 0.75] : [-0.35, 1.25, -0.3], { info: id, cls: 'small', detail: 2, owner: s, needs: () => state.transparent });
}

// Valves : anneau + valvules qui pivotent sur leur bord
const valves = {};
function makeValve(id, pos, normal, R, n, lbl, lp) {
  const g = new THREE.Group();
  g.position.copy(V3(pos));
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), V3(normal).normalize());
  heart.add(g);
  const ringMat = mat({ color: 0xe0cfa8, rim: 0xfff0d0, rimStr: 0.3, rough: 0.5 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, R * 0.12, 10, 40), ringMat);
  g.add(ring); registerPick(ring, id, 3);
  const leafMat = mat({ color: 0xf4ead6, opacity: 0.92, rim: 0xffffff, rimStr: 0.35, rough: 0.6, side: THREE.DoubleSide });
  const leaves = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + 0.04, a1 = ((i + 1) / n) * Math.PI * 2 - 0.04, am = (a0 + a1) / 2;
    const rim = new THREE.Vector3(Math.cos(am) * R, Math.sin(am) * R, 0);
    const geo = new THREE.CircleGeometry(R * 0.97, 18, a0, a1 - a0);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), d = Math.hypot(x, y) / R; p.setZ(k, -0.18 * R * Math.sin(Math.PI * d)); }
    geo.translate(-rim.x, -rim.y, 0); geo.computeVertexNormals();
    const pivot = new THREE.Group(); pivot.position.copy(rim); g.add(pivot);
    const leaf = new THREE.Mesh(geo, leafMat); pivot.add(leaf); registerPick(leaf, id, 3);
    leaves.push({ pivot, axis: new THREE.Vector3(-Math.sin(am), Math.cos(am), 0) });
  }
  valves[id] = { g, leaves, open: 0 };
  addLabel(lbl, lp, { info: id, cls: 'small', detail: 2, owner: g, needs: () => state.transparent || state.coupe });
}
makeValve('tricuspide', [-0.62, 0.12, 0.3], [0.6, -0.85, 0.25], 0.22, 3, 'Tricuspide', [-1.15, -0.25, 0.75]);
makeValve('mitrale', [0.42, 0.15, -0.27], [0.05, -0.9, 0.35], 0.21, 2, 'Mitrale', [1.05, 0.2, -0.05]);
makeValve('pulmonaire', [0.08, 0.58, 0.62], [0.35, 0.85, -0.1], 0.17, 3, 'Valve pulmonaire', [0.55, 0.62, 1.0]);
makeValve('aortique', [-0.05, 0.38, 0.05], [-0.15, 0.95, 0.05], 0.18, 3, 'Valve aortique', [-0.55, 0.62, 0.45]);

/* ---------- gros vaisseaux et trajets dans le cœur ---------- */
const H = ['coeur'];
seg({ id: 'vcs', pts: [[-1.0, 2.72, -0.08], [-1.02, 2.0, -0.04], [-1.0, 1.15, 0.02]], r: 0.17, o2: 'poor', dir: 'retour', th: H, info: 'vcs', label: 'Veine cave sup.', lt: 0.35 });
seg({ id: 'vci', pts: [[-0.82, -1.6, -0.55], [-0.92, -0.8, -0.3], [-0.95, -0.1, -0.08]], r: 0.19, o2: 'poor', dir: 'retour', th: H, info: 'vci', label: 'Veine cave inf.', lt: 0.0 });
seg({ id: 'od_a', pts: [[-1.0, 1.15, 0.02], [-0.97, 0.62, 0.18], [-0.62, 0.12, 0.3]], o2: 'poor', dir: 'int', th: H });
seg({ id: 'od_b', pts: [[-0.95, -0.1, -0.08], [-0.92, 0.3, 0.15], [-0.62, 0.12, 0.3]], o2: 'poor', dir: 'int', th: H });
seg({ id: 'vd_p', pts: [[-0.62, 0.12, 0.3], [-0.35, -0.45, 0.45], [-0.05, -0.55, 0.6], [0.05, 0.0, 0.68], [0.08, 0.58, 0.62]], o2: 'poor', dir: 'int', th: H });
seg({ id: 'tp', pts: [[0.08, 0.58, 0.62], [0.3, 1.1, 0.52], [0.42, 1.48, 0.18]], r: 0.2, o2: 'poor', dir: 'aller', th: H, info: 'art_pulm', label: 'Tronc pulmonaire', lt: 0.55 });
seg({ id: 'ap_d', pts: [[0.42, 1.48, 0.18], [0.05, 1.56, -0.28], [-0.7, 1.5, -0.45], [-1.35, 1.45, -0.5]], r: 0.13, o2: 'poor', dir: 'aller', th: H, info: 'art_pulm' });
seg({ id: 'ap_g', pts: [[0.42, 1.48, 0.18], [0.85, 1.6, -0.1], [1.4, 1.55, -0.35]], r: 0.13, o2: 'poor', dir: 'aller', th: H, info: 'art_pulm', label: 'Artère pulm.', lt: 0.8, ld: 2 });
const VP = [['vp_ds', [-1.45, 0.98, -0.8], [-0.6, 0.9, -0.78], [0.15, 0.75, -0.65]], ['vp_di', [-1.45, 0.45, -0.8], [-0.6, 0.5, -0.78], [0.15, 0.6, -0.65]],
  ['vp_gs', [1.55, 0.98, -0.75], [1.1, 0.85, -0.7], [0.75, 0.72, -0.62]], ['vp_gi', [1.55, 0.45, -0.75], [1.1, 0.52, -0.7], [0.75, 0.6, -0.62]]];
for (const [id, ...pts] of VP) seg({ id, pts, r: 0.085, o2: 'rich', dir: 'retour', th: H, info: 'veines_pulm', label: id === 'vp_gi' ? 'Veines pulm.' : null, lt: 0.2, ld: 2 });
seg({ id: 'og_p', pts: [[0.45, 0.66, -0.6], [0.44, 0.4, -0.42], [0.42, 0.15, -0.27]], o2: 'rich', dir: 'int', th: H });
seg({ id: 'vg_p', pts: [[0.42, 0.15, -0.27], [0.6, -0.55, -0.12], [0.85, -1.0, 0.05], [0.45, -0.75, 0.15], [0.15, -0.3, 0.12], [-0.05, 0.38, 0.05]], o2: 'rich', dir: 'int', th: H });
seg({ id: 'ao_asc', pts: [[-0.05, 0.38, 0.05], [-0.22, 1.15, 0.12], [-0.18, 1.85, 0.02]], r: 0.24, o2: 'rich', dir: 'aller', th: H, info: 'aorte', label: 'Aorte', lt: 0.7 });
seg({ id: 'ao_crosse', pts: [[-0.18, 1.85, 0.02], [-0.05, 2.25, -0.2], [0.3, 2.42, -0.45], [0.65, 2.2, -0.8], [0.78, 1.6, -1.0]], r: 0.23, o2: 'rich', dir: 'aller', th: H, info: 'aorte', label: 'Crosse de l’aorte', lt: 0.45, ld: 2 });
seg({ id: 'ao_desc', pts: [[0.78, 1.6, -1.0], [0.65, 0.2, -1.1], [0.4, -1.6, -1.05]], r: [0.21, 0.19], o2: 'rich', dir: 'aller', th: H, info: 'aorte' });

circuit('coeur', ['vcs', 'od_a', 'vd_p', 'tp', 'ap_d']);
circuit('coeur', ['vci', 'od_b', 'vd_p', 'tp', 'ap_g']);
for (const v of ['vp_ds', 'vp_di', 'vp_gs', 'vp_gi']) circuit('coeur', [v, 'og_p', 'vg_p', 'ao_asc', 'ao_crosse', 'ao_desc'], 0.6);

/* ---------- conduction électrique ---------- */
const cond = new THREE.Group(); heart.add(cond); cond.visible = false;
const condPaths = {};
function condTube(id, pts, info, r = 0.022) {
  const c = curveOf(pts); condPaths[id] = c;
  const m = addMesh(tubeGeo(c, () => r, 40, 8), basic([1.6, 1.25, 0.35], 0.85, true), { info, prio: 4, parent: cond });
  m.renderOrder = 20;
  return c;
}
const SA = [-1.02, 0.98, 0.3], AV = [-0.4, 0.05, 0.08], HISB = [-0.2, -0.16, 0.18];
condTube('internodal', [SA, [-0.8, 0.55, 0.28], [-0.55, 0.25, 0.2], AV], 'noeud_sinusal');
condTube('bachmann', [SA, [-0.4, 1.0, -0.15], [0.35, 0.88, -0.45]], 'noeud_sinusal');
condTube('his', [AV, [-0.3, -0.05, 0.14], HISB], 'his', 0.03);
condTube('bd', [HISB, [-0.1, -0.7, 0.42], [0.25, -1.1, 0.48]], 'his', 0.026);
condTube('bg', [HISB, [0.2, -0.55, 0.05], [0.65, -1.05, 0.02]], 'his', 0.026);
const purk = [];
for (let i = 0; i < 9; i++) {
  const left = i % 2 === 0, base = left ? [0.65, -1.05, 0.02] : [0.25, -1.1, 0.48];
  const a = (i / 9) * Math.PI * 2;
  const end = [base[0] + Math.cos(a) * 0.55 + (left ? 0.2 : -0.35), base[1] + 0.55 + rnd() * 0.5, base[2] + Math.sin(a) * 0.45];
  const mid = [(base[0] + end[0]) / 2 + 0.08, (base[1] + end[1]) / 2 - 0.15, (base[2] + end[2]) / 2];
  purk.push(condTube('pk' + i, [base, mid, end], 'purkinje', 0.012));
}
const nodeMat = () => basic([2.4, 1.9, 0.6], 1, true);
const saNode = addMesh(sphereGeo, nodeMat(), { info: 'noeud_sinusal', pos: SA, prio: 5, parent: cond }); saNode.scale.setScalar(0.075); saNode.renderOrder = 21;
const avNode = addMesh(sphereGeo, nodeMat(), { info: 'noeud_av', pos: AV, prio: 5, parent: cond }); avNode.scale.setScalar(0.065); avNode.renderOrder = 21;
addLabel('Nœud sinusal', [-1.75, 1.35, 0.4], { info: 'noeud_sinusal', cls: 'elec', owner: cond });
addLabel('Nœud AV', [-0.95, -0.25, 0.55], { info: 'noeud_av', cls: 'elec', owner: cond });
addLabel('Faisceau de His', [0.5, -0.15, 0.75], { info: 'his', cls: 'elec', owner: cond });
addLabel('Purkinje', [1.35, -1.25, 0.45], { info: 'purkinje', cls: 'elec', owner: cond });
const pulseMat = basic([4, 3.3, 1.2], 1, true);
const pulses = [];
function pulse(curve, t0, t1, size = 0.06) {
  const m = new THREE.Mesh(sphereGeo, pulseMat); m.scale.setScalar(size); m.renderOrder = 22; cond.add(m);
  pulses.push({ curve, t0, t1, m });
}
pulse(condPaths.internodal, 0.0, 0.07); pulse(condPaths.bachmann, 0.0, 0.06);
pulse(condPaths.his, 0.115, 0.125); pulse(condPaths.bd, 0.125, 0.14); pulse(condPaths.bg, 0.125, 0.14);
purk.forEach((c) => pulse(c, 0.138, 0.152, 0.04));

/* ---------- coronaires (posées à la surface du cœur) ---------- */
heart.updateMatrixWorld(true);
function snap(pts) {
  const c = new THREE.Vector3(0.1, -0.1, -0.05), rc = new THREE.Raycaster();
  const targets = [CH.od.mesh, CH.vd.mesh, CH.og.mesh, CH.vg.mesh, conus];
  return pts.map((p) => {
    const P = V3(p), dir = P.clone().sub(c).normalize();
    rc.set(c.clone().addScaledVector(dir, 6), dir.clone().negate());
    const hit = rc.intersectObjects(targets, false)[0];
    return hit ? hit.point.clone().addScaledVector(dir, 0.05) : P;
  });
}
const C = ['coronaires'];
const coroRootD = [-0.22, 0.52, 0.22], coroRootG = [0.12, 0.5, -0.08];
seg({ id: 'coro_d', pts: [coroRootD, ...snap([[-0.55, 0.32, 0.6], [-0.95, 0.02, 0.55], [-1.22, -0.35, 0.15], [-1.05, -0.72, -0.45], [-0.5, -0.98, -0.8], [0.1, -1.18, -0.75], [0.6, -1.35, -0.45]])], r: 0.055, o2: 'rich', dir: 'aller', th: C, info: 'coro_d', label: 'Coronaire droite', lt: 0.22 });
const bif = snap([[0.62, 0.42, 0.36]])[0];
seg({ id: 'coro_tc', pts: [coroRootG, [0.4, 0.55, 0.12], bif], r: 0.048, o2: 'rich', dir: 'aller', th: C, info: 'coro_g', arrows: false });
seg({ id: 'iva', pts: [bif, ...snap([[0.5, 0.05, 0.75], [0.62, -0.55, 0.8], [0.95, -1.1, 0.55], [1.15, -1.42, 0.2]])], r: [0.055, 0.038], o2: 'rich', dir: 'aller', th: C, info: 'iva', label: 'IVA', lt: 0.45 });
seg({ id: 'circ', pts: [bif, ...snap([[1.05, 0.18, 0.1], [1.22, -0.1, -0.35], [0.9, -0.28, -0.82]])], r: [0.052, 0.038], o2: 'rich', dir: 'aller', th: C, info: 'coro_g', label: 'Circonflexe', lt: 0.4, ld: 2 });
seg({ id: 'cap_myo', pts: snap([[1.15, -1.42, 0.2], [1.12, -1.2, 0.5], [0.95, -1.0, 0.68]]), o2: 'rp', dir: 'cap', th: C });
seg({ id: 'gvc', pts: snap([[0.95, -1.0, 0.68], [0.72, -0.48, 0.86], [0.62, 0.1, 0.8], [0.9, 0.38, 0.32], [1.18, 0.05, -0.25], [0.8, -0.3, -0.88], [0.05, -0.38, -0.98], [-0.6, -0.22, -0.72], [-0.88, -0.05, -0.38]]), r: 0.055, o2: 'poor', dir: 'retour', th: C, info: 'sinus_coro', label: 'Sinus coronaire', lt: 0.82, ld: 2 });
seg({ id: 'cap_d', pts: snap([[0.6, -1.35, -0.45], [0.35, -0.85, -0.9], [0.05, -0.4, -0.98]]), o2: 'rp', dir: 'cap', th: C });
seg({ id: 'cap_circ', pts: snap([[0.9, -0.28, -0.82], [0.7, -0.5, -0.88], [0.6, -0.3, -0.9]]), o2: 'rp', dir: 'cap', th: C });
circuit('coronaires', [['ao_asc', 0, 0.1], 'coro_tc', 'iva', 'cap_myo', 'gvc', 'od_b'], 1.6);
circuit('coronaires', [['ao_asc', 0, 0.1], 'coro_d', 'cap_d', ['gvc', [0.05, -0.38, -0.98], 1], 'od_b'], 1.6);
circuit('coronaires', [['ao_asc', 0, 0.1], 'coro_tc', 'circ', 'cap_circ', ['gvc', [0.8, -0.3, -0.88], 1], 'od_b'], 1.4);

/* =========================================================================
   ORGANES
   ========================================================================= */
const ghostMat = () => mat({ color: 0x9fb0d0, opacity: 0.03, rim: 0xa9c0ff, rimStr: 0.2 });
// Silhouette discrète pour se repérer
{
  const torso = addMesh(blobGeo([2.55, 4.95, 1.5], { detail: 4, noise: 0, deform: (v, u) => { v.x *= 1 - 0.12 * Math.exp(-(((u.y + 0.15) / 0.3) ** 2)); if (u.y > 0.75) v.y *= 0.96; } }), ghostMat(), { pos: [0, -1.5, -0.3] });
  ghosts.body.push(torso);
  const neck = addMesh(tubeGeo(curveOf([[0, 3.2, -0.3], [0, 4.6, -0.3], [0, 5.7, -0.3]]), () => 0.62, 20, 20), ghostMat());
  const head = addMesh(blobGeo([1.6, 2.0, 1.85], { detail: 4, noise: 0 }), ghostMat(), { pos: [0, 7.3, -0.25] });
  ghosts.head.push(neck, head);
}

/* ---------- poumons ---------- */
{
  const P = 'poumons';
  const lungMat = () => mat({ color: 0xf0a2b2, opacity: 0.26, rim: 0xffc6d2, rimStr: 0.55, rough: 0.6 });
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'd' : 'g';
    addMesh(blobGeo([1.3, 2.15, 1.35], {
      noise: 0.03, deform: (v, u) => {
        const med = -u.x * s;
        if (med > 0) v.x *= 1 - 0.5 * med;
        const top = Math.max(0, u.y); v.x *= 1 - 0.3 * top * top; v.z *= 1 - 0.3 * top * top;
        if (u.y < -0.2) v.y += 0.6 * Math.max(0, 1 - Math.hypot(u.x, u.z) * 1.4) * (-u.y - 0.2);
        if (s > 0 && med > 0 && u.z > 0) v.x += 0.5 * med * u.z * smooth(0.3, -0.5, u.y);
      },
    }), lungMat(), { th: P, info: 'poumons', pos: [2.5 * s, 0.7, -0.4], prio: 1 });
    addLabel(s < 0 ? 'Poumon droit · 3 lobes' : 'Poumon gauche · 2 lobes', [3.0 * s, 2.75, -0.2], { info: 'poumons', owner: themeObjs[P][themeObjs[P].length - 1] });

    const hA = [1.8 * s, 1.35, -0.5], hVs = [1.78 * s, 0.9, -0.75], hVi = [1.78 * s, 0.42, -0.75];
    seg({ id: `apx_${k}`, pts: [pointOn(`ap_${k}`, 1), hA], r: 0.12, o2: 'poor', dir: 'aller', th: [P], info: 'art_pulm', arrows: false });
    seg({ id: `vpx_${k}s`, pts: [hVs, pointOn(`vp_${k}s`, 0)], r: 0.085, o2: 'rich', dir: 'retour', th: [P], info: 'veines_pulm', arrows: false });
    seg({ id: `vpx_${k}i`, pts: [hVi, pointOn(`vp_${k}i`, 0)], r: 0.085, o2: 'rich', dir: 'retour', th: [P], info: 'veines_pulm', arrows: false });
    const targets = [[2.3 * s, 2.35, -0.45], [3.35 * s, 0.85, -0.25], [2.65 * s, -0.75, -0.2]];
    targets.forEach((t, i) => {
      const mid = [lerp(hA[0], t[0], 0.5) + 0.15 * s, lerp(hA[1], t[1], 0.5) + 0.1, lerp(hA[2], t[2], 0.5) + 0.25];
      const tv = [t[0] - 0.05 * s, t[1] - 0.3, t[2] - 0.3];
      const hV = i === 0 ? hVs : hVi;
      const vmid = [lerp(tv[0], hV[0], 0.5) + 0.12 * s, lerp(tv[1], hV[1], 0.5) - 0.1, lerp(tv[2], hV[2], 0.5) - 0.25];
      seg({ id: `apb_${k}${i}`, pts: [hA, mid, t], r: [0.08, 0.035], o2: 'poor', dir: 'aller', th: [P], info: 'art_pulm' });
      seg({ id: `cpl_${k}${i}`, pts: [t, [t[0] + 0.3 * s, t[1] + 0.15, t[2] + 0.2], [t[0] + 0.28 * s, t[1] - 0.25, t[2] + 0.05], tv], o2: 'pr', dir: 'cap', th: [P] });
      seg({ id: `vpb_${k}${i}`, pts: [tv, vmid, hV], r: [0.035, 0.08], o2: 'rich', dir: 'retour', th: [P], info: 'veines_pulm' });
      // petites ramifications décoratives
      for (let j = 0; j < 2; j++) {
        const a = pointOn(`apb_${k}${i}`, 0.55 + j * 0.2), e = a.clone().add(new THREE.Vector3((0.3 + rnd() * 0.4) * s, (rnd() - 0.5) * 0.9, (rnd() - 0.3) * 0.6));
        seg({ id: `apd_${k}${i}${j}`, pts: [a, a.clone().lerp(e, 0.5).add(new THREE.Vector3(0, 0.08, 0)), e], r: [0.025, 0.012], o2: 'poor', dir: 'aller', th: [P], arrows: false });
        const b = pointOn(`vpb_${k}${i}`, 0.25 + j * 0.25), f = b.clone().add(new THREE.Vector3((0.25 + rnd() * 0.4) * s, (rnd() - 0.5) * 0.9, (rnd() - 0.6) * 0.5));
        seg({ id: `vpd_${k}${i}${j}`, pts: [f, f.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -0.08, 0)), b], r: [0.012, 0.025], o2: 'rich', dir: 'retour', th: [P], arrows: false });
      }
      circuit(P, ['vd_p', 'tp', `ap_${k}`, `apx_${k}`, `apb_${k}${i}`, `cpl_${k}${i}`, `vpb_${k}${i}`, i === 0 ? `vpx_${k}s` : `vpx_${k}i`, i === 0 ? `vp_${k}s` : `vp_${k}i`, 'og_p', 'vg_p', 'ao_asc'], 0.8);
    });
  }
  seg({ id: 'trachee', pts: [[0, 4.4, -0.55], [0, 3.4, -0.6], [0, 2.55, -0.65]], r: 0.13, kind: 'air', o2: 'rich', dir: 'int', tube: true, th: [P], info: 'trachee', label: 'Trachée', lt: 0.3 });
  seg({ id: 'bronche_d', pts: [[0, 2.55, -0.65], [-0.8, 2.0, -0.62], [-1.7, 1.55, -0.6]], r: [0.11, 0.08], kind: 'air', o2: 'rich', dir: 'int', tube: true, th: [P], info: 'trachee' });
  seg({ id: 'bronche_g', pts: [[0, 2.55, -0.65], [0.85, 2.05, -0.62], [1.7, 1.55, -0.6]], r: [0.1, 0.075], kind: 'air', o2: 'rich', dir: 'int', tube: true, th: [P], info: 'trachee' });
}

/* ---------- cerveau ---------- */
{
  const T = ['cerveau'];
  const brain = addMesh(blobGeo([1.45, 1.15, 1.75], {
    noise: 0, deform: (v, u) => {
      const g = Math.sin(u.x * 13 + Math.sin(u.y * 9) * 1.5) * Math.sin(u.y * 12 + u.z * 7) * Math.sin(u.z * 11 + u.x * 5);
      v.multiplyScalar(1 + 0.035 * g);
      v.y -= 0.22 * Math.exp(-((u.x / 0.07) ** 2)) * smooth(-0.2, 0.5, u.y);
      if (u.y < -0.2) v.y *= 0.82;
    },
  }), mat({ color: 0xeab2bb, opacity: 0.5, rim: 0xffd3da, rimStr: 0.5, rough: 0.55 }), { th: 'cerveau', info: 'cerveau', pos: [0, 7.6, -0.3], prio: 1 });
  addMesh(blobGeo([0.72, 0.42, 0.55], { detail: 4, noise: 0.04, freq: 5 }), mat({ color: 0xd99aa6, opacity: 0.55, rim: 0xffd3da, rimStr: 0.5 }), { th: 'cerveau', info: 'cerveau', pos: [0, 6.75, -1.3], prio: 1 });
  addLabel('Cerveau', [1.75, 8.6, -0.2], { info: 'cerveau', owner: brain });
  seg({ id: 'tabc', pts: [{ from: 'ao_crosse', t: 0.18 }, [-0.4, 2.6, -0.15], [-0.6, 3.0, -0.2]], r: 0.12, o2: 'rich', dir: 'aller', th: ['cerveau', 'bras'], info: 'tabc', label: 'Tronc brachio-céphalique', lt: 0.5, ld: 2, arrows: false });
  seg({ id: 'car_d', pts: [[-0.6, 3.0, -0.2], [-0.55, 4.5, -0.05], [-0.5, 5.8, -0.05], [-0.42, 6.6, -0.15]], r: 0.08, o2: 'rich', dir: 'aller', th: T, info: 'carotides', label: 'Carotide commune', lt: 0.45 });
  seg({ id: 'car_g', pts: [{ from: 'ao_crosse', t: 0.38 }, [0.4, 3.1, -0.3], [0.52, 4.5, -0.05], [0.5, 5.8, -0.05], [0.42, 6.6, -0.15]], r: 0.08, o2: 'rich', dir: 'aller', th: T, info: 'carotides' });
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'd' : 'g';
    seg({ id: `cap_br_${k}`, pts: [[0.42 * s, 6.6, -0.15], [0.6 * s, 7.3, 0.4], [0.95 * s, 8.15, -0.2], [0.75 * s, 7.7, -1.25], [0.82 * s, 6.85, -0.6]], o2: 'rp', dir: 'cap', th: T });
  }
  seg({ id: 'jug_d', pts: [[-0.82, 6.85, -0.6], [-0.88, 5.5, -0.25], [-0.97, 4.0, -0.2], [-1.0, 2.72, -0.08]], r: 0.1, o2: 'poor', dir: 'retour', th: T, info: 'jugulaires', label: 'Jugulaire interne', lt: 0.35 });
  seg({ id: 'jug_g', pts: [[0.82, 6.85, -0.6], [0.88, 5.5, -0.25], [0.9, 4.0, -0.2], [0.85, 3.0, -0.2]], r: 0.1, o2: 'poor', dir: 'retour', th: T, info: 'jugulaires' });
  seg({ id: 'tvbc_g', pts: [[0.85, 3.0, -0.2], [0.2, 2.86, -0.1], [-1.0, 2.72, -0.08]], r: 0.11, o2: 'poor', dir: 'retour', th: ['cerveau', 'bras'], info: 'vcs', label: 'Tronc veineux brachio-céph.', lt: 0.35, ld: 2 });
  circuit('cerveau', ['ao_asc', ['ao_crosse', 0, 0.18], 'tabc', 'car_d', 'cap_br_d', 'jug_d', 'vcs', 'od_a']);
  circuit('cerveau', ['ao_asc', ['ao_crosse', 0, 0.38], 'car_g', 'cap_br_g', 'jug_g', 'tvbc_g', 'vcs', 'od_a']);
}

/* ---------- membres supérieurs ---------- */
{
  const T = ['bras'];
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'd' : 'g';
    const arm = addMesh(tubeGeo(curveOf([[2.55 * s, 3.45, -0.3], [3.35 * s, 2.0, -0.15], [3.95 * s, 0.3, 0.05], [4.25 * s, -1.2, 0.2], [4.45 * s, -2.55, 0.3]]), (t) => lerp(0.5, 0.3, t), 60, 24),
      mat({ color: 0x9fb0d0, opacity: 0.05, rim: 0xa9c0ff, rimStr: 0.3 }), { th: 'bras', info: 'membres_sup', prio: 0 });
    addMesh(blobGeo([0.32, 0.48, 0.13], { detail: 3, noise: 0 }), mat({ color: 0x9fb0d0, opacity: 0.05, rim: 0xa9c0ff, rimStr: 0.3 }), { th: 'bras', info: 'membres_sup', pos: [4.62 * s, -3.15, 0.25], rot: [0, 0, 0.1 * s], prio: 0 });
    const subStart = s < 0 ? [-0.6, 3.0, -0.2] : { from: 'ao_crosse', t: 0.55 };
    seg({ id: `sub_${k}`, pts: [subStart, [1.3 * s, 3.15, -0.45], [2.4 * s, 3.35, -0.3], [3.0 * s, 3.1, -0.25]], r: 0.09, o2: 'rich', dir: 'aller', th: T, info: 'art_bras', label: s < 0 ? 'A. subclavière' : null, lt: 0.6 });
    seg({ id: `hum_${k}`, pts: [[3.0 * s, 3.1, -0.25], [3.5 * s, 1.7, -0.1], [3.95 * s, 0.35, 0.05]], r: 0.075, o2: 'rich', dir: 'aller', th: T, info: 'art_bras', label: s < 0 ? 'A. humérale' : null, lt: 0.45 });
    seg({ id: `rad_${k}`, pts: [[3.95 * s, 0.35, 0.05], [4.2 * s, -1.2, 0.2], [4.45 * s, -2.55, 0.35]], r: [0.065, 0.05], o2: 'rich', dir: 'aller', th: T, info: 'art_bras', label: s < 0 ? 'A. radiale' : null, lt: 0.5 });
    seg({ id: `cap_m_${k}`, pts: [[4.45 * s, -2.55, 0.35], [4.6 * s, -3.1, 0.32], [4.72 * s, -3.45, 0.18], [4.66 * s, -3.0, 0.02], [4.6 * s, -2.6, 0.05]], o2: 'rp', dir: 'cap', th: T });
    const vEnd = s < 0 ? [[-1.4, 2.95, -0.3], [-1.0, 2.72, -0.08]] : [[1.4, 3.05, -0.35], [0.85, 3.0, -0.2]];
    seg({ id: `vb_${k}`, pts: [[4.6 * s, -2.6, 0.05], [4.22 * s, -1.0, 0.28], [3.8 * s, 0.3, 0.32], [3.35 * s, 1.7, 0.05], [2.85 * s, 3.0, -0.42], [2.0 * s, 3.18, -0.45], ...vEnd], r: [0.055, 0.1], o2: 'poor', dir: 'retour', th: T, info: 'veines_bras', label: s < 0 ? 'V. du pli du coude' : null, lt: 0.26 });
    circuit('bras', s < 0 ? ['ao_asc', ['ao_crosse', 0, 0.18], 'tabc', 'sub_d', 'hum_d', 'rad_d', 'cap_m_d', 'vb_d', 'vcs', 'od_a'] : ['ao_asc', ['ao_crosse', 0, 0.55], 'sub_g', 'hum_g', 'rad_g', 'cap_m_g', 'vb_g', 'tvbc_g', 'vcs', 'od_a']);
    if (s > 0) addLabel('Membre supérieur', [4.9, 1.2, 0], { info: 'membres_sup', owner: arm });
  }
}

/* ---------- foie et tube digestif ---------- */
const ABDO = ['digestif', 'reins', 'jambes'];
seg({ id: 'ao_abdo', pts: [[0.4, -1.6, -1.05], [0.25, -3.0, -0.95], [0.1, -4.6, -0.75], [0.05, -5.6, -0.6]], r: [0.19, 0.16], o2: 'rich', dir: 'aller', th: ABDO, info: 'aorte', label: 'Aorte abdominale', lt: 0.62 });
seg({ id: 'vci_abdo', pts: [[-0.5, -5.7, -0.65], [-0.55, -4.5, -0.8], [-0.6, -3.2, -0.9], [-0.82, -1.6, -0.55]], r: [0.17, 0.2], o2: 'poor', dir: 'retour', th: ABDO, info: 'vci', label: 'Veine cave inf.', lt: 0.38 });
{
  const T = ['digestif'];
  const liver = addMesh(blobGeo([1.85, 0.85, 1.15], { noise: 0.025, deform: (v, u) => { const k = 1 - 0.6 * smooth(-0.4, 1, u.x); v.y *= k; v.z *= 0.6 + 0.4 * k; v.y *= u.y < 0 ? 0.6 : 1.05; } }),
    mat({ color: 0x8e3a33, opacity: 0.45, rim: 0xd9846f, rimStr: 0.5, rough: 0.45 }), { th: 'digestif', info: 'foie', pos: [-1.15, -2.3, 0.05], rot: [0, 0, -0.12], prio: 1 });
  addLabel('Foie', [-2.6, -1.75, 0.6], { info: 'foie', owner: liver });
  const stomach = addMesh(tubeGeo(curveOf([[0.9, -1.7, -0.05], [1.6, -1.9, 0.25], [1.9, -2.5, 0.35], [1.5, -3.1, 0.4], [0.8, -3.0, 0.45], [0.35, -2.6, 0.4]]), (t) => 0.18 + 0.36 * Math.sin(Math.PI * Math.min(1, t * 1.15)), 60, 24),
    mat({ color: 0xe3a08f, opacity: 0.4, rim: 0xffc8b8, rimStr: 0.5 }), { th: 'digestif', info: 'intestin', prio: 1 });
  addLabel('Estomac', [2.55, -2.2, 0.4], { info: 'intestin', owner: stomach });
  const sp = []; let row = 0;
  for (let y = -3.68; y >= -5.3; y -= 0.3, row++) {
    const d = row % 2 ? -1 : 1;
    for (let k = 0; k <= 4; k++) sp.push([d * (-1.0 + k * 0.5), y + 0.06 * Math.sin(k * 2 + row), 0.55 + 0.18 * Math.sin(k * 1.7 + row * 1.3)]);
  }
  const intest = addMesh(tubeGeo(curveOf(sp), () => 0.13, 400, 12), mat({ color: 0xe9a2a2, opacity: 0.38, rim: 0xffc8c8, rimStr: 0.45 }), { th: 'digestif', info: 'intestin', prio: 1 });
  addLabel('Intestin grêle', [1.75, -4.55, 0.8], { info: 'intestin', owner: intest });
  addMesh(tubeGeo(curveOf([[-1.55, -5.75, 0.35], [-1.68, -4.6, 0.4], [-1.65, -3.55, 0.4], [0, -3.3, 0.6], [1.65, -3.5, 0.4], [1.62, -4.6, 0.35], [1.55, -5.5, 0.35], [0.9, -6.05, 0.4], [0.1, -6.3, 0.0]]), () => 0.26, 200, 16),
    mat({ color: 0xd99c7c, opacity: 0.32, rim: 0xffc8a8, rimStr: 0.45 }), { th: 'digestif', info: 'intestin', prio: 1 });

  seg({ id: 'tc', pts: [{ from: 'ao_abdo', t: 0.1 }, [0.3, -1.88, -0.5], [0.25, -1.92, -0.2]], r: 0.075, o2: 'rich', dir: 'aller', th: T, info: 'art_digest', label: 'Tronc cœliaque', lt: 0.4, ld: 2, arrows: false });
  seg({ id: 'a_hep', pts: [[0.25, -1.92, -0.2], [-0.3, -2.1, 0.0], [-0.75, -2.35, 0.05]], r: 0.055, o2: 'rich', dir: 'aller', th: T, info: 'art_digest', label: 'A. hépatique', lt: 0.6, ld: 2 });
  seg({ id: 'a_gast', pts: [[0.25, -1.92, -0.2], [0.8, -2.0, 0.1], [1.3, -2.3, 0.35]], r: 0.055, o2: 'rich', dir: 'aller', th: T, info: 'art_digest' });
  seg({ id: 'ams', pts: [{ from: 'ao_abdo', t: 0.27 }, [0.32, -2.8, -0.3], [0.25, -3.6, 0.25], [0.1, -4.3, 0.5]], r: 0.075, o2: 'rich', dir: 'aller', th: T, info: 'art_digest', label: 'A. mésentérique sup.', lt: 0.55, ld: 2 });
  seg({ id: 'cap_int', pts: [[0.1, -4.3, 0.5], [-0.7, -4.0, 0.62], [-0.9, -4.7, 0.58], [0.0, -5.0, 0.62], [0.8, -4.6, 0.58], [0.6, -3.95, 0.62], [0.15, -3.7, 0.58]], o2: 'rp', dir: 'cap', th: T });
  seg({ id: 'cap_sto', pts: [[1.3, -2.3, 0.35], [1.8, -2.6, 0.45], [1.5, -3.0, 0.5], [0.9, -2.9, 0.52]], o2: 'rp', dir: 'cap', th: T });
  seg({ id: 'v_mes', pts: [[0.15, -3.7, 0.58], [0.05, -3.45, 0.45], [-0.05, -3.2, 0.35]], r: 0.075, o2: 'poor', dir: 'retour', th: T, info: 'veine_porte', arrows: false });
  seg({ id: 'v_spl', pts: [[0.9, -2.9, 0.52], [0.4, -2.98, 0.4], [-0.05, -3.2, 0.35]], r: 0.065, o2: 'poor', dir: 'retour', th: T, info: 'veine_porte', arrows: false });
  seg({ id: 'veine_porte', pts: [[-0.05, -3.2, 0.35], [-0.4, -2.85, 0.15], [-0.75, -2.52, 0.0]], r: 0.11, o2: 'poor', dir: 'retour', th: T, info: 'veine_porte', label: 'Veine porte', lt: 0.5 });
  seg({ id: 'cap_foie_a', pts: [[-0.75, -2.35, 0.05], [-1.6, -2.15, 0.35], [-2.15, -2.1, -0.2], [-1.6, -1.95, -0.45]], o2: 'rp', dir: 'cap', th: T });
  seg({ id: 'cap_foie_p', pts: [[-0.75, -2.52, 0.0], [-1.45, -2.55, 0.4], [-2.35, -2.4, 0.1], [-1.95, -2.05, -0.4], [-1.6, -1.95, -0.45]], o2: 'poor', dir: 'cap', th: T });
  seg({ id: 'v_hep', pts: [[-1.6, -1.95, -0.45], [-1.15, -1.72, -0.52], [-0.84, -1.62, -0.55]], r: 0.075, o2: 'poor', dir: 'retour', th: T, info: 'veines_hep', label: 'V. hépatiques', lt: 0.3, ld: 2 });
  seg({ id: 'v_hep2', pts: [[-1.25, -1.85, 0.0], [-1.0, -1.7, -0.3], [-0.84, -1.62, -0.55]], r: 0.06, o2: 'poor', dir: 'retour', th: T, info: 'veines_hep', arrows: false });
  const A = ['ao_asc', 'ao_crosse', 'ao_desc'];
  circuit('digestif', [...A, ['ao_abdo', 0, 0.1], 'tc', 'a_hep', 'cap_foie_a', 'v_hep', 'vci', 'od_b']);
  circuit('digestif', [...A, ['ao_abdo', 0, 0.27], 'ams', 'cap_int', 'v_mes', 'veine_porte', 'cap_foie_p', 'v_hep', 'vci', 'od_b'], 1.3);
  circuit('digestif', [...A, ['ao_abdo', 0, 0.1], 'tc', 'a_gast', 'cap_sto', 'v_spl', 'veine_porte', 'cap_foie_p', 'v_hep', 'vci', 'od_b'], 0.8);
}

/* ---------- reins ---------- */
{
  const T = ['reins'];
  const A = ['ao_asc', 'ao_crosse', 'ao_desc'];
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'd' : 'g', y = s < 0 ? -3.55 : -3.35;
    const kid = addMesh(blobGeo([0.42, 0.72, 0.32], { detail: 4, noise: 0.015, deform: (v, u) => { const med = -u.x * s; if (med > 0.5) v.x += s * 0.3 * ((med - 0.5) / 0.5) * Math.exp(-((u.y / 0.4) ** 2)); } }),
      mat({ color: 0x9a3a3c, opacity: 0.55, rim: 0xe08a8a, rimStr: 0.5, rough: 0.4 }), { th: 'reins', info: 'reins', pos: [1.3 * s, y, -1.2], rot: [0, 0, 0.2 * s], prio: 1 });
    addLabel(s < 0 ? 'Rein droit' : 'Rein gauche', [1.85 * s, y + 0.75, -1.0], { info: 'reins', owner: kid });
    const hil = [0.98 * s, y + 0.05, -1.1];
    seg({ id: `ar_${k}`, pts: [{ from: 'ao_abdo', t: s < 0 ? 0.4 : 0.37 }, [0.5 * s, y + 0.15, -1.0], hil], r: 0.065, o2: 'rich', dir: 'aller', th: T, info: 'art_renales', label: s < 0 ? 'A. rénale' : null, lt: 0.5, ld: 2 });
    seg({ id: `cap_r_${k}`, pts: [hil, [1.35 * s, y + 0.45, -1.2], [1.58 * s, y - 0.05, -1.25], [1.32 * s, y - 0.48, -1.2], [1.0 * s, y - 0.12, -1.0]], o2: 'rp', dir: 'cap', th: T });
    const vrPts = s < 0 ? [[-1.0, y - 0.12, -1.0], [-0.8, -3.55, -0.95], [-0.6, -3.42, -0.88]] : [[1.0, y - 0.12, -1.0], [0.5, -3.4, -0.55], [-0.1, -3.42, -0.6], [-0.6, -3.42, -0.88]];
    seg({ id: `vr_${k}`, pts: vrPts, r: 0.075, o2: 'poor', dir: 'retour', th: T, info: 'veines_renales', label: s > 0 ? 'V. rénale gauche' : null, lt: 0.3, ld: 2 });
    seg({ id: `ur_${k}`, pts: [[1.0 * s, y - 0.25, -1.05], [0.75 * s, -5.0, -0.6], [0.25 * s, -6.3, 0.4]], r: 0.035, kind: 'uro', o2: 'rich', dir: 'int', tube: true, th: T, info: 'ureteres' });
    circuit('reins', [...A, ['ao_abdo', 0, s < 0 ? 0.4 : 0.37], `ar_${k}`, `cap_r_${k}`, `vr_${k}`, ['vci_abdo', [-0.6, -3.42, -0.88], 1], 'vci', 'od_b'], 1.3);
  }
  const bl = addMesh(blobGeo([0.5, 0.42, 0.45], { detail: 4 }), mat({ color: 0xd8c060, opacity: 0.35, rim: 0xffeaa0, rimStr: 0.5 }), { th: 'reins', info: 'ureteres', pos: [0, -6.5, 0.55], prio: 1 });
  addLabel('Vessie', [0.9, -6.85, 0.7], { info: 'ureteres', cls: 'small', owner: bl, detail: 2 });
}

/* ---------- membres inférieurs ---------- */
{
  const T = ['jambes'];
  const A = ['ao_asc', 'ao_crosse', 'ao_desc', 'ao_abdo'];
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'd' : 'g';
    const leg = addMesh(tubeGeo(curveOf([[0.95 * s, -6.4, -0.2], [1.02 * s, -8.5, 0.0], [1.12 * s, -10.6, -0.1], [1.18 * s, -12.6, -0.2], [1.22 * s, -14.25, -0.05]]), (t) => lerp(0.72, 0.3, Math.pow(t, 0.8)), 80, 24),
      mat({ color: 0x9fb0d0, opacity: 0.05, rim: 0xa9c0ff, rimStr: 0.3 }), { th: 'jambes', info: 'membres_inf', prio: 0 });
    addMesh(blobGeo([0.32, 0.2, 0.62], { detail: 3, noise: 0 }), mat({ color: 0x9fb0d0, opacity: 0.05, rim: 0xa9c0ff, rimStr: 0.3 }), { th: 'jambes', info: 'membres_inf', pos: [1.22 * s, -14.62, 0.42], prio: 0 });
    if (s > 0) addLabel('Membre inférieur', [2.3, -11.5, 0], { info: 'membres_inf', owner: leg });
    seg({ id: `il_${k}`, pts: [[0.05, -5.6, -0.6], [0.5 * s, -6.2, -0.45], [0.85 * s, -6.9, -0.1]], r: 0.12, o2: 'rich', dir: 'aller', th: T, info: 'art_jambes', label: s < 0 ? 'A. iliaque' : null, lt: 0.5, ld: 2 });
    seg({ id: `fem_${k}`, pts: [[0.85 * s, -6.9, -0.1], [0.95 * s, -7.6, 0.15], [1.05 * s, -9.3, 0.05], [1.12 * s, -10.5, -0.3]], r: 0.1, o2: 'rich', dir: 'aller', th: T, info: 'art_jambes', label: s < 0 ? 'A. fémorale' : null, lt: 0.4 });
    seg({ id: `tib_${k}`, pts: [[1.12 * s, -10.5, -0.3], [1.16 * s, -11.3, -0.25], [1.2 * s, -13.5, -0.15], [1.25 * s, -14.3, 0.18], [1.25 * s, -14.5, 0.62]], r: [0.075, 0.05], o2: 'rich', dir: 'aller', th: T, info: 'art_jambes', label: s < 0 ? 'A. tibiale → pédieuse' : null, lt: 0.45, ld: 2 });
    seg({ id: `cap_p_${k}`, pts: [[1.25 * s, -14.5, 0.62], [1.32 * s, -14.68, 0.95], [1.12 * s, -14.75, 0.9], [1.05 * s, -14.6, 0.5], [1.0 * s, -14.3, 0.12]], o2: 'rp', dir: 'cap', th: T });
    seg({ id: `vf_${k}`, pts: [[1.0 * s, -14.3, 0.12], [1.0 * s, -13.5, -0.22], [0.97 * s, -11.3, -0.38], [0.93 * s, -10.5, -0.42], [0.85 * s, -9.3, -0.08], [0.75 * s, -7.6, 0.08], [0.6 * s, -6.9, -0.18], [0.5 * s, -6.2, -0.52], [-0.5, -5.7, -0.65]], r: [0.07, 0.13], o2: 'poor', dir: 'retour', th: T, info: 'veines_jambes', label: s < 0 ? 'V. fémorale' : null, lt: 0.62 });
    seg({ id: `saph_${k}`, pts: [[1.0 * s, -14.3, 0.32], [0.85 * s, -13.4, 0.28], [0.68 * s, -11.2, 0.25], [0.6 * s, -10.3, 0.2], [0.55 * s, -8.6, 0.38], [0.62 * s, -7.5, 0.32], [0.72 * s, -7.3, 0.1]], r: [0.04, 0.05], o2: 'poor', dir: 'retour', th: T, info: 'saphene', label: s > 0 ? 'Grande saphène' : null, lt: 0.4, ld: 2 });
    circuit('jambes', [...A, `il_${k}`, `fem_${k}`, `tib_${k}`, `cap_p_${k}`, `vf_${k}`, 'vci_abdo', 'vci', 'od_b'], 1.0);
    circuit('jambes', [...A, `il_${k}`, `fem_${k}`, `tib_${k}`, `cap_p_${k}`, `saph_${k}`, [`vf_${k}`, [0.72 * s, -7.3, 0.1], 1], 'vci_abdo', 'vci', 'od_b'], 0.45);
  }
}

/* ---------- repères des pouls ---------- */
const pulseRings = [];
for (const [txt, p, th, lp] of [
  ['Pouls carotidien', [-0.58, 4.6, 0.12], 'cerveau', [-1.75, 4.6, 0.12]],
  ['Pouls huméral', [-3.8, 0.45, 0.3], 'bras', [-4.95, 0.75, 0.3]],
  ['Pouls radial', [-4.35, -2.2, 0.48], 'bras', [-5.35, -2.0, 0.48]],
  ['Pouls fémoral', [-0.95, -7.35, 0.35], 'jambes', [-2.1, -7.35, 0.35]],
  ['Pouls poplité', [-1.13, -10.55, -0.55], 'jambes', [-2.25, -10.4, -0.4]],
  ['Pouls pédieux', [-1.25, -14.4, 0.8], 'jambes', [-2.35, -14.2, 0.8]],
]) {
  const ring = addMesh(new THREE.TorusGeometry(0.12, 0.018, 8, 28), basic([2.2, 1.8, 0.6], 0.9), { th, info: 'pouls', pos: p, prio: 4 });
  pulseRings.push(ring);
  addLabel(txt, lp, { info: 'pouls', cls: 'pulse', owner: ring });
}

/* ---------- orientation ---------- */

circuits.forEach(buildCircuit);

/* =========================================================================
   Particules (globules)
   ========================================================================= */
const MAXP = 9000;
const richMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.04, 1), basic([3.0, 0.38, 0.32]), MAXP);
const poorMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.058, 0.058, 0.058), basic([0.42, 0.85, 3.2]), MAXP);
for (const m of [richMesh, poorMesh]) { m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }
let parts = [];
function rebuildParticles() {
  parts = [];
  for (const c of circuits) {
    if (!state.themes.has(c.th)) continue;
    for (let i = 0; i < c.count && parts.length < MAXP; i++) {
      let jx, jy, jz; do { jx = rnd() * 2 - 1; jy = rnd() * 2 - 1; jz = rnd() * 2 - 1; } while (jx * jx + jy * jy + jz * jz > 1);
      const ax = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
      parts.push({ c, off: ((i + rnd() * 0.9) / c.count) * c.L, jx, jy, jz, ax, sp: 0.92 + rnd() * 0.16, rs: 1 + rnd() * 2 });
    }
  }
}
const _m = new THREE.Matrix4(), _s = new THREE.Vector3();
function updateParticles(flowDist, time, sizeMul) {
  let kr = 0, kp = 0;
  if (state.flow) {
    for (const p of parts) {
      const c = p.c;
      const s = (p.off + flowDist * p.sp) % c.L;
      const i = Math.min(c.N - 1, (s / c.step) | 0);
      const d = c.dir[i];
      if ((d === 1 && !state.aller) || (d === 2 && !state.retour)) continue;
      const fade = Math.min(1, s / 0.3, (c.L - s) / 0.3);
      const r = c.rad[i] * 0.55;
      const x = c.pos[i * 3] + p.jx * r, y = c.pos[i * 3 + 1] + p.jy * r, z = c.pos[i * 3 + 2] + p.jz * r;
      const o = c.o2[i], wr = smooth(0.3, 0.7, o);
      const sc = fade * sizeMul;
      if (wr > 0.02) { _m.makeScale(sc * (0.5 + 0.5 * wr), sc * (0.5 + 0.5 * wr), sc * (0.5 + 0.5 * wr)); _m.setPosition(x, y, z); richMesh.setMatrixAt(kr++, _m); }
      if (wr < 0.98) { const q = sc * (0.5 + 0.5 * (1 - wr)); _m.makeRotationAxis(p.ax, time * p.rs + p.off); _m.scale(_s.set(q, q, q)); _m.setPosition(x, y, z); poorMesh.setMatrixAt(kp++, _m); }
    }
  }
  richMesh.count = kr; poorMesh.count = kp;
  richMesh.instanceMatrix.needsUpdate = true; poorMesh.instanceMatrix.needsUpdate = true;
}

/* =========================================================================
   Cycle cardiaque
   ========================================================================= */
const PH = [
  [0, 0.12, 'Systole auriculaire', 'dia', 'SA'],
  [0.12, 0.19, 'Contraction isovolumique', 'sys', 'CIV'],
  [0.19, 0.47, 'Éjection ventriculaire', 'sys', 'Éjection'],
  [0.47, 0.54, 'Relaxation isovolumique', 'dia', 'RIV'],
  [0.54, 1, 'Remplissage ventriculaire', 'dia', 'Remplissage'],
];
const phaseAt = (t) => PH.find((p) => t >= p[0] && t < p[1]) || PH[4];
function ventVol(t) {
  if (t < 0.12) return lerp(0.955, 1, smooth(0.02, 0.12, t));
  if (t < 0.19) return 1;
  if (t < 0.47) return lerp(1, 0.9, smooth(0.19, 0.44, t));
  if (t < 0.54) return 0.9;
  return lerp(0.9, 0.955, 1 - (1 - smooth(0.54, 0.85, t)) ** 2);
}
function atrVol(t) {
  if (t < 0.12) return 0.99 - 0.07 * Math.sin(Math.PI * clamp((t - 0.02) / 0.1, 0, 1));
  if (t < 0.54) return lerp(0.99, 1.04, smooth(0.15, 0.5, t));
  return lerp(1.04, 0.99, smooth(0.54, 0.72, t));
}
function ecgVal(t) {
  const g = (c, w, a) => a * Math.exp(-(((t - c) / w) ** 2));
  return g(0.045, 0.022, 0.14) + g(0.118, 0.006, -0.09) + g(0.13, 0.007, 1) + g(0.142, 0.008, -0.24) + g(0.38, 0.038, 0.28);
}
const ejection = (t) => (t >= 0.19 && t < 0.47 ? Math.sin((Math.PI * (t - 0.19)) / 0.28) : 0);

/* ---------- sons B1 / B2 ---------- */
let actx = null;
function thump(freq, dur, gain) {
  if (!actx) return;
  const o = actx.createOscillator(), g = actx.createGain(), f = actx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 180;
  o.type = 'sine'; o.frequency.setValueAtTime(freq * 1.6, actx.currentTime); o.frequency.exponentialRampToValueAtTime(freq, actx.currentTime + dur * 0.6);
  g.gain.setValueAtTime(0.0001, actx.currentTime); g.gain.exponentialRampToValueAtTime(gain, actx.currentTime + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
  o.connect(f); f.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + dur + 0.05);
}
function soundHit(which) {
  const el = which === 1 ? $('#b1') : $('#b2');
  el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 140);
  if (state.sound) which === 1 ? thump(46, 0.17, 0.6) : thump(64, 0.11, 0.4);
}

/* ---------- ECG défilant ---------- */
const ecgCv = $('#ecg'), ecgCtx = ecgCv.getContext('2d');
const ecg = { vals: null, x: 0, acc: 0 };
function ecgResize() {
  const r = ecgCv.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2);
  ecgCv.width = Math.max(2, (r.width * d) | 0); ecgCv.height = Math.max(2, (r.height * d) | 0);
  ecg.vals = new Float32Array(ecgCv.width).fill(NaN); ecg.x = 0;
}
function ecgStep(c0, dc, dtPhys) {
  const W = ecgCv.width; if (!ecg.vals) return;
  ecg.acc += (dtPhys * W) / 3.2;
  const n = Math.floor(ecg.acc); ecg.acc -= n;
  for (let i = 0; i < n; i++) {
    let best = 0;
    for (let k = 0; k < 4; k++) { const t = (((c0 + (dc * (i + (k + 1) / 4)) / n) % 1) + 1) % 1; const v = ecgVal(t); if (Math.abs(v) > Math.abs(best)) best = v; }
    ecg.vals[ecg.x] = best; ecg.x = (ecg.x + 1) % W;
    for (let g = 1; g < W * 0.06; g++) ecg.vals[(ecg.x + g) % W] = NaN;
  }
}
function ecgDraw() {
  const W = ecgCv.width, Hh = ecgCv.height, ctx = ecgCtx, d = Math.min(devicePixelRatio, 2);
  ctx.clearRect(0, 0, W, Hh);
  ctx.strokeStyle = 'rgba(111,224,168,0.07)'; ctx.lineWidth = 1;
  const gs = 10 * d;
  ctx.beginPath();
  for (let x = 0; x < W; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, Hh); }
  for (let y = 0; y < Hh; y += gs) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  ctx.strokeStyle = '#6fe0a8'; ctx.lineWidth = 1.6 * d; ctx.shadowColor = '#6fe0a8'; ctx.shadowBlur = 6 * d;
  ctx.beginPath(); let pen = false;
  const base = Hh * 0.66, amp = Hh * 0.5;
  for (let x = 0; x < W; x++) {
    const v = ecg.vals[x];
    if (Number.isNaN(v)) { pen = false; continue; }
    const y = base - v * amp;
    pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true;
  }
  ctx.stroke(); ctx.shadowBlur = 0;
  const cx = (ecg.x - 1 + W) % W, cv = ecg.vals[cx];
  if (!Number.isNaN(cv)) { ctx.fillStyle = '#d9fff0'; ctx.beginPath(); ctx.arc(cx, base - cv * amp, 2.4 * d, 0, Math.PI * 2); ctx.fill(); }
}

/* ---------- barre des phases ---------- */
{
  const bar = $('#phaseBar');
  for (const p of PH) {
    const s = document.createElement('span');
    s.className = p[3]; s.style.width = `${(p[1] - p[0]) * 100}%`; s.textContent = p[4];
    s.title = `${p[2]} (${p[3] === 'sys' ? 'systole ventriculaire' : 'diastole'})`;
    bar.insertBefore(s, $('#phaseCursor'));
  }
}

/* =========================================================================
   Caméra : cadrage automatique sur les thèmes visibles
   ========================================================================= */
const BOX = {
  coeur: [[-1.7, -1.75, -1.3], [1.7, 2.7, 1.0]],
  coronaires: [[-1.7, -1.75, -1.3], [1.7, 2.2, 1.0]],
  poumons: [[-4.0, -1.7, -1.8], [4.0, 4.5, 1.0]],
  cerveau: [[-1.9, -1.7, -2.0], [1.9, 9.1, 1.4]],
  bras: [[-5.1, -3.7, -1.0], [5.1, 3.8, 1.0]],
  digestif: [[-3.2, -6.5, -1.3], [2.8, 2.7, 1.2]],
  reins: [[-2.1, -7.0, -1.6], [2.1, 2.7, 1.0]],
  jambes: [[-2.4, -15.0, -1.0], [2.4, 2.7, 1.0]],
};
function viewInsets() {
  const W = innerWidth, Hh = innerHeight;
  if (isMobile()) {
    const c = $('#cycle').getBoundingClientRect();
    return { l: 6, r: 6, t: c.bottom + 8, b: 64 };
  }
  const p = $('#panel').getBoundingClientRect(), i = $('#info').getBoundingClientRect(), c = $('#cycle').getBoundingClientRect();
  return { l: p.right + 8, r: W - i.left + 8, t: 70, b: Hh - c.top + 8 };
}
function resize() {
  const W = innerWidth, Hh = innerHeight;
  renderer.setSize(W, Hh, false);
  composer.setSize(W, Hh);
  labelRenderer.setSize(W, Hh);
  camera.aspect = W / Hh;
  const ins = viewInsets();
  camera.setViewOffset(W, Hh, -(ins.l - ins.r) / 2, -(ins.t - ins.b) / 2, W, Hh);
  camera.updateProjectionMatrix();
  ecgResize();
  const sl = $('#sideL'), sr = $('#sideR');
  sl.style.left = `${ins.l + 8}px`; sr.style.right = `${ins.r + 8}px`;
  sl.style.bottom = sr.style.bottom = `${ins.b + 10}px`;
}
let tween = null;
function fitView(front = false, instant = false) {
  const box = new THREE.Box3();
  for (const t of state.themes) { const b = BOX[t]; box.union(new THREE.Box3(V3(b[0]), V3(b[1]))); }
  const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const W = innerWidth, Hh = innerHeight, ins = viewInsets();
  const effW = Math.max(120, W - ins.l - ins.r), effH = Math.max(120, Hh - ins.t - ins.b);
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const dist = Math.max((size.y / 2) / (tan * (effH / Hh)), (size.x / 2) / (tan * camera.aspect * (effW / W))) * 1.06 + size.z / 2;
  let dir = camera.position.clone().sub(controls.target).normalize();
  if (front || dir.lengthSq() < 0.5) dir = new THREE.Vector3(0, 0.06, 1).normalize();
  const to = { target: center, pos: center.clone().addScaledVector(dir, dist) };
  if (instant) { controls.target.copy(to.target); camera.position.copy(to.pos); tween = null; return; }
  tween = { t: 0, from: { target: controls.target.clone(), pos: camera.position.clone() }, to };
}
controls.addEventListener('start', () => { tween = null; });

/* =========================================================================
   Application de l'état
   ========================================================================= */
const ORGAN_THEMES = ['poumons', 'cerveau', 'bras', 'digestif', 'reins', 'jambes'];
function applyVisibility() {
  for (const t of THEMES) for (const o of themeObjs[t.id]) o.visible = state.themes.has(t.id);
  for (const s of Object.values(SEG)) if (s.group) s.group.visible = segVisible(s);
  const any = ORGAN_THEMES.some((t) => state.themes.has(t));
  ghosts.body.forEach((g) => (g.visible = any));
  ghosts.head.forEach((g) => (g.visible = state.themes.has('cerveau')));
  cond.visible = state.conduction;
  const op = state.coupe || !state.transparent ? 1 : state.themes.has('coronaires') ? 0.55 : state.conduction ? 0.22 : 0.36;
  for (const m of heartMats) {
    const tr = op < 1;
    if (m.transparent !== tr) m.needsUpdate = true;
    m.transparent = tr; m.opacity = op; m.depthWrite = !tr;
    m.color.setHex(state.realistic ? COL.real : COL[m.userData.o2]);
    m.userData.u.uStripes.value = state.realistic || m.userData.o2 === 'rich' ? 0 : 0.6;
  }
  for (const m of septMats) m.opacity = state.transparent && !state.coupe ? 0.5 : 0.95;
  const plane = state.coupe ? [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.12)] : null;
  for (const m of [...heartMats, ...septMats]) {
    const side = state.coupe ? THREE.DoubleSide : THREE.FrontSide;
    if (m.side !== side || !!m.clippingPlanes !== !!plane) m.needsUpdate = true;
    m.side = side; m.clippingPlanes = plane;
  }
  document.querySelectorAll('.dirbtn').forEach((b) => b.classList.toggle('on', state[b.dataset.dir]));
  document.querySelectorAll('.theme').forEach((b) => b.classList.toggle('on', state.themes.has(b.dataset.id)));
}
function setThemes(list, refit = true) {
  state.themes = new Set(['coeur', ...list]);
  rebuildParticles(); applyVisibility();
  if (refit) fitView();
}

/* =========================================================================
   Fiches
   ========================================================================= */
const infoEl = $('#info');
function renderInfo(id) {
  const d = INFO[id] || INFO.overview;
  $('#infoKicker').innerHTML = d.k || '';
  $('#infoTitle').textContent = d.t;
  let h = `<p class="lead">${d.d}</p>`;
  if (id === 'overview') {
    h += '<h3>Le trajet du sang</h3><div class="steps">';
    const poor = new Set(['vcs', 'od', 'tricuspide', 'vd', 'pulmonaire', 'art_pulm', 'vci']);
    CIRCUIT_STEPS.forEach(([sid, txt], i) => {
      h += `<button data-sel="${sid}" class="${poor.has(sid) ? 'poor' : ''}"><span class="dot"></span>${txt}</button>`;
      if (i < CIRCUIT_STEPS.length - 1) h += '<span class="sep">→</span>';
    });
    h += '</div>';
  }
  if (d.p?.length) h += `<ul>${d.p.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  if (d.i?.length) h += `<div class="ifsi"><h3>En pratique</h3><ul>${d.i.map((x) => `<li>${x}</li>`).join('')}</ul></div>`;
  if (d.th && d.th !== 'coeur' && !state.themes.has(d.th)) h += `<button class="ghost theme-cta" data-theme="${d.th}">Afficher le thème « ${THEMES.find((t) => t.id === d.th).name} »</button>`;
  $('#infoBody').innerHTML = h;
  infoEl.classList.remove('flash'); void infoEl.offsetWidth; infoEl.classList.add('flash');
  infoEl.scrollTop = 0;
}
function showRef() {
  $('#infoKicker').textContent = 'Repères chiffrés';
  $('#infoTitle').textContent = 'Valeurs normales';
  $('#infoBody').innerHTML = REPERES;
  openInfo();
}
function openInfo() { infoEl.classList.remove('hidden'); if (isMobile()) { $('#panel').classList.remove('open'); hideToast(); } }
infoEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-sel]');
  if (b) { onPick(b.dataset.sel, true); return; }
  const t = e.target.closest('[data-theme]');
  if (t) { setThemes([...state.themes, t.dataset.theme]); renderInfo(state.selected || 'overview'); }
});
$('#infoClose').addEventListener('click', () => {
  state.selected = null; labels.forEach((L) => L.el.classList.remove('sel'));
  if (isMobile()) infoEl.classList.add('hidden'); else renderInfo('overview');
});

function onPick(id, fromUI = false) {
  if (quiz) { quizAnswer(id); return; }
  const d = INFO[id];
  if (d?.th && !state.themes.has(d.th)) setThemes([...state.themes, d.th]);
  if (d?.cond && !state.conduction) { state.conduction = true; $('[data-k="conduction"]').checked = true; applyVisibility(); }
  state.selected = id;
  labels.forEach((L) => L.el.classList.toggle('sel', L.info === id));
  renderInfo(id); openInfo();
}

/* =========================================================================
   Quiz
   ========================================================================= */
let quiz = null;
const quizEl = $('#quiz');
function startQuiz() {
  const order = QUIZ.slice().sort(() => Math.random() - 0.5).slice(0, 10);
  quiz = { order, i: 0, score: 0, lock: false, saved: { themes: [...state.themes], cond: state.conduction } };
  quizEl.hidden = false; $('#btnQuiz').classList.add('on');
  state.selected = null;
  showQuestion();
}
function showQuestion() {
  const q = quiz.order[quiz.i];
  quiz.lock = false;
  state.conduction = !!q.cond; $('[data-k="conduction"]').checked = state.conduction;
  setThemes(q.th);
  state.selected = null;
  $('#quizCount').textContent = `Question ${quiz.i + 1} / ${quiz.order.length}`;
  $('#quizScore').textContent = `Score ${quiz.score}`;
  $('#quizQ').textContent = q.q;
  $('#quizFb').textContent = ''; $('#quizFb').className = '';
  $('#quizNext').hidden = true; $('#quizSkip').hidden = false;
}
function quizAnswer(id) {
  if (!quiz || quiz.lock) return;
  const q = quiz.order[quiz.i], ok = q.a.includes(id);
  quiz.lock = true;
  if (ok) quiz.score++;
  const fb = $('#quizFb');
  const good = INFO[q.a[0]].t;
  fb.className = ok ? 'ok' : 'ko';
  fb.innerHTML = ok ? `<b>✓ Juste.</b> ${good}.` : `<b>✗ Raté</b>${INFO[id] ? ` (tu as cliqué : ${INFO[id].t})` : ''}. La bonne réponse clignote : <b>${good}</b>.`;
  state.selected = q.a[0];
  renderInfo(q.a[0]);
  if (!isMobile()) openInfo();
  $('#quizScore').textContent = `Score ${quiz.score}`;
  $('#quizNext').hidden = false; $('#quizSkip').hidden = true;
  $('#quizNext').textContent = quiz.i + 1 < quiz.order.length ? 'Suivante' : 'Résultat';
}
function quizNext() {
  quiz.i++;
  if (quiz.i < quiz.order.length) { showQuestion(); return; }
  const n = quiz.order.length;
  $('#quizCount').textContent = 'Terminé';
  $('#quizQ').textContent = `${quiz.score} / ${n} bonnes réponses`;
  $('#quizFb').className = quiz.score >= n * 0.7 ? 'ok' : 'ko';
  $('#quizFb').innerHTML = quiz.score >= n * 0.7 ? '<b>✓ Bien joué !</b> Relance pour d’autres questions.' : '<b>Encore un tour ?</b> Relis les fiches des réponses ratées puis relance.';
  $('#quizNext').hidden = false; $('#quizNext').textContent = 'Recommencer'; $('#quizSkip').hidden = true;
  quiz.done = true;
}
function quitQuiz() {
  if (!quiz) return;
  const sv = quiz.saved; quiz = null;
  quizEl.hidden = true; $('#btnQuiz').classList.remove('on');
  state.conduction = sv.cond; $('[data-k="conduction"]').checked = sv.cond;
  setThemes(sv.themes.filter((t) => t !== 'coeur'));
}
$('#btnQuiz').addEventListener('click', () => (quiz ? quitQuiz() : startQuiz()));
$('#quizQuit').addEventListener('click', quitQuiz);
$('#quizSkip').addEventListener('click', () => { quiz.lock = true; const q = quiz.order[quiz.i]; $('#quizFb').className = 'ko'; $('#quizFb').innerHTML = `Réponse : <b>${INFO[q.a[0]].t}</b> (elle clignote).`; state.selected = q.a[0]; renderInfo(q.a[0]); $('#quizNext').hidden = false; $('#quizSkip').hidden = true; });
$('#quizNext').addEventListener('click', () => { if (quiz.done) startQuiz(); else quizNext(); });

/* =========================================================================
   Interface
   ========================================================================= */
{
  const wrap = $('#themes');
  for (const t of THEMES) {
    const b = document.createElement('button');
    b.className = 'theme' + (t.locked ? ' locked' : '');
    b.dataset.id = t.id;
    b.innerHTML = `<span class="box"></span><span><b>${t.name}</b><small>${t.sub}</small></span>`;
    b.addEventListener('click', () => {
      if (t.locked || quiz) return;
      const s = new Set(state.themes); s.has(t.id) ? s.delete(t.id) : s.add(t.id); s.delete('coeur');
      setThemes([...s]);
    });
    wrap.appendChild(b);
  }
}
$('#allThemes').addEventListener('click', () => { if (!quiz) setThemes(THEMES.map((t) => t.id).filter((x) => x !== 'coeur')); });
$('#heartOnly').addEventListener('click', () => { if (!quiz) setThemes([]); });
document.querySelectorAll('.dirbtn').forEach((b) => b.addEventListener('click', () => { state[b.dataset.dir] = !state[b.dataset.dir]; applyVisibility(); }));
document.querySelectorAll('.sw input').forEach((inp) => inp.addEventListener('change', () => {
  state[inp.dataset.k] = inp.checked;
  if (inp.dataset.k === 'sound' && inp.checked && !actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* pas de son */ } }
  if (inp.dataset.k === 'sound' && actx?.state === 'suspended') actx.resume();
  applyVisibility();
}));
const bpmIn = $('#bpm');
bpmIn.addEventListener('input', () => {
  state.bpm = +bpmIn.value;
  $('#bpmOut').textContent = `${state.bpm} bpm`;
  document.querySelector('.brand svg').style.animationDuration = `${60 / state.bpm}s`;
});
$('#btnPlay').addEventListener('click', () => { state.playing = !state.playing; $('#btnPlay').textContent = state.playing ? 'Pause' : 'Lecture'; $('#btnPlay').classList.toggle('on', !state.playing); });
$('#btnSlow').addEventListener('click', () => { state.slow = !state.slow; $('#btnSlow').classList.toggle('on', state.slow); });
$('#btnRef').addEventListener('click', () => { state.selected = null; showRef(); });
$('#btnFront').addEventListener('click', () => fitView(true));
$('#btnInfo').addEventListener('click', () => {
  if (infoEl.classList.contains('hidden')) { renderInfo(state.selected || 'overview'); openInfo(); } else infoEl.classList.add('hidden');
});
$('#panelHandle').addEventListener('click', () => { $('#panel').classList.toggle('open'); if ($('#panel').classList.contains('open')) infoEl.classList.add('hidden'); });

/* ---------- sélection 3D ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pickAt(cx, cy) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const vis = pickables.filter(isShown);
  const hits = ray.intersectObjects(vis, false);
  if (!hits.length) return null;
  // On préfère une petite structure (vaisseau, valve…) située juste derrière un organe translucide.
  let best = hits[0];
  const p0 = hits[0].object.userData.prio;
  for (const h of hits) {
    const p = h.object.userData.prio, gap = h.distance - hits[0].distance;
    const win = p >= 4 ? 3 : p0 <= 1 ? 1.6 : p0 === 2 ? 0.45 : 0;
    if (gap <= win && p > best.object.userData.prio) best = h;
  }
  return best.object.userData.info;
}
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, n: e.isPrimary }; hideToast(); });
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
  down = null;
  const id = pickAt(e.clientX, e.clientY);
  if (id) onPick(id);
});
const tip = $('#tip');
let hoverReq = null;
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  hoverReq = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointerleave', () => { hoverReq = null; state.hover = null; tip.hidden = true; });
function doHover() {
  if (!hoverReq) return;
  const { x, y } = hoverReq; hoverReq = null;
  const id = down ? null : pickAt(x, y);
  state.hover = id;
  canvas.style.cursor = id ? 'pointer' : 'grab';
  if (id && !quiz && INFO[id]) { tip.hidden = false; tip.textContent = INFO[id].t; tip.style.left = `${x}px`; tip.style.top = `${y}px`; } else tip.hidden = true;
}

/* ---------- message d'aide ---------- */
const toast = $('#toast');
let toastT = null;
function hideToast() { if (toast.hidden) return; toast.classList.add('out'); setTimeout(() => (toast.hidden = true), 600); clearTimeout(toastT); }

/* =========================================================================
   Boucle
   ========================================================================= */
const clock = new THREE.Clock();
let cyc = 0.55, flowDist = 0, time = 0;
const _pp = new THREE.Vector3();
function setHi(m, v) {
  const u = m.material.userData.u;
  if (u) u.uHi.value = v;
  else if (m.material.userData.base) m.material.color.copy(m.material.userData.base).multiplyScalar(1 + v * 1.6);
}
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  time += dt;
  const speed = state.playing ? (state.slow ? 0.25 : 1) : 0;
  const dtPhys = dt * speed;
  const c0 = cyc;
  const dc = dtPhys * (state.bpm / 60);
  cyc = (cyc + dc) % 1;
  if (dc > 0) {
    const crossed = (x) => (c0 <= cyc ? c0 < x && cyc >= x : c0 < x || cyc >= x);
    if (crossed(0.14)) soundHit(1);
    if (crossed(0.47)) soundHit(2);
  }
  flowDist += dtPhys * 1.9 * (state.bpm / 70) * (0.45 + 1.1 * ejection(cyc));

  // Battement
  const vv = ventVol(cyc), av = atrVol(cyc);
  CH.vd.mesh.scale.setScalar(vv); CH.vg.mesh.scale.setScalar(vv);
  CH.od.mesh.scale.setScalar(av); CH.og.mesh.scale.setScalar(av);
  // Valves
  const avOpen = cyc < 0.12 || cyc >= 0.54 ? 1 : 0, sgOpen = cyc >= 0.19 && cyc < 0.47 ? 1 : 0;
  for (const [id, v] of Object.entries(valves)) {
    const target = id === 'tricuspide' || id === 'mitrale' ? avOpen : sgOpen;
    v.open += (target - v.open) * (1 - Math.exp(-dt * (speed ? 22 * Math.max(speed, 0.4) : 22)));
    const ang = v.open * (id === 'tricuspide' || id === 'mitrale' ? 1.15 : 1.25);
    for (const l of v.leaves) l.pivot.quaternion.setFromAxisAngle(l.axis, ang);
  }
  // Conduction
  let elecA = 0, elecV = 0;
  if (state.conduction) {
    for (const p of pulses) {
      const on = cyc >= p.t0 && cyc < p.t1;
      p.m.visible = on;
      if (on) p.curve.getPointAt((cyc - p.t0) / (p.t1 - p.t0), p.m.position);
    }
    saNode.scale.setScalar(0.075 * (1 + 0.8 * Math.exp(-(((cyc - 0.01) / 0.02) ** 2))));
    avNode.scale.setScalar(0.065 * (1 + 0.6 * smooth(0.06, 0.08, cyc) * (1 - smooth(0.11, 0.125, cyc))));
    elecA = Math.exp(-(((cyc - 0.06) / 0.035) ** 2));
    elecV = Math.exp(-(((cyc - 0.16) / 0.035) ** 2));
  }
  // Surbrillances
  const selPulse = 0.35 + 0.25 * Math.sin(time * 5);
  for (const m of pickables) {
    const id = m.userData.info;
    let v = id === state.selected ? selPulse : 0;
    if (id === state.hover && v === 0) v = 0.3;
    if (id === 'od' || id === 'og') v = Math.max(v, elecA * 0.5);
    if (id === 'vd' || id === 'vg') v = Math.max(v, elecV * 0.5);
    setHi(m, v);
  }
  // Repères des pouls : face à la caméra et battants
  const pb = 1 + 0.25 * Math.exp(-(((cyc - 0.24) / 0.06) ** 2));
  for (const r of pulseRings) { r.quaternion.copy(camera.quaternion); r.scale.setScalar(pb); }

  // Caméra
  if (tween) {
    tween.t = Math.min(1, tween.t + dt / 0.9);
    const k = tween.t < 0.5 ? 4 * tween.t ** 3 : 1 - (-2 * tween.t + 2) ** 3 / 2;
    controls.target.lerpVectors(tween.from.target, tween.to.target, k);
    camera.position.lerpVectors(tween.from.pos, tween.to.pos, k);
    if (tween.t >= 1) tween = null;
  }
  controls.update();
  const camDist = camera.position.distanceTo(controls.target);
  updateParticles(flowDist, time, clamp(camDist / 10, 1, 2.4));

  // Étiquettes
  const W = innerWidth, Hh = innerHeight, cand = [], placed = [];
  for (const L of labels) {
    let v = state.labels && !quiz;
    if (v && L.owner) v = isShown(L.owner);
    if (v && L.detail === 2) v = camDist < 11;
    if (v && L.needs) v = L.needs();
    L.o.visible = false;
    if (!v) continue;
    _pp.copy(L.o.position).project(camera);
    if (_pp.z > 1 || Math.abs(_pp.x) > 1.1 || Math.abs(_pp.y) > 1.1) continue;
    L.sx = ((_pp.x + 1) / 2) * W; L.sy = ((1 - _pp.y) / 2) * Hh;
    cand.push(L);
  }
  cand.sort((a, b) => (b.info === state.selected) - (a.info === state.selected) || b.prio - a.prio);
  for (const L of cand) {
    if (!L.w) L.w = L.el.offsetWidth;
    const w = L.w || 80, h = 22;
    const r = [L.sx - w / 2 - 3, L.sx + w / 2 + 3, L.sy - h / 2 - 2, L.sy + h / 2 + 2];
    if (placed.some((q) => !(r[1] < q[0] || r[0] > q[1] || r[3] < q[2] || r[2] > q[3]))) continue;
    placed.push(r); L.o.visible = true;
  }
  const back = camera.position.z - controls.target.z < 0;
  if (frame.back !== back) { frame.back = back; $('#sideL').textContent = back ? 'Gauche du patient' : 'Droite du patient'; $('#sideR').textContent = back ? 'Droite du patient' : 'Gauche du patient'; }
  doHover();

  // Interface du cycle
  const ph = phaseAt(cyc);
  if (frame.ph !== ph) {
    frame.ph = ph;
    $('#phaseName').textContent = ph[2];
    const vAV = $('#vAV'), vSig = $('#vSig');
    vAV.textContent = `Tricuspide & mitrale : ${avOpen ? 'ouvertes' : 'fermées'}`; vAV.className = avOpen ? 'open' : 'shut';
    vSig.textContent = `Pulmonaire & aortique : ${sgOpen ? 'ouvertes' : 'fermées'}`; vSig.className = sgOpen ? 'open' : 'shut';
  }
  $('#phaseCursor').style.left = `calc(${(cyc * 100).toFixed(2)}% - 1px)`;
  ecgStep(c0, dc, dtPhys);
  ecgDraw();

  if (state.bloom) composer.render(); else renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* =========================================================================
   Démarrage
   ========================================================================= */
addEventListener('resize', () => { resize(); });
mobileQ.addEventListener('change', () => { resize(); fitView(); });
if (isMobile()) infoEl.classList.add('hidden');
renderInfo('overview');
rebuildParticles();
applyVisibility();
resize();
fitView(true, true);
requestAnimationFrame(() => {
  frame();
  $('#loader').classList.add('out');
  setTimeout(() => $('#loader').remove(), 700);
  if (isMobile()) toast.textContent = 'Glisse pour tourner · pince pour zoomer · touche une structure pour sa fiche';
  toast.hidden = false;
  toastT = setTimeout(hideToast, 8000);
});
window.__coeur = { state, setThemes, fitView, onPick, SEG, circuits, camera, controls };
