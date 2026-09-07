import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createWorld } from '../portfolio/world';
import { disposeScene } from '../portfolio/geometry';
import { createBlackOutfitPlayerVoxel } from './player-voxel-black';

// This standalone design page is not imported by the production homepage.
document.title = '黑装人物预览 · Minecraft 3D';
for (const meta of document.querySelectorAll('meta[property="og:image"], meta[property="twitter:image"]')) meta.remove();
for (const schema of document.querySelectorAll('script[type="application/ld+json"]')) schema.remove();
const status = document.querySelector<HTMLElement>('#status')!;
const panels: Panel[] = [];
let background: 'studio' | 'town' = 'studio';
let frame = 0;

export async function exportVoxel(): Promise<ArrayBuffer> {
  const model = createBlackOutfitPlayerVoxel();
  try {
    return await new GLTFExporter().parseAsync(model, { binary: true, onlyVisible: true }) as ArrayBuffer;
  } finally {
    disposeScene(model);
  }
}

function studio() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe6e0d4);
  scene.add(new THREE.HemisphereLight(0xfff7e5, 0x9fabb4, 2));
  const light = new THREE.DirectionalLight(0xffefd5, 3);
  light.position.set(-3, 7, 5);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  Object.assign(light.shadow.camera, { left: -4, right: 4, top: 5, bottom: -3, near: 0.1, far: 18 });
  light.shadow.normalBias = 0.025;
  scene.add(light);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xe6e0d4, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.025;
  floor.receiveShadow = true;
  scene.add(floor);
  return scene;
}

class Panel {
  renderer: THREE.WebGLRenderer;
  camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 140);
  controls: OrbitControls | null = null;
  scene: THREE.Scene = new THREE.Scene();
  figure: THREE.Object3D | null = null;
  observer: ResizeObserver;
  constructor(readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', '黑装 Minecraft 方块 3D 模型，拖动旋转');
    this.host.append(this.renderer.domElement);
    {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.enablePan = false;
      this.controls.minZoom = 0.7;
      this.controls.maxZoom = 2;
      this.controls.minPolarAngle = 0.15;
      this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    }
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.setStage();
  }
  setStage() {
    disposeScene(this.scene);
    if (background === 'town') {
      const town = createWorld();
      town.shadow.position.x = -8;
      this.scene = town.scene;
    } else {
      this.scene = studio();
    }
    const position = background === 'town' ? new THREE.Vector3(-8, 0.07, 0.6) : new THREE.Vector3();
    this.figure = createBlackOutfitPlayerVoxel();
    this.figure.position.add(position);
    this.scene.add(this.figure);
    this.setView('front');
    this.resize();
  }
  setView(view: string) {
    const base = background === 'town' ? new THREE.Vector3(-8, 1.55, 0.6) : new THREE.Vector3(0, 1.55, 0);
    const offset = background === 'town'
      ? view === 'side' ? new THREE.Vector3(20, 5, 0.02) : view === 'quarter' ? new THREE.Vector3(12, 5, 16) : new THREE.Vector3(0, 5, 20)
      : view === 'side' ? new THREE.Vector3(7, 0.2, 0.02) : view === 'quarter' ? new THREE.Vector3(4.5, 1.25, 6) : new THREE.Vector3(0, 0.15, 7);
    this.camera.position.copy(base).add(offset);
    this.camera.zoom = 1;
    this.camera.lookAt(base);
    this.camera.updateProjectionMatrix();
    if (this.controls) {
      this.controls.target.copy(base);
      this.controls.update();
    }
  }

  resize() {
    const width = this.host.clientWidth, height = this.host.clientHeight;
    const viewHeight = background === 'town' ? 5.6 : 3.55;
    const halfWidth = viewHeight * width / height / 2;
    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  render() {
    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.observer.disconnect();
    this.controls?.dispose();
    disposeScene(this.scene);
    this.renderer.dispose();
  }
}

async function start() {
  panels.push(new Panel(document.querySelector('#black-stage')!));
  const render = () => {
    panels.forEach(panel => panel.render());
    frame = requestAnimationFrame(render);
  };
  render();
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-stage]')) {
    button.addEventListener('click', () => {
      background = button.dataset.stage as 'studio' | 'town';
      for (const other of document.querySelectorAll('[data-stage]')) other.setAttribute('aria-pressed', String(other === button));
      panels.forEach(panel => panel.setStage());
    });
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-view]')) button.addEventListener('click', () => panels.forEach(panel => panel.setView(button.dataset.view!)));
  document.querySelector('#download-black')!.addEventListener('click', async () => {
    try {
      const binary = await exportVoxel();
      const url = URL.createObjectURL(new Blob([binary], { type: 'model/gltf-binary' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'fubuki-minecraft-black.glb';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      status.textContent = `模型导出失败：${String(error)}`;
    }
  });
  status.textContent = '已加载黑装人物 · 高 2.4 场景单位 · Minecraft 几何与顶点颜色 · 可旋转查看与导出';
  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(frame);
    panels.forEach(panel => panel.dispose());
  }, { once: true });
}

start().catch(error => { status.textContent = `预览加载失败：${String(error)}`; });
