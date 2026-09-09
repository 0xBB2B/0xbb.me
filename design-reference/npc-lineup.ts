import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createNpcLineupModel, NPC_LINEUP, type NpcLineupId } from './npc-lineup-models';
import { disposeScene } from '../portfolio/geometry';

document.title = '主角与NPC造型 · 黑装 / A / B迎宾者';
for (const element of document.querySelectorAll('meta[property="og:image"], meta[property="twitter:image"], script[type="application/ld+json"]')) element.remove();
const panels: Panel[] = [];
let synchronizing = false;
type View = 'front' | 'quarter' | 'back';

class Panel {
  readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  readonly camera = new THREE.OrthographicCamera(-1.3, 1.3, 1.8, -1.8, .1, 40);
  readonly scene = new THREE.Scene();
  readonly controls: OrbitControls;
  readonly observer: ResizeObserver;
  frame = 0;
  disposed = false;
  constructor(readonly host: HTMLElement, id: NpcLineupId) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', `${id} 三维角色，可拖动同步旋转`);
    host.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color(0xd5dfe1);
    this.scene.add(createNpcLineupModel(id), new THREE.HemisphereLight(0xf4f8f7, 0x5a6d7a, 1.9));
    const key = new THREE.DirectionalLight(0xe7f2f4, 2.2); key.position.set(-3, 5, 4); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 4, bottom: -3, near: .1, far: 15 });
    key.shadow.normalBias = .015;
    const rim = new THREE.DirectionalLight(0x8be1ef, 1.3); rim.position.set(3, 3, -4);
    this.scene.add(key, rim);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0xc6d3d7, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.006; floor.receiveShadow = true; this.scene.add(floor);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false; this.controls.enableDamping = false;
    this.controls.minZoom = .75; this.controls.maxZoom = 2;
    this.controls.minPolarAngle = .35; this.controls.maxPolarAngle = Math.PI / 2 + .1;
    this.controls.addEventListener('change', () => {
      this.requestRender();
      if (synchronizing) return;
      synchronizing = true;
      try {
        for (const other of panels) {
          if (other === this) continue;
          other.camera.position.copy(this.camera.position); other.camera.zoom = this.camera.zoom;
          other.controls.target.copy(this.controls.target); other.camera.updateProjectionMatrix();
          other.controls.update(); other.requestRender();
        }
      } finally { synchronizing = false; }
    });
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host);
    this.setView('front'); this.resize();
  }
  setView(view: View) {
    const offsets: Record<View, [number, number, number]> = { front: [0, .15, 8], quarter: [4.5, 1.2, 7], back: [0, .15, -8] };
    this.controls.target.set(0, 1.4, 0);
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3(...offsets[view]));
    this.camera.zoom = 1; this.camera.updateProjectionMatrix(); this.controls.update(); this.requestRender();
  }
  resize() {
    const width = this.host.clientWidth, height = this.host.clientHeight;
    const viewHeight = Math.max(3.5, 2.15 * height / width);
    this.camera.left = -viewHeight * width / height / 2; this.camera.right = -this.camera.left;
    this.camera.top = viewHeight / 2; this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height, false); this.requestRender();
  }
  requestRender() {
    if (this.frame || this.disposed) return;
    this.frame = requestAnimationFrame(() => { this.frame = 0; if (!this.disposed) this.renderer.render(this.scene, this.camera); });
  }
  dispose() {
    this.disposed = true; cancelAnimationFrame(this.frame); this.observer.disconnect();
    this.controls.dispose(); disposeScene(this.scene); this.renderer.dispose(); this.renderer.forceContextLoss();
  }
}

try {
  for (const item of NPC_LINEUP) {
    const article = document.createElement('article');
    article.innerHTML = `<div class="model-stage" id="model-${item.id}"></div><div class="model-caption"><h2>${item.label}</h2><p>${item.detail}</p></div>`;
    document.querySelector('#lineup')!.appendChild(article);
    panels.push(new Panel(article.querySelector('.model-stage')!, item.id));
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-view]')) button.addEventListener('click', () => {
    synchronizing = true;
    try { panels.forEach(panel => panel.setView(button.dataset.view as View)); }
    finally { synchronizing = false; }
    document.querySelectorAll('[data-view]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  });
  document.querySelector('#status')!.textContent = '三款模型已就绪 · 拖动任一模型可同步旋转，滚轮可同步缩放';
} catch (error) {
  document.querySelector('#status')!.textContent = `对比模型加载失败：${String(error)}`;
}
addEventListener('pagehide', () => panels.forEach(panel => panel.dispose()), { once: true });
