import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { createComparisonScene, VERSIONS } from './scene-comparison-scenes';
import { disposeScene } from '../portfolio/geometry';

test('six distinct scene proposals contain real geometry and the current black character',()=>{
  expect(VERSIONS.filter(item=>item.kind==='workshop')).toHaveLength(3);
  expect(VERSIONS.filter(item=>item.kind==='coast')).toHaveLength(3);
  const counts:number[]=[];
  for(const version of VERSIONS){
    const {scene,labels}=createComparisonScene(version.id);
    try{
      let count=0;scene.traverse(object=>{if(object instanceof THREE.Mesh)count++;});counts.push(count);
      expect(count).toBeGreaterThan(100);
      expect(scene.getObjectByName('FUBUKI_Minecraft_Black_Outfit')).toBeDefined();
      expect(labels.some(label=>label.prompt)).toBe(true);
    }finally{disposeScene(scene);}
  }
  expect(new Set(counts).size).toBe(6);
});

test('all coastal previews stop paving beside the lighthouse instead of extending it out of view',()=>{
  for(const version of VERSIONS.filter(item=>item.kind==='coast')){
    const {scene}=createComparisonScene(version.id);scene.updateMatrixWorld(true);
    try{
      const path=scene.getObjectByName('Preview_path')!;
      const end=scene.getObjectByName('Preview_path_end')!;
      const tower=scene.getObjectByName('Preview_lighthouse')!;
      const pathBounds=new THREE.Box3().setFromObject(path),endBounds=new THREE.Box3().setFromObject(end);
      expect(pathBounds.max.x).toBe(7);
      expect(endBounds.max.x).toBeLessThan(8);
      expect(Math.abs(tower.position.x-pathBounds.max.x)).toBeLessThan(1);
      const ray=new THREE.Raycaster(new THREE.Vector3(10,2,1.2),new THREE.Vector3(0,-1,0));
      expect(ray.intersectObject(path).length).toBe(0);
      expect(ray.intersectObject(end).length).toBe(0);
    }finally{disposeScene(scene);}
  }
});
