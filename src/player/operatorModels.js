import * as THREE from "three";

function ellipsoid(parent, x, y, z, sx, sy, sz, m) {
  const o = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), m);
  o.position.set(x, y, z);
  o.scale.set(sx, sy, sz);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}

export function makeOperatorModel(style, mat) {
  const root = new THREE.Group(),
    hats = [0x30232d, 0xe5dfd7, 0x886844],
    coats = [0x211821, 0xe8e4dd, 0x95744e, 0x282236, 0x211e22],
    hairs = [0x17131b, 0xe8dfd3, 0x38251e, 0x50392d, 0x9b342e],
    trims = [0xb08e51, 0xbda45d, 0xc2984b, 0x9b85d3, 0xd6aa3e],
    skinTone = mat(0xd5a18d),
    coat = mat(coats[style], 0.75, 0.06),
    hairMat = mat(hairs[style], 0.86),
    trim = mat(trims[style], 0.42, 0.5),
    pants = mat(
      style === 0
        ? 0x17151a
        : style === 1
          ? 0xc7c2b9
          : style === 2
            ? 0x70583c
            : 0x211e27,
      0.78,
      0.04,
    ),
    hat = mat(hats[Math.min(style, 2)], 0.62, 0.12),
    boot = mat(
      style === 0
        ? 0x17141a
        : style === 1
          ? 0xb8b1a4
          : style === 2
            ? 0x493525
            : 0x19171c,
      0.7,
      0.12,
    ),
    gloveMat = mat(style === 1 ? 0xd8cdbb : 0x211e20, 0.84, 0.04),
    gunMat = mat(0x20252a, 0.42, 0.58),
    metalMat = mat(0xb3a17a, 0.35, 0.7);
  ellipsoid(root, 0, 1.53, 0, 0.32, 0.43, 0.22, coat);
  ellipsoid(root, 0, 1.98, 0.015, 0.22, 0.27, 0.21, skinTone);
  ellipsoid(root, 0, 2.13, -0.055, 0.245, 0.22, 0.23, hairMat);
  ellipsoid(root, -0.2, 1.96, -0.015, 0.07, 0.34, 0.09, hairMat);
  ellipsoid(root, 0.2, 1.96, -0.015, 0.07, 0.34, 0.09, hairMat);
  ellipsoid(root, -0.09, 2.01, 0.207, 0.025, 0.018, 0.016, gunMat);
  ellipsoid(root, 0.09, 2.01, 0.207, 0.025, 0.018, 0.016, gunMat);
  if (style < 3) {
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.78, 0.075, 32),
      hat,
    );
    brim.position.y = 2.34;
    brim.scale.set(style === 0 ? 1.28 : 1.18, 1, style === 0 ? 1.02 : 0.95);
    root.add(brim);
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.48, 0.43, 20),
      hat,
    );
    crown.position.y = 2.57;
    crown.scale.x = style === 0 ? 1.04 : 1;
    root.add(crown);
    const hatband = new THREE.Mesh(
      new THREE.TorusGeometry(0.405, 0.025, 8, 24),
      trim,
    );
    hatband.position.y = 2.45;
    hatband.rotation.x = Math.PI / 2;
    root.add(hatband);
  } else if (style === 3) {
    for (const side of [-1, 1]) {
      ellipsoid(root, side * 0.24, 2.12, -0.04, 0.12, 0.1, 0.12, hairMat);
      const pony = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.09, 0.34, 5, 10),
        hairMat,
      );
      pony.position.set(side * 0.34, 1.98, -0.08);
      pony.rotation.z = side * 0.2;
      root.add(pony);
    }
    ellipsoid(root, 0, 2.2, -0.045, 0.22, 0.13, 0.18, hairMat);
  } else {
    ellipsoid(root, 0, 2.16, -0.015, 0.27, 0.2, 0.24, hairMat);
    ellipsoid(root, -0.22, 1.98, -0.01, 0.075, 0.24, 0.11, hairMat);
    ellipsoid(root, 0.22, 1.98, -0.01, 0.075, 0.24, 0.11, hairMat);
  }
  ellipsoid(root, 0, 1.32, 0.005, 0.3, 0.12, 0.2, trim);
  ellipsoid(root, 0, 1.24, 0.015, 0.34, 0.07, 0.22, coat);
  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.09, 0.035),
    metalMat,
  );
  buckle.position.set(0, 1.32, 0.22);
  root.add(buckle);
  for (const side of [-1, 1]) {
    ellipsoid(root, side * 0.39, 1.59, 0.015, 0.15, 0.2, 0.16, coat);
    ellipsoid(root, side * 0.48, 1.22, 0.04, 0.1, 0.34, 0.12, coat);
    ellipsoid(root, side * 0.48, 0.84, 0.025, 0.12, 0.13, 0.13, trim);
    ellipsoid(root, side * 0.17, 0.93, 0, 0.16, 0.35, 0.16, pants);
    ellipsoid(root, side * 0.17, 0.48, 0, 0.14, 0.24, 0.14, pants);
    ellipsoid(root, side * 0.17, 0.16, 0.09, 0.16, 0.13, 0.25, boot);
    ellipsoid(root, side * 0.5, 0.18, 0.02, 0.12, 0.12, 0.2, boot);
    const palm = ellipsoid(
      root,
      side * 0.5,
      0.64,
      0.09,
      0.085,
      0.095,
      0.055,
      gloveMat,
    );
    palm.rotation.z = -side * 0.15;
    const fingerLengths = [0.115, 0.145, 0.132, 0.105],
      fingerGaps = [-0.052, -0.018, 0.018, 0.052];
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.018, 0.06, 4, 8),
        gloveMat,
      );
      finger.position.set(side * 0.5 + fingerGaps[f], 0.51, 0.105);
      finger.scale.y = fingerLengths[f] / 0.096;
      finger.rotation.z = -side * 0.08;
      root.add(finger);
      ellipsoid(
        root,
        side * 0.5 + fingerGaps[f],
        0.44,
        0.105,
        0.019,
        0.025,
        0.02,
        gloveMat,
      );
    }
    const thumb = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.023, 0.075, 4, 8),
      gloveMat,
    );
    thumb.position.set(side * 0.42, 0.63, 0.12);
    thumb.rotation.z = side * 0.65;
    thumb.rotation.x = -0.35;
    root.add(thumb);
  }
  if (style === 0) {
    ellipsoid(root, -0.22, 1.55, 0.13, 0.16, 0.36, 0.08, coat);
    ellipsoid(root, 0.22, 1.55, 0.13, 0.16, 0.36, 0.08, coat);
    for (let y = 1.38; y < 1.8; y += 0.16)
      ellipsoid(root, 0.025, y, 0.22, 0.025, 0.025, 0.018, trim);
  }
  if (style === 1) {
    ellipsoid(root, 0, 1.57, 0.17, 0.27, 0.22, 0.075, mat(0xf4f0e9, 0.7, 0.04));
    for (let side of [-1, 1])
      ellipsoid(root, side * 0.24, 1.55, 0.19, 0.035, 0.24, 0.025, trim);
    ellipsoid(root, 0, 2.38, 0.035, 0.14, 0.055, 0.08, trim);
  }
  if (style === 2) {
    const bandolier = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.57, 0.045),
      trim,
    );
    bandolier.position.set(0.13, 1.55, 0.225);
    bandolier.rotation.z = -0.52;
    root.add(bandolier);
    for (let n = 0; n < 5; n++) {
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.1, 8),
        metalMat,
      );
      shell.rotation.z = Math.PI / 2;
      shell.position.set(-0.13 + n * 0.065, 1.31, 0.23);
      root.add(shell);
    }
  }
  if (style === 3) {
    const jacket = mat(0x7765ad, 0.38, 0.25),
      dress = mat(0x181720, 0.5, 0.1);
    ellipsoid(root, 0, 1.52, 0.18, 0.25, 0.32, 0.055, dress);
    for (const side of [-1, 1])
      ellipsoid(root, side * 0.25, 1.57, 0.11, 0.12, 0.4, 0.075, jacket);
    for (const y of [0.49, 0.58, 0.67])
      for (const side of [-1, 1])
        ellipsoid(
          root,
          side * 0.17,
          y,
          0.12,
          0.18,
          0.026,
          0.025,
          mat(0x241d2a, 0.7, 0.08),
        );
  }
  if (style === 4) {
    const black = mat(0x17171b, 0.48, 0.15),
      gold = mat(0xd3a434, 0.35, 0.45);
    ellipsoid(root, 0, 1.5, 0.18, 0.27, 0.33, 0.07, black);
    for (let n = 0; n < 5; n++) {
      const pleat = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.25, 0.035),
        gold,
      );
      pleat.position.set(-0.2 + n * 0.1, 1.16, 0.18);
      pleat.rotation.z = (n - 2) * 0.13;
      root.add(pleat);
    }
    ellipsoid(root, 0, 1.86, 0.22, 0.29, 0.07, 0.06, gold);
  }
  const rifle = new THREE.Group();
  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.12, 0.13),
    gunMat,
  );
  receiver.position.set(0.08, 1.68, 0.29);
  receiver.rotation.z = -0.24;
  rifle.add(receiver);
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.72, 10),
    metalMat,
  );
  barrel.rotation.z = Math.PI / 2 - 0.24;
  barrel.position.set(0.64, 1.77, 0.29);
  rifle.add(barrel);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.17, 0.12), gunMat);
  stock.position.set(-0.38, 1.58, 0.28);
  stock.rotation.z = -0.24;
  rifle.add(stock);
  root.add(rifle);
  return root;
}

export const operatorNames = [
  "NOIR // 黑曜枪手",
  "ALBA // 白昼游侠",
  "SAND // 荒野侦察",
  "VIOLET // 紫影双尾",
  "RUBY // 赤金舞者",
];

export const armStyles = [
  { sleeve: 0x211b22, glove: 0x141419, trim: 0xb08b53, plate: 0x3a2a32 },
  { sleeve: 0xd9d4c9, glove: 0xf0e5d1, trim: 0xc6a75a, plate: 0xf3eadb },
  { sleeve: 0x947451, glove: 0x493326, trim: 0xc69b52, plate: 0x705538 },
  { sleeve: 0x7266a6, glove: 0x191922, trim: 0xd3c8ef, plate: 0x31263f },
  { sleeve: 0x28252a, glove: 0x121318, trim: 0xd6aa3e, plate: 0x815a1e },
];
