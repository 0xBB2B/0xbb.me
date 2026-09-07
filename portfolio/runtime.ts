import * as THREE from 'three';
import { createCharacter } from './character';
import { disposeScene } from './geometry';
import type { TownInput } from './input';
import { advance, type Session } from './state';
import { createWorld } from './world';

export function mountWorld(
  container: HTMLElement,
  session: Session,
  input: TownInput,
  onUnavailable: () => void,
) {
  let renderer: THREE.WebGLRenderer | undefined;
  let scene: THREE.Scene | undefined;
  let character: ReturnType<typeof createCharacter> | undefined;
  let observer: ResizeObserver | undefined;
  let detach: (() => void) | undefined;
  let frame: number | undefined;
  let disposed = false;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (frame !== undefined) cancelAnimationFrame(frame);
    detach?.();
    observer?.disconnect();
    character?.dispose();
    if (scene) disposeScene(scene);
    if (renderer) {
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    dispose();
    onUnavailable();
  };

  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-label', 'Playable dusk town');
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    container.appendChild(renderer.domElement);

    const world = createWorld();
    scene = world.scene;
    character = createCharacter();
    scene.add(character.root);
    const camera = new THREE.OrthographicCamera(-10, 10, 6, -6, 0.1, 120);
    let cameraX = session.x;
    let targetHeight = 3.5;
    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      const viewHeight = height < 500 ? 10 : 15;
      const halfWidth = viewHeight * width / height / 2;
      camera.left = -halfWidth;
      camera.right = halfWidth;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      targetHeight = width < 600 ? 3.8 : 3.5;
      camera.updateProjectionMatrix();
      renderer!.setSize(width, height);
    };
    observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    detach = input.attach();
    let previous = performance.now();
    const render = (now: number) => {
      if (disposed) return;
      const seconds = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      advance(session, input.direction(), seconds);
      if (!session.paused) cameraX += (session.x - cameraX) * (1 - Math.exp(-seconds * 7));
      camera.position.set(cameraX, targetHeight + 5, 20);
      camera.lookAt(cameraX, targetHeight, 0);
      character!.update(session, camera);
      world.shadow.position.x = session.x;
      renderer!.render(scene!, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return { dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
