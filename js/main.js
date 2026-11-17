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
import { icon } from './icons.js';

/* Échelle : 1 unité = 5 cm. Le cœur est au centre (y = 0), la plante des pieds à y ≈ -25,6 (1,75 m). */

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
let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const catm = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
function tableAt(tab, x) {
  if (x <= tab[0][0]) return tab[0].slice(1);
  if (x >= tab[tab.length - 1][0]) return tab[tab.length - 1].slice(1);
  let i = 0; while (tab[i + 1][0] < x) i++;
  const a = tab[Math.max(0, i - 1)], b = tab[i], c = tab[i + 1], d = tab[Math.min(tab.length - 1, i + 2)];
  const t = (x - b[0]) / (c[0] - b[0]);
  return b.slice(1).map((_, k) => catm(a[k + 1], b[k + 1], c[k + 1], d[k + 1], t));
}

/* =========================================================================
   État
   ========================================================================= */
const state = {
  themes: new Set(['coeur']), aller: true, retour: true,
  flow: true, transparent: true, coupe: false, conduction: false, labels: false, o2: false, body: true,
  bloom: true, sound: false, dark: false, sex: 'h',
  bpm: 70, playing: true, slow: false, selected: null, hover: null,
};

/* =========================================================================
   Rendu
   ========================================================================= */
const canvas = $('#scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  $('#loader').innerHTML = '<p>WebGL n’est pas disponible sur cet appareil ou ce navigateur.</p>';
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.localClippingEnabled = true;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 400);
camera.position.set(0, 0.5, 9);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0.5, 0);
controls.minDistance = 1.5;
controls.maxDistance = 120;
controls.rotateSpeed = 0.8;

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
scene.add(new THREE.HemisphereLight(0xffffff, 0x6f5552, 0.45));
const key = new THREE.DirectionalLight(0xfff4ea, 1.5); key.position.set(4, 7, 9); scene.add(key);
const fill = new THREE.DirectionalLight(0xb9ccff, 0.7); fill.position.set(-7, 1, -6); scene.add(fill);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.35, 0.9));
composer.addPass(new OutputPass());

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'labels';
document.body.appendChild(labelRenderer.domElement);

/* =========================================================================
   Matériaux : PBR + texture organique procédurale (bruit 3D, relief) + liseré + surbrillance
   ========================================================================= */
const NOISE = `
float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
float orgH(vec3 p, float mode) {
  if (mode > 0.5 && mode < 1.5) { float n = fbm(p + 0.7 * fbm(p * 0.5)); return pow(1.0 - abs(2.0 * n - 1.0), 1.6); }
  if (mode > 1.5) return 0.55 * fbm(p) + 0.45 * vnoise(p * 3.3);
  return fbm(p);
}`;
// tex = [échelle du motif, mélange vers la 2e couleur, relief, mode (0 marbré, 1 circonvolutions, 2 spongieux)]
function mat({ color, color2, opacity = 1, rim, rimStr = 0.3, stripes = 0, rough = 0.5, clear = 0.3, side = THREE.FrontSide, tex = [0, 0, 0, 0], sheen = 0.3 }) {
  const c = new THREE.Color(color);
  const m = new THREE.MeshPhysicalMaterial({
    color: c, roughness: rough, metalness: 0, clearcoat: clear, clearcoatRoughness: 0.3,
    sheen, sheenRoughness: 0.5, sheenColor: c.clone().lerp(new THREE.Color(0xffffff), 0.35),
    transparent: opacity < 1, opacity, depthWrite: opacity >= 1, side,
  });
  m.userData.u = {
    uRim: { value: new THREE.Color(rim ?? c.clone().lerp(new THREE.Color(0xffffff), 0.5)) },
    uRimStr: { value: rimStr }, uStripes: { value: stripes }, uHi: { value: 0 },
    uC2: { value: new THREE.Color(color2 ?? c.clone().multiplyScalar(0.65)) },
    uTex: { value: new THREE.Vector4(...tex) },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPosW; varying vec3 vPosO;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvPosW = (modelMatrix * vec4(transformed, 1.0)).xyz; vPosO = transformed;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vPosW; varying vec3 vPosO;
        uniform vec3 uRim; uniform float uRimStr; uniform float uStripes; uniform float uHi; uniform vec3 uC2; uniform vec4 uTex;
        ${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float th = 0.0;
        if (uTex.x > 0.0) {
          vec3 tp = vPosO * uTex.x;
          th = orgH(tp, uTex.w);
          float m2 = smoothstep(0.32, 0.72, fbm(tp * 0.42 + 7.3));
          diffuseColor.rgb = mix(diffuseColor.rgb, uC2, m2 * uTex.y);
          diffuseColor.rgb *= (uTex.w > 0.5 && uTex.w < 1.5) ? (0.62 + 0.5 * th) : (0.84 + 0.3 * th);
          if (uTex.w > 1.5) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32, 0.26, 0.3), smoothstep(0.78, 0.86, vnoise(tp * 2.2)) * 0.55);
        }
        float stp = smoothstep(-0.3, 0.3, sin((vPosW.x * 0.6 + vPosW.y + vPosW.z * 0.45) * 26.0));
        diffuseColor.rgb *= mix(1.0, 0.62 + 0.38 * stp, uStripes);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (uTex.z > 0.0) {
          vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
          float hx = dFdx(th), hy = dFdy(th);
          vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
          float det = dot(dpx, r1);
          vec3 grad = sign(det) * (hx * r1 + hy * r2);
          normal = normalize(abs(det) * normal - grad * uTex.z);
        }`)
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>
        float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uRim, clamp(fr * uRimStr, 0.0, 1.0));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.78, 0.25), uHi * (0.28 + 0.55 * fr));
        gl_FragColor.a = clamp(gl_FragColor.a + fr * uRimStr * 0.5 + uHi * 0.3, 0.0, 1.0);`);
  };
  return m;
}
function basic(rgb, opacity = 1, onTop = false) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb), transparent: opacity < 1 || onTop, opacity, depthTest: !onTop, depthWrite: !onTop });
  m.userData.base = m.color.clone();
  return m;
}
// Couleurs réalistes [couleur, 2e couleur]
const R = {
  heart: [0x9a2a2a, 0x5a1212], lung: [0xe7a7aa, 0xa86f7b], brain: [0xe2b4ac, 0xb27f7a], liver: [0x6d2420, 0x41110e],
  spleen: [0x63243c, 0x3c1426], stomach: [0xcf7a70, 0x9e4f48], intestine: [0xd88779, 0xa95a4f], colon: [0xc58466, 0x925840],
  kidney: [0x7f2c28, 0x551a17], bladder: [0xe7c6a8, 0xc69a7a], uterus: [0xd98b8e, 0xa95f64], ovary: [0xead1c5, 0xc5a191],
  prostate: [0xc78b7f, 0xa1665c], testis: [0xe6c4ba, 0xc49a8f], oeso: [0xd58f87, 0xae645c],
  artery: [0xb81f2c, 0x7a121b], vein: [0x2f4ca8, 0x1b2c6c], air: [0xe9e1d0, 0xc6bca6], uro: [0xd8bd68, 0xae9244],
};
const organ = (k, o = {}) => mat({ color: R[k][0], color2: R[k][1], rough: 0.45, clear: 0.55, rimStr: 0.18, sheen: 0.1, ...o });

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
// Section elliptique (ou « super-ellipse », plus carrée) le long d'une courbe : largeur sur x, profondeur sur z.
function loftGeo(curve, prof, { tub = 90, rad = 40, exp = 2 } = {}) {
  const pos = [], idx = [];
  const P = new THREE.Vector3(), T = new THREE.Vector3(), B = new THREE.Vector3(), N = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i <= tub; i++) {
    const t = i / tub; curve.getPointAt(t, P); curve.getTangentAt(t, T);
    B.crossVectors(T, Z); if (B.lengthSq() < 1e-6) B.set(1, 0, 0); B.normalize(); N.crossVectors(B, T).normalize();
    const [rx, rz] = prof(t, P);
    for (let j = 0; j < rad; j++) {
      const a = (j / rad) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const cx = Math.sign(c) * Math.abs(c) ** (2 / exp), sz = Math.sign(s) * Math.abs(s) ** (2 / exp);
      pos.push(P.x + B.x * rx * cx + N.x * rz * sz, P.y + B.y * rx * cx + N.y * rz * sz, P.z + B.z * rx * cx + N.z * rz * sz);
    }
  }
  for (let i = 0; i < tub; i++) for (let j = 0; j < rad; j++) {
    const a = i * rad + j, b = i * rad + ((j + 1) % rad), c = (i + 1) * rad + j, d = (i + 1) * rad + ((j + 1) % rad);
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const curveOf = (pts) => new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : V3(p))), false, 'centripetal');
const sphereGeo = new THREE.SphereGeometry(1, 16, 12);
function nearestT(curve, p) {
  let best = 0, bd = Infinity; const q = new THREE.Vector3();
  for (let i = 0; i <= 300; i++) { curve.getPointAt(i / 300, q); const d = q.distanceToSquared(p); if (d < bd) { bd = d; best = i / 300; } }
  return best;
}

/* =========================================================================
   Registres
   ========================================================================= */
const objs = [];       // objets liés à des thèmes : userData.th (liste), userData.sex
const pickables = [];
const labels = [];
const SEG = {};
const circuits = [];

function registerPick(m, info, prio = 2) {
  m.userData.info = info; m.userData.prio = prio;
  pickables.push(m);
}
function addMesh(geo, material, { th, info, pos, rot, prio = 2, parent = scene, sex } = {}) {
  const m = new THREE.Mesh(geo, material);
  if (pos) m.position.copy(V3(pos));
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  parent.add(m);
  if (th) { m.userData.th = Array.isArray(th) ? th : [th]; m.userData.sex = sex; objs.push(m); }
  if (info) registerPick(m, info, prio);
  return m;
}
function isShown(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
function addLabel(text, pos, { info, owner = null } = {}) {
  const el = document.createElement('div');
  el.className = 'lbl';
  el.textContent = text;
  if (info) el.addEventListener('click', (e) => { e.stopPropagation(); onPick(info); });
  const o = new CSS2DObject(el);
  o.position.copy(pos.isVector3 ? pos : V3(pos));
  scene.add(o);
  const L = { o, el, info, owner, w: 0 };
  labels.push(L);
  return L;
}

/* =========================================================================
   Vaisseaux (segments) et circuits
   ========================================================================= */
const DIRC = { int: 0, cap: 0, aller: 1, retour: 2 };
const KIND = {
  rich: { c: R.artery, stripes: 0, opacity: 0.6 },
  poor: { c: R.vein, stripes: 0.45, opacity: 0.6 },
  air: { c: R.air, stripes: 0.7, opacity: 0.7 },
  uro: { c: R.uro, stripes: 0, opacity: 0.75 },
};
function pointOn(id, t) {
  const s = SEG[id];
  if (Array.isArray(t)) t = nearestT(s.curve, V3(t));
  return s.curve.getPointAt(t);
}
// def : id, pts, r, o2 (rich|poor|rp|pr), dir (aller|retour|int|cap), th, info, label, lt, kind, sex
function seg(def) {
  const pts = def.pts.map((p) => (p.isVector3 ? p : p.from ? pointOn(p.from, p.t) : V3(p)));
  const curve = curveOf(pts);
  const len = curve.getLength();
  const s = { def, curve, len, group: null };
  SEG[def.id] = s;
  const r0 = Array.isArray(def.r) ? def.r[0] : def.r ?? 0.1;
  const r1 = Array.isArray(def.r) ? def.r[1] : def.r ?? 0.1;
  const isTube = def.tube ?? !(def.dir === 'int' || def.dir === 'cap');
  s.rad = (t) => (isTube ? lerp(r0, r1, t) : def.dir === 'int' ? 0.07 : 0.12);
  if (!isTube) return s;
  const K = KIND[def.kind || def.o2];
  const m = mat({ color: K.c[0], color2: K.c[1], opacity: K.opacity, rimStr: 0.35, stripes: K.stripes, rough: 0.28, clear: 0.8, tex: [5, 0.3, 0.003, 0] });
  const g = new THREE.Group(); scene.add(g);
  const mesh = new THREE.Mesh(tubeGeo(curve, s.rad, Math.max(10, Math.ceil(len * 20)), 14), m);
  g.add(mesh);
  for (const [t, r] of [[0, r0], [1, r1]]) {
    const c = new THREE.Mesh(sphereGeo, m); c.scale.setScalar(r); c.position.copy(curve.getPointAt(t)); g.add(c);
  }
  if (def.info) registerPick(mesh, def.info, 3);
  s.group = g; s.mesh = mesh;
  if (def.label) addLabel(def.label, curve.getPointAt(def.lt ?? 0.5), { info: def.info, owner: g });
  return s;
}
const sexOk = (sx) => !sx || sx === state.sex;
function segVisible(s) {
  const d = s.def;
  if (!sexOk(d.sex)) return false;
  if (!d.th.some((t) => state.themes.has(t))) return false;
  if (d.dir === 'aller' && !state.aller) return false;
  if (d.dir === 'retour' && !state.retour) return false;
  return true;
}
const circuit = (th, seq, w = 1, sex) => circuits.push({ th, seq, w, sex });
function o2At(k, t) {
  if (k === 'rich') return 1;
  if (k === 'poor') return 0;
  if (k === 'rp') return 1 - smooth(0.1, 0.9, t);
  if (k === 'pr') return smooth(0.1, 0.9, t);
  return 1;
}
const CAPW = 2.6; // les capillaires ralentissent le sang
const DENS = 5.5;
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
    o2[k] = lerp(a.o2, b.o2, f); dir[k] = f < 0.5 ? a.dir : b.dir; rad[k] = Math.min(a.r, b.r);
  }
  Object.assign(c, { L, N, step, pos, o2, dir, rad, count: Math.min(560, Math.round(L * DENS * c.w)) });
}

