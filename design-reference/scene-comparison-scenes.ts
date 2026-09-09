import * as THREE from 'three';
import { box, contactShadow } from '../portfolio/geometry';
import { createBlackOutfitPlayerVoxel } from './player-voxel-black';

export const VERSIONS = [
  { id: 'A', kind: 'workshop', title: '雨夜霓虹巷', subtitle: 'NEON ALLEY / WARM & LIVED-IN', description: '雨棚、外接楼梯、错落店铺与霓虹倒影。五个技术工作位藏在街巷里，保留小镇的生活感。' },
  { id: 'B', kind: 'workshop', title: '地下数据工厂', subtitle: 'DATA FOUNDRY / INDUSTRIAL & PRECISE', description: '钢架大厅、冷却管道、数据核心与上层维护走廊。冷白、电蓝与警示橙，强调真正的工业科技感。' },
  { id: 'C', kind: 'workshop', title: '悬空机械工坊', subtitle: 'SKY GARAGE / INVENTIVE & PLAYFUL', description: '悬挑工作间、吊架、机械臂与正在组装的飞行器。薄荷青配琥珀黄，更像未来发明家的工作室。' },
  { id: '1', kind: 'coast', title: '月光岩岸', subtitle: 'MOONLIT CAPE / QUIET & GROUNDED', description: '月光、岩壁、潮汐与石径。三颗作品星组成疏朗星座，道路在灯塔前的石台收口，右侧只剩自然岩岸。' },
  { id: '2', kind: 'coast', title: '蓝色荧光海', subtitle: 'BIOLUMINESCENT BAY / SOFT & LUMINOUS', description: '青蓝荧光浪、弧形沙湾与微亮潮池。木板路在暖光灯塔前结束，末端之后是没有铺装的沙滩。' },
  { id: '3', kind: 'coast', title: '极光星穹海岸', subtitle: 'AURORA POINT / OPEN & OTHERWORLDLY', description: '广阔星空、淡淡极光、低矮岩丘。浅色碎石路抵达灯塔后收成圆形尽头，不再向右无限延伸。' },
] as const;
export type VersionId = typeof VERSIONS[number]['id'];
export type Label = { text: string; position: THREE.Vector3; prompt?: boolean };

