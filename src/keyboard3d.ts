import * as THREE from 'three';
import {
  getKeyboardLayout,
  isK98LightKey,
  resolveKeyByVk,
  type KeyboardLayoutId,
  type KeySpec,
} from './keyboardLayout';
import type { KeyboardOrientation } from './catEngine';

export class Spring1D {
  public x: number;
  public v = 0;
  public hz: number;
  public damping: number;

  constructor(x = 0, hz = 2, damping = 0.7) {
    this.x = x;
    this.hz = hz;
    this.damping = damping;
  }

  public step(target: number, dt: number): number {
    const w = 2 * Math.PI * this.hz;
    const n = Math.max(1, Math.ceil(dt * 240));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.v += (w * w * (target - this.x) - 2 * this.damping * w * this.v) * h;
      this.x += this.v * h;
    }
    return this.x;
  }

  public kick(v: number): void {
    this.v += v;
  }

  public set(x: number): void {
    this.x = x;
    this.v = 0;
  }
}

export class Spring3D {
  public x: THREE.Vector3;
  public v = new THREE.Vector3();
  public hz: number;
  public damping: number;

  constructor(x: THREE.Vector3, hz = 3.2, damping = 0.78) {
    this.x = x.clone();
    this.hz = hz;
    this.damping = damping;
  }

  public step(target: THREE.Vector3, dt: number): THREE.Vector3 {
    const w = 2 * Math.PI * this.hz;
    const n = Math.max(1, Math.ceil(dt * 240));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.v.x += (w * w * (target.x - this.x.x) - 2 * this.damping * w * this.v.x) * h;
      this.v.y += (w * w * (target.y - this.x.y) - 2 * this.damping * w * this.v.y) * h;
      this.v.z += (w * w * (target.z - this.x.z) - 2 * this.damping * w * this.v.z) * h;
      this.x.x += this.v.x * h;
      this.x.y += this.v.y * h;
      this.x.z += this.v.z * h;
    }
    return this.x;
  }
}

export const approach = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt);
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Dynamic variable-radius 3D tube rebuilt cleanly in place each frame (zero GC churn). */
export class TaperTube3D {
  public readonly mesh: THREE.Mesh;
  private readonly n: number;
  private readonly m: number;
  private readonly pts: THREE.Vector3[];
  private readonly T = new THREE.Vector3();
  private readonly N = new THREE.Vector3();
  private readonly B = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();

  constructor(segments: number, radial: number, material: THREE.Material, renderOrder = 0) {
    this.n = segments;
    this.m = radial;
    const geo = new THREE.BufferGeometry();
    const count = (segments + 1) * radial;
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute(
      'along',
      new THREE.BufferAttribute(
        Float32Array.from({ length: count }, (_, k) => Math.floor(k / radial) / segments),
        1,
      ),
    );
    const index: number[] = [];
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < radial; j++) {
        const a = i * radial + j;
        const b = i * radial + ((j + 1) % radial);
        const c = a + radial;
        const d = b + radial;
        index.push(a, b, c, b, d, c);
      }
    }
    geo.setIndex(index);
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.renderOrder = renderOrder;
    this.mesh.frustumCulled = false;
    this.pts = Array.from({ length: segments + 1 }, () => new THREE.Vector3());
  }

  public update(
    point: (t: number, out: THREE.Vector3) => void,
    radius: (t: number) => number,
    grow: number | ((t: number) => number) = 0,
  ): void {
    const { n, m, pts, T, N, B, tmp } = this;
    for (let i = 0; i <= n; i++) point(i / n, pts[i]);
    const pos = this.mesh.geometry.attributes.position.array as Float32Array;
    const nrm = this.mesh.geometry.attributes.normal.array as Float32Array;
    for (let i = 0; i <= n; i++) {
      T.subVectors(pts[Math.min(n, i + 1)], pts[Math.max(0, i - 1)]).normalize();
      if (i === 0) {
        tmp.set(0, 1, 0);
        if (Math.abs(T.dot(tmp)) > 0.9) tmp.set(1, 0, 0);
        N.crossVectors(T, tmp).normalize();
      } else {
        B.crossVectors(N, T);
        N.crossVectors(T, B).normalize();
      }
      B.crossVectors(T, N).normalize();
      const gVal = typeof grow === 'function' ? grow(i / n) : grow;
      const r = Math.max(0.0008, radius(i / n) + gVal);
      for (let j = 0; j < m; j++) {
        const a = (j / m) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const c = ca * r;
        const s = sa * r;
        const k = (i * m + j) * 3;
        pos[k] = pts[i].x + N.x * c + B.x * s;
        pos[k + 1] = pts[i].y + N.y * c + B.y * s;
        pos[k + 2] = pts[i].z + N.z * c + B.z * s;
        nrm[k] = N.x * ca + B.x * sa;
        nrm[k + 1] = N.y * ca + B.y * sa;
        nrm[k + 2] = N.z * ca + B.z * sa;
      }
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.normal.needsUpdate = true;
    this.mesh.geometry.computeBoundingSphere();
  }
}

