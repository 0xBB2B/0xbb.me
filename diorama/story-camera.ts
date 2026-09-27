import * as THREE from 'three';
import { storyLayout, scrollProgress } from './story-scroll';

export interface Pose {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

interface CameraStop {
  position: [number, number, number];
  target: [number, number, number];
}

export const CAMERA_STOPS: CameraStop[] = [
  { position: [10, 5.5, 36], target: [-2, -0.8, 4] },
  { position: [3, 5.5, 20], target: [-1, 2.2, -2] },
  { position: [-6.35, 1.5, 10.68], target: [-0.85, 0.7, 1.2] },
];

export function framingOffset(width: number, height: number): { x: number; y: number } {
  if (width / height >= 1) return { x: -0.19 * width, y: 0 };
  return { x: 0, y: 0.15 * height };
}

export function stopPose(index: number): Pose {
  const stop = CAMERA_STOPS[index];
  return { position: new THREE.Vector3(...stop.position), target: new THREE.Vector3(...stop.target) };
}

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

export function poseAtScroll(
  scrollY: number,
  height: number,
  dioramaPose: Pose,
): { position: THREE.Vector3; target: THREE.Vector3; opacity: number; index: number } {
  const { pullBack, sectionStarts } = storyLayout(height);
  const { opacity, index } = scrollProgress(scrollY, height);

  if (scrollY <= 0) {
    return { position: dioramaPose.position.clone(), target: dioramaPose.target.clone(), opacity, index };
  }

  if (scrollY < pullBack) {
    const t = scrollY / pullBack;
    const stop0 = stopPose(0);
    return {
      position: dioramaPose.position.clone().lerp(stop0.position, t),
      target: dioramaPose.target.clone().lerp(stop0.target, t),
      opacity,
      index,
    };
  }

  const lastIndex = sectionStarts.length - 1;
  if (scrollY >= sectionStarts[lastIndex]) {
    const last = stopPose(lastIndex);
    return { position: last.position, target: last.target, opacity, index };
  }

  for (let i = 0; i < lastIndex; i++) {
    if (scrollY >= sectionStarts[i] && scrollY < sectionStarts[i + 1]) {
      const t = smoothstep((scrollY - sectionStarts[i]) / (sectionStarts[i + 1] - sectionStarts[i]));
      const stopA = stopPose(i);
      const stopB = stopPose(i + 1);
      return {
        position: stopA.position.lerp(stopB.position, t),
        target: stopA.target.lerp(stopB.target, t),
        opacity,
        index,
      };
    }
  }

  const last = stopPose(lastIndex);
  return { position: last.position, target: last.target, opacity, index };
}

const ENTER_DURATION = 1.2;

export function enterSequence(from: Pose, to: Pose): { duration: number; sample(seconds: number): Pose } {
  const start = { position: from.position.clone(), target: from.target.clone() };
  const end = { position: to.position.clone(), target: to.target.clone() };
  return {
    duration: ENTER_DURATION,
    sample(seconds: number): Pose {
      const t = smoothstep(seconds / ENTER_DURATION);
      return {
        position: start.position.clone().lerp(end.position, t),
        target: start.target.clone().lerp(end.target, t),
      };
    },
  };
}
