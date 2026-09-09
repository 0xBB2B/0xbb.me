import * as THREE from 'three';
import { disposeScene } from '../portfolio/geometry';
import { createTransitionScene, TRANSITIONS, type Edge, type TransitionId } from './transition-comparison-scenes';

document.title = '三版过渡对比 · 小镇 / 数据工厂 / 荧光海';
for (const element of document.querySelectorAll('meta[property="og:image"], meta[property="twitter:image"], script[type="application/ld+json"]')) element.remove();
const root = document.querySelector<HTMLElement>('#transitions')!;
const dialog = document.querySelector<HTMLDialogElement>('#transition-dialog')!;
const chosen: Record<Edge, TransitionId | null> = { town: null, coast: null };
const panels: TransitionPreview[] = [];
let enlarged: TransitionPreview | null = null;

class TransitionPreview {
  model: ReturnType<typeof createTransitionScene>;
  renderer: THREE.WebGLRenderer;
  camera = new THREE.OrthographicCamera(-13.6, 13.6, 8.5, -8.5, .1, 120);
  observer: ResizeObserver;
  labels: HTMLElement[];
  offset = 0;
  constructor(readonly host: HTMLElement, id: TransitionId, edge: Edge) {
    this.model = createTransitionScene(id, edge);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', `${id}版${edge === 'town' ? '小镇到工厂' : '工厂到海岸'}三维过渡`);
    host.prepend(this.renderer.domElement);
    this.labels = this.model.screens.map(({ board }, index) => {
      const label = document.createElement('div'); label.className = `terminal-copy ${index % 2 ? 'amber' : ''}`;
      const title = document.createElement('b'); title.textContent = board.title.zh;
      const description = document.createElement('p'); description.textContent = board.summary.zh;
      label.append(title, description); host.append(label); return label;
    });
    this.observer = new ResizeObserver(() => this.render()); this.observer.observe(host); this.render();
  }
  render() {
    const width = this.host.clientWidth, height = this.host.clientHeight;
    if (!width || !height) return;
    const x = this.model.edgeX + this.offset;
    this.model.updateEnvironment(x);
    this.model.player.position.x = x;
    this.model.shadow.position.x = x;
    this.camera.position.set(x, 8.5, 20); this.camera.lookAt(x, 3.5, 0);
    this.camera.left = -8.5 * width / height; this.camera.right = 8.5 * width / height;
    this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height, false);
    this.renderer.render(this.model.scene, this.camera);
    this.model.screens.forEach(({ bounds }, index) => {
      const a = new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.max.z).project(this.camera);
      const b = new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.max.z).project(this.camera);
      const style = this.labels[index].style;
      style.left = `${(a.x + b.x + 2) * width / 4}px`; style.top = `${(2 - a.y - b.y) * height / 4}px`;
      style.width = `${(b.x - a.x) * width / 2}px`; style.height = `${(a.y - b.y) * height / 2}px`;
      style.visibility = b.x > -1 && a.x < 1 ? 'visible' : 'hidden';
    });
  }
  dispose() {
    this.observer.disconnect(); disposeScene(this.model.scene); this.renderer.dispose(); this.renderer.forceContextLoss();
    this.renderer.domElement.remove(); this.labels.forEach(label => label.remove());
  }
}
function open(id: TransitionId, edge: Edge) {
  const version = TRANSITIONS.find(item => item.id === id)!;
  document.querySelector('#large-title')!.textContent = `${id} · ${version.title} / ${edge === 'town' ? '小镇 → 数据工厂' : '数据工厂 → 荧光海'}`;
  document.querySelector('#large-description')!.textContent = version[edge];
  document.querySelectorAll('[data-offset]').forEach(button => button.setAttribute('aria-pressed', String((button as HTMLElement).dataset.offset === '0')));
  dialog.showModal();
  enlarged = new TransitionPreview(document.querySelector<HTMLElement>('#large-stage')!, id, edge);
}
document.querySelector('#close-large')!.addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { enlarged?.dispose(); enlarged = null; });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-offset]')) button.addEventListener('click', () => {
  if (!enlarged) return;
  enlarged.offset = Number(button.dataset.offset); enlarged.render();
  document.querySelectorAll('[data-offset]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
});
for (const version of TRANSITIONS) {
  const section = document.createElement('section'); section.className = 'transition-option'; section.dataset.version = version.id;
  section.innerHTML = `<header><span class="code">${version.id}</span><div><h2>${version.title}</h2><span class="subtitle">${version.subtitle}</span><p>${version.note}</p></div></header><div class="pair"></div>`;
  root.append(section);
  for (const edge of ['town', 'coast'] as const) {
    const panel = document.createElement('article'); panel.className = 'edge-panel'; panel.dataset.edge = edge;
    const name = edge === 'town' ? '小镇 → 数据工厂' : '数据工厂 → 荧光海';
    panel.innerHTML = `<div class="edge-title"><span>${name}</span><small>${edge === 'town' ? 'JUNCTION 01' : 'JUNCTION 02'}</small></div><div class="stage" role="button" tabindex="0" aria-label="放大${version.id}版${name}"><span class="zoom-hint">放大 / 查看过渡 ⤢</span></div><div class="edge-info"><p>${version[edge]}</p><button aria-pressed="false">这处选择 ${version.id} · ${version.title}</button></div>`;
    section.querySelector('.pair')!.append(panel);
    const stage = panel.querySelector<HTMLElement>('.stage')!;
    stage.addEventListener('click', () => open(version.id, edge));
    stage.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(version.id, edge); } });
    try { panels.push(new TransitionPreview(stage, version.id, edge)); } catch (error) {
      const warning = document.createElement('p'); warning.className = 'render-error'; warning.textContent = `图形加载失败：${String(error)}`; stage.append(warning);
    }
    panel.querySelector('button')!.addEventListener('click', () => {
      chosen[edge] = version.id;
      for (const sibling of root.querySelectorAll<HTMLElement>(`[data-edge="${edge}"]`)) {
        const selected = sibling.closest<HTMLElement>('[data-version]')!.dataset.version === version.id;
        sibling.classList.toggle('selected', selected); sibling.querySelector('button')!.setAttribute('aria-pressed', String(selected));
      }
      document.querySelector('#selection-text')!.textContent = `小镇 → 工厂：${chosen.town ?? '待选'}　／　工厂 → 海岸：${chosen.coast ?? '待选'}`;
      const copy = document.querySelector<HTMLButtonElement>('#copy-selection')!; copy.disabled = !chosen.town || !chosen.coast; copy.textContent = '复制选择';
    });
  }
}
document.querySelector('#copy-selection')!.addEventListener('click', async () => {
  const button = document.querySelector<HTMLButtonElement>('#copy-selection')!;
  try { await navigator.clipboard.writeText(document.querySelector('#selection-text')!.textContent!); button.textContent = '已复制，发给我即可'; }
  catch { button.textContent = '直接发送上面的编号即可'; }
});
window.addEventListener('pagehide', () => { enlarged?.dispose(); panels.forEach(panel => panel.dispose()); }, { once: true });
