import * as THREE from 'three';

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function pointerNDC(event: PointerEvent, canvas: HTMLCanvasElement): THREE.Vector2 {
  const rect = canvas.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  return ndc;
}

export function hitsPlaque(event: PointerEvent, canvas: HTMLCanvasElement, camera: THREE.Camera, plaqueGroup: THREE.Object3D): boolean {
  const root = plaqueGroup.parent ?? plaqueGroup;
  raycaster.setFromCamera(pointerNDC(event, canvas), camera);
  const hits = raycaster.intersectObjects(root.children, true);
  if (hits.length === 0) return false;
  let object: THREE.Object3D | null = hits[0].object;
  while (object) {
    if (object === plaqueGroup) return true;
    object = object.parent;
  }
  return false;
}

export interface InteractionOptions {
  canvas: HTMLCanvasElement;
  camera: THREE.Camera;
  plaqueGroup: THREE.Object3D;
  accepts(): boolean;
  onPlaqueClick(): void;
}

export interface Interaction {
  readonly hovered: boolean;
  clearHover(): void;
  dispose(): void;
}

export function createInteraction({ canvas, camera, plaqueGroup, accepts, onPlaqueClick }: InteractionOptions): Interaction {
  let hovered = false;
  let downPoint: { x: number; y: number } | null = null;

  function setHovered(next: boolean): void {
    hovered = next;
    canvas.style.cursor = next ? 'pointer' : '';
  }

  function handlePointerMove(event: PointerEvent): void {
    if (!matchMedia('(hover: hover)').matches) return;
    if (!accepts()) {
      setHovered(false);
      return;
    }
    setHovered(hitsPlaque(event, canvas, camera, plaqueGroup));
  }

  function handlePointerDown(event: PointerEvent): void {
    if (!event.isPrimary) {
      downPoint = null;
      return;
    }
    if (event.button !== 0) return;
    downPoint = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event: PointerEvent): void {
    if (!event.isPrimary || event.button !== 0) return;
    const origin = downPoint;
    downPoint = null;
    if (!origin) return;
    const moved = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
    if (moved > 5) return;
    if (!accepts()) return;
    if (hitsPlaque(event, canvas, camera, plaqueGroup)) onPlaqueClick();
  }

  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointerup', handlePointerUp);

  return {
    get hovered(): boolean {
      return hovered;
    },
    clearHover(): void {
      setHovered(false);
    },
    dispose(): void {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
    },
  };
}
