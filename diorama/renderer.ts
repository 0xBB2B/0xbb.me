import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ctex } from './materials';
import { DEFAULT_CAMERA } from './layout';

export class ToonPass extends Pass {
  private effect: OutlineEffect;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  constructor(effect: OutlineEffect, scene: THREE.Scene, camera: THREE.Camera) {
    super();
    this.effect = effect;
    this.scene = scene;
    this.camera = camera;
    this.needsSwap = false;
  }

  render(renderer: THREE.WebGLRenderer, _writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    this.effect.render(this.scene, this.camera);
  }
}

export function disableFogOnEmissive(scene: THREE.Scene): void {
  scene.traverse((object) => {
    const material = (object as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!material) return;
    for (const m of Array.isArray(material) ? material : [material]) {
      if ((m as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
        (m as THREE.MeshBasicMaterial).fog = false;
        m.needsUpdate = true;
      }
    }
  });
}

function backgroundTexture(): THREE.CanvasTexture {
  return ctex(512, 512, (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h * 0.4, 20, w / 2, h * 0.45, w * 0.75);
    gradient.addColorStop(0, '#1d2a58');
    gradient.addColorStop(0.55, '#121b3e');
    gradient.addColorStop(1, '#070a18');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  });
}

export interface DioramaRenderer {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  effect: OutlineEffect;
  render(): void;
  resize(width: number, height: number): void;
  setPixelRatio(ratio: number): void;
  dispose(): void;
}

export function createRenderer(container: HTMLElement, pixelRatio: number): DioramaRenderer {
  const width = container.clientWidth || 1;
  const height = container.clientHeight || 1;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.toneMapping = THREE.NoToneMapping;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = backgroundTexture();
  scene.fog = new THREE.FogExp2('#1a2858', 0.012);

  const camera = new THREE.PerspectiveCamera(DEFAULT_CAMERA.fov, width / height, 0.5, 260);
  camera.position.set(...DEFAULT_CAMERA.position);

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height);

  const effect = new OutlineEffect(renderer, { defaultThickness: 0.0018, defaultColor: [0.05, 0.07, 0.15] });

  const renderTarget = new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, {
    type: THREE.HalfFloatType,
    samples: 4,
  });
  const composer = new EffectComposer(renderer, renderTarget);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(width, height);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.6, 0.6, 0.97);
  const outputPass = new OutputPass();
  composer.addPass(new ToonPass(effect, scene, camera));
  composer.addPass(bloomPass);
  composer.addPass(outputPass);

  return {
    renderer,
    scene,
    camera,
    composer,
    effect,
    render(): void {
      composer.render();
    },
    resize(w: number, h: number): void {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    },
    setPixelRatio(ratio: number): void {
      renderer.setPixelRatio(ratio);
      composer.setPixelRatio(ratio);
    },
    dispose(): void {
      bloomPass.dispose();
      outputPass.dispose();
      composer.dispose();
      (scene.background as THREE.Texture).dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
