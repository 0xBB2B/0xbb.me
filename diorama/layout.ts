export const BASE_HALF = 13;

export interface CameraConfig {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export const DEFAULT_CAMERA: CameraConfig = {
  position: [33, 23, 40],
  target: [0, -1.4, -0.5],
  fov: 28,
};

export interface OrbitLimits {
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
}

export const ORBIT_LIMITS: OrbitLimits = {
  minDistance: 16,
  maxDistance: 80,
  minPolarAngle: 0.2,
  maxPolarAngle: 1.4,
};

export const CAR_CENTER: [number, number, number] = [-0.85, 0.15, 1.15];

export interface RoofZone {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y: number;
}

export const ROOF_ZONES: RoofZone[] = [
  { x0: -6.2, x1: 3.7, z0: -9.1, z1: -2.9, y: 4.1 },
  { x0: -6.2, x1: 3.7, z0: -2.9, z1: -1.35, y: 2.72 },
  { x0: -13, x1: -7.6, z0: -13, z1: -3.5, y: 7.1 },
];

export function isOnLot(x: number, z: number): boolean {
  return (x < 5 && z < 5) || z > 11 || (x > 11 && z < 5);
}

export function portraitDistanceScale(width: number, height: number): number {
  if (width >= height) return 1;
  return Math.min(1.9, Math.pow(height / width, 0.85));
}
