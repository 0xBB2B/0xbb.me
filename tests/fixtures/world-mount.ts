import * as THREE from 'three';
import { mountDiorama } from '../../diorama/world';

declare global {
  interface Window {
    handle?: Awaited<ReturnType<typeof mountDiorama>>;
    views?: string[];
    viewTimes?: number[];
    ready?: boolean;
    mountError?: string;
    projectToScreen?: (world: [number, number, number]) => { x: number; y: number } | null;
  }
}

window.addEventListener('error', (event) => {
  window.mountError ??= String(event.error ?? event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  window.mountError ??= String((event as PromiseRejectionEvent).reason);
});

async function boot(): Promise<void> {
  window.views = [];
  window.viewTimes = [];
  const stage = document.getElementById('stage');
  if (!stage) throw Error('#stage missing from fixture');
  const handle = await mountDiorama(stage, { language: 'zh' });
  handle.onViewChange((view) => {
    window.views!.push(view);
    window.viewTimes!.push(performance.now());
  });
  await handle.ready;
  window.handle = handle;
  window.projectToScreen = (world) => {
    const camera = (handle as unknown as { camera?: THREE.PerspectiveCamera }).camera;
    if (!camera) return null;
    camera.updateMatrixWorld();
    const ndc = new THREE.Vector3(...world).project(camera);
    return { x: ((ndc.x + 1) / 2) * innerWidth, y: ((1 - ndc.y) / 2) * innerHeight };
  };
  window.ready = true;
}

boot().catch((error) => {
  window.mountError ??= error instanceof Error ? `${error.name}: ${error.message}` : String(error);
});
