import { expect, test, describe } from 'bun:test';
import * as storyCamera from '../diorama/story-camera';
import * as storyScroll from '../diorama/story-scroll';
import * as THREE from 'three';
import { CAR_CENTER, DEFAULT_CAMERA, viewFov } from '../diorama/layout';
import { PLAQUE_PANEL } from '../diorama/plaque';

type Pose = { position: THREE.Vector3; target: THREE.Vector3 };

function makePose(position: [number, number, number], target: [number, number, number]): Pose {
  return { position: new THREE.Vector3(...position), target: new THREE.Vector3(...target) };
}

function plaqueProjection(width: number, height: number) {
  const m = storyCamera;
  const camera = new THREE.PerspectiveCamera(viewFov(width, height), width / height, 0.5, 400);
  const offset = m.framingOffset(width, height);
  camera.setViewOffset(width, height, offset.x, offset.y, width, height);
  const pose = m.stopPose(0);
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const ndc = new THREE.Vector3(...PLAQUE_PANEL.center).project(camera);
  return { px: ((ndc.x + 1) / 2) * width, py: ((1 - ndc.y) / 2) * height };
}

describe('storyLayout', () => {
  test('900 高视口：回拉区 450，三段起点 450/1350/2250', () => {
    expect(storyScroll.storyLayout(900)).toEqual({ pullBack: 450, sectionStarts: [450, 1350, 2250] });
  });

  test('1200 高视口：回拉区随视口高度线性缩放', () => {
    expect(storyScroll.storyLayout(1200)).toEqual({ pullBack: 600, sectionStarts: [600, 1800, 3000] });
  });
});

describe('CAMERA_STOPS', () => {
  test('长度为 3，每项含三维 position 与 target', () => {
    const stops = storyCamera.CAMERA_STOPS;
    expect(stops.length).toBe(3);
    for (const stop of stops) {
      expect(stop.position.length).toBe(3);
      expect(stop.target.length).toBe(3);
    }
  });
});

describe('poseAtScroll 段内跟手', () => {
  const dioramaPose = makePose(DEFAULT_CAMERA.position, DEFAULT_CAMERA.target);

  for (const k of [0, 1, 2] as const) {
    test(`第 ${k} 段起点：镜头与观察目标贴合该停靠点，透明度为 1`, () => {
      const sectionStarts = storyScroll.storyLayout(900).sectionStarts;
      const result = storyCamera.poseAtScroll(sectionStarts[k], 900, dioramaPose);
      const stop = storyCamera.stopPose(k);
      expect(result.position.distanceTo(stop.position)).toBeLessThan(0.05);
      expect(result.target.distanceTo(stop.target)).toBeLessThan(0.05);
      expect(result.opacity).toBe(1);
    });
  }

  test('第 1、2 段起点正中间：镜头远离两侧停靠点，处于过渡中', () => {
    const result = storyCamera.poseAtScroll(900, 900, dioramaPose);
    const stop0 = storyCamera.stopPose(0);
    const stop1 = storyCamera.stopPose(1);
    expect(result.position.distanceTo(stop0.position)).toBeGreaterThan(0.1);
    expect(result.position.distanceTo(stop1.position)).toBeGreaterThan(0.1);
  });
});

describe('poseAtScroll 回拉区', () => {
  test('回拉区中点：镜头介于第 1 停靠点与整体视角之间，透明度介于 0 和 1 之间', () => {
    const dioramaPose = makePose(DEFAULT_CAMERA.position, DEFAULT_CAMERA.target);
    const result = storyCamera.poseAtScroll(225, 900, dioramaPose);
    const stop0 = storyCamera.stopPose(0);
    expect(result.position.distanceTo(stop0.position)).toBeGreaterThan(0.1);
    expect(result.position.distanceTo(dioramaPose.position)).toBeGreaterThan(0.1);
    expect(result.opacity).toBeGreaterThan(0);
    expect(result.opacity).toBeLessThan(1);
  });

  test('scrollY 为 0：镜头等于整体视角位姿（默认位姿），透明度为 0', () => {
    const dioramaPose = makePose(DEFAULT_CAMERA.position, DEFAULT_CAMERA.target);
    const result = storyCamera.poseAtScroll(0, 900, dioramaPose);
    expect(result.position.distanceTo(dioramaPose.position)).toBeLessThan(0.1);
    expect(result.opacity).toBe(0);
  });

  test('scrollY 为 0：使用非默认整体视角位姿时，镜头跟随传入值而非硬编码默认值', () => {
    const customPose = makePose([-30, 20, 30], [1, 2, 3]);
    const result = storyCamera.poseAtScroll(0, 900, customPose);
    expect(result.position.distanceTo(customPose.position)).toBeLessThan(1e-6);
    expect(result.target.distanceTo(customPose.target)).toBeLessThan(1e-6);
  });
});

