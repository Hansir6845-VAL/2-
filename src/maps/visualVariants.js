import * as THREE from "three";

export function buildVisualMapVariant(id, sharedColliders, mat) {
  const group = new THREE.Group(),
    palette = {
      2: {
        ground: 0xb9a477,
        wall: 0xe1c89c,
        roof: 0x8e5540,
        detail: 0x315d62,
        window: 0x7bc5ca,
      },
      3: {
        ground: 0x182633,
        wall: 0x435466,
        roof: 0x18212d,
        detail: 0x50c8e8,
        window: 0x8deeff,
      },
      4: {
        ground: 0x103640,
        wall: 0x1d4e57,
        roof: 0x102a35,
        detail: 0x38d4c7,
        window: 0x73e9dc,
      },
      5: {
        ground: 0x766b51,
        wall: 0x948363,
        roof: 0x4e4938,
        detail: 0xd8bd68,
        window: 0x68c3a0,
      },
    }[id];
  const add = (geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const groundMat = mat(palette.ground),
    wallMat = mat(palette.wall),
    roofMat = mat(palette.roof),
    detailMat = mat(palette.detail),
    windowMat = new THREE.MeshStandardMaterial({
      color: palette.window,
      emissive: palette.window,
      emissiveIntensity: id === 4 ? 0.28 : 0.08,
      roughness: 0.3,
      metalness: 0.25,
    });
  // The walkable surface stays level; themed terrain relief is beyond the shared play bounds.
  const terrain = new THREE.PlaneGeometry(100, 100, 30, 30);
  terrain.rotateX(-Math.PI / 2);
  const p = terrain.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i),
      edge = Math.max(0, (Math.abs(x) - 18.5) / 8, (-z - 46) / 8, (z - 26) / 8);
    let y = 0;
    if (id === 2)
      y =
        edge *
        (1.2 + 1.2 * Math.sin(x * 0.22 + z * 0.12) + 0.55 * Math.cos(z * 0.31));
    if (id === 3)
      y = edge * (0.45 + 0.3 * Math.sin(x * 0.3) * Math.cos(z * 0.22));
    if (id === 4) y = edge * (0.25 + 0.25 * Math.sin(x * 0.45 + z * 0.2));
    if (id === 5)
      y =
        edge *
        (1.5 +
          1.4 * Math.sin(x * 0.14) * Math.cos(z * 0.19) +
          0.7 * Math.sin(z * 0.32));
    p.setY(i, y);
  }
  terrain.computeVertexNormals();
  add(terrain, groundMat, 0, -0.12, 0);
  // Theme-specific facade treatment wraps the same stage 1 building/cover footprints.
  for (const collider of sharedColliders) {
    if (collider.halfX != null && collider.halfZ != null) {
      const { x, z, halfX, halfZ, top } = collider;
      if (top <= 0.1) continue;
      const w = halfX * 2,
        d = halfZ * 2,
        h = top,
        base = mat(palette.wall);
      // This visible solid has the exact same bounding box as the shared collider.
      const body = add(new THREE.BoxGeometry(w, h, d), base, x, h / 2, z);
      body.userData.blocksShots = true;
      // Different architecture: seaside homes, station modules, pressure domes, and ruin blocks.
      if (id === 2) {
        add(
          new THREE.ConeGeometry(
            Math.min(w, d) * 0.72,
            Math.max(0.7, h * 0.22),
            4,
          ),
          roofMat,
          x,
          h + Math.max(0.35, h * 0.11),
          z,
        ).rotation.y = Math.PI / 4;
        for (
          let wx = -w * 0.32;
          wx <= w * 0.32;
          wx += Math.max(0.9, w * 0.36)
        ) {
          add(
            new THREE.BoxGeometry(
              Math.max(0.42, w * 0.18),
              Math.min(1.5, h * 0.42),
              0.09,
            ),
            windowMat,
            x + wx,
            h * 0.57,
            z + d / 2 - 0.04,
          );
          add(
            new THREE.BoxGeometry(Math.max(0.6, w * 0.22), 0.12, 0.22),
            detailMat,
            x + wx,
            h * 0.34,
            z + d / 2 - 0.13,
          );
        }
        add(
          new THREE.BoxGeometry(w * 0.16, 0.8, 0.3),
          roofMat,
          x,
          h * 0.42,
          z + d / 2 - 0.15,
        );
      } else if (id === 3) {
        add(
          new THREE.BoxGeometry(w * 0.9, h * 0.08, d * 0.9),
          detailMat,
          x,
          h * 0.9,
          z,
        );
        for (let wx = -w * 0.34; wx <= w * 0.34; wx += Math.max(0.8, w * 0.3)) {
          add(
            new THREE.BoxGeometry(Math.max(0.16, w * 0.07), h * 0.72, 0.08),
            windowMat,
            x + wx,
            h * 0.51,
            z + d / 2 - 0.04,
          );
          add(
            new THREE.BoxGeometry(Math.max(0.12, w * 0.04), 0.12, d * 0.84),
            roofMat,
            x + wx,
            h * 0.8,
            z,
          );
        }
        add(
          new THREE.CylinderGeometry(
            Math.min(w, d) * 0.21,
            Math.min(w, d) * 0.21,
            0.2,
            16,
          ),
          windowMat,
          x,
          h + 0.1,
          z,
        );
      } else if (id === 4) {
        add(
          new THREE.CylinderGeometry(
            Math.min(w, d) * 0.42,
            Math.min(w, d) * 0.48,
            Math.max(0.3, h * 0.16),
            20,
          ),
          roofMat,
          x,
          h + 0.12,
          z,
        );
        for (let wx = -w * 0.34; wx <= w * 0.34; wx += Math.max(0.8, w * 0.3)) {
          add(
            new THREE.BoxGeometry(
              Math.max(0.25, w * 0.16),
              Math.max(0.35, h * 0.17),
              0.07,
            ),
            windowMat,
            x + wx,
            h * 0.55,
            z + d / 2 - 0.04,
          );
          add(
            new THREE.BoxGeometry(Math.max(0.4, w * 0.2), 0.13, 0.15),
            detailMat,
            x + wx,
            h * 0.37,
            z + d / 2 - 0.1,
          );
        }
        for (let side of [-1, 1])
          add(
            new THREE.CylinderGeometry(0.12, 0.12, h * 0.82, 8),
            detailMat,
            x + side * w * 0.4,
            h * 0.5,
            z + d / 2 - 0.1,
          );
      } else {
        add(
          new THREE.BoxGeometry(w * 0.86, h * 0.12, d * 0.86),
          roofMat,
          x,
          h * 0.92,
          z,
        );
        for (let side of [-1, 1]) {
          add(
            new THREE.BoxGeometry(
              Math.min(0.58, w * 0.2),
              h * 0.94,
              Math.min(0.7, d * 0.2),
            ),
            detailMat,
            x + side * (w / 2 - Math.min(0.32, w * 0.11)),
            h * 0.48,
            z + d / 2 - Math.min(0.3, d * 0.1),
          );
        }
        for (let wx = -w * 0.34; wx <= w * 0.34; wx += Math.max(0.9, w * 0.3))
          add(
            new THREE.BoxGeometry(Math.max(0.18, w * 0.065), h * 0.52, 0.1),
            roofMat,
            x + wx,
            h * 0.47,
            z + d / 2 - 0.05,
          );
        add(
          new THREE.BoxGeometry(w * 0.56, 0.13, 0.13),
          windowMat,
          x,
          h * 0.72,
          z + d / 2 - 0.06,
        );
      }
    } else if (collider.radius != null && collider.top > 0.1) {
      const solid = add(
        new THREE.CylinderGeometry(
          collider.radius,
          collider.radius,
          collider.top,
          12,
        ),
        id === 2
          ? roofMat
          : id === 3
            ? detailMat
            : id === 4
              ? windowMat
              : wallMat,
        collider.x,
        collider.top / 2,
        collider.z,
      );
      solid.userData.blocksShots = true;
    }
  }
  // Large, distinctive floor layouts are purely visual and stay clear of collision/aim rules.
  const paint = (color) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.98, metalness: 0 });
  const sandTrack = paint(0xd7bb83),
    icePatch = paint(0x20364a),
    iceCrack = paint(0x1b2b39),
    roadPatch = paint(0x17434b),
    roadMark = paint(0x3eb8ac),
    mossPatch = paint(0x82734f),
    forestDirt = paint(0x4b4738);
  const groundMark = (geometry, material, x, z, sx, sz, rotation = 0) => {
    const m = add(geometry, material, x, -0.085, z, sx, 0.018, sz);
    m.rotation.y = rotation;
    return m;
  };
  if (id === 2) {
    for (let z = -40; z < 22; z += 10) {
      groundMark(
        new THREE.BoxGeometry(32, 0.01, 2.1),
        sandTrack,
        0,
        z,
        1,
        1,
        0,
      );
      groundMark(
        new THREE.BoxGeometry(8, 0.01, 3.2),
        paint(0x887b65),
        0,
        z + 3,
        1,
        1,
        0,
      );
    }
    for (let x = -13; x <= 13; x += 6)
      for (let z = -36; z <= 18; z += 12)
        groundMark(
          new THREE.BoxGeometry(3.8, 0.01, 2.6),
          paint(0xb2a58c),
          x,
          z,
          1,
          1,
          0,
        );
  }
  if (id === 3) {
    for (let z = -42; z <= 22; z += 6)
      for (let x = -15; x <= 15; x += 6) {
        groundMark(
          new THREE.BoxGeometry(5.8, 0.01, 5.8),
          icePatch,
          x,
          z,
          1,
          1,
          0,
        );
        groundMark(
          new THREE.BoxGeometry(0.08, 0.01, 5.6),
          detailMat,
          x - 2.85,
          z === -42 ? z : z,
          1,
          1,
          0,
        );
      }
    for (let x = -15; x <= 15; x += 3)
      groundMark(
        new THREE.BoxGeometry(0.09, 0.01, 62),
        iceCrack,
        x,
        -10,
        1,
        1,
        0,
      );
  }
  if (id === 4) {
    for (let z = -42; z <= 22; z += 5)
      for (let x = -15; x <= 15; x += 5) {
        groundMark(
          new THREE.BoxGeometry(4.8, 0.01, 4.8),
          roadPatch,
          x,
          z,
          1,
          1,
          0,
        );
        groundMark(
          new THREE.BoxGeometry(0.1, 0.01, 4.7),
          roadMark,
          x - 2.4,
          z,
          1,
          1,
          0,
        );
      }
    for (let z = -39; z < 22; z += 12)
      groundMark(
        new THREE.CylinderGeometry(1.2, 1.2, 0.02, 20),
        windowMat,
        0,
        z,
        1,
        1,
        0,
      );
  }
  if (id === 5) {
    for (let z = -42; z <= 22; z += 6)
      for (let x = -15; x <= 15; x += 6) {
        groundMark(
          new THREE.BoxGeometry(5.7, 0.01, 5.7),
          mossPatch,
          x,
          z,
          1,
          1,
          ((x + z) % 2) * 0.12,
        );
        groundMark(
          new THREE.BoxGeometry(0.14, 0.01, 5.6),
          forestDirt,
          x - 2.8,
          z,
          1,
          1,
          0,
        );
        groundMark(
          new THREE.BoxGeometry(5.6, 0.01, 0.14),
          detailMat,
          x,
          z - 2.8,
          1,
          1,
          0,
        );
      }
    for (let x = -12; x <= 12; x += 12)
      for (let z = -36; z <= 18; z += 18)
        groundMark(
          new THREE.CylinderGeometry(0.07, 0.07, 4.8, 6),
          windowMat,
          x,
          z,
          1,
          1,
          Math.PI / 2,
        );
  }
  // Distinct silhouettes beyond the unchanged play boundary; these are background only.
  const rockMat = mat(
    id === 2 ? 0xb99b67 : id === 3 ? 0xc3d9df : id === 4 ? 0x343941 : 0x3e503b,
  );
  if (id === 2)
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1,
        z = -47 + Math.floor(i / 2) * 9,
        x = side * (25 + (i % 3) * 2);
      add(new THREE.BoxGeometry(5, 5, 5), wallMat, x, 2.5, z);
      add(new THREE.ConeGeometry(3.9, 2.8, 4), roofMat, x, 6.3, z).rotation.y =
        Math.PI / 4;
      add(new THREE.CylinderGeometry(0.1, 0.1, 8, 8), detailMat, x, 10, z);
    }
  if (id === 3)
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1,
        z = -48 + Math.floor(i / 2) * 9,
        x = side * (25 + (i % 3) * 2);
      add(new THREE.CylinderGeometry(3, 3, 5, 16), wallMat, x, 2.5, z);
      add(new THREE.CylinderGeometry(3.2, 3.2, 0.18, 16), detailMat, x, 5.1, z);
      add(new THREE.CylinderGeometry(0.16, 0.16, 7, 8), windowMat, x, 9, z);
    }
  if (id === 4)
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1,
        z = -47 + Math.floor(i / 2) * 9,
        x = side * 27;
      add(new THREE.CylinderGeometry(3.4, 3.4, 5, 18), wallMat, x, 2.5, z);
      add(
        new THREE.SphereGeometry(3.5, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        windowMat,
        x,
        5,
        z,
      );
      for (let a = 0; a < 4; a++) {
        const pipe = add(
          new THREE.CylinderGeometry(0.13, 0.13, 7, 8),
          detailMat,
          x + (a - 1.5) * 0.6,
          2.5,
          z + 3,
        );
        pipe.rotation.x = Math.PI / 2;
      }
    }
  if (id === 5)
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1,
        z = -46 + Math.floor(i / 2) * 8,
        x = side * (25 + (i % 3) * 2),
        h = 9 + ((i * 7) % 12);
      add(new THREE.BoxGeometry(3.5, h, 3.5), wallMat, x, h / 2, z);
      add(new THREE.BoxGeometry(4.3, 0.4, 4.3), detailMat, x, h + 0.2, z);
      add(
        new THREE.BoxGeometry(0.16, h * 0.8, 0.18),
        windowMat,
        x,
        h * 0.5,
        z + 1.8,
      );
    }
  // Each level also gets a bespoke architectural skyline outside the unchanged
  // movement boundary. These meshes are scenery only and add no collision entries.
  const silhouette = (
    geometry,
    material,
    x,
    y,
    z,
    sx = 1,
    sy = 1,
    sz = 1,
    ry = 0,
  ) => {
    const m = add(geometry, material, x, y, z, sx, sy, sz);
    m.rotation.y = ry;
    return m;
  };
  if (id === 2) {
    const stucco = mat(0xe1c89c),
      terracotta = mat(0x984f3b),
      sea = mat(0x237985, 0.4, 0.2),
      wood = mat(0x574534);
    for (const side of [-1, 1]) {
      const x = side * 28;
      for (let n = 0; n < 3; n++) {
        const z = -38 + n * 17,
          w = 7 + (n % 2) * 2;
        silhouette(new THREE.BoxGeometry(w, 5.5, 6), stucco, x, 2.75, z);
        silhouette(
          new THREE.ConeGeometry(w * 0.78, 3.2, 4),
          terracotta,
          x,
          7.1,
          z,
        ).rotation.y = Math.PI / 4;
        for (let wx = -1; wx <= 1; wx++)
          silhouette(
            new THREE.BoxGeometry(0.85, 1.4, 0.12),
            sea,
            x + wx * 2,
            2.9,
            z + 3.08,
          );
      }
      silhouette(new THREE.BoxGeometry(6, 0.7, 2), wood, x, 1.2, -43);
      for (let p = 0; p < 5; p++)
        silhouette(
          new THREE.CylinderGeometry(0.08, 0.08, 4, 6),
          wood,
          x - 2 + p,
          2,
          -44,
        );
    }
    silhouette(new THREE.BoxGeometry(100, 0.5, 22), sea, 0, -0.4, -63);
    for (let x = -22; x <= 22; x += 11) {
      silhouette(new THREE.CylinderGeometry(0.12, 0.12, 9, 8), wood, x, 3, -52);
      silhouette(new THREE.BoxGeometry(8, 0.18, 0.18), wood, x, 7.5, -52);
    }
    for (let z = -48; z <= -34; z += 3)
      silhouette(new THREE.BoxGeometry(1, 0.35, 0.22), detailMat, -12, 1.6, z);
  } else if (id === 3) {
    const hull = mat(0x526477, 0.5, 0.7),
      metal = mat(0x263746, 0.6, 0.8),
      glow = new THREE.MeshStandardMaterial({
        color: 0x6feaff,
        emissive: 0x25c9ee,
        emissiveIntensity: 1.2,
        metalness: 0.35,
        roughness: 0.25,
      });
    for (const side of [-1, 1])
      for (let n = 0; n < 3; n++) {
        const x = side * 28,
          z = -38 + n * 18;
        silhouette(
          new THREE.CylinderGeometry(4.2, 4.2, 9, 16),
          hull,
          x,
          4.5,
          z,
        );
        silhouette(
          new THREE.CylinderGeometry(4.35, 4.35, 0.32, 16),
          glow,
          x,
          8.8,
          z,
        );
        for (let a = 0; a < 8; a++) {
          const ang = (a * Math.PI) / 4;
          silhouette(
            new THREE.BoxGeometry(0.18, 8, 0.18),
            metal,
            x + Math.cos(ang) * 4.1,
            4,
            z + Math.sin(ang) * 4.1,
          );
        }
      }
    for (let x = -24; x <= 24; x += 12) {
      silhouette(new THREE.CylinderGeometry(2, 2, 0.4, 20), metal, x, 0, -53);
      silhouette(new THREE.TorusGeometry(2.5, 0.12, 8, 24), glow, x, 0.4, -53);
      silhouette(new THREE.CylinderGeometry(0.1, 0.1, 9, 8), metal, x, 5, -53);
    }
    silhouette(
      new THREE.SphereGeometry(20, 24, 16),
      mat(0x203d65),
      0,
      8,
      -78,
      1,
      0.8,
      1,
    );
    for (let i = 0; i < 30; i++) {
      const x = ((i * 37) % 54) - 27,
        z = -45 - ((i * 23) % 37),
        y = 5 + ((i * 13) % 18);
      silhouette(new THREE.SphereGeometry(0.09, 6, 6), glow, x, y, z);
    }
  } else if (id === 4) {
    const hull = mat(0x15515a, 0.5, 0.55),
      glass = new THREE.MeshStandardMaterial({
        color: 0x368f91,
        emissive: 0x126666,
        emissiveIntensity: 0.7,
        metalness: 0.25,
        roughness: 0.2,
        transparent: true,
        opacity: 0.78,
      }),
      pipe = mat(0x49c9b7, 0.4, 0.6);
    for (const side of [-1, 1])
      for (let n = 0; n < 3; n++) {
        const x = side * 28,
          z = -38 + n * 18;
        silhouette(new THREE.CylinderGeometry(4.5, 4.5, 8, 20), hull, x, 4, z);
        silhouette(
          new THREE.SphereGeometry(
            4.25,
            20,
            12,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2,
          ),
          glass,
          x,
          8,
          z,
        );
        for (let a = 0; a < 5; a++) {
          const p = add(
            new THREE.CylinderGeometry(0.16, 0.16, 10, 8),
            pipe,
            x - 1.2 + a * 0.6,
            2,
            z + 4.2,
          );
          p.rotation.x = Math.PI / 2;
        }
      }
    silhouette(
      new THREE.BoxGeometry(100, 60, 1),
      new THREE.MeshBasicMaterial({
        color: 0x075564,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
      }),
      0,
      20,
      -75,
    );
    for (let i = 0; i < 36; i++) {
      const x = ((i * 19) % 58) - 29,
        z = -47 - ((i * 31) % 33),
        y = 1 + ((i * 17) % 16);
      silhouette(
        new THREE.SphereGeometry(0.08 + (i % 4) * 0.035, 6, 6),
        glass,
        x,
        y,
        z,
      );
    }
    for (let i = 0; i < 12; i++) {
      const x = (i % 2 ? 1 : -1) * (25 + (i % 3) * 2),
        z = -48 + Math.floor(i / 2) * 8;
      silhouette(
        new THREE.CylinderGeometry(0.3, 0.8, 6 + (i % 4), 8),
        detailMat,
        x,
        3,
        z,
      );
    }
  } else {
    const stone = mat(0x998866),
      cutStone = mat(0x625840),
      rune = new THREE.MeshStandardMaterial({
        color: 0x75d6aa,
        emissive: 0x237a57,
        emissiveIntensity: 0.85,
        roughness: 0.4,
      });
    for (const side of [-1, 1])
      for (let n = 0; n < 4; n++) {
        const x = side * 28,
          z = -43 + n * 15,
          h = 8 + (n % 2) * 4;
        silhouette(new THREE.BoxGeometry(4, h, 4), stone, x, h / 2, z);
        silhouette(
          new THREE.BoxGeometry(4.6, 0.45, 4.6),
          cutStone,
          x,
          h + 0.22,
          z,
        );
        silhouette(
          new THREE.BoxGeometry(0.16, h * 0.72, 0.12),
          rune,
          x,
          h * 0.5,
          z + 2.06,
        );
        silhouette(
          new THREE.BoxGeometry(7, 0.7, 3),
          stone,
          x - side * 3.5,
          h * 0.72,
          z,
        );
      }
    for (let x = -21; x <= 21; x += 14)
      for (let z = -43; z <= 17; z += 15) {
        silhouette(new THREE.BoxGeometry(5, 0.8, 5), cutStone, x, 0.4, z);
        silhouette(new THREE.BoxGeometry(3.2, 0.12, 3.2), rune, x, 0.86, z);
        silhouette(new THREE.BoxGeometry(0.15, 1.5, 0.15), stone, x, 1.5, z);
      }
    for (const side of [-1, 1]) {
      const x = side * 28;
      for (let n = 0; n < 4; n++) {
        const z = -41 + n * 16;
        silhouette(new THREE.BoxGeometry(2, 13, 2), stone, x, 6.5, z);
        silhouette(new THREE.BoxGeometry(3, 0.55, 3), cutStone, x, 13.3, z);
        silhouette(new THREE.BoxGeometry(8, 1, 2), stone, x - side * 3, 10, z);
      }
    }
    silhouette(new THREE.BoxGeometry(12, 1, 4), stone, 0, 11, -55);
    for (const x of [-5, 5])
      silhouette(new THREE.BoxGeometry(2, 10, 3), stone, x, 5, -55);
    silhouette(
      new THREE.TorusGeometry(5, 0.18, 8, 32),
      rune,
      0,
      7,
      -55,
      1,
      1,
      1,
      Math.PI / 2,
    );
  }
  return group;
}
