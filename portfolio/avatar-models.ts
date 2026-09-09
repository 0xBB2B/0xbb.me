import * as THREE from 'three';

export type AvatarDesign = 'dress' | 'blonde';

export function createAvatarModel(id: AvatarDesign) {
  const root = new THREE.Group(); root.name = `Avatar_${id}`; root.scale.setScalar(.075);
  const materials = new Map<number, THREE.MeshStandardMaterial>();
  const geometries = new Map<string, THREE.BoxGeometry>();
  const skin = 0xe8c5b9, ink = 0x151a24, satin = 0x282e3b, seam = 0x4c5361;
  const hairColor = id === 'blonde' ? 0xf2dfb6 : 0xe3edf2;
  const hairShade = id === 'blonde' ? 0xc2a981 : 0xa9c0d2;
  const white = 0xe4e8ea;
  function block(parent: THREE.Object3D, name: string, color: number, x: number, y: number, z: number,
    w: number, h: number, d: number, tilt = 0) {
    const key = `${w}/${h}/${d}`;
    if (!geometries.has(key)) geometries.set(key, new THREE.BoxGeometry(w, h, d));
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .72, metalness: .02, flatShading: true }));
    const mesh = new THREE.Mesh(geometries.get(key)!, materials.get(color)!);
    mesh.name = name; mesh.position.set(x, y, z); mesh.rotation.z = tilt;
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function group(name: string, parent: THREE.Object3D = root) {
    const part = new THREE.Group(); part.name = name; parent.add(part); return part;
  }
  function bow(parent: THREE.Object3D, name: string, x: number, y: number, z: number, size = 1) {
    const part = group(name, parent); part.position.set(x, y, z);
    block(part, 'Bow_knot', ink, 0, 0, .08, .6 * size, .65 * size, .5 * size);
    for (const side of [-1, 1]) block(part, 'Bow_loop', satin, side * .85 * size, 0, 0, 1.25 * size, 1.3 * size, .5 * size, -side * .2);
    return part;
  }

  for (const side of [-1, 1]) {
    const leg = group(side < 0 ? 'Left_leg' : 'Right_leg'); leg.position.x = side * 1.85;
    block(leg, 'Leg', skin, 0, 7.15, 0, 2.65, 11.9, 2.8);
    if (id !== 'dress') {
      block(leg, 'Black_stocking', 0x383941, 0, 5.35, .02, 2.7, 8.3, 2.86);
      block(leg, 'Stocking_top', ink, 0, 9.4, .03, 2.74, .55, 2.92);
    }
    block(leg, 'Heel', ink, 0, .65, -1.02, .72, 1.3, .7);
    block(leg, 'Shoe_toe', satin, 0, .45, 1.12, 2.8, .7, 2.3);
    block(leg, 'Shoe_instep', ink, 0, 1.12, .2, 2.72, .5, 2.25);
    block(leg, 'Ankle_strap', ink, 0, 1.9, 0, 2.83, .27, 2.96);
    block(leg, 'Shoe_buckle', id === 'blonde' ? 0xbfa873 : 0x8994a5, side * 1.45, 1.9, .55, .16, .35, .4);
  }
  const torso = group('Torso');
  block(torso, 'Waist', id === 'blonde' ? skin : satin, 0, 14.8, 0, 5.8, 3.0, 3.4);
  block(torso, 'Upper_body', skin, 0, 19.35, 0, 6.4, 4.9, 3.3);
  block(torso, 'Neck', skin, 0, 22, 0, 2.6, 1.6, 2.6);
  block(torso, id === 'blonde' ? 'Halter_top' : 'Black_bodice', ink, 0, 18.1, .05, 6.6, 5.2, 3.6);
  if (id === 'blonde') {
    block(torso, 'High_halter_collar', ink, 0, 21.65, 0, 3.1, 1.9, 2.85);
    for (const side of [-1, 1]) block(torso, 'Halter_diagonal', satin, side * 1.05, 20.65, 1.79, 2.0, 2.5, .18, side * .36);
    for (let i = 0; i < 12; i++) block(torso, 'Ribbed_top', 0x363640, -2.9 + i * .53, 18.15, 1.88, .07, 4.45, .06);
  } else {
    block(torso, 'Lace_collar', satin, 0, 22, 0, 3.15, 1.35, 2.85);
    block(torso, 'Lace_yoke', 0x62565a, 0, 20.65, 1.76, 5.4, 2.5, .16);
    for (let row = 0; row < 5; row++) for (let col = 0; col < 9; col++) {
      if ((row + col) % 2 === 0) block(torso, 'Yoke_lace_stitch', satin, -2.35 + col * .58, 19.65 + row * .48, 1.89, .22, .22, .07, Math.PI / 4);
    }
    for (const side of [-1, 1]) block(torso, 'Wrapped_satin_panel', satin, side * 1.3, 17.45, 1.94, 3.55, 4.75, .3, side * -.27);
    bow(torso, 'Collar_ribbon', 0, 21.45, 2.02, .55);
  }

  for (const side of [-1, 1]) {
    const arm = group(side < 0 ? 'Left_arm' : 'Right_arm'); arm.position.set(side * 4.4, 20.4, 0);
    arm.rotation.z = -side * .07;
    block(arm, 'Bare_arm', skin, 0, -2.4, 0, 2.2, 6.9, 2.4);
    block(arm, 'Hand', id === 'blonde' ? skin : ink, 0, -6.15, .12, 2.08, 1.2, 2.28);
    if (id === 'dress') {
      block(arm, 'Long_lace_glove', 0x42404a, 0, -4.65, 0, 2.26, 3.25, 2.46);
      for (let i = 0; i < 5; i++) block(arm, 'Glove_lace_band', ink, 0, -3.35 - i * .6, 1.26, 2.3, .16, .07);
      block(arm, 'Off_shoulder_drape', satin, 0, -.8, .05, 2.7, 1.75, 2.8, -side * .2);
      block(arm, 'Sleeve_fold', seam, 0, -.65, 1.49, 2.65, .18, .1, -side * .15);
    } else {
      block(arm, 'Light_jacket_sleeve', 0xcbd2d9, 0, -3.15, -.08, 3.0, 5.4, 3.0);
      block(arm, 'Folded_sleeve_top', white, 0, -.52, -.02, 3.3, .75, 3.3, -side * .16);
      for (let i = 0; i < 3; i++) block(arm, 'Sleeve_fold', 0x9faebc, side * .2, -2 - i * 1.05, 1.48, 2.65, .22, .13, side * .12);
      block(arm, 'Jacket_cuff', white, 0, -5.65, -.02, 3.05, .55, 3.05);
    }
  }

  const skirt = group(id === 'dress' ? 'Long_split_gown' : 'Pleated_skirt');
  block(skirt, 'Waistband', ink, 0, 13.55, 0, 6.5, .7, 3.65);
  if (id === 'dress') {
    for (let row = 0; row < 7; row++) {
      const y = 12.5 - row * 1.85, width = 7.1 + row * .85;
      block(skirt, 'Gown_back_layer', row % 2 ? satin : ink, 0, y, -1.8 - row * .13, width, 1.95, .65);
      for (const side of [-1, 1]) {
        block(skirt, 'Gown_side_fold', side < 0 ? satin : ink, side * (width / 2 - .55), y, -.1, 1.35, 2.0, 4.2 + row * .25);
        block(skirt, 'Lace_hem_edge', seam, side * (width / 2 - .08), y, 2.12 + row * .12, .23, 1.95, .14);
      }
      block(skirt, 'Front_draped_panel', row % 2 ? 0x252b37 : 0x303642, 1.9 + row * .13, y, 2.05 + row * .08, 3.8 + row * .32, 1.95, .38);
      for (let stitch = 0; stitch < 4; stitch++) block(skirt, 'Gown_lace_stitch', 0x73808e, -.1 + row * -.06, y - .65 + stitch * .42, 2.3 + row * .08, .13, .15, .1);
    }
    block(skirt, 'Trailing_hem', ink, 0, .16, -2, 13, .28, 6.0);
    bow(skirt, 'Hip_knot', -2.65, 13.2, 2.3, .64);
    block(skirt, 'Draped_sash', seam, -2.3, 11.25, 2.46, .4, 3.8, .22, -.2);
  } else {
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 1.04;
      block(skirt, 'Skirt_pleat', i % 2 ? satin : ink, x, 11.9, 1.6, 1.05, 2.6, 1.2, -x * .025);
      block(skirt, 'Skirt_back_pleat', i % 2 ? ink : satin, x, 11.9, -1.6, 1.05, 2.6, 1.2, -x * .025);
    }
    for (const side of [-1, 1]) block(skirt, 'Skirt_side', ink, side * 3.4, 11.95, 0, 1.0, 2.6, 3.6);
    const jacket = group('Dropped_light_jacket');
    block(jacket, 'Jacket_back', 0xcbd2d9, 0, 16.5, -2.0, 7.0, 6.0, .55);
    for (const side of [-1, 1]) {
      block(jacket, 'Open_jacket_edge', white, side * 3.35, 15.9, 1.7, .68, 5.3, .5, side * -.06);
      block(jacket, 'Jacket_zip', 0x8493a5, side * 3.05, 15.9, 2.01, .13, 5.2, .12);
    }
  }

  const head = group('Head');
  block(head, 'Face', skin, 0, 25.55, .1, 7.2, 6.4, 6.1);
  for (const side of [-1, 1]) {
    block(head, 'Ear', skin, side * 3.72, 25.0, -.05, .45, 1.15, .65);
    block(head, 'Eyelash', ink, side * 1.66, 25.65, 3.2, 1.9, .98, .07);
    block(head, 'Eye_white', white, side * 1.66, 25.48, 3.25, 1.65, .7, .05);
    block(head, 'Blue_iris', id === 'blonde' ? 0x668c9b : 0x4aa3d0, side * 1.45, 25.49, 3.29, .77, .7, .04);
    block(head, 'Pupil', 0x182c42, side * 1.43, 25.49, 3.32, .28, .61, .02);
    block(head, 'Eye_glint', 0xf8ffff, side * 1.43 - .13, 25.67, 3.34, .16, .17, .02);
    block(head, 'Brow', id === 'blonde' ? 0x9c815f : 0x728699, side * 1.7, 26.6, 3.24, 1.3, .19, .08, side * .05);
    const gold = id === 'blonde' ? 0xc6a36c : 0xb8cbdc;
    block(head, 'Earring_stud', gold, side * 3.88, 24.4, .65, .25, .4, .2);
    block(head, 'Earring_drop', gold, side * 3.88, 23.65, .65, .18, 1.05, .2);
    block(head, 'Earring_pendant', gold, side * 3.88, 23.1, .65, .42, .4, .24, Math.PI / 4);
  }
  block(head, 'Nose', 0xd9ae9f, 0, 24.7, 3.22, .3, .4, .18);
  block(head, 'Closed_lips', id === 'dress' ? 0xa4434c : 0xad7074, 0, 23.86, 3.23, .87, .2, .04);
  const hair = group(id === 'dress' ? 'Silver_high_ponytail' : 'Blonde_hair', head);
  block(hair, 'Hair_crown', hairColor, 0, 28.9, -.08, 8.0, 1.4, 6.95);
  block(hair, 'Hair_back', hairShade, 0, 26.15, -3.24, 7.8, 5.8, 1.0);
  for (const side of [-1, 1]) {
    block(hair, 'Side_hair', hairColor, side * 3.72, 26.45, .1, .85, 4.5, 6.2);
    block(hair, 'Face_lock', hairColor, side * 3.5, 23.9, 2.4, .65, 3.0, .8, side * .08);
  }
  for (const [i, h] of [1.7, 2.4, 2.9, 2.2, 1.6].entries()) {
    block(hair, 'Fringe_lock', hairColor, -2.6 + i * 1.3, 28.25 - h / 2, 3.28, 1.3, h, .6, .16 - i * .07);
    block(hair, 'Fringe_highlight', id === 'blonde' ? 0xffefd1 : 0xf3f9fc, -2.7 + i * 1.3, 28.1 - h / 2, 3.62, .14, h * .7, .07, .16 - i * .07);
  }
  if (id === 'dress') {
    const ponytail = group('Ponytail', hair); ponytail.position.set(-1.9, 29.4, -2.9);
    block(ponytail, 'Ponytail_crown', hairColor, 0, 1.0, 0, 3.2, 2.3, 2.8, -.15);
    for (let i = 0; i < 5; i++) {
      block(ponytail, 'Ponytail_layer', i % 2 ? hairShade : hairColor, -.35 - i * .32, -.65 - i * 1.45, -.35 - i * .15, 3.1 - i * .24, 1.9, 2.8 - i * .17, -.13);
    }
    bow(hair, 'Black_hair_bow', -1.9, 29.9, .1, 1.5);
  } else {
    for (let i = 0; i < 7; i++) {
      const length = 8.5 + (i % 3) * .7;
      block(hair, 'Long_back_lock', i % 2 ? hairShade : hairColor, -3.6 + i * 1.2, 26.7 - length / 2, -3.25, 1.3, length, 1.1);
      block(hair, 'Hair_tip', hairShade, -3.6 + i * 1.2, 26.6 - length, -3.18, .8, 1.4, 1.0, (i - 3) * .045);
    }
    for (const side of [-1, 1]) block(hair, 'Front_long_lock', hairColor, side * 3.85, 22.0, .5, .8, 5.5, 1.4, side * -.055);
  }
  return root;
}
