import * as THREE from 'three';
import type { CutDirection, Hand, Lane } from '../../game/types';

// 紫罗兰（左手）和像素青（右手）——呼应银狼数据流配色。
export const HAND_COLOR: Record<Hand, number> = {
  L: 0x9b7bff,
  R: 0x66e0ff,
};

// 4 个轨道在 X 方向的中心位置（米）。
export const LANE_X: Record<Lane, number> = {
  0: -2.4,
  1: -0.8,
  2: 0.8,
  3: 2.4,
};

// 方块到达判定线时所处的 Z 坐标。
export const JUDGE_Z = 2;

// 方块从远处生成时的 Z 坐标。
export const SPAWN_Z = -16;

// 方块在判定线之后还能继续穿过相机的距离，用于 Miss 退场动画。
export const PAST_Z = 5;

// 方块从出生到判定线的位移：飞行速度按这段距离 / approachMs 计算。
export const APPROACH_DISTANCE = JUDGE_Z - SPAWN_Z;

// 方块离开视野的总位移：从 SPAWN_Z 走到 PAST_Z。
export const TRAVEL_DISTANCE = PAST_Z - SPAWN_Z;

// 单个方块沿 X 与 Y 的固定尺寸。
export const NOTE_SIZE = 0.78;

// 玩家抬眼看到方块时的高度。
export const NOTE_Y = 1.05;

const ARROW_ANGLE: Record<CutDirection, number> = {
  U: 0,
  D: Math.PI,
  L: -Math.PI / 2,
  R: Math.PI / 2,
  UL: -Math.PI / 4,
  UR: Math.PI / 4,
  DL: -3 * Math.PI / 4,
  DR: 3 * Math.PI / 4,
  A: 0,
};

// 缓存方块六面贴图，避免重复绘制 canvas。
const faceTextureCache = new Map<string, THREE.CanvasTexture>();

/**
 * makeNoteFaceTexture 生成方块正面贴图（含背景色与切击方向箭头）。
 *
 * 其它五面共用纯色版本（dir 传 'A' 即只画底色与小圆点）。
 */
export function makeNoteFaceTexture(hand: Hand, dir: CutDirection): THREE.CanvasTexture {
  const key = `${hand}:${dir}`;
  const cached = faceTextureCache.get(key);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  const bgColor = hand === 'L' ? '#7c5dff' : '#3fc7e8';
  const accentColor = hand === 'L' ? '#ffd6f4' : '#dffcff';

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 128, 128);

  // 内描边——加深方块边缘，避免黑色背景下边界模糊。
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 122, 122);

  // 顶部一道高光带，强化方块面的"金属质感"。
  const grad = ctx.createLinearGradient(0, 0, 0, 50);
  grad.addColorStop(0, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(6, 6, 116, 44);

  ctx.save();
  ctx.translate(64, 64);
  if (dir === 'A') {
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.rotate(ARROW_ANGLE[dir]);
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(0, -36);
    ctx.lineTo(26, 14);
    ctx.lineTo(10, 14);
    ctx.lineTo(10, 36);
    ctx.lineTo(-10, 36);
    ctx.lineTo(-10, 14);
    ctx.lineTo(-26, 14);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  faceTextureCache.set(key, texture);
  return texture;
}

/**
 * createNoteMesh 构造方块网格——正面带箭头贴图，其余五面使用纯色。
 */
export function createNoteMesh(hand: Hand, dir: CutDirection): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(NOTE_SIZE, NOTE_SIZE, NOTE_SIZE);
  const baseMat = new THREE.MeshBasicMaterial({ map: makeNoteFaceTexture(hand, 'A') });
  const arrowMat = new THREE.MeshBasicMaterial({ map: makeNoteFaceTexture(hand, dir) });
  // BoxGeometry 顺序：+x, -x, +y, -y, +z, -z。+z 是面向相机的"正面"。
  const materials = [baseMat, baseMat, baseMat, baseMat, arrowMat, baseMat];
  const mesh = new THREE.Mesh(geometry, materials);
  return mesh;
}