interface KeyEntry3D {
  spec: KeySpec;
  holder: THREE.Group;
  topMat: THREE.MeshBasicMaterial;
  baseColor: THREE.Color;
  x: number;
  z: number;
  down: boolean;
  depth: number;
  glow: number;
}

const legendTextureCache = new Map<string, THREE.CanvasTexture>();

function makeKeyLegendTexture(label: string, accent: 'base' | 'mod' | 'orange', rotated180: boolean, capColor?: string): THREE.CanvasTexture {
  const key = `${capColor ?? accent}|${label}|${rotated180 ? 1 : 0}`;
  const cached = legendTextureCache.get(key);
  if (cached) return cached;

  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = capColor ?? (accent === 'orange' ? '#f59b2e' : accent === 'mod' ? '#e6e4db' : '#f9f8f3');
  g.fillRect(0, 0, 128, 128);

  // Sculpted concave PBT keycap sheen
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0.08)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);

  if (label) {
    g.save();
    g.translate(64, 64);
    if (rotated180) g.rotate(Math.PI);
    const fontSize = label.length >= 4 ? 32 : label.length === 3 ? 38 : label.length === 2 ? 46 : 56;
    g.font = `700 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
    g.fillStyle = (capColor ? capColor === '#7886bc' : accent === 'orange') ? '#ffffff' : '#2b2d34';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, 0, 2);
    g.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  legendTextureCache.set(key, tex);
  return tex;
}

function makeSoftShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 22, 128, 128, 122);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.44)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.20)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeMouseLabelTexture(char: 'L' | 'R', rotated180: boolean, capColor?: string): THREE.CanvasTexture {
  const key = `mouse:${char}:${rotated180 ? 1 : 0}`;
  const hit = legendTextureCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.save();
  g.translate(32, 32);
  if (rotated180) g.rotate(Math.PI);
  g.font = '800 36px "Segoe UI", system-ui, sans-serif';
  g.fillStyle = 'rgba(42, 46, 56, 0.56)';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(char, 0, 2);
  g.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  legendTextureCache.set(key, tex);
  return tex;
}

function makeRoundedSlab(w: number, d: number, h: number, r: number, color: string, y: number, opacity = 1): THREE.Mesh {
  const s = new THREE.Shape();
  const x0 = -w / 2;
  const z0 = -d / 2;
  s.moveTo(x0 + r, z0);
  s.lineTo(x0 + w - r, z0);
  s.quadraticCurveTo(x0 + w, z0, x0 + w, z0 + r);
  s.lineTo(x0 + w, z0 + d - r);
  s.quadraticCurveTo(x0 + w, z0 + d, x0 + w - r, z0 + d);
  s.lineTo(x0 + r, z0 + d);
  s.quadraticCurveTo(x0, z0 + d, x0, z0 + d - r);
  s.lineTo(x0, z0 + r);
  s.quadraticCurveTo(x0, z0, x0 + r, z0);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 6 });
  g.rotateX(Math.PI / 2);
  g.translate(0, y + h, 0);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, opacity, transparent: opacity < 1 }));
}

/**
 * KuroCat's iconic clean desktop gear in real 3D:
 * - Slightly canted matte-charcoal mechanical keyboard (NO KeyCat white sticker halo!)
 * - Cordless oval split-plate L/R mini mouse with engraved L/R & dual-color highlight (NO mouse wire!)
 */
export class KeyboardAndMouse3D {
  public readonly boardGroup = new THREE.Group();
  public readonly mouseGroup = new THREE.Group();
  public readonly deskGroup = new THREE.Group();

  private readonly capGeo: THREE.CylinderGeometry;
  private readonly sideBaseMat = new THREE.MeshBasicMaterial({ color: '#dad7cd' });
  private readonly sideK98Mat = new THREE.MeshBasicMaterial({ color: '#6874a3' });
  private readonly sideModMat = new THREE.MeshBasicMaterial({ color: '#c4c0b4' });
  private readonly sideOrangeMat = new THREE.MeshBasicMaterial({ color: '#c4741a' });
  private readonly capBottomMat = new THREE.MeshBasicMaterial({ color: '#1b1c20' });
  private readonly shadowTex = makeSoftShadowTexture();

  private keys = new Map<string, KeyEntry3D>();
  private layoutId: KeyboardLayoutId = '65';
  private orientation: KeyboardOrientation = 'cat';
  private hitColor = new THREE.Color('#d4f044');
  private rightBtnColor = new THREE.Color('#ff7b3b');
  private boardH = 0.115;
  private capH = 0.056;
  private boardWidth = 2.4;

  // Cordless 3D KuroCat Mini Mouse
  private readonly mouseShape = new THREE.Group();
  private readonly mouseBodyMat: THREE.MeshBasicMaterial;
  private readonly leftBtnMat: THREE.MeshBasicMaterial;
  private readonly rightBtnMat: THREE.MeshBasicMaterial;
  private readonly wheelMat: THREE.MeshBasicMaterial;
  private readonly mouseLabelLMat: THREE.MeshBasicMaterial;
  private readonly mouseLabelRMat: THREE.MeshBasicMaterial;
  private readonly mouseHome = new THREE.Vector3(-1.32, 0.015, 1.04);
  private readonly mouseOffset = new THREE.Vector3();
  private readonly mouseTarget = new THREE.Vector3();
  private readonly mouseFollow = new Spring3D(new THREE.Vector3(), 5.5, 0.78);
  private leftPress = 0;
  private rightPress = 0;
  private wheelGlow = 0;

  private privacyPlate: THREE.Mesh | null = null;
  private privacyMat: THREE.MeshBasicMaterial | null = null;

  constructor(scene: THREE.Scene) {
    this.capGeo = new THREE.CylinderGeometry(Math.SQRT1_2 * 0.80, Math.SQRT1_2, 1, 4, 1);
    this.capGeo.rotateY(Math.PI / 4);
    this.capGeo.translate(0, 0.5, 0);

    // Subtle playful KuroCat keyboard tilt matching original catEngine.ts
    this.boardGroup.position.set(0.24, 0.015, 1.08);
    this.boardGroup.rotation.set(0.06, -0.042, 0);
    this.deskGroup.add(this.boardGroup);

    // Build Cordless KuroCat Oval Split-Plate Mini Mouse (ZERO cord, ZERO white KeyCat outline!)
    this.mouseGroup.position.copy(this.mouseHome);
    this.mouseShape.rotation.y = -0.10;
    this.mouseGroup.add(this.mouseShape);

    const MW = 0.165;
    const MH = 0.098;
    const ML = 0.228;
    const domeGeo = new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const q = domeGeo.attributes.position;
    const colors: number[] = [];
    const topC = new THREE.Color('#f7f7f2');
    const sideC = new THREE.Color('#cbc8be');
    const c = new THREE.Color();
    for (let i = 0; i < q.count; i++) {
      const x = q.getX(i);
      const y = q.getY(i);
      const z = q.getZ(i);
      q.setXYZ(i, x * (1 - 0.07 * z), y * (1 - 0.12 * z), z);
      c.copy(sideC).lerp(topC, smoothstep(0.08, 0.76, y));
      colors.push(c.r, c.g, c.b);
    }
    domeGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // Soft grounded desk shadow under mouse
    const mouseShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(MW * 3.1, ML * 2.8),
      new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false, opacity: 0.78 }),
    );
    mouseShadow.rotation.x = -Math.PI / 2;
    mouseShadow.position.set(0, 0.002, 0.012);

    // Subtle dark recessed lower skirt (gives real floating desk height without cartoon white halo)
    const baseSkirt = new THREE.Mesh(
      new THREE.CylinderGeometry(MW * 0.96, MW * 0.92, 0.018, 32),
      new THREE.MeshBasicMaterial({ color: '#b7b5ac' }),
    );
    baseSkirt.scale.set(1, 1, ML / MW);
    baseSkirt.position.y = 0.008;

    this.mouseBodyMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: '#ffffff' });
    const dome = new THREE.Mesh(domeGeo, this.mouseBodyMat);
    dome.scale.set(MW, MH, ML);
    dome.position.y = 0.012;

    const onTop = (x: number, z: number) =>
      0.012 +
      MH *
        (1 - (0.12 * z) / ML) *
        Math.sqrt(Math.max(0, 1 - (x / (MW * (1 - (0.07 * z) / ML))) ** 2 - (z / ML) ** 2));

    // Crisp horizontal palm-to-button seam + vertical L|R split seam (KuroCat signature mouse look!)
    const seamMat = new THREE.MeshBasicMaterial({ color: '#8e9099', depthTest: true });
    const vSeam = new TaperTube3D(14, 4, seamMat, 6);
    vSeam.update(
      (t, out) => {
        const z = mix(-0.01, ML * 0.95, t);
        out.set(0, onTop(0, z) + 0.003, z);
      },
      () => 0.0038,
    );
    const hSeam = new TaperTube3D(16, 4, seamMat, 6);
    hSeam.update(
      (t, out) => {
        const x = mix(-MW * 0.94, MW * 0.94, t);
        const z = -0.01 + 0.012 * Math.cos(Math.PI * (t - 0.5));
        out.set(x, onTop(x, z) + 0.003, z);
      },
      () => 0.0036,
    );

    this.wheelMat = new THREE.MeshBasicMaterial({ color: '#555966', depthTest: true });
    const wheel = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), this.wheelMat);
    wheel.scale.set(0.016, 0.013, 0.036);
    wheel.position.set(0, onTop(0, ML * 0.44) + 0.005, ML * 0.44);
    wheel.renderOrder = 7;

    // Curved surface-hugging LMB (+X in cat-facing) & RMB (-X in cat-facing) highlight plates
    const makeBtnPatch = (sideSign: -1 | 1) => {
      const geo = new THREE.PlaneGeometry(1, 1, 10, 10);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i) + 0.5; // 0..1 from center to outer edge
        const v = pos.getY(i) + 0.5; // 0..1 from middle seam to front tip
        const ang = (1 - v) * (Math.PI * 0.46);
        const rad = 0.08 + u * 0.85;
        const x = sideSign * Math.max(0.010, Math.cos(ang) * rad * MW * 0.92);
        const z = Math.max(0.004, Math.sin(ang) * rad * ML * 0.92);
        pos.setXYZ(i, x, onTop(x, z) + 0.004, z);
      }
      geo.computeVertexNormals();
      return geo;
    };

    this.leftBtnMat = new THREE.MeshBasicMaterial({
      color: '#d4f044',
      transparent: true,
      opacity: 0,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const leftBtn = new THREE.Mesh(makeBtnPatch(1), this.leftBtnMat);
    leftBtn.renderOrder = 5;

    this.rightBtnMat = new THREE.MeshBasicMaterial({
      color: '#ff7b3b',
      transparent: true,
      opacity: 0,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const rightBtn = new THREE.Mesh(makeBtnPatch(-1), this.rightBtnMat);
    rightBtn.renderOrder = 5;

    // Subtle L & R micro-labels on mouse buttons
    this.mouseLabelLMat = new THREE.MeshBasicMaterial({
      map: makeMouseLabelTexture('L', true),
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    this.mouseLabelRMat = new THREE.MeshBasicMaterial({
      map: makeMouseLabelTexture('R', true),
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const lblGeo = new THREE.PlaneGeometry(0.068, 0.068);
    lblGeo.rotateX(-Math.PI / 2);
    const lblL = new THREE.Mesh(lblGeo, this.mouseLabelLMat);
    lblL.position.set(MW * 0.42, onTop(MW * 0.42, ML * 0.48) + 0.009, ML * 0.48);
    lblL.renderOrder = 8;
    const lblR = new THREE.Mesh(lblGeo, this.mouseLabelRMat);
    lblR.position.set(-MW * 0.42, onTop(-MW * 0.42, ML * 0.48) + 0.009, ML * 0.48);
    lblR.renderOrder = 8;

    this.mouseShape.add(
      mouseShadow,
      baseSkirt,
      dome,
      leftBtn,
      rightBtn,
      vSeam.mesh,
      hSeam.mesh,
      wheel,
      lblL,
      lblR,
    );
    this.deskGroup.add(this.mouseGroup);

    scene.add(this.deskGroup);
    this.rebuildBoard('65', 'cat');
  }

  public setAccentColors(primaryHex: string, rightHex: string): void {
    this.hitColor.set(primaryHex);
    this.rightBtnColor.set(rightHex);
    this.leftBtnMat.color.set(primaryHex);
    this.rightBtnMat.color.set(rightHex);
  }

  public setStyle(style: '3d' | '2d'): void {
    const is3D = style === '3d';
    this.mouseBodyMat.vertexColors = is3D;
    this.mouseBodyMat.color.set(is3D ? '#ffffff' : '#f4f4f0');
    this.mouseBodyMat.needsUpdate = true;
  }

  public rebuildBoard(layoutId: KeyboardLayoutId, orientation: KeyboardOrientation): void {
    this.layoutId = layoutId;
    this.orientation = orientation;
    this.keys.clear();

    while (this.boardGroup.children.length > 0) {
      this.boardGroup.remove(this.boardGroup.children[0]);
    }

    const layout = getKeyboardLayout(layoutId);
    const is108 = layoutId !== '65';
    const isK98 = layoutId === 'k98m';
    const isCatFacing = orientation === 'cat';

    // Sync mouse orientation (180° cat-facing vs 0° viewer-facing)
    this.mouseShape.rotation.y = isCatFacing ? -0.10 : Math.PI - 0.10;
    this.mouseLabelLMat.map = makeMouseLabelTexture('L', isCatFacing);
    this.mouseLabelRMat.map = makeMouseLabelTexture('R', isCatFacing);
    this.mouseLabelLMat.needsUpdate = true;
    this.mouseLabelRMat.needsUpdate = true;

    const U = is108 ? 0.122 : 0.150;
    const CAP = U * 0.87;
    const W = layout.totalUnits * U + 0.14;
    const D = layout.totalRows * U + 0.14;
    this.boardWidth = W;
    this.boardH = 0.112;
    this.capH = is108 ? 0.048 : 0.056;

    this.boardGroup.position.set(is108 ? 0.24 : 0.24, 0.015, 1.08);
    this.mouseHome.set(is108 ? -1.46 : -1.16, 0.015, 0.96);

    // Soft grounded desk shadow under keyboard (replaces KeyCat white sticker halo!)
    const kbShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 1.18, D * 1.38),
      new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false, opacity: 0.72 }),
    );
    kbShadow.rotation.x = -Math.PI / 2;
    kbShadow.position.set(0, 0.002, 0.025);

    // Sleek matte dark-graphite anodized chassis + subtle upper chamfer edge (ZERO white sticker halo!)
    const baseChassis = makeRoundedSlab(W, D, this.boardH, 0.068, isK98 ? '#c1c3d5' : '#202229', 0, isK98 ? 0.82 : 1);
    const topBezel = makeRoundedSlab(W - 0.014, D - 0.014, 0.014, 0.060, isK98 ? '#ebeaf4' : '#2c2f38', this.boardH - 0.008);
    const plate = makeRoundedSlab(W - 0.062, D - 0.062, 0.008, 0.044, isK98 ? '#b9bbcd' : '#181a20', this.boardH + 0.004);
    this.boardGroup.add(kbShadow, baseChassis, topBezel, plate);

    const baseColors = {
      base: new THREE.Color('#ffffff'),
      mod: new THREE.Color('#ffffff'),
      orange: new THREE.Color('#ffffff'),
    };

    for (const spec of layout.keys) {
      const rY = spec.rowY ?? spec.row;
      const rSpan = spec.rowSpan ?? 1;
      const uCenter = spec.uStart + spec.uWidth * 0.5;
      const rCenter = rY + rSpan * 0.5;

      const screenU = isCatFacing ? layout.totalUnits - uCenter : uCenter;
      const screenR = isCatFacing ? layout.totalRows - rCenter : rCenter;

      const x = (screenU - layout.totalUnits * 0.5) * U;
      const z = (screenR - layout.totalRows * 0.5) * U;
      const accent = spec.accent === 'orange' ? 'orange' : spec.accent === 'mod' ? 'mod' : 'base';

      const legendText = spec.id === 'space' ? '' : spec.id === 'esc' ? 'Esc' : spec.label;
      const tex = makeKeyLegendTexture(legendText, accent, isCatFacing,
        isK98 ? (isK98LightKey(spec) ? '#e5e3de' : '#7886bc') : undefined);
      const topMat = new THREE.MeshBasicMaterial({ map: tex, color: baseColors[accent].clone() });
      const sideMat = isK98 ? (isK98LightKey(spec) ? this.sideBaseMat : this.sideK98Mat) :
        accent === 'orange' ? this.sideOrangeMat : accent === 'mod' ? this.sideModMat : this.sideBaseMat;

      const cap = new THREE.Mesh(this.capGeo, [sideMat, topMat, this.capBottomMat]);
      cap.scale.set(
        Math.max(0.06, spec.uWidth * U - (U - CAP)),
        this.capH,
        Math.max(0.06, rSpan * U - (U - CAP)),
      );

      const holder = new THREE.Group();
      holder.position.set(x, this.boardH + 0.008, z);
      holder.add(cap);
      this.boardGroup.add(holder);

      this.keys.set(spec.id, {
        spec,
        holder,
        topMat,
        baseColor: baseColors[accent],
        x,
        z,
        down: false,
        depth: 0,
        glow: 0,
      });
    }

    // Privacy dark frosted shield over the 3D keyboard
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 512;
    pCanvas.height = 160;
    const pg = pCanvas.getContext('2d')!;
    pg.fillStyle = 'rgba(15, 20, 32, 0.88)';
    pg.fillRect(0, 0, 512, 160);
    pg.strokeStyle = 'rgba(244, 114, 182, 0.65)';
    pg.lineWidth = 6;
    pg.strokeRect(6, 6, 500, 148);
    pg.font = 'bold 34px "Segoe UI", "PingFang SC", sans-serif';
    pg.fillStyle = '#fbcfe8';
    pg.textAlign = 'center';
    pg.textBaseline = 'middle';
    pg.fillText('🔒 密码防偷窥 · 已隐藏按键', 256, 80);
    const pTex = new THREE.CanvasTexture(pCanvas);
    pTex.colorSpace = THREE.SRGBColorSpace;
    this.privacyMat = new THREE.MeshBasicMaterial({
      map: pTex,
      transparent: true,
      opacity: 0,
      depthTest: false,
    });
    this.privacyPlate = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.08, D - 0.08), this.privacyMat);
    this.privacyPlate.rotation.x = -Math.PI / 2;
    this.privacyPlate.position.set(0, this.boardH + this.capH + 0.025, 0);
    this.privacyPlate.renderOrder = 30;
    this.privacyPlate.visible = false;
    this.boardGroup.add(this.privacyPlate);
  }

  public getLayoutId(): KeyboardLayoutId {
    return this.layoutId;
  }

  public getOrientation(): KeyboardOrientation {
    return this.orientation;
  }

  public getBoardWidth(): number {
    return this.boardWidth;
  }

  public resolveKey(vk: number): KeyEntry3D | null {
    const spec = resolveKeyByVk(vk, this.layoutId);
    if (!spec) return null;
    return this.keys.get(spec.id) || null;
  }

  public getKeyById(id: string): KeyEntry3D | null {
    return this.keys.get(id) || null;
  }

  public setKeyDown(id: string, down: boolean): void {
    const k = this.keys.get(id);
    if (k) k.down = down;
  }

  public releaseAllKeys(): void {
    for (const k of this.keys.values()) k.down = false;
  }

  public keyTopWorld(id: string, out = new THREE.Vector3()): THREE.Vector3 {
    const k = this.keys.get(id);
    this.boardGroup.updateMatrixWorld(true);
    if (!k) return out.set(0.24, this.boardH + this.capH, 1.08);
    return out
      .set(k.x, this.boardH + 0.008 + this.capH - k.depth, k.z)
      .applyMatrix4(this.boardGroup.matrixWorld);
  }

  public isRightEdgeTailKey(id: string): boolean {
    const k = this.keys.get(id);
    if (!k) return false;
    return k.x >= this.boardWidth * 0.22;
  }

  public setMouseNormalized(nx: number, ny: number): void {
    this.mouseTarget.set((nx - 0.5) * 0.22, 0, (ny - 0.5) * 0.14);
  }

  public pulseScrollWheel(): void {
    this.wheelGlow = 1;
  }

  public mouseTopWorld(out = new THREE.Vector3()): THREE.Vector3 {
    this.mouseGroup.updateMatrixWorld(true);
    return out.set(0, 0.115, -0.05).applyMatrix4(this.mouseShape.matrixWorld);
  }

  public update(
    dt: number,
    leftDown: boolean,
    rightDown: boolean,
    deskHopY: number,
    privacyAlpha: number,
  ): void {
    this.deskGroup.position.y = deskHopY;

    for (const k of this.keys.values()) {
      const targetDepth = k.down ? 0.032 : 0;
      k.depth += (targetDepth - k.depth) * approach(k.down ? 62 : 24, dt);
      k.glow += ((k.down ? 1 : 0) - k.glow) * approach(k.down ? 44 : 6.5, dt);
      k.holder.position.y = this.boardH + 0.008 - k.depth;
      k.topMat.color.copy(k.baseColor).lerp(this.hitColor, k.glow * 0.90);
    }

    if (this.privacyPlate && this.privacyMat) {
      this.privacyPlate.visible = privacyAlpha > 0.02;
      this.privacyMat.opacity = privacyAlpha;
    }

    this.mouseTarget.multiplyScalar(1 - approach(1.6, dt));
    this.mouseOffset.copy(this.mouseFollow.step(this.mouseTarget, dt));
    this.mouseGroup.position.copy(this.mouseHome).add(this.mouseOffset);

    this.leftPress += ((leftDown ? 1 : 0) - this.leftPress) * approach(32, dt);
    this.rightPress += ((rightDown ? 1 : 0) - this.rightPress) * approach(32, dt);
    this.wheelGlow = Math.max(0, this.wheelGlow - dt * 3.8);

    // Since mouseShape already rotates 180° when switching cat/viewer orientation, L plate is always LMB!
    this.leftBtnMat.opacity = 0.88 * this.leftPress;
    this.rightBtnMat.opacity = 0.88 * this.rightPress;
    this.wheelMat.color.set('#555966').lerp(this.hitColor, this.wheelGlow);

    const anyPress = Math.max(this.leftPress, this.rightPress);
    this.mouseShape.scale.set(1 + 0.03 * anyPress, 1 - 0.10 * anyPress, 1);
  }
}