/* =========================================================================
   LE CŒUR
   ========================================================================= */
const heart = new THREE.Group(); scene.add(heart);
const O2COL = { rich: [0xc4323d, 0x8a1c25], poor: [0x4558c0, 0x2a3780] };
const bump = (D, amt) => { const d = D.clone().normalize(); return (v, u) => { const k = u.dot(d); if (k > 0.72) { const q = (k - 0.72) / 0.28; v.addScaledVector(d, amt * q * q); } }; };
const CH = {
  od: { c: [-0.95, 0.58, 0.12], r: [0.62, 0.6, 0.58], rot: [0, 0, 0.15], o2: 'poor', lp: [-1.6, 0.9, 0.4], deform: bump(V3([0.55, 0.45, 0.7]), 0.3) },
  vd: { c: [-0.22, -0.34, 0.36], r: [0.8, 0.98, 0.56], rot: [0.08, 0, 0.42], o2: 'poor', lp: [-0.1, -0.8, 1.0],
    deform: (v, u) => { if (u.y < 0) { const k = 1 - 0.38 * Math.pow(-u.y, 1.4); v.x *= k; v.z *= k; } if (u.z < 0) v.z *= 0.65; } },
  og: { c: [0.45, 0.66, -0.58], r: [0.62, 0.46, 0.5], rot: [0, 0, -0.1], o2: 'rich', lp: [1.2, 1.0, -0.6], deform: bump(V3([0.85, 0.15, 0.55]), 0.32) },
  vg: { c: [0.48, -0.38, -0.12], r: [0.74, 1.15, 0.74], rot: [0.05, 0, 0.5], o2: 'rich', lp: [1.35, -0.55, 0.2],
    deform: (v, u) => { if (u.y < 0) { const k = 1 - 0.42 * Math.pow(-u.y, 1.4); v.x *= k; v.z *= k; } } },
};
const NAMES = { od: 'Oreillette droite', vd: 'Ventricule droit', og: 'Oreillette gauche', vg: 'Ventricule gauche' };
const heartMats = [];
for (const [id, d] of Object.entries(CH)) {
  const m = mat({ color: R.heart[0], color2: R.heart[1], opacity: 0.4, rimStr: 0.35, rough: 0.4, clear: 0.7, tex: [3.2, 0.55, 0.012, 0] });
  m.userData.o2 = d.o2; heartMats.push(m);
  d.mesh = addMesh(blobGeo(d.r, { deform: d.deform }), m, { info: id, pos: d.c, rot: d.rot, parent: heart });
  addLabel(NAMES[id], d.lp, { info: id, owner: d.mesh });
}
const conus = addMesh(tubeGeo(curveOf([[-0.2, -0.15, 0.5], [0.0, 0.25, 0.66], [0.08, 0.56, 0.62]]), (t) => lerp(0.36, 0.19, t), 30, 20), CH.vd.mesh.material, { info: 'vd', parent: heart });
const septMats = [];
for (const [id, c, r, rot] of [['septum_iv', [0.1, -0.42, 0.24], [0.07, 0.86, 0.5], [0.12, -0.2, 0.47]], ['septum_ia', [-0.3, 0.66, -0.25], [0.05, 0.42, 0.42], [0, 0.5, 0.1]]]) {
  const m = mat({ color: 0xd98a92, color2: 0xa8565f, opacity: 0.55, rimStr: 0.3, rough: 0.5, tex: [4, 0.4, 0.004, 0] });
  septMats.push(m);
  const s = addMesh(blobGeo(r, { detail: 4 }), m, { info: id, pos: c, rot, parent: heart });
  addLabel(id === 'septum_iv' ? 'Septum interventriculaire' : 'Septum interauriculaire', id === 'septum_iv' ? [0.35, -1.25, 0.75] : [-0.35, 1.25, -0.3], { info: id, owner: s });
}

const valves = {};
function makeValve(id, pos, normal, R0, n, lbl, lp) {
  const g = new THREE.Group();
  g.position.copy(V3(pos));
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), V3(normal).normalize());
  heart.add(g);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R0, R0 * 0.12, 10, 40), mat({ color: 0xe4d2ad, rough: 0.5 }));
  g.add(ring); registerPick(ring, id, 3);
  const leafMat = mat({ color: 0xf1e4cc, color2: 0xd9c4a0, opacity: 0.94, rimStr: 0.25, rough: 0.55, side: THREE.DoubleSide, tex: [12, 0.4, 0, 0] });
  const leaves = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + 0.04, a1 = ((i + 1) / n) * Math.PI * 2 - 0.04, am = (a0 + a1) / 2;
    const rim = new THREE.Vector3(Math.cos(am) * R0, Math.sin(am) * R0, 0);
    const geo = new THREE.CircleGeometry(R0 * 0.97, 18, a0, a1 - a0);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) { const d = Math.hypot(p.getX(k), p.getY(k)) / R0; p.setZ(k, -0.18 * R0 * Math.sin(Math.PI * d)); }
    geo.translate(-rim.x, -rim.y, 0); geo.computeVertexNormals();
    const pivot = new THREE.Group(); pivot.position.copy(rim); g.add(pivot);
    const leaf = new THREE.Mesh(geo, leafMat); pivot.add(leaf); registerPick(leaf, id, 3);
    leaves.push({ pivot, axis: new THREE.Vector3(-Math.sin(am), Math.cos(am), 0) });
  }
  valves[id] = { g, leaves, open: 0 };
  addLabel(lbl, lp, { info: id, owner: g });
}
makeValve('tricuspide', [-0.62, 0.12, 0.3], [0.6, -0.85, 0.25], 0.22, 3, 'Valve tricuspide', [-1.15, -0.25, 0.75]);
makeValve('mitrale', [0.42, 0.15, -0.27], [0.05, -0.9, 0.35], 0.21, 2, 'Valve mitrale', [1.05, 0.2, -0.05]);
makeValve('pulmonaire', [0.08, 0.58, 0.62], [0.35, 0.85, -0.1], 0.17, 3, 'Valve pulmonaire', [0.55, 0.62, 1.0]);
makeValve('aortique', [-0.05, 0.38, 0.05], [-0.15, 0.95, 0.05], 0.18, 3, 'Valve aortique', [-0.55, 0.62, 0.45]);

/* ---------- gros vaisseaux et trajets dans le cœur ---------- */
const H = ['coeur'];
seg({ id: 'vcs', pts: [[-1.0, 2.72, -0.08], [-1.02, 2.0, -0.04], [-1.0, 1.15, 0.02]], r: 0.17, o2: 'poor', dir: 'retour', th: H, info: 'vcs', label: 'Veine cave supérieure', lt: 0.35 });
seg({ id: 'vci', pts: [[-0.82, -1.6, -0.55], [-0.92, -0.8, -0.3], [-0.95, -0.1, -0.08]], r: 0.19, o2: 'poor', dir: 'retour', th: H, info: 'vci', label: 'Veine cave inférieure', lt: 0.1 });
seg({ id: 'od_a', pts: [[-1.0, 1.15, 0.02], [-0.97, 0.62, 0.18], [-0.62, 0.12, 0.3]], o2: 'poor', dir: 'int', th: H });
seg({ id: 'od_b', pts: [[-0.95, -0.1, -0.08], [-0.92, 0.3, 0.15], [-0.62, 0.12, 0.3]], o2: 'poor', dir: 'int', th: H });
seg({ id: 'vd_p', pts: [[-0.62, 0.12, 0.3], [-0.35, -0.45, 0.45], [-0.05, -0.55, 0.6], [0.05, 0.0, 0.68], [0.08, 0.58, 0.62]], o2: 'poor', dir: 'int', th: H });
seg({ id: 'tp', pts: [[0.08, 0.58, 0.62], [0.3, 1.1, 0.52], [0.42, 1.48, 0.18]], r: 0.2, o2: 'poor', dir: 'aller', th: H, info: 'art_pulm', label: 'Tronc pulmonaire', lt: 0.55 });
seg({ id: 'ap_d', pts: [[0.42, 1.48, 0.18], [0.05, 1.56, -0.28], [-0.7, 1.5, -0.45], [-1.35, 1.45, -0.5]], r: 0.13, o2: 'poor', dir: 'aller', th: H, info: 'art_pulm' });
seg({ id: 'ap_g', pts: [[0.42, 1.48, 0.18], [0.85, 1.6, -0.1], [1.4, 1.55, -0.35]], r: 0.13, o2: 'poor', dir: 'aller', th: H, info: 'art_pulm' });
const VP = [['vp_ds', [-1.45, 0.98, -0.8], [-0.6, 0.9, -0.78], [0.15, 0.75, -0.65]], ['vp_di', [-1.45, 0.45, -0.8], [-0.6, 0.5, -0.78], [0.15, 0.6, -0.65]],
  ['vp_gs', [1.55, 0.98, -0.75], [1.1, 0.85, -0.7], [0.75, 0.72, -0.62]], ['vp_gi', [1.55, 0.45, -0.75], [1.1, 0.52, -0.7], [0.75, 0.6, -0.62]]];
for (const [id, ...pts] of VP) seg({ id, pts, r: 0.085, o2: 'rich', dir: 'retour', th: H, info: 'veines_pulm', label: id === 'vp_gi' ? 'Veines pulmonaires' : null, lt: 0.2 });
seg({ id: 'og_p', pts: [[0.45, 0.66, -0.6], [0.44, 0.4, -0.42], [0.42, 0.15, -0.27]], o2: 'rich', dir: 'int', th: H });
seg({ id: 'vg_p', pts: [[0.42, 0.15, -0.27], [0.6, -0.55, -0.12], [0.85, -1.0, 0.05], [0.45, -0.75, 0.15], [0.15, -0.3, 0.12], [-0.05, 0.38, 0.05]], o2: 'rich', dir: 'int', th: H });
seg({ id: 'ao_asc', pts: [[-0.05, 0.38, 0.05], [-0.22, 1.15, 0.12], [-0.18, 1.85, 0.02]], r: 0.24, o2: 'rich', dir: 'aller', th: H, info: 'aorte', label: 'Aorte', lt: 0.7 });
seg({ id: 'ao_crosse', pts: [[-0.18, 1.85, 0.02], [-0.05, 2.25, -0.2], [0.3, 2.42, -0.45], [0.65, 2.2, -0.8], [0.78, 1.6, -1.0]], r: 0.23, o2: 'rich', dir: 'aller', th: H, info: 'aorte' });
seg({ id: 'ao_desc', pts: [[0.78, 1.6, -1.0], [0.65, 0.2, -1.1], [0.4, -1.6, -1.05]], r: [0.21, 0.19], o2: 'rich', dir: 'aller', th: H, info: 'aorte' });
circuit('coeur', ['vcs', 'od_a', 'vd_p', 'tp', 'ap_d']);
circuit('coeur', ['vci', 'od_b', 'vd_p', 'tp', 'ap_g']);
for (const v of ['vp_ds', 'vp_di', 'vp_gs', 'vp_gi']) circuit('coeur', [v, 'og_p', 'vg_p', 'ao_asc', 'ao_crosse', 'ao_desc'], 0.6);