const CYAN = 0x38e5fa, PINK = 0xf752aa, AMBER = 0xffc46d;
function block(g: THREE.Object3D, c: number, x: number, y: number, z: number, w: number, h: number, d: number) {
  return box(g, c, x, y, z, w, h, d);
}
function lit(g: THREE.Object3D, color: number, x: number, y: number, z: number, w: number, h: number, d = .06) {
  const m = block(g, color, x, y, z, w, h, d);
  const mat = m.material as THREE.MeshStandardMaterial;
  mat.emissive.set(color); mat.emissiveIntensity = 1.3;
  m.castShadow = false;
  return m;
}
function cylinder(g: THREE.Object3D, c: number, x: number, y: number, z: number, top: number, bottom: number, h: number, sides = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, h, sides), new THREE.MeshStandardMaterial({ color: c, roughness: .7, flatShading: true }));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
}
function line(g: THREE.Object3D, points: THREE.Vector3[], color: number, opacity = 1) {
  const m = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
  g.add(m); return m;
}
function glowDisc(g: THREE.Object3D, x: number, y: number, z: number, radius: number, color: number, opacity: number) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  m.position.set(x,y,z); g.add(m); return m;
}
function rock(g: THREE.Object3D, x: number, y: number, z: number, r: number, c: number, scaleY = .65) {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), new THREE.MeshStandardMaterial({ color:c, roughness:1, flatShading:true }));
  m.position.set(x,y,z); m.scale.set(1.25,scaleY,1); m.rotation.y = x * 1.3; m.castShadow = true; m.receiveShadow = true; g.add(m);
}
function terminal(g: THREE.Object3D, labels: Label[], x: number, index: number, color: number, y = 1.7, z = -2.6) {
  block(g,0x172136,x,y,z,2.25,2.4,.45);
  block(g,0x081321,x,y+.12,z+.26,1.92,1.6,.06);
  for(const side of [-1,1]) lit(g,color,x+side*1.04,y,z+.31,.05,2.1);
  lit(g,color,x,y+1.09,z+.31,2.1,.05);
  for(let i=0;i<4;i++) lit(g,color,x-.7+i*.43,y-.63,z+.34,.23,.035);
  labels.push({text:['AI AGENT','GOLANG','DOCKER / K8S','GAME SDK','PAYMENTS'][index],position:new THREE.Vector3(x,y+.4,z+.35)});
}
function window(g: THREE.Object3D, x:number,y:number,z:number,w:number,h:number,c:number) {
  block(g,0x101522,x,y,z,w+.18,h+.18,.12);lit(g,c,x,y,z+.08,w,h,.03);
  for(let i=1;i<4;i++)block(g,0x283447,x-w/2+w*i/4,y,z+.13,.045,h,.03);
  block(g,0x344355,x,y-h/2-.12,z+.15,w+.4,.16,.45);
}
function sign(g:THREE.Object3D,x:number,y:number,z:number,c:number) {
  block(g,0x131b2d,x,y,z,.85,2.8,.3);
  for(const s of [-1,1])lit(g,c,x+s*.4,y,z+.2,.04,2.75);
  for(let i=0;i<3;i++) {lit(g,c,x,y-.85+i*.8,z+.21,.5,.06);lit(g,c,x-.13,y-.65+i*.8,z+.21,.055,.36);lit(g,c,x+.17,y-.65+i*.8,z+.21,.055,.36);}
}
function pipe(g:THREE.Object3D, x:number,y:number,z:number,width:number,color:number) {
  block(g,0x49566b,x,y,z,width,.17,.17);
  for(const s of [-1,1]) {block(g,0x49566b,x+s*width/2,y-.7,z,.17,1.5,.17);cylinder(g,0x758293,x+s*width/2,y,z,.18,.18,.12,8);}
  lit(g,color,x,y+.02,z+.1,width,.035);
}
function workshop(id:VersionId, g:THREE.Group, labels:Label[]) {
  block(g,0x171f2e,0,-.22,0,60,.4,60);
  block(g,id==='A'?0x3c3f50:0x414d59,0,-.045,1.7,32,.16,4.8).name='Preview_path';
  for(let i=0;i<32;i++)block(g,0x737b85,-15.5+i,.06,4.15,.85,.16,.18);
  if(id==='A') {
    for(const [i,x] of [-11,-5.5,.8,7,12].entries()) {
      const h=[6.2,8.6,6.9,9.5,7.3][i];
      block(g,[0x403343,0x26394b,0x4b3b44][i%3],x,h/2,-6.8,5.4,h,4);
      for(const y of [4.4,6.1,7.8].filter(y=>y<h-.3))for(const dx of [-1.4,1.1])window(g,x+dx,y,-4.75,1.4,1.15,i%2?CYAN:AMBER);
      block(g,0x171e2a,x,3.2,-3.65,5.8,.22,2.4);
      lit(g,i%2?CYAN:PINK,x,3.2,-2.41,5.5,.07);
      sign(g,x+2.1,4.8,-3.5,i%2?PINK:CYAN);
      for(let j=0;j<3;j++) {block(g,0x5c6979,x-1.5+j*.6,h+.2,-6,.5,.4,.6);}
      block(g,0x6b747e,x-1.8,3.9,-4.55,.9,.6,.4);
      for(let j=0;j<5;j++)block(g,0x25303f,x-2.13+j*.16,3.9,-4.31,.05,.46,.02);
    }
    for(let i=0;i<12;i++){const x=-7+i*.32;block(g,0x687587,x,1.6+i*.16,-3.6,.36,.12,1.1);}
    for(let row=0;row<3;row++)line(g,Array.from({length:25},(_,i)=>new THREE.Vector3(-14+i*1.2,6.7+row*.15-Math.sin(i/24*Math.PI)*1.2,-2.7)),0x121728);
    for(let i=0;i<35;i++){const x=-15+(i*7%31),z=.1+(i*3%8)*.43;const puddle=glowDisc(g,x,.041,z,.25+i%3*.16,i%2?CYAN:PINK,.13);puddle.rotation.x=-Math.PI/2;puddle.scale.x=2;}
    for(let i=0;i<48;i++)line(g,[new THREE.Vector3(-15+i*.64,6+(i%5),2),new THREE.Vector3(-15+i*.64-.12,5.65+(i%5),2)],0x8396b1,.3);
    [-10,-5,0,5,10].forEach((x,i)=>terminal(g,labels,x,i,i%2?PINK:CYAN));
  } else if(id==='B') {
    block(g,0x192c3b,0,5,-8,32,10,1.5);
    for(const x of [-14,-7,0,7,14]) {block(g,0x4a5c68,x,4.5,-5.5,.48,9,.55);block(g,0x647581,x,8.7,-3,1,.4,6);}
    block(g,0x556672,0,4.7,-4.9,30,.24,2);lit(g,AMBER,0,4.86,-3.86,30,.05);
    for(let i=0;i<40;i++)block(g,0x657d89,-14.5+i*.75,5.22,-3.85,.06,.75,.06);
    for(const x of [-11,10]) {cylinder(g,0x263a4c,x,2.5,-6,1.25,1.25,5);for(const y of [1,2.5,4])cylinder(g,0x8cabb7,x,y,-6,1.29,1.29,.14);}
    cylinder(g,0x374656,0,.6,-5,2.2,2.6,1.2);
    const core=cylinder(g,CYAN,0,3,-5,1.15,1.15,4);(core.material as THREE.MeshStandardMaterial).emissive.set(CYAN);(core.material as THREE.MeshStandardMaterial).emissiveIntensity=1.1;
    for(let i=0;i<8;i++){const a=i*Math.PI/4;block(g,0x182533,Math.cos(a)*1.5,3,-5+Math.sin(a)*1.5,.17,4.8,.17);}
    for(const y of [1.2,4.7])cylinder(g,0x536a7b,0,y,-5,1.8,1.8,.3);
    pipe(g,-8,7,-5.5,10,AMBER);pipe(g,8,6.6,-5.5,10,CYAN);
    for(const x of [-12,-8,8,12])for(let slot=0;slot<9;slot++){block(g,0x132533,x,1+slot*.33,-4.3,2,.24,.6);lit(g,CYAN,x+.6,1+slot*.33,-3.97,.2,.04);}
    [-10,-5,0,5,10].forEach((x,i)=>terminal(g,labels,x,i,i%2?AMBER:CYAN,1.25,-1.9));
    for(let i=0;i<24;i++){const m=block(g,AMBER,-14+i*1.2,.041,3.7,.5,.01,.12);m.rotation.y=-.5;}
  } else {
    for(let i=0;i<10;i++)block(g,0x28354d,-15+i*3.4,2+(i%4)*.6,-11,2.7,4+(i%4)*1.2,2);
    for(const [i,x] of [-10,-3,5,12].entries()) {
      block(g,0x515063,x,3+i%2,-6.8,5.8,.3,4.3);
      for(const s of [-1,1]){block(g,0x546a76,x+s*2.4,2,-6.8,.2,4,.2);}
      block(g,0x293b4c,x,5.1+i%2,-7.5,5.2,3.6,2);
      window(g,x,5.5+i%2,-6.4,3.7,1.5,i%2?CYAN:AMBER);
      block(g,0x67818b,x,7+i%2,-6.3,6,.17,5.2);lit(g,CYAN,x,7+i%2,-3.65,5.8,.05);
    }
    for(const x of [-7,7]) {block(g,0xffbb65,x,5.4,-2.8,.3,7,.3);block(g,0xe8ae69,x/2,8.8,-2.8,7,.24,.3);line(g,[new THREE.Vector3(x/2,8.8,-2.8),new THREE.Vector3(x/2,5.8,-2.8)],0xaac3ca);}
    const ship=new THREE.Group();ship.position.set(1,5,-3.3);ship.rotation.z=.07;g.add(ship);
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.5,2.1,3,8),new THREE.MeshStandardMaterial({color:0x91bec9,metalness:.5,roughness:.3}));body.rotation.z=Math.PI/2;ship.add(body);
    for(const s of [-1,1]){const wing=block(ship,0xdbc3a0,s*.45,0,s*.75,1.7,.12,1.8);wing.rotation.y=s*.2;cylinder(ship,0x4a7180,s*1.45,-.2,0,.28,.28,.6);lit(ship,CYAN,s*1.45,-.55,0,.42,.12,.4);}
    for(const x of [-6,6]){block(g,0x415363,x,.5,-1.7,1.5,1,1.2);const arm=block(g,AMBER,x+.3,1.6,-1.7,.23,1.8,.25);arm.rotation.z=x<0?-.6:.6;const forearm=block(g,0x92c1c2,x+(x<0?.9:-.4),2.5,-1.7,1.1,.2,.2);forearm.rotation.z=.4;}
    [-10,-5,0,5,10].forEach((x,i)=>terminal(g,labels,x,i,i%2?AMBER:CYAN,1.45,-3));
    for(let i=0;i<12;i++){rock(g,-12+i*2,.2,4.8,.3,0x3b555c,.5);}
  }
  labels.push({text:'E  查看技能',position:new THREE.Vector3(0,3.1,-2.15),prompt:true});
}

