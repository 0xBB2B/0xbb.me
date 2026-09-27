import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Language } from '../data';
import { loadCanvasFonts } from './fonts';
import { initialTier, TIER_SETTINGS, createFrameMonitor, type Tier } from './quality';
import { createRenderer, disableFogOnEmissive } from './renderer';
import { createTextures } from './textures';
import { buildPedestal, buildGround, buildRoadMarkings } from './ground';
import { buildStore } from './store';
import { buildStreet } from './street';
import { buildLights } from './lights';
import { createPlaque, setPlaqueGlow, setPlaqueLanguage } from './plaque';
import { createRain, createSplashes, createDrips } from './weather';
import { createWetGround } from './wet-ground';
import { buildCar } from './car';
import { createAmbient } from './ambient';
import { plaqueGlow } from './rhythm';
import { sharedTime } from './materials';
import { DEFAULT_CAMERA, ORBIT_LIMITS, portraitDistanceScale } from './layout';
import { poseAtScroll, enterSequence, stopPose, storyLayout, framingOffset, type Pose } from './story-camera';
import { createInteraction } from './interaction';
import { acceptsSceneInput, type View } from './view-state';

function defaultCameraPosition(width: number, height: number): THREE.Vector3 {
  const target = new THREE.Vector3(...DEFAULT_CAMERA.target);
  const offset = new THREE.Vector3(...DEFAULT_CAMERA.position).sub(target).multiplyScalar(portraitDistanceScale(width, height));
  return target.add(offset);
}

export interface DioramaHandle {
  ready: Promise<void>;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  enterStory(): void;
  startStoryWithoutEntering(): void;
  setScroll(scrollY: number): void;
  exitToDiorama(): void;
  setLanguage(language: Language): void;
  onViewChange(cb: (view: View) => void): void;
  onQualityChange(cb: (tier: Tier) => void): void;
  onContextLost(cb: () => void): void;
  dispose(): void;
}