/* ---------- conduction électrique ---------- */
const cond = new THREE.Group(); heart.add(cond); cond.visible = false;
const condPaths = {};
function condTube(id, pts, info, r = 0.022) {
  const c = curveOf(pts); condPaths[id] = c;
  const m = addMesh(tubeGeo(c, () => r, 40, 8), basic([1.6, 1.15, 0.2], 0.9, true), { info, prio: 4, parent: cond });
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
const saNode = addMesh(sphereGeo, basic([2.4, 1.7, 0.3], 1, true), { info: 'noeud_sinusal', pos: SA, prio: 5, parent: cond }); saNode.scale.setScalar(0.075); saNode.renderOrder = 21;
const avNode = addMesh(sphereGeo, basic([2.4, 1.7, 0.3], 1, true), { info: 'noeud_av', pos: AV, prio: 5, parent: cond }); avNode.scale.setScalar(0.065); avNode.renderOrder = 21;
addLabel('Nœud sinusal', [-1.6, 1.3, 0.4], { info: 'noeud_sinusal', owner: cond });
addLabel('Nœud auriculo-ventriculaire', [-0.95, -0.25, 0.55], { info: 'noeud_av', owner: cond });
addLabel('Faisceau de His', [0.5, -0.15, 0.75], { info: 'his', owner: cond });
addLabel('Réseau de Purkinje', [1.3, -1.25, 0.45], { info: 'purkinje', owner: cond });
const pulseMat = basic([4, 3.0, 0.8], 1, true);
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
function snapTo(targets, pts, center, off = 0.05) {
  const rc = new THREE.Raycaster(), c = V3(center);
  return pts.map((p) => {
    const P = V3(p), dir = P.clone().sub(c).normalize();
    rc.set(c.clone().addScaledVector(dir, 8), dir.clone().negate());
    const hit = rc.intersectObjects(targets, false)[0];
    return hit ? hit.point.clone().addScaledVector(dir, off) : P;
  });
}
const snap = (pts) => snapTo([CH.od.mesh, CH.vd.mesh, CH.og.mesh, CH.vg.mesh, conus], pts, [0.1, -0.1, -0.05]);
const C = ['coronaires'];
const coroRootD = [-0.22, 0.52, 0.22], coroRootG = [0.12, 0.5, -0.08];
seg({ id: 'coro_d', pts: [coroRootD, ...snap([[-0.55, 0.32, 0.6], [-0.95, 0.02, 0.55], [-1.22, -0.35, 0.15], [-1.05, -0.72, -0.45], [-0.5, -0.98, -0.8], [0.1, -1.18, -0.75], [0.6, -1.35, -0.45]])], r: 0.055, o2: 'rich', dir: 'aller', th: C, info: 'coro_d', label: 'Coronaire droite', lt: 0.22 });
const bif = snap([[0.62, 0.42, 0.36]])[0];
seg({ id: 'coro_tc', pts: [coroRootG, [0.4, 0.55, 0.12], bif], r: 0.055, o2: 'rich', dir: 'aller', th: C, info: 'coro_g' });
seg({ id: 'iva', pts: [bif, ...snap([[0.5, 0.05, 0.75], [0.62, -0.55, 0.8], [0.95, -1.1, 0.55], [1.15, -1.42, 0.2]])], r: [0.055, 0.038], o2: 'rich', dir: 'aller', th: C, info: 'iva', label: 'IVA', lt: 0.45 });
seg({ id: 'circ', pts: [bif, ...snap([[1.05, 0.18, 0.1], [1.22, -0.1, -0.35], [0.9, -0.28, -0.82]])], r: [0.052, 0.038], o2: 'rich', dir: 'aller', th: C, info: 'coro_g', label: 'Circonflexe', lt: 0.4 });
seg({ id: 'cap_myo', pts: snap([[1.15, -1.42, 0.2], [1.12, -1.2, 0.5], [0.95, -1.0, 0.68]]), o2: 'rp', dir: 'cap', th: C });
seg({ id: 'gvc', pts: snap([[0.95, -1.0, 0.68], [0.72, -0.48, 0.86], [0.62, 0.1, 0.8], [0.9, 0.38, 0.32], [1.18, 0.05, -0.25], [0.8, -0.3, -0.88], [0.05, -0.38, -0.98], [-0.6, -0.22, -0.72], [-0.88, -0.05, -0.38]]), r: 0.055, o2: 'poor', dir: 'retour', th: C, info: 'sinus_coro', label: 'Sinus coronaire', lt: 0.82 });
seg({ id: 'cap_d', pts: snap([[0.6, -1.35, -0.45], [0.35, -0.85, -0.9], [0.05, -0.4, -0.98]]), o2: 'rp', dir: 'cap', th: C });
seg({ id: 'cap_circ', pts: snap([[0.9, -0.28, -0.82], [0.7, -0.5, -0.88], [0.6, -0.3, -0.9]]), o2: 'rp', dir: 'cap', th: C });
circuit('coronaires', [['ao_asc', 0, 0.1], 'coro_tc', 'iva', 'cap_myo', 'gvc', 'od_b'], 1.6);
circuit('coronaires', [['ao_asc', 0, 0.1], 'coro_d', 'cap_d', ['gvc', [0.05, -0.38, -0.98], 1], 'od_b'], 1.6);
circuit('coronaires', [['ao_asc', 0, 0.1], 'coro_tc', 'circ', 'cap_circ', ['gvc', [0.8, -0.3, -0.88], 1], 'od_b'], 1.4);

/* =========================================================================
   SILHOUETTE DU CORPS (proportions d'un adulte de 1,75 m, homme ou femme)
   ========================================================================= */
const bodies = { h: new THREE.Group(), f: new THREE.Group() };
const bodyMats = {};
const SKIN = { h: 0xd8a585, f: 0xe2b294 };
function buildBody(sx) {
  const G = bodies[sx]; scene.add(G);
  const fem = sx === 'f';
  const m = mat({ color: SKIN[sx], opacity: 0.08, rim: 0x9a6e55, rimStr: 0.5, rough: 0.6, clear: 0, sheen: 0 });
  bodyMats[sx] = m;
  // Tronc : [y, demi-largeur, demi-profondeur, centre z]
  const T = fem
    ? [[-9.45, 0.9, 0.6, -0.55], [-9.05, 2.55, 1.45, -0.6], [-8.3, 3.55, 2.0, -0.65], [-7.2, 3.8, 2.2, -0.6], [-6.0, 3.45, 2.05, -0.45], [-4.7, 2.75, 1.85, -0.35], [-3.5, 2.5, 1.75, -0.4], [-2.0, 2.75, 1.9, -0.55], [-0.6, 3.0, 2.05, -0.65], [0.8, 3.1, 2.1, -0.7], [1.9, 3.2, 2.0, -0.75], [2.55, 3.55, 1.7, -0.75], [3.05, 3.15, 1.35, -0.75], [3.45, 1.7, 1.05, -0.72], [3.75, 0.95, 0.9, -0.7]]
    : [[-9.45, 0.9, 0.6, -0.55], [-9.05, 2.45, 1.4, -0.6], [-8.3, 3.25, 1.9, -0.65], [-7.2, 3.4, 2.05, -0.6], [-6.0, 3.15, 2.0, -0.45], [-4.7, 2.95, 1.95, -0.35], [-3.5, 2.85, 1.9, -0.4], [-2.0, 3.1, 2.05, -0.55], [-0.6, 3.35, 2.25, -0.65], [0.8, 3.45, 2.3, -0.7], [1.9, 3.6, 2.2, -0.75], [2.55, 4.0, 1.85, -0.75], [3.05, 3.55, 1.45, -0.75], [3.45, 1.9, 1.1, -0.72], [3.75, 1.05, 0.95, -0.7]];
  const torsoC = new THREE.CatmullRomCurve3(T.slice().reverse().map((r) => new THREE.Vector3(0, r[0], r[3])));
  G.add(new THREE.Mesh(loftGeo(torsoC, (t, P) => tableAt(T, P.y).slice(0, 2), { tub: 120, rad: 48, exp: 2.5 }), m));
  // Cou et tête
  G.add(new THREE.Mesh(loftGeo(curveOf([[0, 5.7, -0.75], [0, 4.5, -0.68], [0, 3.4, -0.68]]), (t) => (fem ? [lerp(1.0, 1.1, t), lerp(0.98, 1.05, t)] : [lerp(1.12, 1.25, t), lerp(1.08, 1.15, t)]), { tub: 30, rad: 36 }), m));
  const head = new THREE.Mesh(blobGeo(fem ? [1.42, 2.15, 1.9] : [1.5, 2.25, 1.98], {
    detail: 5, noise: 0, deform: (v, u) => {
      if (u.y < 0) { const k = -u.y; v.x *= 1 - 0.34 * k * k; v.z *= u.z < 0 ? 1 - 0.5 * k : 1 - 0.12 * k; }
      if (u.y < -0.55 && u.z > 0.25) v.z += 0.14;
      const d = Math.hypot(u.x / 0.12, (u.y + 0.05) / 0.22);
      if (u.z > 0 && d < 1) v.z += 0.32 * (1 - d * d) * u.z;
    },
  }), m);
  head.position.set(0, 7.15, -0.4); G.add(head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(blobGeo([0.14, 0.42, 0.28], { detail: 3, noise: 0 }), m); ear.position.set(s * (fem ? 1.43 : 1.5), 7.1, -0.5); G.add(ear);
    const k = fem ? 0.88 : 1;
    const arm = new THREE.Mesh(loftGeo(curveOf([[s * 3.95, 2.6, -0.6], [s * 4.1, 0.5, -0.65], [s * 4.25, -2.0, -0.65], [s * 4.35, -4.0, -0.6], [s * 4.55, -6.5, -0.45], [s * 4.75, -9.0, -0.3]]),
      (t) => tableAt([[0, 1.0, 1.05], [0.1, 0.98, 1.0], [0.35, 0.85, 0.9], [0.55, 0.68, 0.7], [0.62, 0.8, 0.72], [0.75, 0.72, 0.6], [0.92, 0.56, 0.4], [1, 0.52, 0.34]], t).map((x) => x * k), { tub: 90, rad: 32 }), m);
    G.add(arm); registerPick(arm, 'membres_sup', 0);
    // Main (paume vers l'avant) et doigts
    const W = [s * 4.8, -9.0, -0.3];
    const palm = new THREE.Mesh(blobGeo([0.5 * k, 0.62, 0.17], { detail: 3, noise: 0 }), m); palm.position.set(W[0], W[1] - 0.75, W[2]); G.add(palm);
    [[-0.33, 1.25], [-0.11, 1.6], [0.11, 1.72], [0.33, 1.5]].forEach(([dx, L]) => {
      const x = W[0] + s * dx * k, y0 = W[1] - 1.3;
      G.add(new THREE.Mesh(loftGeo(curveOf([[x, y0, W[2]], [x + s * dx * 0.15, y0 - L * 0.55, W[2] + 0.03], [x + s * dx * 0.2, y0 - L, W[2] + 0.06]]), (t) => [lerp(0.11, 0.08, t) * k, lerp(0.1, 0.07, t) * k], { tub: 12, rad: 12 }), m));
    });
    G.add(new THREE.Mesh(loftGeo(curveOf([[W[0] + s * 0.42 * k, W[1] - 0.45, W[2] + 0.1], [W[0] + s * 0.7 * k, W[1] - 0.95, W[2] + 0.25], [W[0] + s * 0.85 * k, W[1] - 1.45, W[2] + 0.32]]), (t) => [lerp(0.15, 0.09, t) * k, lerp(0.13, 0.08, t) * k], { tub: 12, rad: 12 }), m));
    const leg = new THREE.Mesh(loftGeo(curveOf([[s * 1.75, -7.3, -0.5], [s * 1.7, -10.5, -0.35], [s * 1.6, -14.0, -0.3], [s * 1.55, -16.0, -0.3], [s * 1.52, -19.0, -0.5], [s * 1.48, -22.0, -0.55], [s * 1.45, -24.4, -0.55]]),
      (t) => tableAt([[0, fem ? 1.72 : 1.6, fem ? 1.75 : 1.65], [0.12, fem ? 1.6 : 1.5, 1.55], [0.3, 1.25, 1.3], [0.45, 1.0, 1.05], [0.51, 0.95, 1.0], [0.58, 0.98, 1.1], [0.66, 1.0, 1.15], [0.8, 0.78, 0.85], [0.95, 0.58, 0.6], [1, 0.55, 0.55]], t).map((x) => (fem ? x * 0.95 : x)), { tub: 110, rad: 36 }), m);
    G.add(leg); registerPick(leg, 'membres_inf', 0);
    const foot = new THREE.Mesh(blobGeo([0.55, 0.42, 1.75], { detail: 4, noise: 0, deform: (v, u) => { if (u.z > 0) { v.y *= 1 - 0.5 * u.z; v.x *= 1 + 0.12 * u.z; } if (u.y < 0) v.y *= 0.45; } }), m);
    foot.position.set(s * 1.55, -25.2, 0.55); G.add(foot);
    if (fem) {
      const br = new THREE.Mesh(blobGeo([0.72, 0.68, 0.5], { detail: 4, noise: 0, deform: (v, u) => { if (u.y < 0) v.z *= 1.1; } }), m);
      br.position.set(s * 1.65, -0.05, 1.2); G.add(br);
    }
  }
}
buildBody('h'); buildBody('f');

/* =========================================================================
   ORGANES ET VAISSEAUX DES THÈMES
   ========================================================================= */
/* ---------- poumons ---------- */
{
  const P = 'poumons';
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'd' : 'g';
    const lung = addMesh(blobGeo([1.12, 2.45, 1.85], {
      noise: 0.03, deform: (v, u) => {
        const med = -u.x * s;
        if (med > 0) v.x *= 1 - 0.5 * med;
        const top = Math.max(0, u.y); v.x *= 1 - 0.32 * top * top; v.z *= 1 - 0.32 * top * top;
        if (u.y < -0.2) v.y += 0.7 * Math.max(0, 1 - Math.hypot(u.x, u.z) * 1.4) * (-u.y - 0.2);
        if (s > 0 && med > 0 && u.z > 0) v.x += 0.5 * med * u.z * smooth(0.3, -0.5, u.y);
      },
    }), organ('lung', { opacity: 0.6, rough: 0.7, clear: 0.2, tex: [2.6, 0.45, 0.025, 2] }), { th: P, info: 'poumons', pos: [2.25 * s, 1.0, -0.6], prio: 1 });
    addLabel(s < 0 ? 'Poumon droit (3 lobes)' : 'Poumon gauche (2 lobes)', [2.9 * s, 3.1, -0.3], { info: 'poumons', owner: lung });
    lung.updateMatrixWorld(true);
    // Scissures (séparent les lobes)
    let nf = 0;
    const fis = (pts) => {
      const f = seg({ id: `fis_${k}${nf++}`, pts: snapTo([lung], pts, [2.25 * s, 1.0, -0.6], 0.01), r: 0.02, kind: 'air', o2: 'rich', dir: 'int', tube: true, th: [P], info: 'poumons' });
      f.mesh.material.color.setHex(0x8a4f5c); f.mesh.material.userData.u.uStripes.value = 0;
    };
    fis([[2.0 * s, 2.6, -2.2], [2.9 * s, 1.6, -1.2], [3.2 * s, 0.4, 0.0], [2.8 * s, -0.6, 0.9], [2.2 * s, -0.9, 1.1]]);
    if (s < 0) fis([[2.0 * s, 0.9, 1.3], [2.8 * s, 0.95, 0.7], [3.3 * s, 0.8, -0.2]]);

    const hA = [1.62 * s, 1.35, -0.55], hVs = [1.6 * s, 0.9, -0.8], hVi = [1.6 * s, 0.42, -0.8];
    seg({ id: `apx_${k}`, pts: [pointOn(`ap_${k}`, 1), hA], r: 0.12, o2: 'poor', dir: 'aller', th: [P], info: 'art_pulm' });
    seg({ id: `vpx_${k}s`, pts: [hVs, pointOn(`vp_${k}s`, 0)], r: 0.085, o2: 'rich', dir: 'retour', th: [P], info: 'veines_pulm' });
    seg({ id: `vpx_${k}i`, pts: [hVi, pointOn(`vp_${k}i`, 0)], r: 0.085, o2: 'rich', dir: 'retour', th: [P], info: 'veines_pulm' });
    const targets = [[2.1 * s, 2.9, -0.6], [2.95 * s, 1.0, -0.4], [2.35 * s, -0.75, -0.3]];
    targets.forEach((t, i) => {
      const mid = [lerp(hA[0], t[0], 0.5) + 0.15 * s, lerp(hA[1], t[1], 0.5) + 0.1, lerp(hA[2], t[2], 0.5) + 0.25];
      const tv = [t[0] - 0.05 * s, t[1] - 0.3, t[2] - 0.35];
      const hV = i === 0 ? hVs : hVi;
      const vmid = [lerp(tv[0], hV[0], 0.5) + 0.12 * s, lerp(tv[1], hV[1], 0.5) - 0.1, lerp(tv[2], hV[2], 0.5) - 0.25];
      seg({ id: `apb_${k}${i}`, pts: [hA, mid, t], r: [0.08, 0.035], o2: 'poor', dir: 'aller', th: [P], info: 'art_pulm' });
      seg({ id: `cpl_${k}${i}`, pts: [t, [t[0] + 0.3 * s, t[1] + 0.15, t[2] + 0.2], [t[0] + 0.28 * s, t[1] - 0.25, t[2] + 0.05], tv], o2: 'pr', dir: 'cap', th: [P] });
      seg({ id: `vpb_${k}${i}`, pts: [tv, vmid, hV], r: [0.035, 0.08], o2: 'rich', dir: 'retour', th: [P], info: 'veines_pulm' });
      for (let j = 0; j < 2; j++) {
        const a = pointOn(`apb_${k}${i}`, 0.55 + j * 0.2), e = a.clone().add(new THREE.Vector3((0.3 + rnd() * 0.4) * s, (rnd() - 0.5) * 0.9, (rnd() - 0.3) * 0.6));
        seg({ id: `apd_${k}${i}${j}`, pts: [a, a.clone().lerp(e, 0.5).add(new THREE.Vector3(0, 0.08, 0)), e], r: [0.025, 0.012], o2: 'poor', dir: 'aller', th: [P] });
        const b = pointOn(`vpb_${k}${i}`, 0.25 + j * 0.25), f = b.clone().add(new THREE.Vector3((0.25 + rnd() * 0.4) * s, (rnd() - 0.5) * 0.9, (rnd() - 0.6) * 0.5));
        seg({ id: `vpd_${k}${i}${j}`, pts: [f, f.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -0.08, 0)), b], r: [0.012, 0.025], o2: 'rich', dir: 'retour', th: [P] });
      }
      circuit(P, ['vd_p', 'tp', `ap_${k}`, `apx_${k}`, `apb_${k}${i}`, `cpl_${k}${i}`, `vpb_${k}${i}`, i === 0 ? `vpx_${k}s` : `vpx_${k}i`, i === 0 ? `vp_${k}s` : `vp_${k}i`, 'og_p', 'vg_p', 'ao_asc'], 0.8);
    });
  }
  seg({ id: 'trachee', pts: [[0, 5.0, 0.1], [0, 3.6, -0.4], [0, 2.55, -0.65]], r: 0.15, kind: 'air', o2: 'rich', dir: 'int', tube: true, th: [P], info: 'trachee', label: 'Trachée', lt: 0.3 });
  seg({ id: 'bronche_d', pts: [[0, 2.55, -0.65], [-0.8, 2.0, -0.62], [-1.6, 1.55, -0.6]], r: [0.12, 0.08], kind: 'air', o2: 'rich', dir: 'int', tube: true, th: [P], info: 'trachee' });
  seg({ id: 'bronche_g', pts: [[0, 2.55, -0.65], [0.85, 2.05, -0.62], [1.6, 1.55, -0.6]], r: [0.11, 0.075], kind: 'air', o2: 'rich', dir: 'int', tube: true, th: [P], info: 'trachee' });
}