/**
 * createSaber 构造一把发光光剑——细长方块 + 半透明光晕外壳。
 */
export function createSaber(hand: Hand): THREE.Group {
  const group = new THREE.Group();
  const color = HAND_COLOR[hand];

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 1.8),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  blade.position.z = -0.6;
  group.add(blade);

  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 1.8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 }),
  );
  glow.position.z = -0.6;
  group.add(glow);

  const aura = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.34, 1.8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18 }),
  );
  aura.position.z = -0.6;
  group.add(aura);

  const hilt = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.16, 0.36),
    new THREE.MeshBasicMaterial({ color: 0x1d1933 }),
  );
  hilt.position.z = 0.4;
  group.add(hilt);

  return group;
}

/**
 * createEnvironment 创建银狼舞台：紫粉网格地面、远端霓虹拱门、扫描线条。
 */
export function createEnvironment(): THREE.Group {
  const group = new THREE.Group();

  const grid = new THREE.GridHelper(40, 60, 0xff4fd8, 0x3a206b);
  (grid.material as THREE.LineBasicMaterial).transparent = true;
  (grid.material as THREE.LineBasicMaterial).opacity = 0.6;
  grid.position.y = 0;
  group.add(grid);

  // 远端霓虹拱门——一道紫色发光长条横在 z 远处。
  const arch = new THREE.Mesh(
    new THREE.BoxGeometry(18, 0.08, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x9b7bff, transparent: true, opacity: 0.9 }),
  );
  arch.position.set(0, 4.5, SPAWN_Z + 0.4);
  group.add(arch);

  // 两侧高墙——垂直发光线，营造数据流走廊感。
  for (let i = 0; i < 8; i += 1) {
    const t = i / 7;
    const z = SPAWN_Z + t * (JUDGE_Z - SPAWN_Z - 0.5);
    const left = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 3, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x66e0ff, transparent: true, opacity: 0.6 }),
    );
    left.position.set(-4.6, 1.5, z);
    group.add(left);

    const right = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 3, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.6 }),
    );
    right.position.set(4.6, 1.5, z);
    group.add(right);
  }

  // 判定线——一条横亮线落在玩家正前方。
  const judgeLine = new THREE.Mesh(
    new THREE.BoxGeometry(11, 0.04, 0.04),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }),
  );
  judgeLine.position.set(0, 0.05, JUDGE_Z);
  group.add(judgeLine);

  // 远处地平线雾气底盘——一个紫色矩形，让 spawn 区不会显得空白。
  const horizon = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 6),
    new THREE.MeshBasicMaterial({ color: 0x2a1140, transparent: true, opacity: 0.65 }),
  );
  horizon.position.set(0, 3, SPAWN_Z - 0.5);
  group.add(horizon);

  return group;
}

/**
 * computeNoteZ 给定相对时间，计算方块当前在 Z 轴的位置。
 *
 * 速度按"出生 → 判定线"的距离 / approachMs 计算；过判定线后方块继续以同
 * 速度前飞，直到超过 PAST_Z 视为离场。
 *
 * 不依赖 three.js，便于纯函数测试。
 */
export function computeNoteZ(
  noteTime: number,
  elapsedMs: number,
  approachMs: number,
): number {
  const speed = APPROACH_DISTANCE / approachMs;
  return SPAWN_Z + (elapsedMs - (noteTime - approachMs)) * speed;
}

/**
 * isNoteVisible 判断方块当前是否处于可见时间窗口内。
 */
export function isNoteVisible(
  noteTime: number,
  elapsedMs: number,
  approachMs: number,
): boolean {
  const z = computeNoteZ(noteTime, elapsedMs, approachMs);
  return z >= SPAWN_Z && z <= PAST_Z;
}