function lighthouse(g:THREE.Object3D,id:VersionId) {
  const tower=new THREE.Group();tower.name='Preview_lighthouse';tower.position.set(6.6,0,-2.3);g.add(tower);
  const color=id==='2'?0xc3b9ac:0xd7dcda;
  cylinder(tower,0x667483,0,.18,0,1.6,1.9,.36);
  cylinder(tower,color,0,2.5,0,.62,1.05,4.65);
  for(const y of [1.35,3.35])cylinder(tower,id==='3'?0x536b79:0x986070,0,y,0,1.05-y*.09,1.07-y*.09,.3);
  block(tower,0x203447,0,.7,1,.4,1.05,.06);
  for(const y of [2.2,3.9])lit(tower,AMBER,0,y,.85-y*.04,.18,.3);
  cylinder(tower,0x344d61,0,4.85,0,1,1,.18);
  const lantern=cylinder(tower,AMBER,0,5.35,0,.57,.57,.85);const mat=lantern.material as THREE.MeshStandardMaterial;mat.emissive.set(AMBER);mat.emissiveIntensity=2;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;block(tower,0x405c6b,Math.sin(a)*.72,5.35,Math.cos(a)*.72,.06,1,.06);}
  cylinder(tower,0x344d61,0,5.9,0,0,1.1,.6);
  const light=new THREE.PointLight(AMBER,18,10,2);light.position.set(6.6,5.35,-1.5);g.add(light);
  for(let layer=0;layer<4;layer++){const shape=new THREE.Shape();shape.moveTo(6.6,5.4);shape.lineTo(-11,6.2-layer*.15);shape.lineTo(-11,4.7+layer*.1);shape.closePath();const beam=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:AMBER,transparent:true,opacity:.015,side:THREE.DoubleSide,depthWrite:false}));beam.position.z=-4-layer*.1;g.add(beam);}
}
function star(g:THREE.Object3D,labels:Label[],x:number,y:number,index:number) {
  const shape=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.13:.31;if(i===0)shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);else shape.lineTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();
  const c=[0xffe8a8,0xcbd1ff,0x9beeff][index];const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:false}),new THREE.MeshBasicMaterial({color:c}));mesh.position.set(x,y,-4);g.add(mesh);
  for(let l=0;l<3;l++)glowDisc(g,x,y,-4.05-l*.01,.45+l*.19,c,.045-l*.01);
  const points=[new THREE.Vector3(x-1.1,y+.2,-4.1),new THREE.Vector3(x-.5,y-.25,-4.1),new THREE.Vector3(x,y,-4.1),new THREE.Vector3(x+.8,y+.55,-4.1)];line(g,points,c,.3);
  points.forEach(p=>glowDisc(g,p.x,p.y,p.z,.025,c,.8));
  if(index===1)labels.push({text:'bb-spec  ·  E 查看',position:new THREE.Vector3(x,y-1.15,-3.85),prompt:true});
}
function coast(id:VersionId,g:THREE.Group,labels:Label[]) {
  block(g,id==='2'?0x4d5462:0x333f51,0,-.32,12,60,.6,40);
  block(g,id==='2'?0x0b3849:0x153247,0,-.13,-12,42,.15,22);
  for(let row=0;row<20;row++)for(let col=0;col<14;col++){
    const x=-20+col*3+(row%2)*1.1,z=-3.5-row*.94;
    line(g,[new THREE.Vector3(x,-.045,z),new THREE.Vector3(x+.4+(row*3+col*7)%7*.22,-.045,z)],id==='2'?0x48c4d0:0x819dad,row%3?.35:.6);
  }
  for(let i=0;i<120;i++){const x=-19+(i*17%109)*.36,y=2.5+(i*13%43)*.13;glowDisc(g,x,y,-18-i%3,i%9?.013:.038,0xc9e7ec,.9);}
  glowDisc(g,id==='1'?1.8:10,5.9,-15,id==='1'?.65:.45,0xf4ebd5,1);
  if(id==='1') {
    for(let i=0;i<30;i++){rock(g,-18+i*1.23,-.08,-3.1+(i%3)*.26,.65+(i%4)*.2,0x47566a);}
    for(let i=0;i<12;i++){rock(g,9+i*.7,-.15,1+i%4,.7+i%3*.25,0x4b5e70);}
    block(g,0x9a9b97,-4.5,-.045,1.2,23,.16,3.7).name='Preview_path';
    for(let row=0;row<4;row++)for(let i=0;i<25;i++)block(g,i%2?0xa6a69f:0x939b9e,-15.5+i*.86,.04,-.1+row*.8,.8,.015,.74);
    for(let i=0;i<15;i++){const p=glowDisc(g,1.8+Math.sin(i*3)*.4,-.039,-5-i*.8,.1+i*.028,0xece4bd,.15);p.rotation.x=-Math.PI/2;p.scale.x=4;}
    block(g,0x6f7881,7,.015,1.2,.22,.22,3.9).name='Preview_path_end';
  } else if(id==='2') {
    for(let i=0;i<48;i++){const x=-18+i*.77,z=-2.6+Math.sin(i*.18)*.85;rock(g,x,-.17,z,.3,0x51636f);const m=glowDisc(g,x,-.015,z,.5,CYAN,.16);m.rotation.x=-Math.PI/2;m.scale.set(1.6,.55,1);}
    block(g,0x5e4f47,-4.5,-.075,1.2,23,.22,3.6).name='Preview_path';
    for(let i=0;i<75;i++)block(g,i%3?0x9e8265:0x806e61,-15.8+i*.3,.041,1.2,.27,.025,3.5);
    for(const x of [-13,-8,-3,2,6.9]){cylinder(g,0x685b4d,x,.38,3.1,.075,.09,.75,6);}
    for(let i=0;i<18;i++){const p=glowDisc(g,-14+i*1.6,.004,4.5+i%3*.45,.17+i%3*.06,CYAN,.4);p.rotation.x=-Math.PI/2;p.scale.x=2;}
    block(g,0xc1a078,7,.035,1.2,.16,.12,3.6).name='Preview_path_end';
  } else {
    block(g,0x9ca5a6,-4.5,-.045,1.2,23,.16,3.4).name='Preview_path';
    const end=cylinder(g,0x9ca5a6,6,.005,1.2,1.7,1.7,.06,32);end.name='Preview_path_end';
    for(let i=0;i<32;i++){rock(g,-16+i*1.08,-.1,i%2?-2.8:4.4,.32+i%4*.09,0x5b6870);}
    for(let band=0;band<5;band++){
      const positions:number[]=[],colors:number[]=[];const color=new THREE.Color(band%2?0x9e8cde:0x59dcb5);
      for(let i=0;i<60;i++){const x=-20+i*.7,y=6+Math.sin(i*.1+band*.25)*1.3;positions.push(x,y,-17,x,y+1.1+Math.sin(i*.16)*.5,-17);colors.push(color.r,color.g,color.b,color.r*.15,color.g*.15,color.b*.15);}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const indices:number[]=[];for(let i=0;i<59;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}geo.setIndex(indices);const aurora=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false}));aurora.position.z=-band*.1;g.add(aurora);
    }
  }
  for(let i=0;i<35;i++)for(let b=0;b<3;b++){const x=-17+i*.95;const blade=block(g,id==='2'?0x7c9390:0x778a84,x+b*.08,.1,4.7+i%3*.4,.03,.25+b*.1,.03);blade.rotation.z=(b-1)*.3;}
  [-10,-4,1.3].forEach((x,i)=>star(g,labels,x,[5.6,6.1,5.4][i],i));
  lighthouse(g,id);
  labels.push({text:'道路尽头 · 到这里停下',position:new THREE.Vector3(7,.1,3.4)});
}

export function createComparisonScene(id:VersionId) {
  const isCoast=['1','2','3'].includes(id);
  const scene=new THREE.Scene();scene.background=new THREE.Color(isCoast?(id==='3'?0x112e3b:0x13263a):id==='A'?0x272137:id==='B'?0x122332:0x344459);
  scene.fog=new THREE.Fog(scene.background,38,95);
  scene.add(new THREE.HemisphereLight(isCoast?0xa5c6e4:0xc5d7ed,0x303044,isCoast?1.8:1.5));
  const light=new THREE.DirectionalLight(isCoast?0xd3e3ef:0xffdfb8,isCoast?2:2.2);light.position.set(-8,16,9);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-24,right:24,top:16,bottom:-12,near:.5,far:65});light.shadow.normalBias=.04;scene.add(light);
  const g=new THREE.Group();g.name=`Preview_${id}`;scene.add(g);const labels:Label[]=[];
  if(isCoast)coast(id,g,labels);else workshop(id,g,labels);
  const player=createBlackOutfitPlayerVoxel();player.position.set(isCoast?5.1:1.3,.055,2.1);player.rotation.y=Math.PI/8;scene.add(player);contactShadow(scene,player.position.x,2.1,.6,.25);
  return {scene,labels,isCoast};
}
