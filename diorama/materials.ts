import * as THREE from 'three';

export interface CanvasLike {
  width: number;
  height: number;
  getContext(id: '2d'): CanvasRenderingContext2D | null;
}

let createCanvas: () => CanvasLike = () => document.createElement('canvas');

export function setCanvasFactory(factory: () => CanvasLike): void {
  createCanvas = factory;
}

export function ctex(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeat?: [number, number],
): THREE.CanvasTexture {
  const canvas = createCanvas();
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  texture.userData.redraw = (): void => {
    const redrawCtx = canvas.getContext('2d');
    if (!redrawCtx) return;
    redrawCtx.clearRect(0, 0, width, height);
    draw(redrawCtx, width, height);
    texture.needsUpdate = true;
  };
  return texture;
}

export function redrawCtex(texture: THREE.CanvasTexture): void {
  (texture.userData.redraw as (() => void) | undefined)?.();
}

export function noOutline<T extends THREE.Material>(material: T): T {
  material.userData.outlineParameters = { visible: false };
  return material;
}

function shadeTable(steps: number[]): THREE.DataTexture {
  const texture = new THREE.DataTexture(new Uint8Array(steps), 4, 1, THREE.RedFormat);
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

let gradientMap: THREE.DataTexture | null = null;
let frontLitGradientMap: THREE.DataTexture | null = null;

export function toonGradientMap(): THREE.DataTexture {
  return (gradientMap ??= shadeTable([70, 150, 215, 255]));
}

function toonFrontLitGradientMap(): THREE.DataTexture {
  return (frontLitGradientMap ??= shadeTable([0, 0, 215, 255]));
}

export interface ToonOptions {
  glow?: number;
  map?: THREE.Texture;
  opacity?: number;
  side?: THREE.Side;
  noOutline?: boolean;
  frontLitOnly?: boolean;
}

const matCache = new Map<string, THREE.MeshToonMaterial>();

export function toon(color: THREE.ColorRepresentation, o: ToonOptions = {}): THREE.MeshToonMaterial {
  const key = o.map ? null : `${new THREE.Color(color).getHexString()}${JSON.stringify(o)}`;
  const cached = key ? matCache.get(key) : undefined;
  if (cached) return cached;
  const material = new THREE.MeshToonMaterial({ color, gradientMap: o.frontLitOnly ? toonFrontLitGradientMap() : toonGradientMap() });
  if (o.glow) material.emissive = new THREE.Color(color).multiplyScalar(o.glow);
  if (o.map) {
    material.map = o.map;
    if (o.glow) {
      material.emissive.setScalar(o.glow);
      material.emissiveMap = o.map;
    }
  }
  if (o.opacity !== undefined) {
    material.transparent = true;
    material.opacity = o.opacity;
    material.depthWrite = false;
  }
  if (o.side !== undefined) material.side = o.side;
  if (o.noOutline) noOutline(material);
  if (key) matCache.set(key, material);
  return material;
}

export interface GlowOptions {
  map?: THREE.Texture;
  noOutline?: boolean;
  side?: THREE.Side;
}

export function glow(color: THREE.ColorRepresentation, k = 1.6, o: GlowOptions = {}): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false });
  if (o.map) material.map = o.map;
  if (o.noOutline) noOutline(material);
  if (o.side !== undefined) material.side = o.side;
  return material;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export const sharedTime = { value: 0 };