export async function mountDiorama(container: HTMLElement, options: { language: Language }): Promise<DioramaHandle> {
  await loadCanvasFonts();

  const tier = initialTier(matchMedia('(pointer: coarse)').matches, innerWidth);
  let currentTier: Tier = tier;
  let pixelRatio = Math.min(devicePixelRatio, TIER_SETTINGS[tier].maxPixelRatio);

  const { renderer, scene, camera, render, resize, setPixelRatio, dispose: disposeRenderer } = createRenderer(container, pixelRatio);

  let width = container.clientWidth || 1;
  let height = container.clientHeight || 1;
  camera.position.copy(defaultCameraPosition(width, height));

  let wetGround: ReturnType<typeof createWetGround> | undefined;
  let handleResize: () => void = () => {};
  let handleVisibility: () => void = () => {};
  let handleContextLost: () => void = () => {};

  try {
    const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

    const textures = createTextures();
    buildPedestal(scene, env);
    buildGround(scene, textures);
    buildRoadMarkings(scene, textures);
    const store = buildStore(scene, textures);
    const street = buildStreet(scene, textures);
    buildLights(scene);
    const plaque = createPlaque(scene, options.language, env);

    const rain = createRain();
    const splashes = createSplashes(pixelRatio);
    const drips = createDrips();
    scene.add(rain.mesh, splashes.mesh, drips.mesh);
    wetGround = createWetGround(scene, width, height, pixelRatio);

    function applyTier(nextTier: Tier): void {
      const settings = TIER_SETTINGS[nextTier];
      pixelRatio = Math.min(devicePixelRatio, settings.maxPixelRatio);
      setPixelRatio(pixelRatio);
      wetGround!.setReflections(settings.reflections);
      rain.setVisibleRatio(settings.rainRatio);
      splashes.setPixelRatio(pixelRatio);
      wetGround!.resize(width, height, pixelRatio);
    }

    if (tier === 'low') applyTier('low');

    const car = buildCar();
    scene.add(car.group);
    const ambient = createAmbient({ store, street, hazard: { material: car.hazardMaterial, lights: car.hazardLights } });

    disableFogOnEmissive(scene);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(...DEFAULT_CAMERA.target);
    controls.minPolarAngle = ORBIT_LIMITS.minPolarAngle;
    controls.maxPolarAngle = ORBIT_LIMITS.maxPolarAngle;

    function applyOrbitDistanceLimits(): void {
      const scale = portraitDistanceScale(width, height);
      controls.minDistance = ORBIT_LIMITS.minDistance * scale;
      controls.maxDistance = ORBIT_LIMITS.maxDistance * scale;
    }
    applyOrbitDistanceLimits();
    controls.update();

    let view: View = 'diorama';
    let ready = false;
    let savedPose: Pose | null = null;
    let scrollY = 0;
    let enterAnim: { seq: ReturnType<typeof enterSequence>; startT: number } | null = null;

    const viewListeners: ((view: View) => void)[] = [];
    const qualityListeners: ((tier: Tier) => void)[] = [];
    const contextLostListeners: (() => void)[] = [];
    function emitView(next: View): void {
      viewListeners.forEach((cb) => cb(next));
    }

    function setFraming(ratio: number): void {
      const offset = framingOffset(width, height);
      camera.setViewOffset(width, height, offset.x * ratio, offset.y * ratio, width, height);
    }

    function updateCamera(t: number): void {
      if (view === 'diorama') {
        controls.update();
        return;
      }
      if (view === 'entering' && enterAnim) {
        const seconds = t - enterAnim.startT;
        if (seconds >= enterAnim.seq.duration) {
          const finalPose = enterAnim.seq.sample(enterAnim.seq.duration);
          camera.position.copy(finalPose.position);
          camera.lookAt(finalPose.target);
          setFraming(1);
          enterAnim = null;
          view = 'story';
          scrollY = storyLayout(height).sectionStarts[0];
          emitView('story');
          return;
        }
        const pose = enterAnim.seq.sample(seconds);
        camera.position.copy(pose.position);
        camera.lookAt(pose.target);
        setFraming(seconds / enterAnim.seq.duration);
        return;
      }
      if (view === 'story' && savedPose) {
        const result = poseAtScroll(scrollY, width, height, savedPose);
        camera.position.copy(result.position);
        camera.lookAt(result.target);
        setFraming(result.opacity);
      }
    }

    function enterStory(): void {
      if (view !== 'diorama') return;
      controls.enableDamping = false;
      controls.update();
      controls.enableDamping = true;
      savedPose = { position: camera.position.clone(), target: controls.target.clone() };
      controls.enabled = false;
      interaction.clearHover();
      view = 'entering';
      emitView('entering');
      enterAnim = { seq: enterSequence(savedPose, stopPose(0, width, height)), startT: clock.elapsedTime };
    }

    function startStoryWithoutEntering(): void {
      savedPose = {
        position: defaultCameraPosition(width, height),
        target: new THREE.Vector3(...DEFAULT_CAMERA.target),
      };
      controls.enabled = false;
      interaction.clearHover();
      view = 'story';
      scrollY = storyLayout(height).sectionStarts[0];
    }

    function setScroll(nextScrollY: number): void {
      scrollY = nextScrollY;
    }

    function exitToDiorama(): void {
      if (view !== 'story') return;
      if (savedPose) {
        camera.position.copy(savedPose.position);
        controls.target.copy(savedPose.target);
      }
      camera.clearViewOffset();
      controls.enableDamping = false;
      controls.update();
      controls.enableDamping = true;
      controls.enabled = true;
      view = 'diorama';
      emitView('diorama');
    }

    const interaction = createInteraction({
      canvas: renderer.domElement,
      camera,
      plaqueGroup: plaque.group,
      accepts: () => acceptsSceneInput({ view, ready, failed: false }),
      onPlaqueClick: enterStory,
    });

    const monitor = createFrameMonitor(() => {
      currentTier = 'low';
      applyTier('low');
      qualityListeners.forEach((cb) => cb('low'));
    });

    const clock = new THREE.Clock();
    let rafId = 0;
    function loop(): void {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      sharedTime.value = t;
      ambient.tick(t, dt);
      drips.update(t);
      wetGround!.update(t);
      setPlaqueGlow(plaque, plaqueGlow(t), interaction.hovered && view === 'diorama');
      updateCamera(t);
      if (currentTier === 'high') monitor.sample(performance.now(), document.visibilityState === 'visible');
      render();
      rafId = requestAnimationFrame(loop);
    }

    handleResize = function (): void {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      width = w;
      height = h;
      resize(w, h);
      wetGround!.resize(w, h, pixelRatio);
      applyOrbitDistanceLimits();
      if (view !== 'diorama') updateCamera(clock.elapsedTime);
    };
    window.addEventListener('resize', handleResize);

    handleVisibility = function (): void {
      if (document.visibilityState !== 'visible' && currentTier === 'high') monitor.sample(performance.now(), false);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    handleContextLost = function (): void {
      cancelAnimationFrame(rafId);
      contextLostListeners.forEach((cb) => cb());
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    loop();
    ready = true;

    return {
      ready: Promise.resolve(),
      scene,
      camera,
      enterStory,
      startStoryWithoutEntering,
      setScroll,
      exitToDiorama,
      setLanguage(language: Language): void {
        setPlaqueLanguage(plaque, language);
      },
      onViewChange(cb: (view: View) => void): void {
        viewListeners.push(cb);
      },
      onQualityChange(cb: (tier: Tier) => void): void {
        qualityListeners.push(cb);
      },
      onContextLost(cb: () => void): void {
        contextLostListeners.push(cb);
      },
      dispose(): void {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('visibilitychange', handleVisibility);
        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
        interaction.dispose();
        controls.dispose();
        wetGround!.dispose();
        disposeRenderer();
      },
    };
  } catch (error) {
    window.removeEventListener('resize', handleResize);
    document.removeEventListener('visibilitychange', handleVisibility);
    renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
    wetGround?.dispose();
    disposeRenderer();
    throw error;
  }
}
