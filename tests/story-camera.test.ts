import { expect, test, describe } from 'bun:test';
import * as storyCamera from '../diorama/story-camera';
import * as storyScroll from '../diorama/story-scroll';
import * as THREE from 'three';
import { CAR_CENTER, viewFov } from '../diorama/layout';
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
  test('900 高视口：三段起点 0/900/1800', () => {
    expect(storyScroll.storyLayout(900)).toEqual({ sectionStarts: [0, 900, 1800] });
  });

  test('1200 高视口：三段起点等比缩放为 0/1200/2400', () => {
    expect(storyScroll.storyLayout(1200)).toEqual({ sectionStarts: [0, 1200, 2400] });
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

describe('poseAtScroll 段起点', () => {
  for (const k of [0, 1, 2] as const) {
    test(`第 ${k} 段起点：镜头与观察目标贴合该停靠点，序号为 ${k}`, () => {
      const sectionStarts = storyScroll.storyLayout(900).sectionStarts;
      const result = storyCamera.poseAtScroll(sectionStarts[k], 900);
      const stop = storyCamera.stopPose(k);
      expect(result.position.distanceTo(stop.position)).toBeLessThan(0.05);
      expect(result.target.distanceTo(stop.target)).toBeLessThan(0.05);
      expect(result.index).toBe(k);
    });
  }
});

describe('poseAtScroll 段间过渡', () => {
  test('第 0、1 段之间：镜头远离两侧停靠点，处于过渡中', () => {
    const result = storyCamera.poseAtScroll(450, 900);
    const stop0 = storyCamera.stopPose(0);
    const stop1 = storyCamera.stopPose(1);
    expect(result.position.distanceTo(stop0.position)).toBeGreaterThan(0.1);
    expect(result.position.distanceTo(stop1.position)).toBeGreaterThan(0.1);
  });

  test('第 1、2 段之间：镜头远离两侧停靠点，处于过渡中', () => {
    const result = storyCamera.poseAtScroll(1350, 900);
    const stop1 = storyCamera.stopPose(1);
    const stop2 = storyCamera.stopPose(2);
    expect(result.position.distanceTo(stop1.position)).toBeGreaterThan(0.1);
    expect(result.position.distanceTo(stop2.position)).toBeGreaterThan(0.1);
  });
});

describe('poseAtScroll index', () => {
  test('第 1 段起点 → 0', () => {
    expect(storyCamera.poseAtScroll(0, 900).index).toBe(0);
  });

  test('第 2 段起点 → 1', () => {
    expect(storyCamera.poseAtScroll(900, 900).index).toBe(1);
  });

  test('第 3 段起点 → 2', () => {
    expect(storyCamera.poseAtScroll(1800, 900).index).toBe(2);
  });

  test('段间更靠近第 1 段起点 → 0', () => {
    expect(storyCamera.poseAtScroll(300, 900).index).toBe(0);
  });

  test('段间更靠近第 2 段起点 → 1', () => {
    expect(storyCamera.poseAtScroll(700, 900).index).toBe(1);
  });
});

describe('createPager', () => {
  test('PAGE_DURATION 在 0.8～1.2 秒之间', () => {
    expect(storyScroll.PAGE_DURATION).toBeGreaterThanOrEqual(0.8);
    expect(storyScroll.PAGE_DURATION).toBeLessThanOrEqual(1.2);
  });

  test('向下翻页返回下一段序号，向上翻页返回上一段序号', () => {
    const down = storyScroll.createPager({ durationMs: 1000, cooldownMs: 500 });
    expect(down.input(1, 0, 0)).toBe(1);
    const up = storyScroll.createPager({ durationMs: 1000, cooldownMs: 500 });
    expect(up.input(-1, 0, 1)).toBe(0);
  });

  test('接受一次翻页后，动画时长加冷却时长结束前即使每 50 毫秒持续输入也一直返回 null，锁定结束后第一次输入立即生效', () => {
    const pager = storyScroll.createPager({ durationMs: 1000, cooldownMs: 500 });
    expect(pager.input(1, 0, 0)).toBe(1);
    for (let t = 50; t <= 1450; t += 50) {
      expect(pager.input(1, t, 1)).toBeNull();
    }
    expect(pager.input(1, 1500, 1)).toBe(2);
  });

  test('单次输入场景：锁定结束前的探测返回 null，锁定结束后的探测返回目标段', () => {
    const pager = storyScroll.createPager({ durationMs: 1000, cooldownMs: 500 });
    expect(pager.input(1, 0, 0)).toBe(1);
    expect(pager.input(1, 1300, 1)).toBeNull();
    expect(pager.input(1, 1600, 1)).toBe(2);
  });

  test('rest 从调用时刻起进入冷却：冷却期内输入返回 null，冷却结束后第一次输入生效', () => {
    const pager = storyScroll.createPager({ durationMs: 1000, cooldownMs: 500 });
    pager.rest(0);
    expect(pager.input(1, 400, 0)).toBeNull();
    expect(pager.input(1, 500, 0)).toBe(1);
  });

  test('目标越界（第 1 段向上）返回 null 且不上锁，紧接着有效方向立即生效', () => {
    const pager = storyScroll.createPager({ durationMs: 1000, cooldownMs: 500 });
    expect(pager.input(-1, 0, 0)).toBeNull();
    expect(pager.input(1, 0, 0)).toBe(1);
  });

  test('目标越界（第 3 段向下）返回 null 且不上锁，紧接着反方向立即生效', () => {
    const pager = storyScroll.createPager({ durationMs: 1000, cooldownMs: 500 });
    expect(pager.input(1, 0, 2)).toBeNull();
    expect(pager.input(-1, 0, 2)).toBe(1);
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

describe('scrollProgress 与 poseAtScroll 的段序号一致', () => {
  test.each([0, 300, 450, 700, 900, 1300, 1800])('scrollY=%i', (scrollY) => {
    const pose = storyCamera.poseAtScroll(scrollY, 900);
    expect(storyScroll.scrollProgress(scrollY, 900).index).toBe(pose.index);
  });
});
