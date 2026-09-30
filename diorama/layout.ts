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

export interface RoofPuddle {
  x: number;
  z: number;
  rx: number;
  rz: number;
}

export interface RoofZone {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y: number;
  puddles: RoofPuddle[];
}

export const ROOF_ZONES: RoofZone[] = [
  {
    x0: -6.2, x1: 3.7, z0: -9.1, z1: -2.9, y: 4.1,
    puddles: [
      { x: -1.8, z: -4.3, rx: 0.9, rz: 0.5 },
      { x: 2.2, z: -6.6, rx: 0.7, rz: 0.45 },
      { x: -4.6, z: -3.9, rx: 0.55, rz: 0.4 },
    ],
  },
  { x0: -6.2, x1: 3.7, z0: -2.9, z1: -1.35, y: 2.72, puddles: [] },
  {
    x0: -13, x1: -7.6, z0: -13, z1: -3.5, y: 7.2,
    puddles: [
      { x: -9.4, z: -8.8, rx: 0.8, rz: 0.5 },
      { x: -11.6, z: -5.2, rx: 0.6, rz: 0.4 },
      { x: -9.0, z: -11.8, rx: 0.55, rz: 0.35 },
    ],
  },
];

export function isOnLot(x: number, z: number): boolean {
  return (x < 5 && z < 5) || z > 11 || (x > 11 && z < 5);
}

export function viewFov(width: number, height: number): number {
  const aspect = width / height;
  if (aspect >= 1.6) return DEFAULT_CAMERA.fov;
  const halfFov = Math.atan((Math.tan((DEFAULT_CAMERA.fov / 2) * (Math.PI / 180)) * 1.6) / aspect);
  return (halfFov * 2 * 180) / Math.PI;
}