describe('poseAtScroll index', () => {
  const dioramaPose = makePose(DEFAULT_CAMERA.position, DEFAULT_CAMERA.target);

  test('回拉区内 → 0', () => {
    expect(storyCamera.poseAtScroll(200, 900, dioramaPose).index).toBe(0);
  });

  test('第 2 段起点 → 1', () => {
    expect(storyCamera.poseAtScroll(1350, 900, dioramaPose).index).toBe(1);
  });

  test('第 3 段起点 → 2', () => {
    expect(storyCamera.poseAtScroll(2250, 900, dioramaPose).index).toBe(2);
  });

  test('段间更靠近第 1 段起点 → 0', () => {
    expect(storyCamera.poseAtScroll(700, 900, dioramaPose).index).toBe(0);
  });

  test('段间更靠近第 2 段起点 → 1', () => {
    expect(storyCamera.poseAtScroll(1300, 900, dioramaPose).index).toBe(1);
  });
});

describe('snapTarget', () => {
  test('第 1、2 段之间超过 50%（60%）→ 吸附到第 2 段起点', () => {
    expect(storyScroll.snapTarget(990, 900)).toBe(1350);
  });

  test('第 1、2 段之间不足 50%（40%）→ 吸附到第 1 段起点', () => {
    expect(storyScroll.snapTarget(810, 900)).toBe(450);
  });

  test('回拉区内（>0）一律吸附到第 1 段起点', () => {
    expect(storyScroll.snapTarget(1, 900)).toBe(450);
    expect(storyScroll.snapTarget(225, 900)).toBe(450);
    expect(storyScroll.snapTarget(449, 900)).toBe(450);
  });

  test('超过最后一段起点 → 吸附到第 3 段起点', () => {
    expect(storyScroll.snapTarget(3000, 900)).toBe(2250);
  });

  test('正好在顶部（0）→ 不吸附，停在 0', () => {
    expect(storyScroll.snapTarget(0, 900)).toBe(0);
  });
});

describe('framingOffset 取景区域', () => {
  test('宽屏（1440x900）：铭牌中心投影在画面右侧约 60%，且入画', () => {
    const { px, py } = plaqueProjection(1440, 900);
    expect(px).toBeGreaterThan(576);
    expect(px).toBeGreaterThanOrEqual(0);
    expect(px).toBeLessThanOrEqual(1440);
    expect(py).toBeGreaterThanOrEqual(0);
    expect(py).toBeLessThanOrEqual(900);
  });

  test('竖屏（390x844）：铭牌中心投影在画面上方约 55%，且入画', () => {
    const { px, py } = plaqueProjection(390, 844);
    expect(py).toBeLessThan(464.2);
    expect(px).toBeGreaterThanOrEqual(0);
    expect(px).toBeLessThanOrEqual(390);
    expect(py).toBeGreaterThanOrEqual(0);
    expect(py).toBeLessThanOrEqual(844);
  });
});