/* ---------- cerveau ---------- */
{
  const T = ['cerveau'];
  const brain = addMesh(blobGeo([1.32, 1.1, 1.62], {
    noise: 0, deform: (v, u) => {
      v.y -= 0.24 * Math.exp(-((u.x / 0.06) ** 2)) * smooth(-0.3, 0.5, u.y);
      if (u.y < -0.2) v.y *= 0.8;
      if (u.y < 0.1 && Math.abs(u.x) > 0.55 && u.z > -0.3 && u.z < 0.6) v.y -= 0.18 * (Math.abs(u.x) - 0.55);
    },
  }), organ('brain', { opacity: 0.92, rough: 0.55, clear: 0.35, tex: [3.4, 0.35, 0.05, 1] }), { th: 'cerveau', info: 'cerveau', pos: [0, 7.75, -0.45], prio: 1 });
  addMesh(blobGeo([0.72, 0.42, 0.55], { detail: 4, noise: 0 }), organ('brain', { opacity: 0.85, tex: [7, 0.3, 0.03, 1] }), { th: 'cerveau', info: 'cerveau', pos: [0, 6.95, -1.45], prio: 1 });
  addMesh(tubeGeo(curveOf([[0, 7.2, -0.75], [0, 6.5, -0.85], [0, 5.8, -0.85]]), (t) => lerp(0.26, 0.18, t), 20, 14), organ('brain', { opacity: 0.85, tex: [4, 0.3, 0.005, 0] }), { th: 'cerveau', info: 'cerveau', prio: 1 });
  addLabel('Cerveau', [1.7, 8.8, -0.3], { info: 'cerveau', owner: brain });
  seg({ id: 'tabc', pts: [{ from: 'ao_crosse', t: 0.18 }, [-0.4, 2.6, -0.15], [-0.6, 3.0, -0.2]], r: 0.12, o2: 'rich', dir: 'aller', th: ['cerveau', 'bras'], info: 'tabc', label: 'Tronc brachio-céphalique', lt: 0.5 });
  seg({ id: 'car_d', pts: [[-0.6, 3.0, -0.2], [-0.62, 4.5, -0.05], [-0.55, 6.0, -0.1], [-0.42, 6.75, -0.2]], r: 0.08, o2: 'rich', dir: 'aller', th: T, info: 'carotides', label: 'Carotide commune', lt: 0.45 });
  seg({ id: 'car_g', pts: [{ from: 'ao_crosse', t: 0.38 }, [0.4, 3.1, -0.3], [0.62, 4.5, -0.05], [0.55, 6.0, -0.1], [0.42, 6.75, -0.2]], r: 0.08, o2: 'rich', dir: 'aller', th: T, info: 'carotides' });
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'd' : 'g';
    seg({ id: `cap_br_${k}`, pts: [[0.42 * s, 6.75, -0.2], [0.6 * s, 7.5, 0.5], [0.9 * s, 8.3, -0.3], [0.7 * s, 7.85, -1.4], [0.8 * s, 6.95, -0.85]], o2: 'rp', dir: 'cap', th: T });
  }
  seg({ id: 'jug_d', pts: [[-0.8, 6.95, -0.85], [-0.9, 5.5, -0.4], [-0.97, 4.0, -0.25], [-1.0, 2.72, -0.08]], r: 0.1, o2: 'poor', dir: 'retour', th: T, info: 'jugulaires', label: 'Jugulaire interne', lt: 0.35 });
  seg({ id: 'jug_g', pts: [[0.8, 6.95, -0.85], [0.9, 5.5, -0.4], [0.92, 4.0, -0.25], [0.85, 3.0, -0.2]], r: 0.1, o2: 'poor', dir: 'retour', th: T, info: 'jugulaires' });
  seg({ id: 'tvbc_g', pts: [[0.85, 3.0, -0.2], [0.2, 2.86, -0.1], [-1.0, 2.72, -0.08]], r: 0.11, o2: 'poor', dir: 'retour', th: ['cerveau', 'bras'], info: 'vcs', label: 'Tronc veineux brachio-céphalique', lt: 0.35 });
  circuit('cerveau', ['ao_asc', ['ao_crosse', 0, 0.18], 'tabc', 'car_d', 'cap_br_d', 'jug_d', 'vcs', 'od_a']);
  circuit('cerveau', ['ao_asc', ['ao_crosse', 0, 0.38], 'car_g', 'cap_br_g', 'jug_g', 'tvbc_g', 'vcs', 'od_a']);
}

