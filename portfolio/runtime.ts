import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createCharacter } from './character';
import { createAppearanceEffect } from './appearance-effect';
import { disposeScene } from './geometry';
import type { TownInput } from './input';
import { BOARDS, JOURNEY, ROAD, ROOM_DOORS } from './journey';
import { advance, createSession, type Session } from './state';
import { createWorld } from './world';
import { batchStaticScenery } from './static-batches';

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
  let environmentTarget: THREE.WebGLRenderTarget | undefined;
  let disposed = false;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (frame !== undefined) cancelAnimationFrame(frame);
    detach?.();
    observer?.disconnect();
    character?.dispose();
    if (scene) disposeScene(scene);
    environmentTarget?.dispose();
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
    renderer.domElement.setAttribute('aria-label', 'Playable three-scene MC-2D journey');
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    container.appendChild(renderer.domElement);

    const world = createWorld();
    scene = world.scene;
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    try {
      environmentTarget = pmrem.fromScene(environment, .06);
      scene.environment = environmentTarget.texture;
      scene.environmentIntensity = 0;
    } finally { disposeScene(environment); pmrem.dispose(); }
    let characterAppearance = session.appearance;
    character = createCharacter(characterAppearance);
    scene.add(character.root);
    const appearanceEffect = createAppearanceEffect(scene);
    const camera = new THREE.OrthographicCamera(-10, 10, 6, -6, 0.1, 120);
    scene.updateMatrixWorld(true);
    const boardFaces = BOARDS.filter(board => board.kind === 'skill').map(board => {
      const face = scene!.getObjectByName(`Board_face_${board.id}`)!;
      const bounds = new THREE.Box3().setFromObject(face);
      return {
        id: board.id,
        topLeft: new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
        bottomRight: new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
        element: null as HTMLElement | null,
      };
    });
    const interactionTargets = new Map<string, { point: THREE.Vector3; below: boolean }>();
    const anchor = (id: string, object: THREE.Object3D, below = false) => {
      const bounds = new THREE.Box3().setFromObject(object);
      interactionTargets.set(id, {
        point: new THREE.Vector3((bounds.min.x + bounds.max.x) / 2, below ? bounds.min.y : bounds.max.y, bounds.max.z),
        below,
      });
    };
    anchor('greeter', scene.getObjectByName('NPC_greeter')!);
    for (const door of ROOM_DOORS) anchor(door.id, scene.getObjectByName(`Door_lintel_${door.id}`)!);
    for (const board of BOARDS) {
      anchor(board.id, board.kind === 'skill'
        ? scene.getObjectByName(`Board_face_${board.id}`)!
        : scene.getObjectByName(`Project_star_${board.id}`)!.getObjectByName('Star_core')!, board.kind === 'project');
    }
    const noteAnchor = new THREE.Vector3(ROAD.end + 1.8, 6.8, -1.2);
    const notePoint = new THREE.Vector3();
    const towerBounds = new THREE.Box3().setFromObject(scene.getObjectByName('Coastal_lighthouse')!);
    const towerPoint = new THREE.Vector3();
    batchStaticScenery(scene);
    const projectLighthouseNote = () => {
      const note = container.parentElement!.querySelector<HTMLElement>('.lighthouse-note');
      if (!note) return;
      notePoint.copy(noteAnchor).project(camera);
      const width = container.clientWidth;
      const portrait = container.clientHeight > width;
      towerPoint.copy(portrait ? towerBounds.min : towerBounds.max).project(camera);
      const towerEdge = (towerPoint.x + 1) * width / 2;
      const left = THREE.MathUtils.clamp(portrait ? towerEdge - note.offsetWidth - 16 : towerEdge + 16,
        12, width - note.offsetWidth - 12);
      let top = Math.max(62, (1 - notePoint.y) * container.clientHeight / 2);
      const intro = container.parentElement!.querySelector<HTMLElement>('.town-intro');
      if (intro) {
        const frame = container.getBoundingClientRect();
        const title = intro.getBoundingClientRect();
        if (left < title.right - frame.left + 12 && left + note.offsetWidth > title.left - frame.left - 12
          && top < title.bottom - frame.top + 12 && top + note.offsetHeight > title.top - frame.top - 12) {
          top = title.bottom - frame.top + 12;
        }
      }
      note.style.left = `${left}px`;
      note.style.top = `${top}px`;
      note.style.visibility = 'visible';
    };
    const promptPoint = new THREE.Vector3();
    const projectPrompt = () => {
      const prompt = container.parentElement!.querySelector<HTMLElement>('[data-interaction-id]');
      const target = prompt && interactionTargets.get(prompt.dataset.interactionId!);
      if (!prompt || !target) return;
      promptPoint.copy(target.point).project(camera);
      const halfWidth = prompt.offsetWidth / 2;
      const x = (promptPoint.x + 1) * container.clientWidth / 2;
      const center = THREE.MathUtils.clamp(x, halfWidth + 8, container.clientWidth - halfWidth - 8);
      prompt.style.left = `${center}px`;
      if (prompt.classList.contains('npc-reaction')) prompt.style.setProperty('--reaction-tail-x', `${x - center + halfWidth}px`);
      prompt.style.top = `${(1 - promptPoint.y) * container.clientHeight / 2 + (target.below ? 12 : -12)}px`;
      prompt.style.transform = `translate(-50%, ${target.below ? '0' : '-100%'})`;
      prompt.style.visibility = 'visible';
    };
    const topLeft = new THREE.Vector3();
    const bottomRight = new THREE.Vector3();
    const projectBoards = (insideRoom: boolean) => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      for (const board of boardFaces) {
        if (!board.element?.isConnected) {
          board.element = container.parentElement!.querySelector<HTMLElement>(`.world-board[data-board-id="${board.id}"]`);
        }
        if (!board.element) continue;
        topLeft.copy(board.topLeft).project(camera);
        bottomRight.copy(board.bottomRight).project(camera);
        const style = board.element.style;
        style.left = `${(topLeft.x + bottomRight.x + 2) * width / 4}px`;
        style.top = `${(2 - topLeft.y - bottomRight.y) * height / 4}px`;
        style.width = `${(bottomRight.x - topLeft.x) * width / 2}px`;
        style.height = `${(topLeft.y - bottomRight.y) * height / 2}px`;
        style.visibility = insideRoom && bottomRight.x >= -1 && topLeft.x <= 1 && bottomRight.y <= 1 && topLeft.y >= -1 ? 'visible' : 'hidden';
      }
    };
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
    let previous = performance.now();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const render = (now: number) => {
      if (disposed) return;
      const elapsedSeconds = Math.max(0, (now - previous) / 1000);
      const seconds = Math.min(elapsedSeconds, 0.05);
      previous = now;
      advance(session, input.direction(), seconds, input.sprinting(), elapsedSeconds);
      if (!session.paused) cameraX += (session.x - cameraX) * (1 - Math.exp(-seconds * 7));
      camera.position.set(cameraX, targetHeight + 5, 20);
      camera.lookAt(cameraX, targetHeight, 0);
      if (characterAppearance !== session.appearance) {
        const next = createCharacter(session.appearance);
        character!.dispose();
        character = next;
        characterAppearance = session.appearance;
        scene!.add(character.root);
      }
      character!.root.scale.setScalar(1);
      character!.update(session, camera);
      character!.root.scale.setScalar(appearanceEffect.update(session, reducedMotion.matches));
      world.shadow.position.x = session.x;
      world.updateEnvironment(session.x);
      const insideRoom = world.updateRoom(session);
      world.updateAmbient(seconds, !reducedMotion.matches);
      renderer!.render(scene!, camera);
      projectBoards(insideRoom);
      projectPrompt();
      projectLighthouseNote();
      frame = requestAnimationFrame(render);
    };
    const prepare = async () => {
      renderer!.domElement.style.visibility = 'hidden';
      // Yield before allocating programs so a discarded React effect can cancel cleanly.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      if (disposed) throw new Error('Graphics preparation cancelled');
      const warmCamera = camera.clone();
      warmCamera.left = -65; warmCamera.right = 65;
      warmCamera.top = 18; warmCamera.bottom = -18;
      warmCamera.updateProjectionMatrix();
      const warmSession = createSession();
      appearanceEffect.prepare();
      // Visibility changes alter the active light set, so each actual view needs its own shader programs.
      for (const x of [ROAD.start, JOURNEY[1].start - 1, (JOURNEY[1].start + JOURNEY[1].end) / 2, JOURNEY[1].end + 1, ROAD.end]) {
        if (disposed) throw new Error('Graphics preparation cancelled');
        warmSession.x = x;
        world.updateEnvironment(x);
        world.updateRoom(warmSession);
        warmCamera.position.set(x, targetHeight + 5, 20);
        warmCamera.lookAt(x, targetHeight, 0);
        // Keep program creation and its first draw in the same cancellable stage; no polling callback outlives disposal.
        renderer!.compile(scene!, warmCamera);
        renderer!.render(scene!, warmCamera);
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      }
      if (disposed) throw new Error('Graphics preparation cancelled');
      detach = input.attach();
      previous = performance.now();
      render(previous);
      renderer!.domElement.style.visibility = '';
    };
    const ready = prepare().catch(error => { dispose(); throw error; });
    return { dispose, ready };
  } catch (error) {
    dispose();
    throw error;
  }
}
