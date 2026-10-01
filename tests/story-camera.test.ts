import { expect, test, describe } from 'bun:test';
import * as storyCamera from '../diorama/story-camera';
import * as THREE from 'three';
import { viewFov } from '../diorama/layout';
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
  const pose = m.storyPose();
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const ndc = new THREE.Vector3(...PLAQUE_PANEL.center).project(camera);
  return { px: ((ndc.x + 1) / 2) * width, py: ((1 - ndc.y) / 2) * height };
}

describe('STORY_POSE 与 storyPose', () => {
  test('资料镜头位置为 (10, 5.5, 36)，观察目标为 (-2, -0.8, 4)', () => {
    expect(storyCamera.STORY_POSE).toEqual({ position: [10, 5.5, 36], target: [-2, -0.8, 4] });
  });

  test('storyPose() 返回与 STORY_POSE 一致的三维向量', () => {
    const pose = storyCamera.storyPose();
    expect(pose.position.toArray()).toEqual([10, 5.5, 36]);
    expect(pose.target.toArray()).toEqual([-2, -0.8, 4]);
  });

  test('storyPose() 每次返回独立副本，修改返回值不影响下一次结果', () => {
    const first = storyCamera.storyPose();
    first.position.set(0, 0, 0);
    first.target.set(9, 9, 9);
    const second = storyCamera.storyPose();
    expect(second.position.toArray()).toEqual([10, 5.5, 36]);
    expect(second.target.toArray()).toEqual([-2, -0.8, 4]);
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
const PLAQUE_BOX = new THREE.Box3(
  new THREE.Vector3(PLAQUE_PANEL.center[0] - PLAQUE_PANEL.width / 2, PLAQUE_PANEL.center[1] - PLAQUE_PANEL.height / 2, PLAQUE_PANEL.center[2]),
  new THREE.Vector3(PLAQUE_PANEL.center[0] + PLAQUE_PANEL.width / 2, PLAQUE_PANEL.center[1] + PLAQUE_PANEL.height / 2, PLAQUE_PANEL.center[2]),
);

function storyViewCamera(width: number, height: number) {
  const camera = new THREE.PerspectiveCamera(viewFov(width, height), width / height, 0.5, 400);
  const offset = storyCamera.framingOffset(width, height);
  camera.setViewOffset(width, height, offset.x, offset.y, width, height);
  const pose = storyCamera.storyPose();
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

function boxInFrame(box: THREE.Box3, camera: THREE.PerspectiveCamera, width: number, height: number): boolean {
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const ndc = new THREE.Vector3(x, y, z).project(camera);
    const px = ((ndc.x + 1) / 2) * width;
    const py = ((1 - ndc.y) / 2) * height;
    if (px < 0 || px > width || py < 0 || py > height || ndc.z > 1) return false;
  }
  return true;
}

describe('资料镜头位取景：主体完整入画', () => {
  const viewports: [number, number][] = [[1440, 900], [390, 844], [375, 667], [800, 800]];
  test.each(viewports)('%ix%i：铭牌与店头招牌完整入画', (w, h) => {
    const camera = storyViewCamera(w, h);
    expect(boxInFrame(PLAQUE_BOX, camera, w, h)).toBe(true);
    expect(boxInFrame(SIGN_BOX, camera, w, h)).toBe(true);
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