/* ---------- membres supérieurs ---------- */
{
  const T = ['bras'];
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'd' : 'g';
    const subStart = s < 0 ? [-0.6, 3.0, -0.2] : { from: 'ao_crosse', t: 0.55 };
    seg({ id: `sub_${k}`, pts: [subStart, [1.4 * s, 3.25, -0.45], [2.6 * s, 3.2, -0.55], [3.55 * s, 2.45, -0.6]], r: 0.1, o2: 'rich', dir: 'aller', th: T, info: 'art_bras', label: s < 0 ? 'Artère subclavière' : null, lt: 0.6 });
    seg({ id: `hum_${k}`, pts: [[3.55 * s, 2.45, -0.6], [3.75 * s, 0.3, -0.45], [3.95 * s, -2.3, -0.3], [4.15 * s, -4.0, -0.05]], r: 0.085, o2: 'rich', dir: 'aller', th: T, info: 'art_bras', label: s < 0 ? 'Artère humérale' : null, lt: 0.5 });
    seg({ id: `rad_${k}`, pts: [[4.15 * s, -4.0, -0.05], [4.45 * s, -6.5, -0.05], [4.98 * s, -8.85, -0.05]], r: [0.07, 0.055], o2: 'rich', dir: 'aller', th: T, info: 'art_bras', label: s < 0 ? 'Artère radiale' : null, lt: 0.6 });
    seg({ id: `cap_m_${k}`, pts: [[4.98 * s, -8.85, -0.05], [4.98 * s, -9.8, -0.15], [4.82 * s, -10.75, -0.22], [4.62 * s, -9.9, -0.28], [4.62 * s, -8.95, -0.2]], o2: 'rp', dir: 'cap', th: T });
    const vEnd = s < 0 ? [[-1.4, 2.95, -0.3], [-1.0, 2.72, -0.08]] : [[1.4, 3.05, -0.35], [0.85, 3.0, -0.2]];
    seg({ id: `vb_${k}`, pts: [[4.62 * s, -8.95, -0.2], [4.45 * s, -6.5, 0.12], [4.12 * s, -4.05, 0.28], [3.82 * s, -1.5, 0.05], [3.6 * s, 1.0, -0.4], [3.4 * s, 2.45, -0.78], [2.4 * s, 3.05, -0.6], ...vEnd], r: [0.06, 0.11], o2: 'poor', dir: 'retour', th: T, info: 'veines_bras', label: s < 0 ? 'Veines du pli du coude' : null, lt: 0.24 });
    circuit('bras', s < 0 ? ['ao_asc', ['ao_crosse', 0, 0.18], 'tabc', 'sub_d', 'hum_d', 'rad_d', 'cap_m_d', 'vb_d', 'vcs', 'od_a'] : ['ao_asc', ['ao_crosse', 0, 0.55], 'sub_g', 'hum_g', 'rad_g', 'cap_m_g', 'vb_g', 'tvbc_g', 'vcs', 'od_a']);
  }
}

/* ---------- foie et tube digestif ---------- */
const ABDO = ['digestif', 'reins', 'jambes', 'pelvis'];
seg({ id: 'ao_abdo', pts: [[0.4, -1.6, -1.05], [0.25, -2.8, -0.95], [0.12, -4.0, -0.82], [0.05, -4.9, -0.75]], r: [0.19, 0.16], o2: 'rich', dir: 'aller', th: ABDO, info: 'aorte', label: 'Aorte abdominale', lt: 0.62 });
seg({ id: 'vci_abdo', pts: [[-0.5, -5.2, -0.8], [-0.55, -4.2, -0.9], [-0.6, -3.0, -0.95], [-0.82, -1.6, -0.55]], r: [0.17, 0.2], o2: 'poor', dir: 'retour', th: ABDO, info: 'vci', label: 'Veine cave inférieure', lt: 0.38 });
{
  const T = ['digestif'];
  const liver = addMesh(blobGeo([2.1, 1.05, 1.45], { noise: 0.025, deform: (v, u) => { const k = 1 - 0.62 * smooth(-0.4, 1, u.x); v.y *= k; v.z *= 0.6 + 0.4 * k; v.y *= u.y < 0 ? 0.62 : 1.05; } }),
    organ('liver', { opacity: 0.92, rough: 0.3, clear: 0.9, tex: [2.2, 0.5, 0.01, 0] }), { th: 'digestif', info: 'foie', pos: [-1.3, -2.15, 0.0], rot: [0, 0, -0.12], prio: 1 });
  addLabel('Foie', [-2.9, -1.6, 0.6], { info: 'foie', owner: liver });
  const spleen = addMesh(blobGeo([0.42, 0.85, 0.3], { detail: 4 }), organ('spleen', { opacity: 0.95, tex: [4, 0.4, 0.006, 0] }), { th: 'digestif', info: 'rate', pos: [2.75, -1.75, -1.25], rot: [0, 0.6, 0.3], prio: 1 });
  addLabel('Rate', [3.3, -1.1, -1.2], { info: 'rate', owner: spleen });
  seg({ id: 'oeso', pts: [[0, 5.0, -0.55], [0.05, 2.5, -1.15], [0.15, 0.5, -1.45], [0.4, -0.8, -1.35], [0.75, -1.35, -0.6]], r: 0.13, kind: 'air', o2: 'rich', dir: 'int', tube: true, th: T, info: 'oesophage', label: 'Œsophage', lt: 0.15 });
  SEG.oeso.mesh.material.color.setHex(R.oeso[0]); SEG.oeso.mesh.material.userData.u.uC2.value.setHex(R.oeso[1]); SEG.oeso.mesh.material.userData.u.uStripes.value = 0;
  const stomach = addMesh(tubeGeo(curveOf([[0.75, -1.35, -0.6], [1.6, -1.5, 0.15], [2.15, -2.2, 0.4], [1.8, -3.1, 0.6], [1.0, -3.35, 0.7], [0.25, -3.0, 0.6]]), (t) => 0.2 + 0.42 * Math.sin(Math.PI * Math.min(1, t * 1.15)), 70, 26),
    organ('stomach', { opacity: 0.88, tex: [3, 0.4, 0.01, 0] }), { th: 'digestif', info: 'intestin', prio: 1 });
  addLabel('Estomac', [2.85, -2.6, 0.5], { info: 'intestin', owner: stomach });
  const sp = [[0.25, -3.0, 0.6], [-0.35, -3.4, 0.4], [-0.5, -4.0, 0.3], [0.35, -4.25, 0.45]];
  let row = 0;
  for (let y = -4.55; y >= -7.0; y -= 0.36, row++) {
    const d = row % 2 ? -1 : 1;
    for (let k = 0; k <= 4; k++) sp.push([d * (-1.4 + k * 0.7), y + 0.07 * Math.sin(k * 2 + row), 0.75 + 0.25 * Math.sin(k * 1.7 + row * 1.3)]);
  }
  const intest = addMesh(tubeGeo(curveOf(sp), () => 0.16, 500, 12), organ('intestine', { opacity: 0.88, tex: [5, 0.35, 0.008, 0] }), { th: 'digestif', info: 'intestin', prio: 1 });
  addLabel('Intestin grêle', [1.3, -6.0, 1.3], { info: 'intestin', owner: intest });
  const colon = addMesh(tubeGeo(curveOf([[-2.0, -6.9, 0.55], [-2.25, -5.0, 0.5], [-2.3, -3.3, 0.4], [-1.0, -3.7, 1.05], [0.4, -4.1, 1.2], [1.6, -3.4, 0.85], [2.35, -2.9, 0.25], [2.4, -4.6, 0.3], [2.25, -6.4, 0.35], [1.4, -7.4, 0.6], [0.4, -7.2, 0.2], [0, -7.9, -0.75], [0, -8.9, -0.6]]), (t) => 0.33 - 0.08 * smooth(0.8, 1, t), 260, 18),
    organ('colon', { opacity: 0.85, tex: [3.5, 0.35, 0.008, 0] }), { th: 'digestif', info: 'intestin', prio: 1 });
  addLabel('Côlon', [-2.95, -5.0, 0.6], { info: 'intestin', owner: colon });

  seg({ id: 'tc', pts: [{ from: 'ao_abdo', t: 0.08 }, [0.3, -1.95, -0.5], [0.25, -2.0, -0.2]], r: 0.075, o2: 'rich', dir: 'aller', th: T, info: 'art_digest', label: 'Tronc cœliaque', lt: 0.4 });
  seg({ id: 'a_hep', pts: [[0.25, -2.0, -0.2], [-0.3, -2.15, 0.0], [-0.85, -2.35, 0.0]], r: 0.055, o2: 'rich', dir: 'aller', th: T, info: 'art_digest', label: 'Artère hépatique', lt: 0.6 });
  seg({ id: 'a_gast', pts: [[0.25, -2.0, -0.2], [0.85, -2.05, 0.15], [1.4, -2.35, 0.45]], r: 0.055, o2: 'rich', dir: 'aller', th: T, info: 'art_digest' });
  seg({ id: 'a_spl', pts: [[0.25, -2.0, -0.2], [1.4, -1.95, -0.7], [2.45, -1.7, -1.15]], r: 0.06, o2: 'rich', dir: 'aller', th: T, info: 'art_digest' });
  seg({ id: 'ams', pts: [{ from: 'ao_abdo', t: 0.22 }, [0.32, -2.6, -0.3], [0.25, -3.6, 0.4], [0.1, -4.6, 0.8]], r: 0.075, o2: 'rich', dir: 'aller', th: T, info: 'art_digest', label: 'Artère mésentérique sup.', lt: 0.55 });
  seg({ id: 'cap_int', pts: [[0.1, -4.6, 0.8], [-1.0, -4.5, 0.95], [-1.3, -5.5, 0.9], [0.0, -6.4, 0.95], [1.3, -5.6, 0.9], [1.0, -4.5, 0.95], [0.25, -4.1, 0.85]], o2: 'rp', dir: 'cap', th: T });
  seg({ id: 'cap_sto', pts: [[1.4, -2.35, 0.45], [1.95, -2.7, 0.55], [1.6, -3.1, 0.65], [0.9, -2.95, 0.6]], o2: 'rp', dir: 'cap', th: T });
  seg({ id: 'cap_spl', pts: [[2.45, -1.7, -1.15], [2.85, -1.2, -1.3], [3.0, -2.0, -1.3], [2.55, -2.3, -1.1]], o2: 'rp', dir: 'cap', th: T });
  seg({ id: 'v_spl2', pts: [[2.55, -2.3, -1.1], [1.6, -2.7, -0.6], [0.9, -2.95, 0.6]], r: 0.065, o2: 'poor', dir: 'retour', th: T, info: 'veine_porte' });
  seg({ id: 'v_mes', pts: [[0.25, -4.1, 0.85], [0.05, -3.55, 0.55], [-0.05, -3.15, 0.35]], r: 0.08, o2: 'poor', dir: 'retour', th: T, info: 'veine_porte' });
  seg({ id: 'v_spl', pts: [[0.9, -2.95, 0.6], [0.4, -3.05, 0.42], [-0.05, -3.15, 0.35]], r: 0.07, o2: 'poor', dir: 'retour', th: T, info: 'veine_porte' });
  seg({ id: 'veine_porte', pts: [[-0.05, -3.15, 0.35], [-0.45, -2.8, 0.15], [-0.85, -2.5, 0.0]], r: 0.12, o2: 'poor', dir: 'retour', th: T, info: 'veine_porte', label: 'Veine porte', lt: 0.5 });
  seg({ id: 'cap_foie_a', pts: [[-0.85, -2.35, 0.0], [-1.8, -2.2, 0.45], [-2.5, -2.1, -0.2], [-1.7, -1.85, -0.5]], o2: 'rp', dir: 'cap', th: T });
  seg({ id: 'cap_foie_p', pts: [[-0.85, -2.5, 0.0], [-1.6, -2.6, 0.5], [-2.7, -2.4, 0.1], [-2.1, -1.9, -0.45], [-1.7, -1.85, -0.5]], o2: 'poor', dir: 'cap', th: T });
  seg({ id: 'v_hep', pts: [[-1.7, -1.85, -0.5], [-1.2, -1.7, -0.55], [-0.84, -1.62, -0.55]], r: 0.075, o2: 'poor', dir: 'retour', th: T, info: 'veines_hep', label: 'Veines hépatiques', lt: 0.3 });
  seg({ id: 'v_hep2', pts: [[-1.35, -1.75, 0.05], [-1.05, -1.68, -0.3], [-0.84, -1.62, -0.55]], r: 0.06, o2: 'poor', dir: 'retour', th: T, info: 'veines_hep' });
  const A = ['ao_asc', 'ao_crosse', 'ao_desc'];
  circuit('digestif', [...A, ['ao_abdo', 0, 0.08], 'tc', 'a_hep', 'cap_foie_a', 'v_hep', 'vci', 'od_b']);
  circuit('digestif', [...A, ['ao_abdo', 0, 0.22], 'ams', 'cap_int', 'v_mes', 'veine_porte', 'cap_foie_p', 'v_hep', 'vci', 'od_b'], 1.3);
  circuit('digestif', [...A, ['ao_abdo', 0, 0.08], 'tc', 'a_gast', 'cap_sto', 'v_spl', 'veine_porte', 'cap_foie_p', 'v_hep', 'vci', 'od_b'], 0.7);
  circuit('digestif', [...A, ['ao_abdo', 0, 0.08], 'tc', 'a_spl', 'cap_spl', 'v_spl2', 'v_spl', 'veine_porte', 'cap_foie_p', 'v_hep', 'vci', 'od_b'], 0.7);
}

