import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import * as THREE from 'three';
import { createPlayerVoxel } from './player-voxel';

const read = (name: string) => readFileSync(new URL(name, import.meta.url));

// Artifact validation only. These checks do not certify art preference or game animation.
test('removed SVG character is not shipped', () => {
  expect(existsSync(new URL('./player-redraw.svg', import.meta.url))).toBe(false);
});

test('black outfit has a complete renderable geometry model and real GLB', async () => {
  expect(existsSync(new URL('./player-voxel-black.ts', import.meta.url))).toBe(true);
  const { createBlackOutfitPlayerVoxel } = await import('./player-voxel-black');
  const model = createBlackOutfitPlayerVoxel();
  expect(model).toBeInstanceOf(THREE.Group);
  const bounds = new THREE.Box3().setFromObject(model);
  expect(bounds.max.y - bounds.min.y).toBeCloseTo(2.4, 6);
  expect(bounds.min.y).toBeCloseTo(0, 6);
  expect(bounds.max.z - bounds.min.z).toBeGreaterThan(0.5);
  let meshes = 0;
  model.traverse((object: THREE.Object3D) => {
    if (!(object instanceof THREE.Mesh)) return;
    meshes++;
    const positions = object.geometry.getAttribute('position');
    expect(positions.count).toBeGreaterThan(0);
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      expect(Object.values(material).some(value => value instanceof THREE.Texture)).toBe(false);
    }
  });
  expect(meshes).toBeGreaterThan(10);
  expect(existsSync(new URL('./player-voxel-black.glb', import.meta.url))).toBe(true);
  const glb = read('./player-voxel-black.glb');
  expect(glb.readUInt32LE(0)).toBe(0x46546c67);
  expect(glb.readUInt32LE(4)).toBe(2);
  expect(glb.readUInt32LE(8)).toBe(glb.length);
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const loaded = await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), '');
  const exportedBounds = new THREE.Box3().setFromObject(loaded.scene);
  expect(exportedBounds.max.y - exportedBounds.min.y).toBeCloseTo(2.4, 5);
  const document = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
  expect(document.meshes.length).toBeGreaterThan(10);
  expect(document.images ?? []).toEqual([]);
  expect(document.textures ?? []).toEqual([]);
  for (const buffer of document.buffers) expect(buffer.uri).toBeUndefined();
});

describe('Minecraft model source', () => {
  test('is a complete normalized 3D model using geometry and vertex colors, not image textures', () => {
    const model = createPlayerVoxel();
    const bounds = new THREE.Box3().setFromObject(model);
    expect(bounds.max.y - bounds.min.y).toBeCloseTo(3, 6);
    expect(bounds.min.y).toBeCloseTo(0, 6);
    expect(bounds.max.z - bounds.min.z).toBeGreaterThan(0.5);
    for (const part of ['Head', 'Torso', 'Left_arm', 'Right_arm', 'Left_leg', 'Right_leg', 'High_ponytail']) {
      expect(model.getObjectByName(part)).toBeDefined();
    }
    let meshes = 0;
    const materials = new Set<THREE.Material>();
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      meshes++;
      const positions = object.geometry.getAttribute('position');
      const colors = object.geometry.getAttribute('color');
      expect(positions.count).toBeGreaterThan(0);
      expect(colors.count).toBe(positions.count);
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        expect(Object.values(material).some(value => value instanceof THREE.Texture)).toBe(false);
        materials.add(material);
      }
      object.geometry.dispose();
    });
    expect(meshes).toBeGreaterThan(10);
    materials.forEach(material => material.dispose());
  });
});

describe('exported GLB', () => {
  test('is a glTF 2 binary model with vertex colors and no images, textures, or external buffers', () => {
    const glb = read('./player-voxel.glb');
    expect(glb.readUInt32LE(0)).toBe(0x46546c67);
    expect(glb.readUInt32LE(4)).toBe(2);
    expect(glb.readUInt32LE(8)).toBe(glb.length);
    expect(glb.readUInt32LE(16)).toBe(0x4e4f534a);
    const document = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
    expect(document.asset.version).toBe('2.0');
    expect(document.meshes.length).toBeGreaterThan(10);
    expect(document.images ?? []).toHaveLength(0);
    expect(document.textures ?? []).toHaveLength(0);
    for (const buffer of document.buffers) expect(buffer.uri).toBeUndefined();
    for (const mesh of document.meshes) {
      for (const primitive of mesh.primitives) {
        expect(primitive.attributes.POSITION).toBeNumber();
        expect(primitive.attributes.COLOR_0).toBeNumber();
      }
    }
  });
});

// Geometry bounds are the measured T-34 baseline, not inferred from the new implementation.
test('player/AC-11: uniform 80% bounds, sole origin and repeat construction/update stability', async () => {
  const { createBlackOutfitPlayerVoxel } = await import('./player-voxel-black');
  for (let i = 0; i < 3; i++) {
    const model = createBlackOutfitPlayerVoxel();
    for (let tick = 0; tick < 100; tick++) model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(1.2030719151632912 * 0.8, 6);
    expect(size.y).toBeCloseTo(2.4, 6);
    expect(size.z).toBeCloseTo(1.0048746332120269 * 0.8, 6);
    expect(bounds.min.y).toBeCloseTo(0, 6);
  }
});
test('player/AC-1: live and actual exported geometry have no protruding tongue', async () => {
  const { createBlackOutfitPlayerVoxel } = await import('./player-voxel-black');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const glb = read('./player-voxel-black.glb');
  const loaded = await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), '');
  for (const model of [createBlackOutfitPlayerVoxel(), loaded.scene]) {
    const tongues: string[] = [];
    model.traverse(o => { if (o instanceof THREE.Mesh && /tongue/i.test(o.name)) tongues.push(o.name); });
    expect(tongues).toEqual([]);
  }
});
