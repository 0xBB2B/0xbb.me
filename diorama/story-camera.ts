import * as THREE from 'three';

export interface Pose {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export const STORY_POSE = { position: [10, 5.5, 36], target: [-2, -0.8, 4] } as const;

export function storyPose(): Pose {
  return { position: new THREE.Vector3(...STORY_POSE.position), target: new THREE.Vector3(...STORY_POSE.target) };
}

export function framingOffset(width: number, height: number): { x: number; y: number } {
  if (width / height >= 1) return { x: -0.19 * width, y: 0 };
  return { x: 0, y: 0.15 * height };
}

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

const ENTER_DURATION = 1;

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
