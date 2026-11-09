import * as THREE from "three";

export function createSpecialFlyovers(mat, scene) {
  function makeXWing() {
    const craft = new THREE.Group(),
      hullMat = mat(0xb8c3c6, 0.38, 0.68),
      panelMat = mat(0x65727a, 0.55, 0.62),
      accentMat = mat(0x9e372e, 0.48, 0.38),
      canopyMat = new THREE.MeshStandardMaterial({
        color: 0x70c6d4,
        emissive: 0x1c7189,
        emissiveIntensity: 0.65,
        roughness: 0.16,
        metalness: 0.34,
      }),
      engineGlow = new THREE.MeshBasicMaterial({ color: 0x6ddfff });
    const part = (geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, rz);
      mesh.castShadow = true;
      craft.add(mesh);
      return mesh;
    };
    const hull = part(
      new THREE.CylinderGeometry(0.22, 0.34, 4.2, 14),
      hullMat,
      0,
      0,
      0,
      Math.PI / 2,
    );
    hull.rotation.x = Math.PI / 2;
    const nose = part(
      new THREE.ConeGeometry(0.23, 1.15, 14),
      hullMat,
      0,
      0,
      -2.55,
      -Math.PI / 2,
    );
    part(
      new THREE.SphereGeometry(0.34, 16, 12),
      canopyMat,
      0,
      0.25,
      -0.9,
      0,
      0,
      0,
    );
    part(new THREE.BoxGeometry(0.12, 0.58, 0.68), panelMat, 0, 0.36, 1.55);
    for (const side of [-1, 1]) {
      for (const foil of [-1, 1]) {
        const wing = part(
          new THREE.BoxGeometry(2.55, 0.075, 0.62),
          foil === 1 ? hullMat : panelMat,
          side * 1.12,
          foil * 0.24,
          foil * 0.37,
          0,
          side * foil * 0.48,
        );
        wing.scale.x = 1;
        part(
          new THREE.BoxGeometry(0.72, 0.11, 0.045),
          accentMat,
          side * 1.58,
          foil * 0.285,
          foil * 0.56,
          0,
          side * foil * 0.48,
        );
        const engine = part(
          new THREE.CylinderGeometry(0.15, 0.19, 1.22, 12),
          panelMat,
          side * 0.84,
          foil * 0.24,
          0.82 + foil * 0.37,
          Math.PI / 2,
        );
        engine.rotation.x = Math.PI / 2;
        part(
          new THREE.CylinderGeometry(0.13, 0.13, 0.08, 12),
          engineGlow,
          side * 0.84,
          foil * 0.24,
          1.48 + foil * 0.37,
          Math.PI / 2,
        );
        part(
          new THREE.CylinderGeometry(0.035, 0.035, 0.66, 8),
          accentMat,
          side * 2.38,
          foil * 0.26,
          foil * 0.92,
          Math.PI / 2,
        );
      }
    }
    craft.scale.setScalar(2);
    return craft;
  }
  function makeNuclearSubmarine() {
    const craft = new THREE.Group(),
      hullMat = mat(0x263a3c, 0.55, 0.72),
      deckMat = mat(0x53605d, 0.62, 0.6),
      sailMat = mat(0x344749, 0.5, 0.7),
      propMat = mat(0x94a19a, 0.4, 0.72);
    const part = (geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, rz);
      mesh.castShadow = true;
      craft.add(mesh);
      return mesh;
    };
    const pressureHull = part(
      new THREE.SphereGeometry(1, 28, 18),
      hullMat,
      0,
      0,
      0,
    );
    pressureHull.scale.set(1.08, 0.92, 4.8);
    part(
      new THREE.ConeGeometry(0.95, 2.4, 20),
      hullMat,
      0,
      0,
      -4.55,
      -Math.PI / 2,
    );
    part(new THREE.BoxGeometry(1.15, 1.35, 1.8), sailMat, 0, 0.9, -0.3);
    part(new THREE.BoxGeometry(0.17, 1.5, 1.2), deckMat, 0, 1.88, -0.15);
    part(new THREE.BoxGeometry(2.7, 0.12, 0.58), deckMat, 0, -0.08, 1.15);
    for (const side of [-1, 1]) {
      part(
        new THREE.BoxGeometry(2.2, 0.13, 0.55),
        deckMat,
        side * 1.02,
        -0.12,
        3.48,
        0,
        side * 0.2,
      );
      part(
        new THREE.BoxGeometry(1.55, 0.12, 0.5),
        deckMat,
        side * 0.95,
        -0.08,
        -3.5,
        0,
        -side * 0.16,
      );
      for (let port = 0; port < 3; port++)
        part(
          new THREE.CylinderGeometry(0.085, 0.085, 0.12, 8),
          propMat,
          side * 0.42,
          -0.18,
          -2.35 + port * 0.55,
          Math.PI / 2,
        );
    }
    const propeller = part(
      new THREE.CylinderGeometry(0.12, 0.12, 0.32, 8),
      propMat,
      0,
      0,
      4.72,
      Math.PI / 2,
    );
    propeller.rotation.x = Math.PI / 2;
    craft.scale.setScalar(1.5);
    return craft;
  }
  const xWingLeader = makeXWing(),
    xWingWingman = makeXWing(),
    nuclearSubmarine = makeNuclearSubmarine();
  scene.add(xWingLeader, xWingWingman, nuclearSubmarine);
  const xWingFleet = [xWingLeader, xWingWingman],
    underwaterFleet = [nuclearSubmarine];
  for (const craft of [...xWingFleet, ...underwaterFleet])
    craft.visible = false;
  return { xWingFleet, underwaterFleet };
}