describe('enterSequence', () => {
  const from = makePose([0, 0, 0], [0, -1, 0]);
  const to = makePose([10, 5, 10], [0, -1.4, -0.5]);

  test('总时长不超过 1.5 秒且大于 0', () => {
    const { duration } = storyCamera.enterSequence(from, to);
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThanOrEqual(1.5);
  });

  test('起始时刻位于起点', () => {
    const seq = storyCamera.enterSequence(from, to);
    expect(seq.sample(0).position.distanceTo(from.position)).toBeLessThan(1e-6);
  });

  test('结束时刻抵达终点', () => {
    const seq = storyCamera.enterSequence(from, to);
    expect(seq.sample(seq.duration).position.distanceTo(to.position)).toBeLessThan(0.05);
  });

  test('超出时长后保持在终点', () => {
    const seq = storyCamera.enterSequence(from, to);
    const atEnd = seq.sample(seq.duration);
    const afterEnd = seq.sample(seq.duration + 5);
    expect(afterEnd.position.distanceTo(atEnd.position)).toBeLessThan(1e-6);
    expect(afterEnd.target.distanceTo(atEnd.target)).toBeLessThan(1e-6);
  });

  test('中途既不在起点也不在终点', () => {
    const seq = storyCamera.enterSequence(from, to);
    const mid = seq.sample(seq.duration / 2);
    expect(mid.position.distanceTo(from.position)).toBeGreaterThan(0.1);
    expect(mid.position.distanceTo(to.position)).toBeGreaterThan(0.1);
  });
});

const SIGN_BOX = new THREE.Box3(new THREE.Vector3(-6.15, 2.75, -2.66), new THREE.Vector3(3.65, 3.69, -2.66));
const DOOR_BOX = new THREE.Box3(new THREE.Vector3(-0.61, 0.25, -3.26), new THREE.Vector3(1.41, 2.45, -3.26));
const CAR_BOX = new THREE.Box3(new THREE.Vector3(-1.95, 0.15, -1.25), new THREE.Vector3(0.25, 1.46, 3.44));
const PLAQUE_BOX = new THREE.Box3(
  new THREE.Vector3(PLAQUE_PANEL.center[0] - PLAQUE_PANEL.width / 2, PLAQUE_PANEL.center[1] - PLAQUE_PANEL.height / 2, PLAQUE_PANEL.center[2]),
  new THREE.Vector3(PLAQUE_PANEL.center[0] + PLAQUE_PANEL.width / 2, PLAQUE_PANEL.center[1] + PLAQUE_PANEL.height / 2, PLAQUE_PANEL.center[2]),
);

function stopCamera(index: number, width: number, height: number) {
  const camera = new THREE.PerspectiveCamera(viewFov(width, height), width / height, 0.5, 400);
  const offset = storyCamera.framingOffset(width, height);
  camera.setViewOffset(width, height, offset.x, offset.y, width, height);
  const pose = storyCamera.stopPose(index);
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

function boxScreenBounds(box: THREE.Box3, camera: THREE.PerspectiveCamera, width: number, height: number) {
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity, inFrame = true;
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const ndc = new THREE.Vector3(x, y, z).project(camera);
    const px = ((ndc.x + 1) / 2) * width;
    const py = ((1 - ndc.y) / 2) * height;
    if (px < 0 || px > width || py < 0 || py > height || ndc.z > 1) inFrame = false;
    left = Math.min(left, px);
    right = Math.max(right, px);
    top = Math.min(top, py);
    bottom = Math.max(bottom, py);
  }
  return { left, right, top, bottom, inFrame };
}

function boxInFrame(box: THREE.Box3, camera: THREE.PerspectiveCamera, width: number, height: number): boolean {
  return boxScreenBounds(box, camera, width, height).inFrame;
}

