import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import * as THREE from 'three';
import { Hud } from '../components/portfolio/Hud';
import { createInput } from '../portfolio/input';
import { createCharacter } from '../portfolio/character';
import { createAppearanceEffect } from '../portfolio/appearance-effect';
import { disposeScene } from '../portfolio/geometry';
import { advance, APPEARANCE_CHANGE_SECONDS, cancelAppearanceChange, createSession, cycleAppearance, openOverview, PLAYER_APPEARANCES, ROAD, updateProximity } from '../portfolio/state';

test('the appearance switch shares the lighthouse-note range and cycles only black and A without moving or resetting language', () => {
  const session = createSession(); session.language = 'zh';
  const html = () => renderToStaticMarkup(<Hud session={session} input={createInput()} graphics="ready" />);
  expect(html()).not.toContain('avatar-switch');
  expect(cycleAppearance(session)).toBe(false);
  expect(PLAYER_APPEARANCES).toEqual(['black', 'dress']);
  session.x = ROAD.end - 1.21; updateProximity(session);
  expect(html()).not.toContain('avatar-switch'); expect(html()).not.toContain('lighthouse-note');
  session.x = ROAD.end - 1.2; updateProximity(session);
  expect(session.atLighthouse).toBe(true); expect(html()).toContain('avatar-switch'); expect(html()).toContain('lighthouse-note');
  session.x = ROAD.end; updateProximity(session);
  expect(html()).toContain('avatar-switch');
  expect(html()).not.toContain('class="appearance-label"');
  for (const expected of ['dress', 'black'] as const) {
    expect(cycleAppearance(session)).toBe(true);
    expect(cycleAppearance(session)).toBe(false);
    expect(openOverview(session)).toBe(false);
    advance(session, -1, APPEARANCE_CHANGE_SECONDS / 2, true);
    expect(session.appearance).toBe(expected);
    expect(session.appearanceTransition).not.toBeNull();
    advance(session, -1, APPEARANCE_CHANGE_SECONDS / 2, true);
    expect(session.appearanceTransition).toBeNull();
    expect(session.x).toBe(ROAD.end); expect(session.language).toBe('zh');
  }
  advance(session, -1, .5);
  expect(html()).not.toContain('avatar-switch');
  expect(session.appearance).toBe('black');
});

test('an interrupted appearance effect never prevents graphics-fault overview reading', () => {
  const session = createSession(); session.x = ROAD.end; updateProximity(session);
  cycleAppearance(session); cancelAppearanceChange(session);
  expect(openOverview(session)).toBe(true);
});

test('every selectable protagonist has larger running limb motion, supported feet and separately disposable geometry', () => {
  const camera = new THREE.OrthographicCamera(); camera.position.set(0, 8.5, 20); camera.lookAt(0, 3.5, 0); camera.updateMatrixWorld(true);
  for (const appearance of PLAYER_APPEARANCES) {
    const character = createCharacter(appearance); const session = createSession();
    session.appearance = appearance; session.walking = true; session.stride = Math.PI / 2;
    try {
      character.update(session, camera);
      const arm = character.root.getObjectByName('Left_arm')!;
      const leg = character.root.getObjectByName('Left_leg')!;
      const walkArm = Math.abs(arm.rotation.x), walkLeg = Math.abs(leg.parent!.rotation.x);
      session.sprintBlend = 1; character.update(session, camera);
      expect(Math.abs(arm.rotation.x)).toBeGreaterThan(walkArm * 2);
      expect(Math.abs(leg.parent!.rotation.x)).toBeGreaterThan(walkLeg * 2);
      for (let phase = 0; phase < Math.PI * 2; phase += Math.PI / 8) {
        session.stride = phase; character.update(session, camera); character.root.updateMatrixWorld(true);
        const a = new THREE.Box3().setFromObject(leg);
        const b = new THREE.Box3().setFromObject(character.root.getObjectByName('Right_leg')!);
        expect(Math.min(a.min.y, b.min.y)).toBeCloseTo(.035, 5);
      }
      expect(character.root.userData.appearance).toBe(appearance);
      expect(character.root.getObjectByName('Avatar_blonde')).toBeUndefined();
    } finally { character.dispose(); }
  }
});

test('appearance particles are local, reused, bounded and reduced-motion aware', () => {
  const scene = new THREE.Scene(); const effect = createAppearanceEffect(scene);
  const session = createSession(); session.x = ROAD.end; updateProximity(session);
  const root = scene.getObjectByName('Character_change_effect')!;
  try {
    effect.update(session, false); expect(root.visible).toBe(false);
    cycleAppearance(session); advance(session, 0, .24);
    expect(effect.update(session, false)).toBeLessThan(1);
    expect(root.visible).toBe(true); expect(root.position.x).toBe(ROAD.end);
    const sparks = root.getObjectByName('Change_light_particles') as THREE.InstancedMesh;
    expect(sparks.count).toBe(24); expect(sparks.visible).toBe(true);
    expect(effect.update(session, true)).toBe(1); expect(sparks.visible).toBe(false);
    cancelAppearanceChange(session); effect.update(session, false); expect(root.visible).toBe(false);
  } finally { disposeScene(scene); }
});