/* ---------- reins ---------- */
{
  const T = ['reins'];
  const A = ['ao_asc', 'ao_crosse', 'ao_desc'];
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'd' : 'g', y = s < 0 ? -3.4 : -3.1;
    const kid = addMesh(blobGeo([0.55, 1.05, 0.36], { detail: 4, noise: 0.015, deform: (v, u) => { const med = -u.x * s; if (med > 0.5) v.x += s * 0.36 * ((med - 0.5) / 0.5) * Math.exp(-((u.y / 0.4) ** 2)); } }),
      organ('kidney', { opacity: 0.95, rough: 0.3, clear: 0.8, tex: [4, 0.45, 0.008, 0] }), { th: 'reins', info: 'reins', pos: [1.4 * s, y, -1.4], rot: [0, -0.4 * s, 0.22 * s], prio: 1 });
    addLabel(s < 0 ? 'Rein droit' : 'Rein gauche', [2.2 * s, y + 0.9, -1.2], { info: 'reins', owner: kid });
    const hil = [0.88 * s, y + 0.05, -1.2];
    seg({ id: `ar_${k}`, pts: [{ from: 'ao_abdo', t: [0.2, -3.1, -0.92] }, [0.5 * s, y + 0.12, -1.05], hil], r: 0.07, o2: 'rich', dir: 'aller', th: T, info: 'art_renales', label: s < 0 ? 'Artère rénale' : null, lt: 0.5 });
    seg({ id: `cap_r_${k}`, pts: [hil, [1.5 * s, y + 0.6, -1.45], [1.85 * s, y - 0.05, -1.5], [1.55 * s, y - 0.7, -1.45], [0.95 * s, y - 0.15, -1.15]], o2: 'rp', dir: 'cap', th: T });
    const vrPts = s < 0 ? [[-0.95, y - 0.15, -1.15], [-0.75, -3.45, -1.0], [-0.6, -3.35, -0.95]] : [[0.95, y - 0.15, -1.15], [0.5, -3.25, -0.55], [-0.1, -3.3, -0.6], [-0.6, -3.35, -0.95]];
    seg({ id: `vr_${k}`, pts: vrPts, r: 0.08, o2: 'poor', dir: 'retour', th: k === 'g' ? ['reins', 'pelvis'] : T, info: 'veines_renales', label: s > 0 ? 'Veine rénale gauche' : null, lt: 0.3 });
    seg({ id: `ur_${k}`, pts: [[0.95 * s, y - 0.45, -1.2], [0.85 * s, -5.5, -0.7], [0.6 * s, -7.4, 0.1], [0.25 * s, -7.95, 0.55]], r: 0.045, kind: 'uro', o2: 'rich', dir: 'int', tube: true, th: T, info: 'ureteres' });
    circuit('reins', [...A, ['ao_abdo', 0, [0.2, -3.1, -0.92]], `ar_${k}`, `cap_r_${k}`, `vr_${k}`, ['vci_abdo', [-0.6, -3.35, -0.95], 1], 'vci', 'od_b'], 1.3);
  }
  const bl = addMesh(blobGeo([0.62, 0.5, 0.55], { detail: 4 }), organ('bladder', { opacity: 0.8, tex: [4, 0.4, 0.006, 0] }), { th: ['reins', 'pelvis'], info: 'ureteres', pos: [0, -8.0, 0.75], prio: 1 });
  addLabel('Vessie', [0.95, -8.4, 0.9], { info: 'ureteres', owner: bl });
}

/* ---------- membres inférieurs ---------- */
{
  const T = ['jambes'];
  const A = ['ao_asc', 'ao_crosse', 'ao_desc', 'ao_abdo'];
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'd' : 'g';
    seg({ id: `il_${k}`, pts: [[0.05, -4.9, -0.75], [0.75 * s, -5.8, -0.65], [1.3 * s, -6.8, -0.2], [1.55 * s, -7.6, 0.55]], r: 0.12, o2: 'rich', dir: 'aller', th: T, info: 'art_jambes', label: s < 0 ? 'Artère iliaque' : null, lt: 0.5 });
    seg({ id: `fem_${k}`, pts: [[1.55 * s, -7.6, 0.55], [1.45 * s, -10.0, 0.45], [1.3 * s, -13.0, -0.1], [1.4 * s, -15.0, -0.85], [1.5 * s, -16.0, -0.95]], r: 0.1, o2: 'rich', dir: 'aller', th: T, info: 'art_jambes', label: s < 0 ? 'Artère fémorale' : null, lt: 0.3 });
    seg({ id: `tib_${k}`, pts: [[1.5 * s, -16.0, -0.95], [1.55 * s, -17.3, -0.6], [1.6 * s, -21.0, -0.1], [1.55 * s, -23.9, 0.0], [1.55 * s, -24.7, 0.55], [1.55 * s, -24.95, 1.35]], r: [0.08, 0.055], o2: 'rich', dir: 'aller', th: T, info: 'art_jambes', label: s < 0 ? 'Artère tibiale' : null, lt: 0.4 });
    seg({ id: `cap_p_${k}`, pts: [[1.55 * s, -24.95, 1.35], [1.65 * s, -25.1, 2.0], [1.4 * s, -25.2, 1.9], [1.3 * s, -25.15, 1.0], [1.3 * s, -24.8, 0.2]], o2: 'rp', dir: 'cap', th: T });
    seg({ id: `vf_${k}`, pts: [[1.3 * s, -24.8, 0.2], [1.32 * s, -23.9, -0.35], [1.4 * s, -21.0, -0.6], [1.45 * s, -17.3, -0.9], [1.38 * s, -16.0, -1.05], [1.27 * s, -15.0, -0.95], [1.18 * s, -13.0, -0.15], [1.28 * s, -10.0, 0.4], [1.32 * s, -7.6, 0.5], [1.1 * s, -6.8, -0.3], [0.6 * s, -5.8, -0.75], [-0.5, -5.2, -0.8]], r: [0.075, 0.14], o2: 'poor', dir: 'retour', th: T, info: 'veines_jambes', label: s < 0 ? 'Veine fémorale' : null, lt: 0.66 });
    seg({ id: `saph_${k}`, pts: [[1.18 * s, -24.55, 0.4], [1.1 * s, -21.0, -0.05], [1.0 * s, -17.5, -0.45], [0.98 * s, -16.0, -0.6], [1.02 * s, -13.0, 0.2], [1.12 * s, -10.0, 0.75], [1.22 * s, -8.0, 0.75], [1.32 * s, -7.7, 0.5]], r: [0.045, 0.06], o2: 'poor', dir: 'retour', th: T, info: 'saphene', label: s > 0 ? 'Grande saphène' : null, lt: 0.45 });
    circuit('jambes', [...A, `il_${k}`, `fem_${k}`, `tib_${k}`, `cap_p_${k}`, `vf_${k}`, 'vci_abdo', 'vci', 'od_b'], 1.0);
    circuit('jambes', [...A, `il_${k}`, `fem_${k}`, `tib_${k}`, `cap_p_${k}`, `saph_${k}`, [`vf_${k}`, [1.32 * s, -7.6, 0.5], 1], 'vci_abdo', 'vci', 'od_b'], 0.45);
  }
}

/* ---------- pelvis (selon le sexe) ---------- */
{
  const T = ['pelvis'];
  const A = ['ao_asc', 'ao_crosse', 'ao_desc'];
  const gonStart = [0.18, -3.4, -0.86];
  const toCave = (s) => (s < 0 ? [['vci_abdo', [-0.57, -3.8, -0.9], 1]] : [['vr_g', [0.75, -3.25, -0.82], 1], ['vci_abdo', [-0.6, -3.35, -0.95], 1]]);
  const vEndOf = (s) => (s < 0 ? [[-0.57, -3.8, -0.9]] : [[0.8, -3.6, -0.95], [0.75, -3.25, -0.82]]);
  // Femme : utérus, trompes, ovaires
  const ut = addMesh(blobGeo([0.5, 0.72, 0.38], { detail: 4, deform: (v, u) => { if (u.y < 0) { v.x *= 1 - 0.5 * -u.y; v.z *= 1 - 0.3 * -u.y; } } }),
    organ('uterus', { opacity: 0.9, tex: [4, 0.35, 0.006, 0] }), { th: T, sex: 'f', info: 'uterus', pos: [0, -7.25, 0.2], rot: [0.65, 0, 0], prio: 1 });
  addLabel('Utérus', [0.9, -6.55, 0.6], { info: 'uterus', owner: ut });
  addMesh(tubeGeo(curveOf([[0, -7.75, -0.3], [0, -8.5, -0.38], [0, -9.25, -0.2]]), () => 0.17, 20, 14), organ('uterus', { opacity: 0.7 }), { th: T, sex: 'f', info: 'uterus', prio: 1 });
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'd' : 'g';
    addMesh(blobGeo([0.32, 0.2, 0.18], { detail: 3 }), organ('ovary', { opacity: 0.9, tex: [8, 0.4, 0.004, 0] }), { th: T, sex: 'f', info: 'uterus', pos: [1.4 * s, -7.0, -0.4], prio: 1 });
    addMesh(tubeGeo(curveOf([[0.42 * s, -6.8, 0.35], [0.95 * s, -6.6, 0.1], [1.55 * s, -6.75, -0.15], [1.55 * s, -7.05, -0.45]]), (t) => lerp(0.06, 0.09, t), 30, 10), organ('uterus', { opacity: 0.85 }), { th: T, sex: 'f', info: 'uterus', prio: 1 });
    seg({ id: `gaf_${k}`, pts: [{ from: 'ao_abdo', t: gonStart }, [0.75 * s, -4.3, -0.72], [1.15 * s, -5.6, -0.6], [1.45 * s, -6.6, -0.45], [1.4 * s, -6.85, -0.4]], r: 0.04, o2: 'rich', dir: 'aller', th: T, sex: 'f', info: 'gonadiques', label: s < 0 ? 'Artère ovarienne' : null, lt: 0.5 });
    seg({ id: `cgf_${k}`, pts: [[1.4 * s, -6.85, -0.4], [1.65 * s, -7.0, -0.4], [1.4 * s, -7.2, -0.45], [1.15 * s, -7.0, -0.5]], o2: 'rp', dir: 'cap', th: T, sex: 'f' });
    seg({ id: `gvf_${k}`, pts: [[1.15 * s, -7.0, -0.5], [1.25 * s, -6.4, -0.65], [1.0 * s, -5.2, -0.8], [0.7 * s, -4.3, -0.88], ...vEndOf(s)], r: 0.045, o2: 'poor', dir: 'retour', th: T, sex: 'f', info: 'gonadiques', label: s > 0 ? 'Veine ovarienne' : null, lt: 0.4 });
    circuit('pelvis', [...A, ['ao_abdo', 0, gonStart], `gaf_${k}`, `cgf_${k}`, `gvf_${k}`, ...toCave(s), 'vci', 'od_b'], 0.8, 'f');
  }
  // Homme : prostate, testicules
  const pr = addMesh(blobGeo([0.38, 0.3, 0.3], { detail: 3 }), organ('prostate', { opacity: 0.85, tex: [6, 0.35, 0.005, 0] }), { th: T, sex: 'h', info: 'prostate', pos: [0, -8.75, 0.45], prio: 1 });
  addLabel('Prostate', [0.85, -8.95, 0.7], { info: 'prostate', owner: pr });
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'd' : 'g';
    const te = addMesh(blobGeo([0.25, 0.38, 0.27], { detail: 3 }), organ('testis', { opacity: 0.9, tex: [7, 0.35, 0.004, 0] }), { th: T, sex: 'h', info: 'prostate', pos: [0.42 * s, -10.15, 1.25], prio: 1 });
    if (s > 0) addLabel('Testicule', [1.2, -10.4, 1.3], { info: 'prostate', owner: te });
    seg({ id: `gah_${k}`, pts: [{ from: 'ao_abdo', t: gonStart }, [0.7 * s, -4.4, -0.72], [1.2 * s, -6.2, -0.3], [1.3 * s, -7.4, 0.75], [0.8 * s, -8.4, 1.25], [0.5 * s, -9.65, 1.3]], r: 0.04, o2: 'rich', dir: 'aller', th: T, sex: 'h', info: 'gonadiques', label: s < 0 ? 'Artère testiculaire' : null, lt: 0.45 });
    seg({ id: `cgh_${k}`, pts: [[0.5 * s, -9.65, 1.3], [0.58 * s, -10.25, 1.4], [0.42 * s, -10.5, 1.22], [0.3 * s, -10.0, 1.15]], o2: 'rp', dir: 'cap', th: T, sex: 'h' });
    seg({ id: `gvh_${k}`, pts: [[0.3 * s, -10.0, 1.15], [0.4 * s, -9.2, 1.22], [0.7 * s, -8.4, 1.1], [1.15 * s, -7.4, 0.6], [1.05 * s, -6.0, -0.4], [0.62 * s, -4.4, -0.85], ...vEndOf(s)], r: 0.045, o2: 'poor', dir: 'retour', th: T, sex: 'h', info: 'gonadiques', label: s > 0 ? 'Veine testiculaire' : null, lt: 0.6 });
    circuit('pelvis', [...A, ['ao_abdo', 0, gonStart], `gah_${k}`, `cgh_${k}`, `gvh_${k}`, ...toCave(s), 'vci', 'od_b'], 0.8, 'h');
  }
}