describe('停靠点取景：主体完整入画', () => {
  const viewports: [number, number][] = [[1440, 900], [390, 844], [375, 667], [800, 800]];
  test.each(viewports)('%ix%i：第 1 停靠点铭牌与店头招牌完整入画', (w, h) => {
    const camera = stopCamera(0, w, h);
    expect(boxInFrame(PLAQUE_BOX, camera, w, h)).toBe(true);
    expect(boxInFrame(SIGN_BOX, camera, w, h)).toBe(true);
  });
  test.each(viewports)('%ix%i：第 2 停靠点店头招牌完整入画', (w, h) => {
    expect(boxInFrame(SIGN_BOX, stopCamera(1, w, h), w, h)).toBe(true);
  });
  test.each(viewports)('%ix%i：第 3 停靠点保时捷整车与店门完整入画', (w, h) => {
    const camera = stopCamera(2, w, h);
    expect(boxInFrame(CAR_BOX, camera, w, h)).toBe(true);
    expect(boxInFrame(DOOR_BOX, camera, w, h)).toBe(true);
  });
  test.each(viewports.filter(([w, h]) => w / h >= 1))('%ix%i：宽屏第 3 停靠点整车左边缘超过视口宽的 0.4 倍', (w, h) => {
    const { left } = boxScreenBounds(CAR_BOX, stopCamera(2, w, h), w, h);
    expect(left).toBeGreaterThan(w * 0.4);
  });
  test.each(viewports.filter(([w, h]) => w / h < 1))('%ix%i：竖屏第 3 停靠点整车下边缘低于视口高的 0.55 倍', (w, h) => {
    const { bottom } = boxScreenBounds(CAR_BOX, stopCamera(2, w, h), w, h);
    expect(bottom).toBeLessThan(h * 0.55);
  });
});

describe('第 3 停靠点位置：从车侧前方较低处看车', () => {
  test('镜头在车身前方、偏离车中心 x 超过 2 米、高度低于 2.5 米', () => {
    const pose = storyCamera.stopPose(2);
    expect(pose.position.z).toBeGreaterThan(CAR_BOX.max.z);
    expect(Math.abs(pose.position.x - CAR_CENTER[0])).toBeGreaterThan(2);
    expect(pose.position.y).toBeLessThan(2.5);
  });
});

describe('回拉区比例与滚入深度成正比', () => {
  test.each([0.25, 0.5, 0.75])('滚入 %p 时不透明度等于该比例，镜头到整体视角的距离占全程同一比例', (ratio) => {
    const diorama = makePose([33, 23, 40], [0, -1.4, -0.5]);
    const stop0 = storyCamera.stopPose(0);
    const total = diorama.position.distanceTo(stop0.position);
    const result = storyCamera.poseAtScroll(450 * ratio, 900, diorama);
    expect(result.opacity).toBeCloseTo(ratio, 6);
    expect(result.position.distanceTo(diorama.position) / total).toBeCloseTo(ratio, 6);
  });
});

describe('停靠点与视口无关', () => {
  test('停靠点等于 CAMERA_STOPS 原值', () => {
    storyCamera.CAMERA_STOPS.forEach((stop, index) => {
      const pose = storyCamera.stopPose(index);
      pose.position.toArray().forEach((value, axis) => expect(value).toBeCloseTo(stop.position[axis], 9));
      pose.target.toArray().forEach((value, axis) => expect(value).toBeCloseTo(stop.target[axis], 9));
    });
  });
});

describe('enterSequence 不受调用方后续修改起点影响', () => {
  test('构造后修改 from 向量，采样结果不变', () => {
    const from = makePose([33, 23, 40], [0, -1.4, -0.5]);
    const to = makePose([12, 5.5, 36], [-1, -0.8, 4]);
    const sequence = storyCamera.enterSequence(from, to);
    const before = sequence.sample(sequence.duration / 3).position.clone();
    from.position.set(0, 0, 0);
    from.target.set(9, 9, 9);
    expect(sequence.sample(sequence.duration / 3).position.distanceTo(before)).toBeLessThan(1e-9);
  });
});

describe('scrollProgress 与 poseAtScroll 的不透明度和段序号一致', () => {
  test.each([0, 1, 225, 449, 450, 700, 900, 990, 1350, 1800, 2250, 3000])('scrollY=%i', (scrollY) => {
    const diorama = makePose([33, 23, 40], [0, -1.4, -0.5]);
    const pose = storyCamera.poseAtScroll(scrollY, 900, diorama);
    expect(storyScroll.scrollProgress(scrollY, 900)).toEqual({ opacity: pose.opacity, index: pose.index });
  });
});
