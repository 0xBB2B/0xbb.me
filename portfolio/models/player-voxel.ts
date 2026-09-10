import * as THREE from 'three';

// Original block model. Every visible detail is colored geometry, never a skin image.
export function createPlayerVoxel() {
  const model = new THREE.Group();
  model.name = 'FUBUKI_Minecraft_Study';
  model.userData = { variant: 'Minecraft-inspired block study', artwork: 'Geometry and vertex colors; no image textures' };
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.02 });
  material.name = 'Untextured_vertex_color';
  const palette = {
    skin: 0xe8b9a8, skinShade: 0xc88f88, white: 0xf0f4ed,
    hair: 0xdce7e8, hairShade: 0x9caebd,
    ink: 0x17202d, jacket: 0x26313f, seam: 0x566575,
    silver: 0xaab9c2, cyan: 0x4cc9df, blue: 0x2286a9,
  };
  function paint(geometry: THREE.BufferGeometry, hex: number, shaded = true) {
    const normals = geometry.getAttribute('normal');
    const colors: number[] = [];
    for (let i = 0; i < normals.count; i++) {
      const light = shaded ? 0.88 + Math.max(0, normals.getY(i)) * 0.12 + Math.max(0, normals.getZ(i)) * 0.06 : 1;
      const c = new THREE.Color(hex).multiplyScalar(light);
      colors.push(c.r, c.g, c.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geometry;
  }
  function block(parent: THREE.Object3D, name: string, hex: number,
    x: number, y: number, z: number, w: number, h: number, d: number) {
    const mesh = new THREE.Mesh(paint(new THREE.BoxGeometry(w, h, d), hex), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function patch(parent: THREE.Object3D, name: string, hex: number,
    x: number, y: number, z: number, w: number, h: number) {
    const mesh = new THREE.Mesh(paint(new THREE.PlaneGeometry(w, h), hex, false), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  const torso = new THREE.Group();
  torso.name = 'Torso';
  model.add(torso);
  block(torso, 'Cropped_black_jacket', palette.jacket, 0, 18, 0, 8, 12, 4);
  patch(torso, 'White_high_neck_top', palette.white, 0, 18, 2.025, 4.9, 11.8);
  patch(torso, 'Top_shadow', 0xb7c6cf, 1.85, 18, 2.03, 0.6, 11.5);
  patch(torso, 'Top_rib_1', 0xd5e0e2, -1.25, 17.8, 2.035, 0.2, 10.8);
  patch(torso, 'Top_rib_2', 0xd5e0e2, 0.1, 17.8, 2.035, 0.2, 10.8);
  block(torso, 'Collar', palette.ink, 0, 24.2, 0, 4, 0.65, 4.15);
  patch(torso, 'Collar_buckle', palette.silver, 0.2, 24.2, 2.11, 0.7, 0.44);
  for (const side of [-1, 1]) {
    patch(torso, 'Jacket_lapel', palette.seam, side * 3.05, 22.1, 2.055, 1.0, 3.3);
    patch(torso, 'Lapel_button', palette.silver, side * 3.08, 22.3, 2.065, 0.38, 0.38);
    patch(torso, 'Jacket_fold', 0x3e4d60, side * 3.2, 17.9, 2.05, 0.48, 3.4);
  }
  block(torso, 'Shorts_waist', palette.ink, 0, 12.2, 0, 8.2, 1.4, 4.15);
  patch(torso, 'Belt', 0x101927, 0, 12.55, 2.11, 8.25, 0.65);
  patch(torso, 'Belt_buckle', palette.silver, 0.2, 12.55, 2.125, 0.95, 0.58);
  patch(torso, 'Belt_buckle_inner', palette.ink, 0.2, 12.55, 2.14, 0.49, 0.28);

  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.name = side < 0 ? 'Left_arm' : 'Right_arm';
    arm.position.set(side * 5.6, 23.8, 0);
    arm.rotation.z = -side * 0.045;
    model.add(arm);
    block(arm, 'Black_sleeve', palette.jacket, 0, -4.5, 0, 3.2, 9, 4);
    patch(arm, 'Sleeve_highlight', palette.seam, side * 0.55, -3.7, 2.025, 0.55, 6.3);
    patch(arm, 'Elbow_fold', palette.ink, 0, -6.2, 2.04, 2.8, 0.55);
    block(arm, 'White_cuff', palette.white, 0, -9.05, 0, 3.25, 1.2, 4.05);
    patch(arm, 'Cuff_seam', 0x9dacb9, side * 0.65, -9.05, 2.055, 0.25, 1.0);
    block(arm, 'Hand', palette.skin, 0, -10.55, 0, 3.1, 1.8, 3.9);
    patch(arm, 'Hand_shade', palette.skinShade, side * 0.85, -10.6, 1.965, 0.7, 1.5);
  }

  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.name = side < 0 ? 'Left_leg' : 'Right_leg';
    leg.position.set(side * 2.03, 0, 0);
    model.add(leg);
    block(leg, 'Leg', palette.skin, 0, 6, 0, 4, 12, 4);
    block(leg, 'Tailored_shorts', palette.jacket, 0, 10.9, 0, 4.05, 2.8, 4.08);
    patch(leg, 'Shorts_crease', 0x667386, -side * 0.5, 10.6, 2.075, 2.0, 0.55);
    patch(leg, 'Shorts_hem', 0x8996a3, 0, 9.7, 2.08, 3.9, 0.24);
    if (side > 0) {
      block(leg, 'Asymmetric_high_stocking', 0x232c3b, 0, 7.1, 0, 4.025, 5.1, 4.025);
      patch(leg, 'Stocking_top', 0x111d2c, 0, 9.1, 2.025, 3.95, 0.7);
      patch(leg, 'Stocking_shade', 0x394354, -0.9, 7.1, 2.04, 0.5, 3.3);
    } else {
      patch(leg, 'Knee_shading', 0xc9928b, 0.45, 6.2, 2.025, 1.0, 0.65);
    }
    block(leg, 'Long_black_boot', palette.ink, 0, 2.7, 0, 4.1, 5.4, 4.15);
    block(leg, 'Boot_toe', 0x1b2a39, 0, 0.64, 0.5, 4.2, 1.25, 5.15);
    patch(leg, 'Boot_cuff', palette.seam, 0, 5.2, 2.1, 4.1, 0.5);
    patch(leg, 'Boot_reflection', 0x748795, -0.65, 3.2, 2.11, 0.58, 3.15);
    patch(leg, 'Boot_front_shadow', 0x101c29, 0.8, 3.2, 2.12, 0.7, 2.75);
    patch(leg, 'Ankle_crease', 0x45596b, 0.15, 1.35, 2.125, 2.65, 0.28);
    patch(leg, 'Toe_highlight', 0x788a96, -0.35, 0.63, 3.09, 2.3, 0.32);
    patch(leg, 'Sole', 0x091522, 0, 0.12, 3.105, 4.1, 0.2);
  }

  const head = new THREE.Group();
  head.name = 'Head';
  model.add(head);
  block(head, 'Face_and_head', palette.skin, 0, 28.35, 0, 8, 8, 8);
  block(head, 'Silver_hair_back', palette.hairShade, 0, 28.4, -4.08, 8.5, 8.05, 1.1);
  block(head, 'Silver_hair_crown', palette.hair, 0, 32.45, 0, 8.65, 0.8, 8.65);
  block(head, 'Left_hair_lock', palette.hair, -4.08, 28.1, 1.2, 0.95, 7.2, 5.8);
  block(head, 'Right_hair_lock', palette.hairShade, 4.1, 27.7, 1.5, 0.95, 7.7, 5.4);
  const z = 4.025;
  patch(head, 'Face_left_shadow', palette.skinShade, -3.6, 27.65, z, 0.75, 5.25);
  patch(head, 'Face_right_shadow', 0xd8a29a, 3.65, 27.4, z, 0.65, 4.8);
  for (const side of [-1, 1]) {
    patch(head, 'Eye_white', 0xfafff5, side * 1.85, 27.8, z + 0.025, 1.75, 1.12);
    patch(head, 'Cyan_iris', palette.cyan, side * 1.75, 27.78, z + 0.04, 0.88, 1.1);
    patch(head, 'Blue_iris_shadow', palette.blue, side * 1.75, 28.08, z + 0.05, 0.87, 0.5);
    patch(head, 'Pupil', 0x244457, side * 1.7, 27.9, z + 0.06, 0.32, 0.7);
    patch(head, 'Eye_glint', palette.white, side * 1.85 - 0.21, 28.12, z + 0.07, 0.28, 0.3);
    patch(head, 'Eyelash', palette.ink, side * 1.9, 28.48, z + 0.08, 1.94, 0.34);
    patch(head, 'Cheek', 0xdb9a93, side * 2.7, 26.7, z + 0.025, 0.8, 0.25);
  }
  patch(head, 'Nose', 0xca9189, 0.17, 26.55, z + 0.045, 0.36, 0.52);
  patch(head, 'Mouth', 0x9b6d78, 0.15, 25.55, z + 0.04, 0.85, 0.2);
  patch(head, 'Hair_fringe_top', palette.hair, 0, 31.3, z + 0.1, 8.35, 2.5);
  for (const [x, y, w, h, c] of [
    [-3.25,29.9,1.4,3.0,palette.hair],[-1.8,30.35,1.35,2.2,palette.white],
    [-0.35,29.85,1.35,3.0,palette.hairShade],[1.05,30.45,1.35,2.3,palette.white],
    [2.45,30.0,1.35,3.1,palette.hair],[3.55,30.2,0.75,2.8,palette.hairShade],
  ]) patch(head, 'Separated_silver_fringe', c, x, y, z + 0.12, w, h);
  patch(head, 'Fringe_light', palette.white, -0.65, 32.1, z + 0.14, 5.0, 0.38);
  block(head, 'Elf_ear', palette.skin, 4.65, 27.9, 1.75, 1.1, 1.4, 1.5);
  const earring = block(head, 'Cyan_earring', palette.cyan, 4.55, 25.8, 3.2, 0.65, 1.0, 0.55);
  earring.rotation.z = 0.18;

  const ponytail = new THREE.Group();
  ponytail.name = 'High_ponytail';
  model.add(ponytail);
  for (const [x,y,z,w,h,d,c] of [
    [2.0,34.0,-3.1,4.0,3.8,4.0,palette.hair],
    [3.1,31.5,-5.0,4.2,3.8,4.0,palette.white],
    [4.0,28.4,-5.8,4.0,3.8,3.8,palette.hair],
    [4.65,25.3,-5.75,3.8,3.6,3.5,palette.hairShade],
    [5.2,22.65,-4.9,3.3,3.3,3.1,palette.hairShade],
    [5.2,20.4,-3.6,2.8,2.5,2.8,0x72bccd],
    [4.65,18.9,-2.0,2.1,1.4,2.2,palette.cyan],
  ]) block(ponytail, 'Stepped_ponytail_lock', c, x, y, z, w, h, d);
  block(ponytail, 'Ribbon_knot', palette.ink, 2.0, 33.0, -1.35, 1.8, 1.3, 1.2);
  for (const side of [-1,1]) {
    const bow = block(ponytail, 'Black_ribbon_loop', palette.jacket, 2+side*1.55, 33.15, -1.5, 2.0, 1.8, 1.0);
    bow.rotation.z = side * 0.25;
  }
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const scale = 3 / (bounds.max.y - bounds.min.y);
  model.position.y = -bounds.min.y * scale;
  model.scale.setScalar(scale);
  return model;
}