/* ---------- repères des pouls ---------- */
const pulseRings = [];
for (const [txt, p, th] of [
  ['Pouls carotidien', [-0.62, 4.6, -0.05], 'cerveau'],
  ['Pouls huméral', [-4.12, -3.85, -0.05], 'bras'],
  ['Pouls radial', [-4.96, -8.6, -0.05], 'bras'],
  ['Pouls fémoral', [-1.55, -7.75, 0.6], 'jambes'],
  ['Pouls poplité', [-1.5, -16.0, -0.95], 'jambes'],
  ['Pouls pédieux', [-1.55, -24.95, 1.3], 'jambes'],
]) {
  const ring = addMesh(new THREE.TorusGeometry(0.16, 0.025, 8, 28), basic([1.9, 1.3, 0.2], 0.95), { th, info: 'pouls', pos: p, prio: 4 });
  pulseRings.push(ring);
  addLabel(txt, [p[0] - 1.1, p[1], p[2]], { info: 'pouls', owner: ring });
}

circuits.forEach(buildCircuit);

/* =========================================================================
   Globules : disque biconcave (riche en O₂) et anneau (pauvre en O₂)
   ========================================================================= */
const RBC = 0.034;
const discGeo = new THREE.LatheGeometry([[0, -0.006], [0.012, -0.004], [0.022, -0.009], [0.03, -0.007], [0.034, 0], [0.03, 0.007], [0.022, 0.009], [0.012, 0.004], [0, 0.006]].map(([x, y]) => new THREE.Vector2(x, y)), 18);
discGeo.computeVertexNormals();
const ringGeo = new THREE.TorusGeometry(0.024, 0.0095, 8, 18);
const richMat = new THREE.MeshStandardMaterial({ color: 0xd8121f, roughness: 0.35, emissive: 0xff2020, emissiveIntensity: 0.25 });
const poorMat = new THREE.MeshStandardMaterial({ color: 0x3446c9, roughness: 0.35, emissive: 0x4060ff, emissiveIntensity: 0.25 });
const MAXP = 12000;
const richMesh = new THREE.InstancedMesh(discGeo, richMat, MAXP);
const poorMesh = new THREE.InstancedMesh(ringGeo, poorMat, MAXP);
for (const m of [richMesh, poorMesh]) { m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }
let parts = [];
function rebuildParticles() {
  parts = [];
  for (const c of circuits) {
    if (!state.themes.has(c.th) || !sexOk(c.sex)) continue;
    for (let i = 0; i < c.count && parts.length < MAXP; i++) {
      let jx, jy, jz; do { jx = rnd() * 2 - 1; jy = rnd() * 2 - 1; jz = rnd() * 2 - 1; } while (jx * jx + jy * jy + jz * jz > 1);
      const ax = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
      parts.push({ c, off: ((i + rnd() * 0.9) / c.count) * c.L, jx, jy, jz, ax, sp: 0.92 + rnd() * 0.16, rs: 0.8 + rnd() * 1.6 });
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
      const rr = c.rad[i];
      const sc = Math.min(sizeMul, (rr * 0.8) / RBC) * fade;      // jamais plus large que le vaisseau
      const jr = Math.max(0, rr - RBC * sc) * 0.85;                // reste dans le vaisseau
      const x = c.pos[i * 3] + p.jx * jr, y = c.pos[i * 3 + 1] + p.jy * jr, z = c.pos[i * 3 + 2] + p.jz * jr;
      const wr = smooth(0.3, 0.7, c.o2[i]);
      if (wr > 0.02) { const q = sc * (0.55 + 0.45 * wr); _m.makeRotationAxis(p.ax, time * p.rs + p.off).scale(_s.set(q, q, q)).setPosition(x, y, z); richMesh.setMatrixAt(kr++, _m); }
      if (wr < 0.98) { const q = sc * (0.55 + 0.45 * (1 - wr)); _m.makeRotationAxis(p.ax, time * p.rs + p.off).scale(_s.set(q, q, q)).setPosition(x, y, z); poorMesh.setMatrixAt(kp++, _m); }
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
  ctx.strokeStyle = 'rgba(111,224,168,0.08)'; ctx.lineWidth = 1;
  const gs = 9 * d;
  ctx.beginPath();
  for (let x = 0; x < W; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, Hh); }
  for (let y = 0; y < Hh; y += gs) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  ctx.strokeStyle = '#6fe0a8'; ctx.lineWidth = 1.5 * d; ctx.shadowColor = '#6fe0a8'; ctx.shadowBlur = 5 * d;
  ctx.beginPath(); let pen = false;
  const base = Hh * 0.68, amp = Hh * 0.48;
  for (let x = 0; x < W; x++) {
    const v = ecg.vals[x];
    if (Number.isNaN(v)) { pen = false; continue; }
    const y = base - v * amp;
    pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true;
  }
  ctx.stroke(); ctx.shadowBlur = 0;
}
{
  const bar = $('#phaseBar');
  for (const p of PH) {
    const s = document.createElement('span');
    s.className = p[3]; s.style.width = `${(p[1] - p[0]) * 100}%`; s.textContent = p[4];
    s.dataset.tip = `${p[2]} (${p[3] === 'sys' ? 'systole ventriculaire' : 'diastole'})`;
    bar.insertBefore(s, $('#phaseCursor'));
  }
}

/* =========================================================================
   Caméra : cadrage automatique sur les thèmes visibles
   ========================================================================= */
const BOX = {
  coeur: [[-1.7, -1.75, -1.3], [1.7, 2.7, 1.0]],
  coronaires: [[-1.7, -1.75, -1.3], [1.7, 2.2, 1.0]],
  poumons: [[-3.5, -1.9, -2.5], [3.5, 3.9, 1.3]],
  cerveau: [[-1.8, -1.7, -2.4], [1.8, 9.6, 1.8]],
  bras: [[-5.8, -11.2, -1.2], [5.8, 3.8, 0.8]],
  digestif: [[-3.6, -9.2, -1.6], [3.4, 2.7, 1.6]],
  reins: [[-2.4, -8.8, -2.0], [2.4, 2.7, 1.2]],
  jambes: [[-2.6, -25.8, -1.4], [2.6, 2.7, 2.4]],
  pelvis: [[-2.4, -10.8, -1.6], [2.4, -2.6, 1.6]],
};
function viewInsets() {
  const W = innerWidth, Hh = innerHeight;
  if (isMobile()) {
    const d = $('#dock').getBoundingClientRect(), r = $('#rail').getBoundingClientRect();
    return { l: 4, r: 4, t: d.bottom + 6, b: Hh - r.top + 30 };
  }
  const r = $('#rail').getBoundingClientRect(), d = $('#dock').getBoundingClientRect();
  return { l: r.right + 6, r: 16, t: 66, b: Hh - d.top + 6 };
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
  sl.style.bottom = sr.style.bottom = `${ins.b - 2}px`;
}
let tween = null;
function fitView(front = false, instant = false) {
  const box = new THREE.Box3();
  for (const t of state.themes) { const b = BOX[t]; box.union(new THREE.Box3(V3(b[0]), V3(b[1]))); }
  const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const W = innerWidth, Hh = innerHeight, ins = viewInsets();
  const effW = Math.max(120, W - ins.l - ins.r), effH = Math.max(120, Hh - ins.t - ins.b);
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const dist = Math.max((size.y / 2) / (tan * (effH / Hh)), (size.x / 2) / (tan * camera.aspect * (effW / W))) * 1.05 + size.z / 2;
  let dir = camera.position.clone().sub(controls.target).normalize();
  if (front || dir.lengthSq() < 0.5) dir = new THREE.Vector3(0, 0.05, 1).normalize();
  const to = { target: center, pos: center.clone().addScaledVector(dir, dist) };
  if (instant) { controls.target.copy(to.target); camera.position.copy(to.pos); tween = null; return; }
  tween = { t: 0, from: { target: controls.target.clone(), pos: camera.position.clone() }, to };
}
controls.addEventListener('start', () => { tween = null; });

/* =========================================================================
   Application de l'état
   ========================================================================= */
const ORGAN_THEMES = ['poumons', 'cerveau', 'bras', 'digestif', 'reins', 'jambes', 'pelvis'];
function applyVisibility() {
  for (const o of objs) o.visible = sexOk(o.userData.sex) && o.userData.th.some((t) => state.themes.has(t));
  for (const s of Object.values(SEG)) if (s.group) s.group.visible = segVisible(s);
  const showBody = state.body && ORGAN_THEMES.some((t) => state.themes.has(t));
  bodies.h.visible = showBody && state.sex === 'h';
  bodies.f.visible = showBody && state.sex === 'f';
  cond.visible = state.conduction;
  const op = state.coupe || !state.transparent ? 1 : state.themes.has('coronaires') ? 0.7 : state.conduction ? 0.3 : 0.5;
  for (const m of heartMats) {
    const tr = op < 1;
    if (m.transparent !== tr) m.needsUpdate = true;
    m.transparent = tr; m.opacity = op; m.depthWrite = !tr;
    const c = state.o2 ? O2COL[m.userData.o2] : R.heart;
    m.color.setHex(c[0]); m.userData.u.uC2.value.setHex(c[1]);
    m.userData.u.uStripes.value = state.o2 && m.userData.o2 === 'poor' ? 0.5 : 0;
  }
  for (const m of septMats) m.opacity = state.transparent && !state.coupe ? 0.55 : 0.95;
  const plane = state.coupe ? [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.12)] : null;
  for (const m of [...heartMats, ...septMats]) {
    const side = state.coupe ? THREE.DoubleSide : THREE.FrontSide;
    if (m.side !== side || !!m.clippingPlanes !== !!plane) m.needsUpdate = true;
    m.side = side; m.clippingPlanes = plane;
  }
  document.querySelectorAll('.dirbtn').forEach((b) => b.classList.toggle('on', state[b.dataset.dir]));
  document.querySelectorAll('#themes .ib').forEach((b) => b.classList.toggle('on', state.themes.has(b.dataset.id)));
  document.querySelectorAll('.tog').forEach((b) => b.classList.toggle('on', !!state[b.dataset.k]));
  document.querySelectorAll('[data-sex]').forEach((b) => b.classList.toggle('on', b.dataset.sex === state.sex));
}
function applyTheme() {
  document.documentElement.dataset.theme = state.dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]').content = state.dark ? '#070a12' : '#eef1f5';
  scene.background = state.dark ? new THREE.Color(0x070a12) : null;
  for (const sx of ['h', 'f']) {
    const m = bodyMats[sx];
    m.color.setHex(state.dark ? 0x9fb0d0 : SKIN[sx]);
    m.opacity = state.dark ? 0.05 : 0.08;
    m.userData.u.uRim.value.setHex(state.dark ? 0xa9c0ff : 0x9a6e55);
  }
  richMat.emissiveIntensity = poorMat.emissiveIntensity = state.dark ? 1.4 : 0.22;
  const b = $('#btnTheme');
  b.innerHTML = icon(state.dark ? 'soleil' : 'lune');
  b.dataset.tip = state.dark ? 'Thème clair' : 'Thème sombre';
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
  $('#infoBody').innerHTML = h;
  infoEl.classList.remove('flash'); void infoEl.offsetWidth; infoEl.classList.add('flash');
  infoEl.scrollTop = 0;
}
function openInfo() { infoEl.classList.remove('hidden'); }
function closeInfo() { infoEl.classList.add('hidden'); state.selected = null; }
infoEl.addEventListener('click', (e) => { const b = e.target.closest('[data-sel]'); if (b) onPick(b.dataset.sel); });
$('#infoClose').addEventListener('click', closeInfo);
function onPick(id) {
  if (quiz) { quizAnswer(id); return; }
  const d = INFO[id];
  if (d?.th && !state.themes.has(d.th)) setThemes([...state.themes, d.th]);
  if (d?.cond && !state.conduction) { state.conduction = true; applyVisibility(); }
  state.selected = id;
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
  closeInfo();
  showQuestion();
}
function showQuestion() {
  const q = quiz.order[quiz.i];
  quiz.lock = false;
  state.conduction = !!q.cond;
  setThemes(q.th);
  state.selected = null; infoEl.classList.add('hidden');
  $('#quizCount').textContent = `Question ${quiz.i + 1} / ${quiz.order.length}`;
  $('#quizScore').textContent = `Score ${quiz.score}`;
  $('#quizQ').textContent = q.q;
  $('#quizFb').textContent = ''; $('#quizFb').className = '';
  $('#quizNext').hidden = true; $('#quizSkip').hidden = false;
}
function reveal(q, html, ok) {
  quiz.lock = true;
  const fb = $('#quizFb');
  fb.className = ok ? 'ok' : 'ko'; fb.innerHTML = html;
  state.selected = q.a[0];
  renderInfo(q.a[0]); if (!isMobile()) openInfo();
  $('#quizScore').textContent = `Score ${quiz.score}`;
  $('#quizNext').hidden = false; $('#quizSkip').hidden = true;
  $('#quizNext').textContent = quiz.i + 1 < quiz.order.length ? 'Suivante' : 'Résultat';
}
function quizAnswer(id) {
  if (!quiz || quiz.lock || quiz.done) return;
  const q = quiz.order[quiz.i], ok = q.a.includes(id);
  if (ok) quiz.score++;
  const good = INFO[q.a[0]].t;
  reveal(q, ok ? `<b>✓ Juste.</b> ${good}.` : `<b>✗ Raté</b>${INFO[id] ? ` (tu as cliqué : ${INFO[id].t})` : ''}. La bonne réponse clignote : <b>${good}</b>.`, ok);
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
  state.conduction = sv.cond;
  closeInfo();
  setThemes(sv.themes.filter((t) => t !== 'coeur'));
}
$('#btnQuiz').addEventListener('click', () => (quiz ? quitQuiz() : startQuiz()));
$('#quizQuit').addEventListener('click', quitQuiz);
$('#quizSkip').addEventListener('click', () => { const q = quiz.order[quiz.i]; reveal(q, `Réponse : <b>${INFO[q.a[0]].t}</b> (elle clignote).`, false); });
$('#quizNext').addEventListener('click', () => { if (quiz.done) startQuiz(); else quizNext(); });

