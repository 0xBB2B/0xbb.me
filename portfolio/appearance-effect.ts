import * as THREE from 'three';
import { APPEARANCE_CHANGE_SECONDS, type Session } from './state';

export function createAppearanceEffect(scene: THREE.Scene) {
  const root = new THREE.Group(); root.name = 'Character_change_effect'; root.visible = false; scene.add(root);
  const glow = new THREE.MeshBasicMaterial({ color: 0xaee9ed, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.72, .018, 6, 48), glow);
  ring.name = 'Change_light_ring'; ring.rotation.x = Math.PI / 2; ring.position.y = .065; root.add(ring);
  const sparkMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const sparks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), sparkMaterial, 24);
  sparks.name = 'Change_light_particles'; sparks.frustumCulled = false; root.add(sparks);
  for (let i = 0; i < sparks.count; i++) sparks.setColorAt(i, new THREE.Color(i % 3 ? 0xb4edf1 : 0xffdfaa));
  const transform = new THREE.Object3D();
  return {
    prepare() { root.visible = true; },
    update(session: Session, reducedMotion: boolean) {
      const transition = session.appearanceTransition;
      root.visible = !!transition;
      if (!transition) return 1;
      const t = Math.min(transition.elapsed / APPEARANCE_CHANGE_SECONDS, 1);
      const envelope = Math.sin(Math.PI * t);
      root.position.set(session.x, .035, .6);
      glow.opacity = envelope * .42;
      sparkMaterial.opacity = envelope * .75;
      ring.scale.setScalar(reducedMotion ? 1 : 1 + envelope * .3);
      sparks.visible = !reducedMotion;
      if (!reducedMotion) {
        for (let i = 0; i < sparks.count; i++) {
          const angle = i * 2.39996 + t * 1.8;
          const radius = .2 + (1 - envelope) * (.55 + i % 3 * .06);
          transform.position.set(Math.cos(angle) * radius, .12 + i / sparks.count * 2.65 + envelope * .18, Math.sin(angle) * radius);
          transform.rotation.set(t * 2, angle, Math.PI / 4);
          transform.scale.setScalar((.035 + i % 3 * .012) * envelope);
          transform.updateMatrix(); sparks.setMatrixAt(i, transform.matrix);
        }
        sparks.instanceMatrix.needsUpdate = true;
      }
      // A small local gather/reveal, never a full-screen flash. Reduced motion uses only the ring fade.
      return reducedMotion ? 1 : Math.max(.025, 1 - envelope * envelope);
    },
  };
}
