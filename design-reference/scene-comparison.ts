import * as THREE from 'three';
import { disposeScene } from '../portfolio/geometry';
import { createComparisonScene, VERSIONS, type VersionId } from './scene-comparison-scenes';

// Only the standalone design comparison imports these scene proposals.
document.title = '场景方案对比 · 3个工坊 × 3个海岸';
for (const meta of document.querySelectorAll('meta[property="og:image"], meta[property="twitter:image"], script[type="application/ld+json"]')) meta.remove();
const root = document.querySelector<HTMLElement>('#versions')!;
const dialog = document.querySelector<HTMLDialogElement>('#large-view')!;
const selection = { workshop: '', coast: '' };
const panels: Preview[] = [];
let large: Preview | null = null;

class Preview {
  renderer: THREE.WebGLRenderer;
  camera = new THREE.OrthographicCamera(-14,14,7.875,-7.875,.1,120);
  model: ReturnType<typeof createComparisonScene>;
  observer: ResizeObserver;
  labels: HTMLElement[];
  constructor(readonly host: HTMLElement, id: VersionId) {
    this.model = createComparisonScene(id);
    this.renderer = new THREE.WebGLRenderer({antialias:true,alpha:false});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.12;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label',`${id}版三维场景画面`);
    host.prepend(this.renderer.domElement);
    this.camera.position.set(0,9.2,22);
    this.camera.lookAt(0,3.7,0);
    this.labels=this.model.labels.map(label=>{
      const element=document.createElement('span');
      element.className=`world-label ${label.prompt?'preview-prompt':''}`;
      element.textContent=label.text;
      host.append(element);
      return element;
    });
    this.observer=new ResizeObserver(()=>this.render());
    this.observer.observe(host);
    this.render();
  }
  render() {
    const width=this.host.clientWidth,height=this.host.clientHeight;
    if(!width||!height)return;
    this.renderer.setSize(width,height);
    this.camera.left=-7.875*width/height;
    this.camera.right=7.875*width/height;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.model.scene,this.camera);
    this.model.labels.forEach((label,index)=>{
      const point=label.position.clone().project(this.camera);
      this.labels[index].style.left=`${(point.x+1)*width/2}px`;
      this.labels[index].style.top=`${(1-point.y)*height/2}px`;
    });
  }
  dispose() {
    this.observer.disconnect();disposeScene(this.model.scene);this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();this.labels.forEach(label=>label.remove());
  }
}

function openLarge(id:VersionId) {
  const version=VERSIONS.find(item=>item.id===id)!;
  document.querySelector('#large-title')!.textContent=`${version.id} · ${version.title}`;
  const host=document.querySelector<HTMLElement>('#large-stage')!;
  host.className='stage';
  dialog.showModal();
  try {large=new Preview(host,id);}catch(error){host.textContent=`图形加载失败：${String(error)}`;}
}
document.querySelector('#close-large')!.addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{large?.dispose();large=null;});

for(const version of VERSIONS) {
  const card=document.createElement('article');card.className='version';card.dataset.kind=version.kind;card.dataset.version=version.id;
  card.innerHTML=`<header class="version-head"><span class="code">${version.id}</span><div><h2>${version.title}</h2><span class="subtitle">${version.subtitle}</span></div></header><div class="stage" tabindex="0" role="button" aria-label="放大 ${version.id} ${version.title}"><span class="zoom-hint">放大画面 ⤢</span><span class="frame-note">${version.kind==='coast'?'终点构图 · 右侧道路停止':'中段构图 · 五个技能工作位'}</span></div><div class="version-info"><p>${version.description}</p><button aria-pressed="false" data-choose="${version.id}">选择 ${version.id} · ${version.title}</button></div>`;
  root.append(card);
  const host=card.querySelector<HTMLElement>('.stage')!;
  host.addEventListener('click',()=>openLarge(version.id));
  host.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openLarge(version.id);}});
  try{panels.push(new Preview(host,version.id));}catch(error){host.innerHTML='';const warning=document.createElement('p');warning.className='render-error';warning.textContent=`图形加载失败：${String(error)}`;host.append(warning);}
  card.querySelector('button')!.addEventListener('click',()=>{
    selection[version.kind]=version.id;
    for(const other of root.querySelectorAll<HTMLElement>(`[data-kind="${version.kind}"]`)) {
      const selected=other.dataset.version===version.id;other.classList.toggle('selected',selected);other.querySelector('button')!.setAttribute('aria-pressed',String(selected));
    }
    const work=VERSIONS.find(item=>item.id===selection.workshop),coast=VERSIONS.find(item=>item.id===selection.coast);
    document.querySelector('#selection-text')!.textContent=`工坊：${work?work.id+' '+work.title:'待选择'}　＋　海岸：${coast?coast.id+' '+coast.title:'待选择'} · 终点道路收口`;
    const copy=document.querySelector<HTMLButtonElement>('#copy-selection')!;copy.disabled=!work||!coast;copy.textContent='复制我的选择';
  });
}
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-filter]'))button.addEventListener('click',()=>{
  document.querySelectorAll('[data-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  root.querySelectorAll<HTMLElement>('.version').forEach(card=>{card.hidden=button.dataset.filter!=='all'&&card.dataset.kind!==button.dataset.filter;});
});
document.querySelector('#copy-selection')!.addEventListener('click',async()=>{
  const button=document.querySelector<HTMLButtonElement>('#copy-selection')!;
  try{await navigator.clipboard.writeText(document.querySelector('#selection-text')!.textContent!);button.textContent='已复制，发给我即可';}catch{button.textContent='请直接发送上面的组合编号';}
});
window.addEventListener('pagehide',()=>{large?.dispose();panels.forEach(panel=>panel.dispose());},{once:true});