/* =========================================================================
   Interface : icônes, infobulles, petits messages
   ========================================================================= */
const CAPS = { allThemes: 'Tout', heartOnly: 'Cœur', aller: 'Aller', retour: 'Retour', h: 'Homme', f: 'Femme' };
{
  const wrap = $('#themes');
  for (const t of THEMES) {
    const b = document.createElement('button');
    b.className = 'ib'; b.dataset.id = t.id; b.dataset.icon = t.id;
    b.dataset.tip = t.locked ? `${t.name} (toujours affiché)` : `${t.name} : ${t.sub}`;
    b.dataset.cap = t.cap || t.name.split(' ')[0];
    b.addEventListener('click', () => {
      if (t.locked) { fitView(true); return; }
      if (quiz) return;
      const s = new Set(state.themes); const on = !s.has(t.id); on ? s.add(t.id) : s.delete(t.id); s.delete('coeur');
      setThemes([...s]);
      chip(`${t.name} ${on ? 'affiché' : 'masqué'}`);
    });
    wrap.appendChild(b);
  }
  document.querySelectorAll('[data-icon]').forEach((b) => {
    const cap = b.dataset.cap || CAPS[b.id] || CAPS[b.dataset.dir] || CAPS[b.dataset.sex];
    b.innerHTML = icon(b.dataset.icon) + (b.closest('#rail') && cap ? `<span class="cap">${cap}</span>` : '');
    if (b.dataset.tip) b.setAttribute('aria-label', b.dataset.tip);
  });
}
const tip = $('#tip');
let tipFrom = null;
function showTipFor(el) {
  const r = el.getBoundingClientRect();
  tip.textContent = el.dataset.tip; tip.hidden = false;
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let x, y;
  if (el.closest('#rail') && !isMobile()) { x = r.right + 10; y = r.top + r.height / 2 - th / 2; }
  else if (el.closest('.top')) { x = r.left + r.width / 2 - tw / 2; y = r.bottom + 8; }
  else { x = r.left + r.width / 2 - tw / 2; y = r.top - th - 8; }
  tip.style.left = `${clamp(x, 6, innerWidth - tw - 6)}px`; tip.style.top = `${clamp(y, 6, innerHeight - th - 6)}px`;
}
document.addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest('[data-tip]');
  if (el) { tipFrom = el; showTipFor(el); } else if (tipFrom) { tipFrom = null; tip.hidden = true; }
});
let chipT = null;
function chip(text) {
  const c = $('#chip'); c.textContent = text; c.hidden = false; c.classList.remove('out');
  clearTimeout(chipT); chipT = setTimeout(() => { c.classList.add('out'); setTimeout(() => (c.hidden = true), 300); }, 1400);
}
$('#allThemes').addEventListener('click', () => { if (!quiz) { setThemes(THEMES.map((t) => t.id).filter((x) => x !== 'coeur')); chip('Tous les thèmes'); } });
$('#heartOnly').addEventListener('click', () => { if (!quiz) { setThemes([]); chip('Cœur seul'); } });
document.querySelectorAll('.dirbtn').forEach((b) => b.addEventListener('click', () => {
  state[b.dataset.dir] = !state[b.dataset.dir]; applyVisibility();
  chip(`${b.dataset.dir === 'aller' ? 'Aller (artères)' : 'Retour (veines)'} ${state[b.dataset.dir] ? 'affiché' : 'masqué'}`);
}));
document.querySelectorAll('[data-sex]').forEach((b) => b.addEventListener('click', () => {
  state.sex = b.dataset.sex; rebuildParticles(); applyVisibility();
  chip(state.sex === 'h' ? 'Corps d’homme' : 'Corps de femme');
  if (state.selected === 'uterus' || state.selected === 'prostate') closeInfo();
}));
document.querySelectorAll('.tog').forEach((b) => b.addEventListener('click', () => {
  const k = b.dataset.k;
  state[k] = !state[k];
  if (k === 'sound' && state.sound) {
    try { actx ||= new (window.AudioContext || window.webkitAudioContext)(); actx.resume?.(); } catch (e) { /* pas de son */ }
  }
  applyVisibility();
  chip(`${b.dataset.tip} : ${state[k] ? 'oui' : 'non'}`);
}));
const bpmIn = $('#bpm');
bpmIn.addEventListener('input', () => {
  state.bpm = +bpmIn.value;
  $('#bpmOut').textContent = state.bpm;
  document.querySelector('.brand svg').style.animationDuration = `${60 / state.bpm}s`;
});
$('#btnPlay').addEventListener('click', () => {
  state.playing = !state.playing;
  const b = $('#btnPlay'); b.innerHTML = icon(state.playing ? 'pause' : 'lecture'); b.dataset.tip = state.playing ? 'Pause' : 'Lecture';
  b.classList.toggle('on', !state.playing);
});
$('#btnSlow').addEventListener('click', () => { state.slow = !state.slow; $('#btnSlow').classList.toggle('on', state.slow); chip(state.slow ? 'Ralenti ×¼' : 'Vitesse normale'); });
$('#btnRef').addEventListener('click', () => {
  state.selected = null;
  $('#infoKicker').textContent = 'Repères chiffrés'; $('#infoTitle').textContent = 'Valeurs normales'; $('#infoBody').innerHTML = REPERES;
  openInfo();
});
$('#btnOverview').addEventListener('click', () => { state.selected = null; renderInfo('overview'); openInfo(); });
$('#btnFront').addEventListener('click', () => fitView(true));
$('#btnTheme').addEventListener('click', () => { state.dark = !state.dark; applyTheme(); });

/* ---------- sélection 3D ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pickAt(cx, cy) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(pickables.filter(isShown), false);
  if (!hits.length) return null;
  let best = hits[0];
  const p0 = hits[0].object.userData.prio;
  for (const h of hits) {
    const p = h.object.userData.prio, gap = h.distance - hits[0].distance;
    const win = p >= 4 ? 3 : p0 === 0 ? 4 : p0 === 1 ? 1.6 : p0 === 2 ? 0.45 : 0;
    if (gap <= win && p > best.object.userData.prio) best = h;
  }
  return best.object.userData.info;
}
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
  down = null;
  const id = pickAt(e.clientX, e.clientY);
  if (id) onPick(id);
});
let hoverReq = null;
canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') hoverReq = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerleave', () => { hoverReq = null; state.hover = null; if (!tipFrom) tip.hidden = true; });
function doHover() {
  if (!hoverReq) return;
  const { x, y } = hoverReq; hoverReq = null;
  const id = down ? null : pickAt(x, y);
  state.hover = id;
  canvas.style.cursor = id ? 'pointer' : 'grab';
  if (id && !quiz && INFO[id]) { tip.hidden = false; tip.textContent = INFO[id].t; tip.style.left = `${x + 14}px`; tip.style.top = `${y + 14}px`; tipFrom = null; }
  else if (!tipFrom) tip.hidden = true;
}

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

  const vv = ventVol(cyc), av = atrVol(cyc);
  CH.vd.mesh.scale.setScalar(vv); CH.vg.mesh.scale.setScalar(vv);
  CH.od.mesh.scale.setScalar(av); CH.og.mesh.scale.setScalar(av);
  const avOpen = cyc < 0.12 || cyc >= 0.54 ? 1 : 0, sgOpen = cyc >= 0.19 && cyc < 0.47 ? 1 : 0;
  for (const [id, v] of Object.entries(valves)) {
    const target = id === 'tricuspide' || id === 'mitrale' ? avOpen : sgOpen;
    v.open += (target - v.open) * (1 - Math.exp(-dt * 22 * Math.max(speed, 0.4)));
    const ang = v.open * (id === 'tricuspide' || id === 'mitrale' ? 1.15 : 1.25);
    for (const l of v.leaves) l.pivot.quaternion.setFromAxisAngle(l.axis, ang);
  }
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
  const selPulse = 0.35 + 0.25 * Math.sin(time * 5);
  for (const m of pickables) {
    const id = m.userData.info;
    let v = id === state.selected ? selPulse : 0;
    if (id === state.hover && v === 0 && m.userData.prio > 0) v = 0.3;
    if (id === 'od' || id === 'og') v = Math.max(v, elecA * 0.5);
    if (id === 'vd' || id === 'vg') v = Math.max(v, elecV * 0.5);
    setHi(m, v);
  }
  const pb = 1 + 0.25 * Math.exp(-(((cyc - 0.24) / 0.06) ** 2));
  for (const r of pulseRings) { r.quaternion.copy(camera.quaternion); r.scale.setScalar(pb); }

  if (tween) {
    tween.t = Math.min(1, tween.t + dt / 0.9);
    const k = tween.t < 0.5 ? 4 * tween.t ** 3 : 1 - (-2 * tween.t + 2) ** 3 / 2;
    controls.target.lerpVectors(tween.from.target, tween.to.target, k);
    camera.position.lerpVectors(tween.from.pos, tween.to.pos, k);
    if (tween.t >= 1) tween = null;
  }
  controls.update();
  const camDist = camera.position.distanceTo(controls.target);
  updateParticles(flowDist, time, clamp(camDist / 12, 1, 1.8));

  // Noms : seulement la structure sélectionnée (ou toutes avec « Noms »), sans chevauchement
  const W = innerWidth, Hh = innerHeight, cand = [], placed = [];
  for (const L of labels) {
    L.o.visible = false;
    const sel = !!L.info && L.info === state.selected;
    L.el.classList.toggle('sel', sel);
    if (quiz && !(quiz.lock && sel)) continue;
    if (!(sel || state.labels)) continue;
    if (L.owner && !isShown(L.owner)) continue;
    _pp.copy(L.o.position).project(camera);
    if (_pp.z > 1 || Math.abs(_pp.x) > 1.1 || Math.abs(_pp.y) > 1.1) continue;
    L.sx = ((_pp.x + 1) / 2) * W; L.sy = ((1 - _pp.y) / 2) * Hh; L.sel = sel;
    cand.push(L);
  }
  cand.sort((a, b) => b.sel - a.sel);
  for (const L of cand) {
    if (!L.w) L.w = L.el.offsetWidth;
    const w = L.w || 90, h = 22;
    const r = [L.sx - w / 2 - 3, L.sx + w / 2 + 3, L.sy - h / 2 - 2, L.sy + h / 2 + 2];
    if (placed.some((q) => !(r[1] < q[0] || r[0] > q[1] || r[3] < q[2] || r[2] > q[3]))) continue;
    placed.push(r); L.o.visible = true;
  }
  const back = camera.position.z - controls.target.z < 0;
  if (frame.back !== back) { frame.back = back; $('#sideL').textContent = back ? 'Gauche du patient' : 'Droite du patient'; $('#sideR').textContent = back ? 'Droite du patient' : 'Gauche du patient'; }
  doHover();

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

  if (state.dark && state.bloom) composer.render(); else renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* =========================================================================
   Démarrage
   ========================================================================= */
addEventListener('resize', resize);
mobileQ.addEventListener('change', () => { resize(); fitView(); });
applyTheme();
rebuildParticles();
applyVisibility();
resize();
fitView(true, true);
requestAnimationFrame(() => {
  frame();
  $('#loader').classList.add('out');
  setTimeout(() => $('#loader').remove(), 700);
});
window.__coeur = { state, setThemes, fitView, onPick, SEG, circuits, camera, controls, applyVisibility, applyTheme };
