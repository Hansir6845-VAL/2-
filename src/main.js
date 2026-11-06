import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  armStyles,
  makeOperatorModel,
  operatorNames,
} from "./player/operatorModels.js";
import { buildVisualMapVariant } from "./maps/visualVariants.js";

// Core scene and input
const app = document.querySelector("#app");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x91a29b);
scene.fog = new THREE.FogExp2(0x93a49e, 0.0125);
const camera = new THREE.PerspectiveCamera(
  76,
  innerWidth / innerHeight,
  0.08,
  220,
);
camera.position.set(0, 1.72, 13);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);
const controls = new PointerLockControls(camera, document.body);
controls.pointerSpeed = 0.72;
// Pointer lock is blocked by some embedded browsers. Keep the game playable there
// with captured mouse movement while preserving PointerLockControls on desktop.
let gameStarted = false,
  dragLook = false,
  lastPointerX = 0,
  lastPointerY = 0;
function startGame() {
  if (gameStarted) return;
  gameStarted = true;
  document.querySelector("#start").style.display = "none";
  if (stageState === "ready") startStage();
}
function gameActive() {
  return gameStarted && !dead;
}
function requestPointerLock() {
  startGame();
  try {
    const result = controls.lock();
    if (result && typeof result.catch === "function")
      result.catch((err) => {
        console.warn("Pointer lock unavailable; using drag look.", err);
        notify("鼠标锁定不可用　·　按住鼠标拖动视角");
      });
  } catch (err) {
    console.warn("Pointer lock unavailable; using drag look.", err);
    notify("鼠标锁定不可用　·　按住鼠标拖动视角");
  }
}
controls.addEventListener("lock", startGame);
controls.addEventListener("unlock", () => {
  if (!gameStarted) return;
  document.querySelector("#start").style.display = "none";
  document.body.classList.remove("aim");
  aim = false;
  dragLook = false;
});
document.addEventListener("mousemove", (e) => {
  if (controls.isLocked || !dragLook) return;
  const dx = e.clientX - lastPointerX,
    dy = e.clientY - lastPointerY;
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;
  camera.rotation.order = "YXZ";
  camera.rotation.y -= dx * 0.0022;
  camera.rotation.x = Math.max(
    -Math.PI / 2,
    Math.min(Math.PI / 2, camera.rotation.x - dy * 0.0022),
  );
});
// First-person weapons and character hands
const viewmodel = new THREE.Group();
camera.add(viewmodel);
scene.add(camera);
viewmodel.position.set(0.34, -0.31, -0.58);
const slots = {};
const vmMat = (c, r = 0.45, m = 0.55) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const carbon = vmMat(0x1c292b),
  alloy = vmMat(0x46595a),
  polymer = vmMat(0x121c1d, 0.75, 0.1),
  teal = vmMat(0x50cbb5, 0.32, 0.2),
  glove = vmMat(0x273e3b, 0.85, 0.05),
  sleeve = vmMat(0xc0c2ad, 0.8, 0.05);
function vmBox(x, y, z, sx, sy, sz, m) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
  o.position.set(x, y, z);
  viewmodel.add(o);
  return o;
}
function vmRound(x, y, z, r, h, m) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), m);
  o.rotation.x = Math.PI / 2;
  o.position.set(x, y, z);
  viewmodel.add(o);
  return o;
}
// Detailed VX-9 first-person receiver, handguard, optic, rails, magazine, stock and gloved arms.
vmBox(0, 0, 0, 0.14, 0.13, 0.46, alloy);
vmBox(0, 0.02, -0.19, 0.2, 0.16, 0.23, carbon);
vmBox(0, -0.035, 0.34, 0.065, 0.065, 0.37, alloy);
const primaryMagazineMesh = vmBox(0, -0.12, -0.08, 0.105, 0.26, 0.13, polymer);
vmBox(0, 0.11, -0.06, 0.075, 0.075, 0.12, teal);
vmBox(0, 0.13, -0.24, 0.19, 0.045, 0.22, carbon);
vmBox(0, 0.08, 0.12, 0.11, 0.05, 0.25, carbon);
vmBox(0, 0.145, 0.08, 0.17, 0.025, 0.04, alloy);
vmBox(0, 0.2, -0.08, 0.07, 0.08, 0.17, carbon);
vmBox(0, 0.245, -0.08, 0.035, 0.04, 0.13, teal);
vmRound(0, 0.265, -0.08, 0.065, 0.018, carbon);
for (const x of [-0.085, 0.085])
  for (let z = -0.3; z <= 0.24; z += 0.12)
    vmBox(x, 0.03, z, 0.018, 0.02, 0.025, alloy);
slots.secondary = new THREE.Group();
slots.secondary.visible = false;
viewmodel.add(slots.secondary);
slots.melee = new THREE.Group();
slots.melee.visible = false;
viewmodel.add(slots.melee);
slots.primary = new THREE.Group();
viewmodel.add(slots.primary);
for (const o of [...viewmodel.children])
  if (o !== slots.primary && o !== slots.secondary && o !== slots.melee)
    slots.primary.add(o);
const primaryBolt = new THREE.Group();
const primaryBoltBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.075, 0.027, 0.12),
  alloy,
);
primaryBoltBody.position.set(0, 0.08, -0.13);
primaryBolt.add(primaryBoltBody);
const primaryBoltHandle = new THREE.Mesh(
  new THREE.BoxGeometry(0.035, 0.045, 0.035),
  carbon,
);
primaryBoltHandle.position.set(0.055, 0.075, -0.11);
primaryBolt.add(primaryBoltHandle);
slots.primary.add(primaryBolt);
const primaryBoltBaseZ = primaryBolt.position.z;
// Gold-and-black assault rifle with a suppressor, carry handle, extended magazine,
// and a small blue crystal energy shroud inspired by the supplied weapon reference.
const rifleGold = vmMat(0xc59a38, 0.28, 0.78),
  rifleGoldLight = vmMat(0xf0ce68, 0.24, 0.72),
  rifleBlack = vmMat(0x15191b, 0.48, 0.46),
  rifleBlue = vmMat(0x147ea1, 0.3, 0.52),
  rifleCrystal = new THREE.MeshStandardMaterial({
    color: 0x8eeeff,
    emissive: 0x19a9ff,
    emissiveIntensity: 1.8,
    metalness: 0.28,
    roughness: 0.18,
  });
function riflePart(
  parent,
  geometry,
  material,
  x,
  y,
  z,
  rx = 0,
  ry = 0,
  rz = 0,
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
riflePart(
  slots.primary,
  new THREE.BoxGeometry(0.22, 0.15, 0.38),
  rifleGold,
  0,
  0.015,
  -0.035,
);
riflePart(
  slots.primary,
  new THREE.BoxGeometry(0.205, 0.045, 0.31),
  rifleBlack,
  0,
  0.105,
  -0.045,
);
riflePart(
  slots.primary,
  new THREE.BoxGeometry(0.205, 0.035, 0.25),
  rifleGoldLight,
  0,
  0.14,
  -0.07,
);
riflePart(
  slots.primary,
  new THREE.BoxGeometry(0.19, 0.16, 0.26),
  rifleBlue,
  0,
  -0.015,
  -0.24,
);
// Upper carry handle, rear stock and angled pistol grip give the silhouette a clear AR profile.
riflePart(
  slots.primary,
  new THREE.BoxGeometry(0.22, 0.035, 0.23),
  rifleGold,
  0,
  0.235,
  -0.055,
);
for (const side of [-1, 1])
  riflePart(
    slots.primary,
    new THREE.BoxGeometry(0.035, 0.13, 0.045),
    rifleGold,
    side * 0.09,
    0.185,
    -0.055,
  );
riflePart(
  slots.primary,
  new THREE.BoxGeometry(0.17, 0.12, 0.3),
  rifleBlack,
  0,
  0.015,
  0.28,
);
riflePart(
  slots.primary,
  new THREE.BoxGeometry(0.15, 0.08, 0.2),
  rifleGold,
  0,
  0.02,
  0.4,
);
riflePart(
  slots.primary,
  new THREE.BoxGeometry(0.105, 0.2, 0.12),
  rifleBlue,
  0.02,
  -0.16,
  -0.01,
  0,
  0,
  -0.16,
);
// Suppressor and front rail.
const rifleBarrel = riflePart(
  slots.primary,
  new THREE.CylinderGeometry(0.027, 0.027, 0.48, 16),
  rifleBlack,
  0,
  0.015,
  -0.48,
  Math.PI / 2,
);
riflePart(
  slots.primary,
  new THREE.CylinderGeometry(0.052, 0.052, 0.36, 18),
  rifleGold,
  0,
  0.015,
  -0.61,
  Math.PI / 2,
);
riflePart(
  slots.primary,
  new THREE.CylinderGeometry(0.055, 0.055, 0.035, 18),
  rifleGoldLight,
  0,
  0.015,
  -0.81,
  Math.PI / 2,
);
for (let z = -0.36; z <= -0.13; z += 0.055)
  riflePart(
    slots.primary,
    new THREE.BoxGeometry(0.235, 0.018, 0.018),
    rifleGoldLight,
    0,
    0.115,
    z,
  );
const primaryMagVisual = new THREE.Group();
primaryMagVisual.position.set(0, -0.12, -0.08);
slots.primary.add(primaryMagVisual);
riflePart(
  primaryMagVisual,
  new THREE.BoxGeometry(0.115, 0.29, 0.13),
  rifleBlack,
  0,
  -0.08,
  0,
  0,
  0,
  0.08,
);
riflePart(
  primaryMagVisual,
  new THREE.BoxGeometry(0.08, 0.26, 0.012),
  rifleGold,
  0,
  -0.08,
  0.068,
  0,
  0,
  0.08,
);
for (let y = -0.18; y < 0.03; y += 0.055)
  riflePart(
    primaryMagVisual,
    new THREE.BoxGeometry(0.065, 0.012, 0.014),
    rifleGoldLight,
    0,
    y,
    0.078,
  );
const primaryCrystalGroup = new THREE.Group();
primaryCrystalGroup.position.set(0, 0.02, -0.36);
slots.primary.add(primaryCrystalGroup);
for (let i = 0; i < 7; i++) {
  const a = (i * Math.PI * 2) / 7,
    shard = riflePart(
      primaryCrystalGroup,
      new THREE.OctahedronGeometry(0.09 + (i % 3) * 0.018),
      rifleCrystal,
      Math.cos(a) * 0.105,
      Math.sin(a) * 0.095,
      Math.sin(a * 2) * 0.035,
      0,
      0,
      (i % 2) * 0.3,
    );
  shard.scale.set(0.7, 1.8, 0.68);
}
const primaryEnergyLight = new THREE.PointLight(0x38caff, 1.7, 1.8, 2);
primaryEnergyLight.position.set(0, 0.04, -0.4);
slots.primary.add(primaryEnergyLight);
const secBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.28), alloy);
secBody.position.set(0, 0, 0);
slots.secondary.add(secBody);
const secGrip = new THREE.Mesh(
  new THREE.BoxGeometry(0.09, 0.16, 0.14),
  polymer,
);
secGrip.position.set(0.01, -0.03, -0.17);
slots.secondary.add(secGrip);
const secondaryMagazineMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.065, 0.1, 0.08),
  carbon,
);
secondaryMagazineMesh.position.set(0.01, -0.105, -0.17);
slots.secondary.add(secondaryMagazineMesh);
const secSlide = new THREE.Mesh(
  new THREE.BoxGeometry(0.08, 0.04, 0.12),
  carbon,
);
secSlide.position.set(0, 0.07, -0.03);
slots.secondary.add(secSlide);
const secSlideBaseZ = secSlide.position.z;
// Custom cyan-blue and gold sidearm based on the supplied compact pistol.
const pistolBlue = vmMat(0x087da5, 0.3, 0.48),
  pistolGold = vmMat(0xd7ad3f, 0.28, 0.68),
  pistolBlack = vmMat(0x202629, 0.52, 0.42),
  pistolGlow = new THREE.MeshStandardMaterial({
    color: 0x7eefff,
    emissive: 0x14b9ff,
    emissiveIntensity: 1.35,
    metalness: 0.28,
    roughness: 0.2,
  });
secBody.material = pistolBlue;
secGrip.material = pistolBlue;
secondaryMagazineMesh.material = pistolBlack;
secSlide.material = pistolBlack;
riflePart(
  slots.secondary,
  new THREE.BoxGeometry(0.19, 0.13, 0.34),
  pistolBlue,
  0,
  0.015,
  -0.015,
);
riflePart(
  slots.secondary,
  new THREE.BoxGeometry(0.195, 0.035, 0.3),
  pistolBlack,
  0,
  0.09,
  -0.02,
);
riflePart(
  slots.secondary,
  new THREE.BoxGeometry(0.19, 0.018, 0.24),
  pistolGold,
  0,
  0.113,
  -0.03,
);
riflePart(
  slots.secondary,
  new THREE.BoxGeometry(0.11, 0.045, 0.14),
  pistolGlow,
  0,
  0.13,
  -0.1,
);
riflePart(
  slots.secondary,
  new THREE.CylinderGeometry(0.026, 0.026, 0.22, 12),
  pistolBlack,
  0,
  0.015,
  -0.27,
  Math.PI / 2,
);
riflePart(
  slots.secondary,
  new THREE.CylinderGeometry(0.04, 0.04, 0.045, 14),
  pistolGold,
  0,
  0.015,
  -0.38,
  Math.PI / 2,
);
riflePart(
  slots.secondary,
  new THREE.BoxGeometry(0.105, 0.18, 0.13),
  pistolBlue,
  0.012,
  -0.09,
  -0.16,
  0,
  0,
  -0.15,
);
riflePart(
  slots.secondary,
  new THREE.BoxGeometry(0.11, 0.24, 0.07),
  pistolBlue,
  0.01,
  -0.2,
  -0.16,
  0,
  0,
  -0.18,
);
riflePart(
  slots.secondary,
  new THREE.BoxGeometry(0.12, 0.018, 0.09),
  pistolGold,
  0.012,
  -0.18,
  -0.12,
  0,
  0,
  -0.18,
);
for (let i = 0; i < 4; i++)
  riflePart(
    slots.secondary,
    new THREE.BoxGeometry(0.09, 0.012, 0.045),
    pistolGold,
    0.012,
    -0.11 - i * 0.045,
    -0.117,
    0,
    0,
    -0.18,
  );
riflePart(
  slots.secondary,
  new THREE.TorusGeometry(0.064, 0.012, 8, 18),
  pistolGold,
  0.035,
  -0.092,
  -0.015,
  0,
  0,
  0,
);
riflePart(
  slots.secondary,
  new THREE.BoxGeometry(0.025, 0.09, 0.02),
  pistolBlack,
  0.035,
  -0.05,
  -0.005,
  0,
  0,
  -0.16,
);
riflePart(
  slots.secondary,
  new THREE.BoxGeometry(0.055, 0.016, 0.02),
  pistolGold,
  -0.07,
  0.105,
  -0.01,
);
const characterArmSets = [];
function buildGlovedHand(parent, side, mat) {
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 12), mat);
  palm.position.set(side * 0.135, -0.095, -0.005);
  palm.scale.set(1, 0.68, 1.18);
  parent.add(palm);
  const lengths = [0.105, 0.132, 0.12, 0.098],
    spreads = [-0.045, -0.015, 0.018, 0.05];
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.018, 0.055, 4, 8),
      mat,
    );
    finger.position.set(side * 0.135 + spreads[i], -0.105, -0.085 - i * 0.006);
    finger.rotation.x = -0.24 + i * 0.09;
    finger.rotation.z = (i - 1.5) * 0.09;
    finger.scale.y = lengths[i] / 0.091;
    parent.add(finger);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 6), mat);
    tip.position.set(side * 0.135 + spreads[i], -0.105, -0.145 - i * 0.006);
    parent.add(tip);
  }
  const thumb = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.022, 0.065, 4, 8),
    mat,
  );
  thumb.position.set(side * 0.135 - side * 0.085, -0.075, -0.025);
  thumb.rotation.z = -side * 0.74;
  thumb.rotation.x = -0.36;
  parent.add(thumb);
  const thumbTip = new THREE.Mesh(new THREE.SphereGeometry(0.019, 8, 6), mat);
  thumbTip.position.set(side * 0.135 - side * 0.12, -0.03, -0.075);
  parent.add(thumbTip);
}
for (let style = 0; style < 5; style++) {
  const colors = armStyles[style],
    arms = new THREE.Group(),
    sleeveMat = vmMat(colors.sleeve, 0.8, 0.08),
    gloveMat = vmMat(colors.glove, 0.88, 0.02),
    trimMat = vmMat(colors.trim, 0.4, 0.45),
    plateMat = vmMat(colors.plate, 0.55, 0.2);
  for (const side of [-1, 1]) {
    const forearm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.072, 0.23, 4, 10),
      sleeveMat,
    );
    forearm.position.set(side * 0.235, -0.155, 0.1);
    forearm.rotation.z = -side * 0.15;
    arms.add(forearm);
    const cuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.078, 0.018, 8, 16),
      trimMat,
    );
    cuff.position.set(side * 0.22, -0.045, 0.09);
    cuff.rotation.x = Math.PI / 2;
    arms.add(cuff);
    buildGlovedHand(arms, side, gloveMat);
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.105, 0.14, 0.035),
      plateMat,
    );
    plate.position.set(side * 0.235, -0.18, 0.168);
    plate.rotation.z = -side * 0.15;
    arms.add(plate);
    if (style === 2)
      for (let n = 0; n < 3; n++) {
        const round = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.018, 0.065, 8),
          trimMat,
        );
        round.rotation.z = Math.PI / 2;
        round.position.set(side * 0.235, -0.12 + n * 0.045, 0.194);
        arms.add(round);
      }
  }
  arms.visible = style === 0;
  viewmodel.add(arms);
  characterArmSets.push(arms);
}
const weaponReady = { secondary: true, melee: true };
// Curved karambit with a stonewashed steel hook, three blade holes, saw spine,
// light wood scales, rivets and a finger ring matching the supplied knife reference.
const knifeSteel = vmMat(0x68777c, 0.38, 0.76),
  knifeEdge = vmMat(0xaeb8b6, 0.3, 0.8),
  knifeDark = vmMat(0x31393b, 0.55, 0.5),
  knifeWood = vmMat(0xb7a17a, 0.68, 0.12),
  knifeRivet = vmMat(0xd0ba83, 0.3, 0.68);
const knifeBladeShape = new THREE.Shape();
knifeBladeShape.moveTo(0.02, 0.055);
knifeBladeShape.quadraticCurveTo(-0.06, 0.2, -0.2, 0.31);
knifeBladeShape.quadraticCurveTo(-0.42, 0.5, -0.58, 0.61);
knifeBladeShape.quadraticCurveTo(-0.62, 0.4, -0.46, 0.22);
knifeBladeShape.quadraticCurveTo(-0.3, 0.07, -0.16, -0.055);
knifeBladeShape.quadraticCurveTo(-0.05, -0.02, 0.02, 0.055);
const knifeBlade = new THREE.Mesh(
  new THREE.ExtrudeGeometry(knifeBladeShape, {
    depth: 0.035,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.012,
    bevelThickness: 0.01,
  }),
  knifeSteel,
);
knifeBlade.position.z = -0.018;
knifeBlade.castShadow = true;
knifeBlade.receiveShadow = true;
slots.melee.add(knifeBlade);
const knifeSpineCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.01, 0.08, 0.036),
  new THREE.Vector3(-0.16, 0.28, 0.036),
  new THREE.Vector3(-0.37, 0.46, 0.036),
  new THREE.Vector3(-0.58, 0.61, 0.036),
]);
const knifeSpine = new THREE.Mesh(
  new THREE.TubeGeometry(knifeSpineCurve, 18, 0.016, 6, false),
  knifeEdge,
);
slots.melee.add(knifeSpine);
for (let i = 0; i < 3; i++) {
  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.012, 16),
    knifeDark,
  );
  hole.rotation.x = Math.PI / 2;
  hole.position.set(-0.17 - i * 0.065, 0.27 + i * 0.055, 0.045);
  slots.melee.add(hole);
}
for (let i = 0; i < 5; i++) {
  const toothShape = new THREE.Shape();
  const x = -0.16 - i * 0.055,
    y = 0.31 + i * 0.047;
  toothShape.moveTo(x, y);
  toothShape.lineTo(x - 0.042, y + 0.052);
  toothShape.lineTo(x - 0.012, y - 0.02);
  toothShape.closePath();
  const tooth = new THREE.Mesh(
    new THREE.ExtrudeGeometry(toothShape, {
      depth: 0.018,
      bevelEnabled: false,
    }),
    knifeEdge,
  );
  tooth.position.z = 0.023;
  slots.melee.add(tooth);
}
const knifeHandleShape = new THREE.Shape();
knifeHandleShape.moveTo(0.025, 0.07);
knifeHandleShape.quadraticCurveTo(0.15, 0.02, 0.22, -0.12);
knifeHandleShape.lineTo(0.38, -0.34);
knifeHandleShape.quadraticCurveTo(0.47, -0.46, 0.38, -0.56);
knifeHandleShape.quadraticCurveTo(0.28, -0.66, 0.18, -0.57);
knifeHandleShape.quadraticCurveTo(0.1, -0.49, 0.19, -0.39);
knifeHandleShape.lineTo(0.06, -0.19);
knifeHandleShape.quadraticCurveTo(-0.04, -0.03, 0.025, 0.07);
const knifeHandle = new THREE.Mesh(
  new THREE.ExtrudeGeometry(knifeHandleShape, {
    depth: 0.085,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.012,
    bevelThickness: 0.012,
  }),
  knifeWood,
);
knifeHandle.position.z = -0.045;
knifeHandle.castShadow = true;
slots.melee.add(knifeHandle);
const knifeRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.092, 0.022, 10, 22),
  knifeDark,
);
knifeRing.position.set(0.34, -0.52, 0.01);
slots.melee.add(knifeRing);
for (const [x, y] of [
  [0.095, -0.08],
  [0.18, -0.22],
  [0.29, -0.39],
]) {
  const rivet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.012, 12),
    knifeRivet,
  );
  rivet.rotation.x = Math.PI / 2;
  rivet.position.set(x, y, 0.051);
  slots.melee.add(rivet);
}
scene.add(new THREE.HemisphereLight(0xc9e4dc, 0x2a3532, 2.1));
// Lighting and aircraft flyovers
const sun = new THREE.DirectionalLight(0xffe0b8, 3);
sun.position.set(-14, 25, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -48;
sun.shadow.camera.right = 48;
sun.shadow.camera.top = 48;
sun.shadow.camera.bottom = -48;
scene.add(sun);
// Lightweight procedural fighter jet used for a fly-by at the beginning of each stage.
const fighter = new THREE.Group(),
  jetBodyMat = new THREE.MeshStandardMaterial({
    color: 0x39484a,
    metalness: 0.68,
    roughness: 0.38,
  }),
  jetEdgeMat = new THREE.MeshStandardMaterial({
    color: 0x91a8a4,
    metalness: 0.72,
    roughness: 0.3,
  }),
  jetGlassMat = new THREE.MeshStandardMaterial({
    color: 0x4fc1c3,
    emissive: 0x124b55,
    metalness: 0.3,
    roughness: 0.18,
  });
function jetPart(geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  m.receiveShadow = true;
  fighter.add(m);
  return m;
}
const jetFuselage = jetPart(
  new THREE.CylinderGeometry(0.2, 0.34, 4.4, 14),
  jetBodyMat,
  0,
  0,
  0,
);
jetFuselage.rotation.x = Math.PI / 2;
const jetNose = jetPart(
  new THREE.ConeGeometry(0.2, 0.95, 14),
  jetEdgeMat,
  0,
  0,
  -2.65,
);
jetNose.rotation.x = -Math.PI / 2;
jetPart(new THREE.BoxGeometry(6.2, 0.12, 0.92), jetBodyMat, 0, -0.08, 0.15);
jetPart(new THREE.BoxGeometry(2.1, 0.12, 0.75), jetEdgeMat, 0, 0.05, 1.72);
jetPart(new THREE.BoxGeometry(0.12, 0.75, 0.7), jetBodyMat, 0, 0.39, 1.72);
jetPart(
  new THREE.SphereGeometry(0.28, 16, 12),
  jetGlassMat,
  0,
  0.2,
  -0.85,
  1.15,
  0.65,
  1.9,
);
for (const s of [-1, 1]) {
  const engine = jetPart(
    new THREE.CylinderGeometry(0.17, 0.22, 0.72, 12),
    jetEdgeMat,
    s * 0.38,
    -0.05,
    1.98,
  );
  engine.rotation.x = Math.PI / 2;
  const exhaust = jetPart(
    new THREE.CylinderGeometry(0.12, 0.15, 0.12, 12),
    new THREE.MeshBasicMaterial({ color: 0x83e4ff }),
    s * 0.38,
    -0.05,
    2.4,
  );
  exhaust.rotation.x = Math.PI / 2;
  jetPart(
    new THREE.BoxGeometry(0.75, 0.08, 0.35),
    jetBodyMat,
    s * 0.95,
    -0.16,
    1.55,
  );
}
fighter.visible = false;
scene.add(fighter);
const fighterWingman = fighter.clone(true);
fighterWingman.visible = false;
scene.add(fighterWingman);
const aircraft = [fighter, fighterWingman];
let activeAircraft = [];
function startFlyover() {
  activeAircraft = [...aircraft];
  fighter.position.set(-62, 20, -18);
  fighter.userData.flightBaseY = 20;
  fighter.rotation.set(0, -Math.PI / 2, 0);
  fighter.visible = true;
  fighterWingman.position.set(-78, 23, -24);
  fighterWingman.userData.flightBaseY = 23;
  fighterWingman.rotation.set(0, -Math.PI / 2, 0);
  fighterWingman.visible = true;
}
let treeSkillAction = null,
  treeVisualGroup = null,
  treeVisualExpires = 0,
  treeSkillReady = false,
  headshotPendingAt = 0,
  headshotPending = false,
  headshotIconTimer = 0;
// Shared gameplay state and collision helpers
const bloodEffects = [],
  debrisEffects = [],
  destroyedColliders = new Set(),
  hiddenStageMeshes = new Map();
const mat = (color, roughness = 0.8, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const buildings = [],
  stageMapGroups = [],
  stageObstacleSets = [];
let obstacles = [],
  mapBuildGroup = new THREE.Group();
scene.add(mapBuildGroup);
function addObstacle(
  mesh,
  {
    x,
    z,
    radius = 0.8,
    top = 1.6,
    climb = false,
    halfX = null,
    halfZ = null,
  } = {},
) {
  obstacles.push({ mesh, x, z, radius, top, climb, halfX, halfZ });
  return mesh;
}
function obstacleContains(o, x, z, r = 0) {
  if (o.halfX != null)
    return Math.abs(x - o.x) < o.halfX + r && Math.abs(z - o.z) < o.halfZ + r;
  return Math.hypot(x - o.x, z - o.z) < o.radius + r;
}
function blockingObstacleAt(x, z, feet, r = 0.34, height = 1.72) {
  for (const o of obstacles) {
    if (destroyedColliders.has(o)) continue;
    const vertical = feet < o.top - 0.025 && feet + height > 0.04;
    if (vertical && obstacleContains(o, x, z, r)) return o;
  }
  return null;
}
function blockedAt(x, z, feet, r = 0.34, height = 1.72) {
  return !!blockingObstacleAt(x, z, feet, r, height);
}
function roofAt(x, z, r = 0.25) {
  let roof = null;
  for (const o of obstacles)
    if (
      !destroyedColliders.has(o) &&
      o.climb &&
      obstacleContains(o, x, z, r) &&
      (!roof || o.top > roof.top)
    )
      roof = o;
  return roof;
}
function findFreePoint(x, z, r = 0.5) {
  if (!blockedAt(x, z, 0, r, 1.95) && !roofAt(x, z, r))
    return new THREE.Vector3(x, 0, z);
  for (let ring = 1; ring < 24; ring++)
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12,
        px = x + Math.cos(a) * ring * 0.65,
        pz = z + Math.sin(a) * ring * 0.65;
      if (!blockedAt(px, pz, 0, r, 1.95) && !roofAt(px, pz, r))
        return new THREE.Vector3(px, 0, pz);
    }
  return new THREE.Vector3(0, 0, 13);
}
const basePropGroup = mapBuildGroup;
new GLTFLoader().load(
  "/assets/barrel01/Barrel_01_1k.gltf",
  (g) => {
    const model = g.scene;
    model.scale.setScalar(0.002);
    model.rotation.y = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const c = model.clone(true);
      c.position.set(-10 + (i % 4) * 6, 0.02, 4 - Math.floor(i / 4) * 10);
      basePropGroup.add(c);
    }
  },
  undefined,
  () =>
    console.warn(
      "Optional CC0 barrel model did not load; procedural props remain active.",
    ),
);
const concrete = mat(0x687875),
  dark = mat(0x29383a),
  metal = mat(0x455758, 0.43, 0.65),
  rust = mat(0x765c48),
  glass = new THREE.MeshStandardMaterial({
    color: 0x9edbd0,
    emissive: 0x244a46,
    roughness: 0.2,
    metalness: 0.3,
  }),
  groundmat = mat(0x62695d);
function box(x, y, z, sx, sy, sz, m, shadow = true) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
  o.position.set(x, y, z);
  o.castShadow = shadow;
  o.receiveShadow = true;
  if (
    m === dark ||
    m === rust ||
    m === metal ||
    m === concrete ||
    m === groundmat
  )
    o.userData.blocksShots = true;
  mapBuildGroup.add(o);
  return o;
}
// A compact industrial harbor yard with layered silhouettes, cover, lighting and readable lanes.
box(0, -0.3, 0, 100, 0.6, 100, groundmat);
for (let i = 0; i < 18; i++) {
  let x = ((i % 6) - 2.5) * 8,
    z = -20 - Math.floor(i / 6) * 13;
  let h = 2.5 + ((i * 7) % 5) * 0.72;
  obstacles.push({
    x,
    z,
    halfX: 3.25,
    halfZ: 2.75,
    top: h,
    building: true,
    climb: true,
  });
  box(x, h / 2, z, 6, h, 5, i % 3 === 0 ? rust : concrete);
  box(x, h + 0.08, z, 6.15, 0.16, 5.15, dark, false);
  for (let wy = 1.2; wy < h - 0.4; wy += 1.3)
    for (let wx = -1.8; wx <= 1.9; wx += 1.8)
      box(x + wx, wy, z + 2.53, 0.72, 0.42, 0.045, glass, false);
}
// side warehouses and a distant gantry frame the shooting corridor
for (const side of [-1, 1]) {
  obstacles.push({
    x: side * 19,
    z: -12,
    halfX: 0.7,
    halfZ: 27.8,
    top: 8,
    building: true,
    climb: true,
  });
  box(side * 19, 4, -12, 1, 8, 55, dark);
  for (let z = -35; z < 15; z += 7) {
    box(side * 18.35, 2.7, z, 1.2, 0.18, 0.2, metal, false);
    box(side * 18.35, 5.8, z, 1.2, 0.18, 0.2, metal, false);
  }
  for (let i = 0; i < 5; i++) {
    const gx = side * (9 + (i % 2) * 2),
      gz = 5 - i * 9;
    obstacles.push({
      x: gx,
      z: gz,
      halfX: 1.1,
      halfZ: 1.1,
      top: 2.46,
      building: true,
      climb: true,
    });
    box(gx, 1.15, gz, 2.2, 2.3, 2.2, i % 2 ? dark : rust);
    box(gx, 2.38, gz, 2.35, 0.16, 2.35, metal);
  }
}
// road markings, drainage, cable spools, pallet stacks and barricades
for (let z = -42; z < 24; z += 8) {
  box(-1.8, 0.015, z, 0.12, 0.025, 3.2, mat(0xd8b76a), false);
  box(1.8, 0.015, z, 0.12, 0.025, 3.2, mat(0xd8b76a), false);
}
for (let i = 0; i < 10; i++) {
  const x = (i % 2 ? 1 : -1) * (5.5 + (i % 3) * 1.3),
    z = 8 - Math.floor(i / 2) * 8;
  const pallet = box(x, 0.18, z, 2.5, 0.36, 1.4, rust);
  addObstacle(pallet, {
    x,
    z,
    radius: 1.35,
    halfX: 1.3,
    halfZ: 0.8,
    top: 0.36,
    climb: true,
  });
  for (let j = -2; j <= 2; j++)
    box(x + j * 0.47, 0.4, z, 0.08, 0.1, 1.4, metal, false);
}
function cylinder(x, y, z, r, h, m, rx = 0) {
  let o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), m);
  o.position.set(x, y, z);
  o.rotation.x = rx;
  o.castShadow = true;
  o.receiveShadow = true;
  if (m === dark || m === rust || m === metal || m === concrete)
    o.userData.blocksShots = true;
  mapBuildGroup.add(o);
  return o;
}
for (let i = 0; i < 7; i++) {
  const x = -12 + (i % 4) * 7,
    z = -8 - Math.floor(i / 4) * 14;
  const barrel = cylinder(x, 0.72, z, 0.82, 1.45, metal);
  cylinder(x, 0.72, z, 0.84, 0.08, rust);
  addObstacle(barrel, { x, z, radius: 0.82, top: 1.45, climb: true });
}
// floodlight poles and warm lamps
for (const x of [-16, 16]) {
  box(x, 5, -18, 0.14, 10, 0.14, dark);
  box(x, 9.8, -18, 1.8, 0.2, 0.5, metal);
  const lamp = new THREE.PointLight(0xffc880, 12, 23, 2);
  lamp.position.set(x, 9.3, -18);
  mapBuildGroup.add(lamp);
}
// Operator preview scene; character geometry lives in player/operatorModels.js.

const operator = new THREE.Group();
operator.visible = false; // retained as a harmless third-person anchor
const previewCanvas = document.querySelector("#operator-model"),
  operatorPreviewRenderer = new THREE.WebGLRenderer({
    canvas: previewCanvas,
    alpha: true,
    antialias: true,
  });
operatorPreviewRenderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
operatorPreviewRenderer.setSize(144, 176, false);
operatorPreviewRenderer.setClearColor(0x000000, 0);
operatorPreviewRenderer.outputColorSpace = THREE.SRGBColorSpace;
const operatorPreviewScene = new THREE.Scene(),
  operatorPreviewCamera = new THREE.PerspectiveCamera(34, 144 / 176, 0.1, 30);
operatorPreviewCamera.position.set(3.7, 2.45, 6.8);
operatorPreviewCamera.lookAt(0, 1.48, 0);
operatorPreviewScene.add(new THREE.HemisphereLight(0xfff0db, 0x20252e, 2.1));
const previewKey = new THREE.DirectionalLight(0xffe6c4, 2.2);
previewKey.position.set(-3, 6, 5);
operatorPreviewScene.add(previewKey);
const operatorPreviewModels = [];

for (let i = 0; i < operatorNames.length; i++) {
  const model = makeOperatorModel(i, mat);
  model.visible = i === 0;
  operatorPreviewScene.add(model);
  operatorPreviewModels.push(model);
}

function setPlayerCharacter(stageNo) {
  const characterCount = Math.min(
    operatorNames.length,
    characterArmSets.length,
  );
  const selected = Math.max(0, Math.min(characterCount - 1, stageNo - 1));
  for (let i = 0; i < characterCount; i++) {
    characterArmSets[i].visible = i === selected;
    operatorPreviewModels[i].visible = i === selected;
  }
  const label = document.querySelector("#operator-name");
  if (label) label.textContent = operatorNames[selected];
}
function boxGroup(parent, x, y, z, sx, sy, sz, m) {
  let o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
  o.position.set(x, y, z);
  o.castShadow = true;
  parent.add(o);
  return o;
}
// Closed industrial buildings: solid walls and roofs; door/window recesses are visual only and blocked for this test.
function building(x, z, w, d, h) {
  const wall = dark;
  buildings.push({
    minX: x - w / 2,
    maxX: x + w / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2,
    top: h,
  });
  obstacles.push({
    x,
    z,
    halfX: w / 2,
    halfZ: d / 2,
    top: h,
    building: true,
    climb: true,
  });
  box(x, h / 2, z - d / 2, w, h, 0.45, wall);
  box(x, h / 2, z + d / 2, w, h, 0.45, wall);
  box(x - w / 2, h / 2, z, 0.45, h, d, wall);
  box(x + w / 2, h / 2, z, 0.45, h, d, wall);
  box(x, h, z, w + 0.5, 0.45, d + 0.5, concrete);
  for (const [xx, zz, ww, dd] of [
    [x, z - d / 2, w, 0.55],
    [x, z + d / 2, w, 0.55],
    [x - w / 2, z, 0.55, d],
    [x + w / 2, z, 0.55, d],
  ])
    obstacles.push({
      x: xx,
      z: zz,
      halfX: ww / 2 + 0.55,
      halfZ: dd / 2 + 0.55,
      top: h,
      building: true,
    });
  for (const yy of [1.2, 2.3])
    for (let xx = x - w / 2 + 1.3; xx < x + w / 2 - 1; xx += 2.6) {
      box(xx, yy, z - d / 2 - 0.24, 0.92, 0.8, 0.06, glass, false);
      box(xx, yy, z + d / 2 + 0.24, 0.92, 0.8, 0.06, glass, false);
    }
  for (let xx = x - w / 2 + 1; xx < x + w / 2; xx += 2)
    box(xx, 0.13, z, 0.08, 0.26, d - 0.5, metal, false);
}
building(-8, -30, 12, 10, 6);
building(8, -42, 13, 9, 7);
building(0, -55, 24, 10, 9);
// Raised perimeter mesh fence and overhead cables
for (let x = -32; x <= 32; x += 4) {
  box(x, 1.5, -46, 0.08, 3, 0.08, metal, false);
  box(x, 1.5, 28, 0.08, 3, 0.08, metal, false);
}
for (const z of [-46, 28])
  for (const y of [1, 2.8]) box(0, y, z, 64, 0.06, 0.06, metal, false);
// distant haze and scattered vents/roof trims
for (let i = 0; i < 20; i++) {
  let x = -27 + ((i * 17) % 54),
    z = -43 + ((i * 11) % 12);
  box(x, 7 + ((i * 13) % 8), z, 3, 0.22, 0.35, metal, false);
}
stageMapGroups[1] = mapBuildGroup;
stageObstacleSets[1] = obstacles;
for (let mapId = 2; mapId <= 5; mapId++) {
  stageMapGroups[mapId] = buildVisualMapVariant(
    mapId,
    stageObstacleSets[1],
    mat,
  );
  scene.add(stageMapGroups[mapId]);
  stageObstacleSets[mapId] = stageObstacleSets[1];
}
for (let mapId = 2; mapId <= 5; mapId++) stageMapGroups[mapId].visible = false;
mapBuildGroup = stageMapGroups[1];
obstacles = stageObstacleSets[1];
const mapAtmosphere = [
  null,
  { sky: 0x91a29b, fog: 0x93a49e, density: 0.0125 },
  { sky: 0x5b9da9, fog: 0x8bb6b4, density: 0.009 },
  { sky: 0x081522, fog: 0x182b3b, density: 0.006 },
  { sky: 0x07343e, fog: 0x12606a, density: 0.016 },
  { sky: 0x332d25, fog: 0x61543a, density: 0.013 },
];
function selectStageMap() {
  for (let i = 1; i <= 5; i++) stageMapGroups[i].visible = i === stage;
  const env = mapAtmosphere[stage];
  scene.background.setHex(env.sky);
  scene.fog.color.setHex(env.fog);
  scene.fog.density = env.density;
  obstacles = stageObstacleSets[stage];
  setPlayerCharacter(stage);
}
function colliderBox(c) {
  const hx = c.halfX ?? c.radius ?? 0.8,
    hz = c.halfZ ?? c.radius ?? 0.8;
  return new THREE.Box3(
    new THREE.Vector3(c.x - hx, -0.05, c.z - hz),
    new THREE.Vector3(c.x + hx, c.top, c.z + hz),
  );
}
function hideMeshesAtCollider(map, c) {
  if (!map) return;
  map.updateMatrixWorld(true);
  const area = colliderBox(c);
  map.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const box = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    if (
      box.getSize(new THREE.Vector3()).x > 80 ||
      box.getSize(new THREE.Vector3()).z > 80
    )
      return;
    if (
      box.max.y < area.min.y ||
      box.min.y > area.max.y ||
      !box.intersectsBox(area)
    )
      return;
    if (!hiddenStageMeshes.has(o)) hiddenStageMeshes.set(o, o.visible);
    o.visible = false;
  });
}
function restoreStageDestruction() {
  for (const [mesh, wasVisible] of hiddenStageMeshes) mesh.visible = wasVisible;
  hiddenStageMeshes.clear();
  destroyedColliders.clear();
}
function damageObstacleAt(x, z, feet, r, height) {
  const hits = obstacles.filter(
    (o) =>
      !destroyedColliders.has(o) &&
      feet < o.top &&
      feet + height > 0.04 &&
      obstacleContains(o, x, z, r),
  );
  if (!hits.length) return false;
  for (const collider of hits) {
    destroyedColliders.add(collider);
    for (let i = 1; i <= 5; i++)
      hideMeshesAtCollider(stageMapGroups[i], collider);
  }
  return true;
}
function debrisBurst(point) {
  const group = new THREE.Group(),
    geometry = new THREE.BoxGeometry(0.22, 0.22, 0.22),
    material = new THREE.MeshStandardMaterial({
      color: 0x82745b,
      roughness: 0.95,
    });
  for (let i = 0; i < 12; i++) {
    const chunk = new THREE.Mesh(geometry, material);
    chunk.position.copy(point);
    chunk.position.x += (Math.random() - 0.5) * 0.8;
    chunk.position.y += (Math.random() - 0.5) * 0.7;
    chunk.position.z += (Math.random() - 0.5) * 0.8;
    chunk.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );
    chunk.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      2 + Math.random() * 7,
      (Math.random() - 0.5) * 8,
    );
    group.add(chunk);
  }
  scene.add(group);
  debrisEffects.push({ group, geometry, material, age: 0 });
}
function updateDebrisEffects(dt) {
  for (let i = debrisEffects.length - 1; i >= 0; i--) {
    const fx = debrisEffects[i];
    fx.age += dt;
    for (const chunk of fx.group.children) {
      chunk.position.addScaledVector(chunk.userData.velocity, dt);
      chunk.userData.velocity.y -= 13 * dt;
      chunk.rotation.x += dt * 4;
      chunk.rotation.z += dt * 3;
    }
    if (fx.age >= 1.35) {
      scene.remove(fx.group);
      fx.geometry.dispose();
      fx.material.dispose();
      debrisEffects.splice(i, 1);
    }
  }
}
// gameplay: walking, sprint, target dummies, ammo, recoil, hit feedback
const keys = new Set();
let ammo = 30,
  reserve = 120,
  reloading = false,
  aim = false,
  shotCooldown = 0,
  recoil = 0,
  toastTimer = 0,
  playerHP = 100,
  verticalVelocity = 0,
  onGround = true,
  dead = false,
  damageCooldown = 0,
  crouched = false,
  slideHop = false,
  fireHeld = false,
  weaponIndex = 0,
  weaponAction = 0,
  weaponAnim = null,
  meleeTimer = 0,
  stage = Math.min(
    5,
    Math.max(1, Number(new URLSearchParams(location.search).get("stage")) || 1),
  ),
  stageTime = 60,
  score = 0,
  stageState = "ready",
  restartTimer = 0,
  killStreak = 0,
  lastKillAt = 0,
  shinraReady = false;
const targets = [];
const weaponNames = [
  "VX-9 // PULSE CARBINE",
  "SERVICE PISTOL",
  "KARAMBIT STYLE CLAW",
];
const weaponAmmo = [30, 12, 0];
const targetMaterials = {
  skin: mat(0xe0bcae),
  hair: mat(0xe5e7e3, 0.8),
  helmet: mat(0x151c21, 0.48, 0.5),
  visor: new THREE.MeshStandardMaterial({
    color: 0x2a7580,
    emissive: 0x0c3b45,
    roughness: 0.22,
    metalness: 0.52,
  }),
  uniform: mat(0x20282a, 0.78, 0.12),
  silver: mat(0xb9c2c5, 0.32, 0.68),
  armor: mat(0x27373b, 0.54, 0.3),
  strap: mat(0x111719, 0.82, 0.04),
  webbing: mat(0x485253, 0.72, 0.12),
  glove: mat(0x171c1d, 0.88, 0.02),
  boot: mat(0x303a3c, 0.78, 0.2),
  metal: mat(0x8b9a9e, 0.3, 0.76),
  gun: mat(0x171e20, 0.46, 0.62),
  screen: mat(0x42cce1, 0.3, 0.55),
};
function makeTarget(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  g.userData.radius = 0.48;
  g.userData.height = 1.95;
  const add = (
    geometry,
    material,
    px,
    py,
    pz,
    sx = 1,
    sy = 1,
    sz = 1,
    zone = "body",
    rz = 0,
  ) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(px, py, pz);
    m.scale.set(sx, sy, sz);
    m.rotation.z = rz;
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.owner = g;
    if (zone) m.userData.hitZone = zone;
    g.add(m);
    return m;
  };
  // Invisible ray hit volumes preserve the original body/head damage zones and dimensions.
  const bodyProxy = add(
    new THREE.CapsuleGeometry(0.34, 0.7, 5, 10),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    }),
    0,
    0.92,
    0,
    1,
    1,
    1,
    "body",
  );
  const headProxy = add(
    new THREE.SphereGeometry(0.205, 14, 12),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    }),
    0,
    1.72,
    0,
    1,
    1,
    1,
    "head",
  );
  bodyProxy.renderOrder = 0;
  headProxy.renderOrder = 0;
  // Combat boots, reinforced legs and articulated knee pads.
  for (const side of [-1, 1]) {
    add(
      new THREE.CapsuleGeometry(0.105, 0.34, 4, 9),
      targetMaterials.uniform,
      side * 0.16,
      0.57,
      0,
      1,
      0.95,
      1,
      "body",
    );
    add(
      new THREE.SphereGeometry(0.13, 12, 10),
      targetMaterials.armor,
      side * 0.16,
      0.4,
      0.11,
      1,
      0.68,
      0.55,
      "body",
    );
    add(
      new THREE.CapsuleGeometry(0.085, 0.27, 4, 9),
      targetMaterials.uniform,
      side * 0.16,
      0.27,
      -0.005,
      1,
      0.95,
      1,
      "body",
    );
    add(
      new THREE.BoxGeometry(0.18, 0.14, 0.28),
      targetMaterials.boot,
      side * 0.16,
      0.12,
      0.055,
      1,
      1,
      1,
      "body",
    );
    add(
      new THREE.BoxGeometry(0.16, 0.055, 0.035),
      targetMaterials.metal,
      side * 0.16,
      0.205,
      0.11,
    );
    for (let n = 0; n < 3; n++)
      add(
        new THREE.BoxGeometry(0.11, 0.012, 0.015),
        targetMaterials.webbing,
        side * 0.16,
        0.08 + n * 0.028,
        0.205,
      );
  }
  // Fitted tactical trousers, waist belt, four utility pouches and suspenders.
  add(
    new THREE.CapsuleGeometry(0.23, 0.28, 4, 10),
    targetMaterials.uniform,
    0,
    0.78,
    0,
    1,
    1,
    1,
    "body",
  );
  add(
    new THREE.CylinderGeometry(0.24, 0.25, 0.11, 16),
    targetMaterials.strap,
    0,
    0.98,
    0,
  );
  add(
    new THREE.BoxGeometry(0.11, 0.1, 0.035),
    targetMaterials.metal,
    0,
    0.98,
    0.25,
  );
  for (let side of [-1, 1])
    for (let n = 0; n < 2; n++)
      add(
        new THREE.BoxGeometry(0.105, 0.15, 0.12),
        targetMaterials.webbing,
        side * (0.19 + n * 0.045),
        0.91,
        0.08,
        1,
        1,
        1,
        "body",
        side * 0.08,
      );
  add(
    new THREE.SphereGeometry(1, 18, 12),
    targetMaterials.skin,
    0,
    1.08,
    0.015,
    0.225,
    0.14,
    0.14,
    "body",
  );
  add(
    new THREE.SphereGeometry(1, 18, 12),
    targetMaterials.uniform,
    0,
    1.43,
    0,
    0.27,
    0.25,
    0.18,
    "body",
  );
  add(
    new THREE.SphereGeometry(1, 18, 12),
    targetMaterials.silver,
    0,
    1.42,
    0.125,
    0.235,
    0.17,
    0.085,
    "body",
  );
  // Shoulder armor, silver chest plate, harness straps, buckles and radio clips.
  for (const side of [-1, 1]) {
    add(
      new THREE.SphereGeometry(1, 12, 10),
      targetMaterials.armor,
      side * 0.3,
      1.48,
      0,
      0.105,
      0.13,
      0.13,
    );
    add(
      new THREE.CapsuleGeometry(0.065, 0.34, 4, 9),
      targetMaterials.silver,
      side * 0.36,
      1.16,
      0.055,
      1,
      1,
      1,
      "body",
      -side * 0.13,
    );
    add(
      new THREE.CapsuleGeometry(0.07, 0.28, 4, 9),
      targetMaterials.uniform,
      side * 0.36,
      1.14,
      0.025,
      1,
      1,
      1,
      "body",
      -side * 0.14,
    );
    add(
      new THREE.BoxGeometry(0.12, 0.12, 0.12),
      targetMaterials.strap,
      side * 0.34,
      1.48,
      0.1,
    );
    add(
      new THREE.BoxGeometry(0.07, 0.04, 0.025),
      targetMaterials.metal,
      side * 0.32,
      1.52,
      0.18,
    );
  }
  add(
    new THREE.BoxGeometry(0.2, 0.14, 0.06),
    targetMaterials.armor,
    0,
    1.16,
    0.2,
  );
  add(
    new THREE.BoxGeometry(0.12, 0.05, 0.025),
    targetMaterials.screen,
    0,
    1.19,
    0.24,
  );
  for (let side of [-1, 1]) {
    const strap = add(
      new THREE.BoxGeometry(0.045, 0.46, 0.035),
      targetMaterials.strap,
      side * 0.16,
      1.32,
      0.218,
      1,
      1,
      1,
      "body",
    );
    strap.rotation.z = side * 0.18;
  }
  // Arms end in fingered tactical gloves; finger segments stay inside the target's original radius.
  for (const side of [-1, 1]) {
    add(
      new THREE.CapsuleGeometry(0.065, 0.34, 4, 9),
      targetMaterials.uniform,
      side * 0.39,
      1.11,
      0.025,
      1,
      1,
      1,
      "body",
      -side * 0.12,
    );
    add(
      new THREE.CylinderGeometry(0.07, 0.065, 0.075, 12),
      targetMaterials.metal,
      side * 0.39,
      0.88,
      0.025,
      1,
      1,
      1,
      "body",
    );
    add(
      new THREE.SphereGeometry(0.075, 12, 10),
      targetMaterials.glove,
      side * 0.38,
      0.79,
      0.055,
      0.9,
      1,
      0.72,
      "body",
    );
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.CapsuleGeometry(0.018, 0.075, 3, 7),
        fx = side * 0.38 + (f - 1.5) * 0.034;
      add(
        finger,
        targetMaterials.glove,
        fx,
        0.72,
        0.1,
        1,
        1,
        1,
        "body",
        -side * 0.05,
      );
    }
    add(
      new THREE.CapsuleGeometry(0.02, 0.07, 3, 7),
      targetMaterials.glove,
      side * 0.31,
      0.78,
      0.105,
      1,
      1,
      1,
      "body",
      side * 0.6,
    );
  }
  // White bobbed hair, headset, boom mic, helmet and raised green tactical goggles.
  add(
    new THREE.SphereGeometry(0.19, 16, 12),
    targetMaterials.skin,
    0,
    1.72,
    0.015,
    1,
    1.17,
    0.94,
    "head",
  );
  add(
    new THREE.SphereGeometry(0.205, 16, 12),
    targetMaterials.hair,
    0,
    1.78,
    -0.045,
    1,
    1.02,
    1,
    "head",
  );
  for (const side of [-1, 1])
    add(
      new THREE.CapsuleGeometry(0.055, 0.18, 4, 8),
      targetMaterials.hair,
      side * 0.19,
      1.68,
      -0.035,
      1,
      1,
      1,
      "head",
    );
  for (const side of [-1, 1]) {
    add(
      new THREE.SphereGeometry(0.022, 8, 6),
      targetMaterials.uniform,
      side * 0.075,
      1.755,
      0.185,
      1,
      1,
      0.6,
      "head",
    );
    add(
      new THREE.BoxGeometry(0.055, 0.012, 0.012),
      targetMaterials.helmet,
      side * 0.075,
      1.79,
      0.18,
      1,
      1,
      1,
      "head",
    );
  }
  add(
    new THREE.SphereGeometry(0.023, 8, 6),
    targetMaterials.skin,
    0,
    1.71,
    0.205,
    0.6,
    1,
    0.8,
    "head",
  );
  add(
    new THREE.SphereGeometry(0.028, 8, 6),
    mat(0x9e4454),
    0,
    1.655,
    0.194,
    1,
    0.35,
    0.7,
    "head",
  );
  add(
    new THREE.SphereGeometry(0.19, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    targetMaterials.helmet,
    0,
    1.75,
    -0.01,
    1,
    1,
    0.98,
    "head",
  );
  add(
    new THREE.BoxGeometry(0.46, 0.045, 0.27),
    targetMaterials.helmet,
    0,
    1.82,
    0.045,
    1,
    1,
    1,
    "head",
  );
  add(
    new THREE.BoxGeometry(0.39, 0.035, 0.075),
    targetMaterials.webbing,
    0,
    1.89,
    0.13,
    1,
    1,
    1,
    "head",
  );
  for (const side of [-1, 1]) {
    add(
      new THREE.BoxGeometry(0.13, 0.065, 0.055),
      targetMaterials.visor,
      side * 0.095,
      1.89,
      0.16,
      1,
      1,
      1,
      "head",
    );
    add(
      new THREE.CylinderGeometry(0.07, 0.07, 0.08, 12),
      targetMaterials.helmet,
      side * 0.24,
      1.68,
      0.015,
      1,
      1,
      1,
      "head",
    );
    add(
      new THREE.CylinderGeometry(0.035, 0.035, 0.012, 12),
      targetMaterials.metal,
      side * 0.24,
      1.68,
      0.065,
      1,
      1,
      1,
      "head",
    );
  }
  add(
    new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8),
    targetMaterials.metal,
    -0.24,
    1.58,
    0.04,
    1,
    1,
    1,
    "head",
    -0.55,
  );
  add(
    new THREE.SphereGeometry(0.022, 8, 6),
    targetMaterials.helmet,
    -0.18,
    1.53,
    0.105,
    1,
    1,
    1,
    "head",
  );
  // Upright compact rifle on the target's left side, matching the reference pose.
  const rifle = new THREE.Group();
  g.add(rifle);
  rifle.position.set(-0.37, 1.15, 0.025);
  rifle.rotation.z = -0.12;
  const riflePart = (geo, material, px, py, pz, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(px, py, pz);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.userData.owner = g;
    rifle.add(m);
    return m;
  };
  riflePart(
    new THREE.BoxGeometry(0.11, 0.48, 0.095),
    targetMaterials.gun,
    0,
    0.28,
    0.08,
  );
  riflePart(
    new THREE.CylinderGeometry(0.022, 0.022, 0.42, 10),
    targetMaterials.metal,
    0,
    0.7,
    0.08,
  );
  riflePart(
    new THREE.BoxGeometry(0.17, 0.18, 0.12),
    targetMaterials.gun,
    0,
    0.18,
    0.08,
  );
  riflePart(
    new THREE.BoxGeometry(0.13, 0.24, 0.09),
    targetMaterials.gun,
    0.035,
    -0.12,
    0.08,
    1,
    1,
    1,
  );
  riflePart(
    new THREE.BoxGeometry(0.04, 0.18, 0.03),
    targetMaterials.screen,
    -0.08,
    0.34,
    0.13,
  );
  g.userData.hp = 2;
  g.userData.home = new THREE.Vector3(x, 0, z);
  g.userData.phase = Math.random() * 6;
  targets.push(g);
}
function spawnStageTargets() {
  for (const t of [...targets]) scene.remove(t);
  targets.length = 0;
  const count = 4 + stage;
  for (let i = 0; i < count; i++) {
    const x = -14 + ((i * 13) % 29),
      z = -16 - Math.floor(i / 5) * 8 - (i % 3) * 2,
      free = findFreePoint(x, z, 0.55);
    makeTarget(free.x, free.z);
  }
  updateStageHud();
}
function updateStageHud() {
  document.querySelector("#stage").textContent = `${stage} / 5`;
  document.querySelector("#timer").textContent = Math.max(
    0,
    Math.ceil(stageTime),
  );
  document.querySelector("#score").textContent = score;
  document.querySelector("#remaining").textContent = targets.length;
  const name = document.querySelector("#map-name");
  if (name)
    name.textContent = [
      "",
      "雾港工业区",
      "海边小镇",
      "太空航天站",
      "海底基地",
      "远古遗迹矩阵",
    ][stage];
}
function refillMagazines() {
  weaponAmmo[0] = 30;
  weaponAmmo[1] = 12;
  ammo = 30;
  reloading = false;
  weaponAction = 0;
  weaponAnim = null;
  viewmodel.userData.switching = false;
  viewmodel.position.y = -0.31;
  viewmodel.rotation.set(0, 0, 0);
  primaryMagazineMesh.position.y = -0.12;
  primaryMagVisual.position.y = -0.12;
  secondaryMagazineMesh.position.y = -0.105;
  primaryBolt.position.z = primaryBoltBaseZ;
  secSlide.position.z = secSlideBaseZ;
  updateAmmo();
  updateWeaponHud();
}
function updateKillHud() {
  const streak = document.querySelector("#streak"),
    skill = document.querySelector("#skill"),
    banner = document.querySelector("#shinra-banner"),
    tree = document.querySelector("#tree-skill"),
    treeBanner = document.querySelector("#tree-banner");
  if (streak) streak.textContent = killStreak;
  if (skill) {
    skill.textContent = shinraReady ? "READY" : "LOCKED";
    skill.classList.toggle("ready", shinraReady);
  }
  if (banner) banner.classList.toggle("ready", shinraReady);
  if (tree) {
    tree.textContent = treeSkillReady ? "READY" : "LOCKED";
    tree.classList.toggle("ready", treeSkillReady);
  }
  if (treeBanner) treeBanner.classList.toggle("ready", treeSkillReady);
}
function resetKillStreak() {
  killStreak = 0;
  lastKillAt = 0;
  shinraReady = false;
  treeSkillReady = false;
  headshotPending = false;
  headshotPendingAt = 0;
  clearTreeEffect();
  updateKillHud();
}
function startStage() {
  restoreStageDestruction();
  stageTime = 60;
  stageState = "active";
  playerHP = 100;
  dead = false;
  selectStageMap();
  refillMagazines();
  resetKillStreak();
  spawnStageTargets();
  startFlyover();
  updateHP();
  notify(`第 ${stage} 关开始`);
}
function failStage(reason) {
  if (stageState !== "active") return;
  stageState = "failed";
  dead = true;
  fireHeld = false;
  for (const target of targets) delete target.userData.skillFlight;
  refillMagazines();
  resetKillStreak();
  notify(`${reason}　·　3 秒后重开第 ${stage} 关`);
  restartTimer = 3;
}
function showHeadshotIcon() {
  const icon = document.querySelector("#headshot-pop");
  if (!icon) return;
  icon.classList.remove("show");
  void icon.offsetWidth;
  icon.classList.add("show");
  clearTimeout(headshotIconTimer);
  headshotIconTimer = setTimeout(() => icon.classList.remove("show"), 1150);
}
function showFinalMessage() {
  let banner = document.querySelector("#final-message");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "final-message";
    banner.textContent = "真是好大、好蓝的屋顶鸭~";
    Object.assign(banner.style, {
      position: "fixed",
      left: "50%",
      top: "42%",
      transform: "translate(-50%,-50%)",
      zIndex: "1000",
      padding: "18px 30px",
      border: "1px solid rgba(118,235,255,.7)",
      borderRadius: "6px",
      background: "rgba(5,18,25,.84)",
      color: "#d8fbff",
      fontSize: "clamp(22px,4vw,42px)",
      fontWeight: "700",
      letterSpacing: ".08em",
      textShadow: "0 0 18px rgba(92,220,255,.8)",
      boxShadow: "0 0 30px rgba(59,191,220,.25)",
      pointerEvents: "none",
      opacity: "0",
      transition: "opacity .35s ease",
    });
    document.body.appendChild(banner);
  }
  banner.style.opacity = "1";
  clearTimeout(banner._timer);
  banner._timer = setTimeout(() => {
    banner.style.opacity = "0";
  }, 4700);
}
function targetKilled(
  target,
  points,
  { countStreak = true, headshot = false } = {},
) {
  if (headshot) showHeadshotIcon();
  score += points;
  scene.remove(target);
  targets.splice(targets.indexOf(target), 1);
  const now = performance.now();
  if (headshotPending && now - headshotPendingAt <= 1000) treeSkillReady = true;
  if (headshot) {
    headshotPending = true;
    headshotPendingAt = now;
  } else headshotPending = false;
  if (countStreak) {
    killStreak = now - lastKillAt <= 1000 ? killStreak + 1 : 1;
    lastKillAt = now;
    if (killStreak >= 3) shinraReady = true;
  }
  updateKillHud();
  updateStageHud();
  if (!targets.length && stageState === "active") {
    refillMagazines();
    resetKillStreak();
    if (stage >= 5) {
      stageState = "complete";
      showFinalMessage();
      notify("五关完成　·　5 秒后从第一关再挑战");
      setTimeout(() => {
        if (stageState === "complete") {
          stage = 1;
          score = 0;
          startStage();
        }
      }, 5000);
    } else {
      stageState = "cleared";
      notify(`第 ${stage} 关通过　·　下一关开始`);
      setTimeout(() => {
        if (stageState === "cleared") {
          stage++;
          startStage();
        }
      }, 1300);
    }
  }
}
function findLandingNearPlayer(index, used) {
  const center = camera.position.clone();
  for (let ring = 0; ring < 12; ring++) {
    const radius = 3.2 + ring * 0.82;
    for (let n = 0; n < 20; n++) {
      const angle = (n / 20) * Math.PI * 2 + index * 0.71,
        x = THREE.MathUtils.clamp(
          center.x + Math.cos(angle) * radius,
          -16.2,
          16.2,
        ),
        z = THREE.MathUtils.clamp(
          center.z + Math.sin(angle) * radius,
          -43.5,
          23.5,
        ),
        point = new THREE.Vector3(x, 0, z);
      if (
        Math.hypot(x - center.x, z - center.z) < 2.2 ||
        blockedAt(x, z, 0, 0.58, 1.95) ||
        roofAt(x, z, 0.58) ||
        used.some((p) => p.distanceTo(point) < 1.35)
      )
        continue;
      return point;
    }
  }
  return findFreePoint(center.x + 5 + index, center.z + 5, 0.55);
}
function activateShinra() {
  if (!gameStarted || dead || stageState !== "active" || !shinraReady) return;
  shinraReady = false;
  killStreak = 0;
  lastKillAt = 0;
  updateKillHud();
  const used = [];
  targets.forEach((target, index) => {
    const landing = findLandingNearPlayer(index, used);
    used.push(landing);
    target.userData.skillFlight = {
      start: target.position.clone(),
      landing,
      elapsed: 0,
      duration: 1.24 + index * 0.025,
      peak: 8 + Math.min(index, 4) * 0.55,
    };
  });
  notify("神罗天征　·　标靶击飞！");
}
function clearTreeEffect() {
  if (treeVisualGroup) {
    scene.remove(treeVisualGroup);
    treeVisualGroup.traverse((o) => {
      o.geometry?.dispose();
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
      else o.material?.dispose();
    });
    treeVisualGroup = null;
  }
  treeSkillAction = null;
  treeVisualExpires = 0;
}
function bloodMist(origin, direction) {
  const group = new THREE.Group(),
    geometry = new THREE.SphereGeometry(0.11, 7, 6),
    material = new THREE.MeshBasicMaterial({
      color: 0x9f1730,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
  for (let i = 0; i < 16; i++) {
    const particle = new THREE.Mesh(geometry, material),
      spray = direction
        .clone()
        .multiplyScalar(1.1 + Math.random() * 3.5)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            Math.random() * 2.7,
            (Math.random() - 0.5) * 3,
          ),
        );
    particle.position.copy(origin);
    particle.scale.setScalar(0.45 + Math.random() * 0.8);
    particle.userData.velocity = spray;
    group.add(particle);
  }
  scene.add(group);
  bloodEffects.push({ group, geometry, material, age: 0 });
}
function updateBloodEffects(dt) {
  for (let i = bloodEffects.length - 1; i >= 0; i--) {
    const fx = bloodEffects[i];
    fx.age += dt;
    for (const particle of fx.group.children) {
      particle.position.addScaledVector(particle.userData.velocity, dt);
      particle.userData.velocity.y -= 2.5 * dt;
      particle.scale.multiplyScalar(Math.max(0.9, 1 - dt * 0.45));
    }
    fx.material.opacity = Math.max(0, 0.78 * (1 - fx.age / 0.62));
    if (fx.age >= 0.62) {
      scene.remove(fx.group);
      fx.geometry.dispose();
      fx.material.dispose();
      bloodEffects.splice(i, 1);
    }
  }
}
function makeGrowingBranch(parent, start, end, material, delay = 0) {
  const delta = end.clone().sub(start),
    length = delta.length(),
    mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.3, 1, 9),
      material,
    );
  mesh.position
    .copy(start)
    .addScaledVector(delta.clone().normalize(), length * 0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.clone().normalize(),
  );
  mesh.scale.y = 0.001;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return {
    mesh,
    start: start.clone(),
    direction: delta.normalize(),
    length,
    delay,
  };
}
function activateTreeWorld() {
  if (
    !gameStarted ||
    dead ||
    stageState !== "active" ||
    !treeSkillReady ||
    !targets.length
  )
    return;
  treeSkillReady = false;
  headshotPending = false;
  headshotPendingAt = 0;
  updateKillHud();
  clearTreeEffect();
  const target = targets[Math.floor(Math.random() * targets.length)],
    x = camera.position.x >= 0 ? -23 : 23,
    z = THREE.MathUtils.clamp(
      target.position.z + THREE.MathUtils.randFloat(-5, 5),
      -42,
      21,
    ),
    group = new THREE.Group();
  scene.add(group);
  treeVisualGroup = group;
  const bark = new THREE.MeshStandardMaterial({
      color: 0x503b2d,
      roughness: 0.95,
    }),
    leaf = new THREE.MeshStandardMaterial({ color: 0x315b36, roughness: 0.9 }),
    branchMat = new THREE.MeshStandardMaterial({
      color: 0x3c2e25,
      roughness: 0.92,
    });
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 1.25, 1, 12),
    bark,
  );
  trunk.position.set(x, 0, z);
  trunk.scale.y = 0.001;
  trunk.castShadow = true;
  group.add(trunk);
  const crown = new THREE.Group();
  for (const [cx, cy, cz, r] of [
    [0, 18, 0, 3.8],
    [-2.2, 16.7, 0.3, 2.8],
    [2.1, 17.1, -0.2, 3.1],
    [0, 20, 0, 2.8],
  ]) {
    const leafBall = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leaf);
    leafBall.position.set(cx, cy, cz);
    leafBall.castShadow = true;
    crown.add(leafBall);
  }
  crown.scale.setScalar(0.001);
  group.add(crown);
  const chest = target.position.clone().add(new THREE.Vector3(0, 1.12, 0)),
    entry = new THREE.Vector3(x, 10, z),
    mainDir = chest.clone().sub(entry).normalize(),
    exit = chest.clone().addScaledVector(mainDir, 0.88),
    branches = [makeGrowingBranch(group, entry, exit, branchMat, 0.42)],
    count = 1 + Math.floor(Math.random() * 4),
    axisA = new THREE.Vector3()
      .crossVectors(mainDir, new THREE.Vector3(0, 1, 0))
      .normalize();
  if (axisA.lengthSq() < 0.01) axisA.set(1, 0, 0);
  const axisB = new THREE.Vector3().crossVectors(mainDir, axisA).normalize();
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2,
      spurDir = axisA
        .clone()
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(axisB, Math.sin(angle))
        .addScaledVector(mainDir, (Math.random() - 0.5) * 0.5)
        .normalize(),
      spurStart = chest.clone().addScaledVector(spurDir, -0.18),
      spurEnd = chest
        .clone()
        .addScaledVector(spurDir, 0.92 + Math.random() * 0.32);
    branches.push(
      makeGrowingBranch(group, spurStart, spurEnd, branchMat, 0.68 + i * 0.035),
    );
  }
  treeSkillAction = {
    target,
    trunk,
    crown,
    branches,
    chest,
    mainDir,
    elapsed: 0,
    duration: 1.5,
    bloodShown: false,
  };
  notify("树界降临　·　巨树现身！");
}
function updateTreeWorld(dt) {
  if (!treeSkillAction) {
    if (treeVisualGroup && performance.now() > treeVisualExpires)
      clearTreeEffect();
    return;
  }
  const a = treeSkillAction;
  a.elapsed += dt;
  const grow = Math.min(1, a.elapsed / 0.62);
  a.trunk.scale.y = Math.max(0.001, 20 * grow);
  a.trunk.position.y = 10 * grow;
  a.crown.scale.setScalar(Math.max(0.001, grow));
  for (const branch of a.branches) {
    const amount = Math.max(0, Math.min(1, (a.elapsed - branch.delay) / 0.55));
    branch.mesh.scale.y = Math.max(0.001, branch.length * amount);
    branch.mesh.position
      .copy(branch.start)
      .addScaledVector(branch.direction, branch.length * amount * 0.5);
  }
  if (!a.bloodShown && a.elapsed >= 0.98) {
    a.bloodShown = true;
    bloodMist(a.chest, a.mainDir);
  }
  if (a.elapsed >= a.duration) {
    if (targets.includes(a.target))
      targetKilled(a.target, 0, { countStreak: false });
    notify("树枝贯穿　·　目标淘汰");
    treeSkillAction = null;
    treeVisualExpires = performance.now() + 2600;
  }
}
function updateTargets(dt) {
  for (const t of [...targets]) {
    if (treeSkillAction?.target === t) continue;
    const flight = t.userData.skillFlight;
    if (flight) {
      flight.elapsed += dt;
      const p = Math.min(1, flight.elapsed / flight.duration),
        rise = 0.38,
        xz =
          p < rise
            ? (p / rise) * 0.35
            : 0.35 + 0.65 * ((p - rise) / (1 - rise));
      t.position.x = THREE.MathUtils.lerp(flight.start.x, flight.landing.x, xz);
      t.position.z = THREE.MathUtils.lerp(flight.start.z, flight.landing.z, xz);
      t.position.y =
        p < rise
          ? flight.peak * Math.sin((p / rise) * Math.PI * 0.5)
          : flight.peak * Math.pow(1 - (p - rise) / (1 - rise), 2);
      t.lookAt(camera.position.x, 0, camera.position.z);
      const obstacle =
        p > rise &&
        blockingObstacleAt(
          t.position.x,
          t.position.z,
          t.position.y,
          t.userData.radius,
          t.userData.height,
        );
      if (obstacle) {
        damageObstacleAt(
          t.position.x,
          t.position.z,
          t.position.y,
          t.userData.radius,
          t.userData.height,
        );
        debrisBurst(t.position.clone().add(new THREE.Vector3(0, 0.9, 0)));
        bloodMist(
          t.position.clone().add(new THREE.Vector3(0, 0.9, 0)),
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.6,
            1,
            (Math.random() - 0.5) * 0.6,
          ),
        );
        targetKilled(t, 0, { countStreak: false });
        notify("神罗天征　·　标靶撞毁建筑/障碍，实体破坏");
        continue;
      }
      if (p >= 1) {
        t.position.copy(flight.landing);
        bloodMist(
          t.position.clone().add(new THREE.Vector3(0, 0.65, 0)),
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.55,
            1,
            (Math.random() - 0.5) * 0.55,
          ),
        );
        targetKilled(t, 0, { countStreak: false });
      }
      continue;
    }
    const prev = t.position.clone();
    t.userData.phase += dt;
    const h = t.userData.home,
      tx = h.x + Math.sin(t.userData.phase * 0.8) * 1.5,
      tz = h.z + Math.sin(t.userData.phase * 0.45) * 0.75;
    if (
      blockedAt(tx, tz, 0, t.userData.radius, t.userData.height) ||
      roofAt(tx, tz, t.userData.radius)
    ) {
      const away = findFreePoint(prev.x, prev.z, t.userData.radius);
      t.position.copy(away);
      t.userData.home.copy(away);
      t.userData.phase += Math.PI;
    } else {
      t.position.x = tx;
      t.position.z = tz;
    }
    t.lookAt(camera.position.x, 0, camera.position.z);
    if (
      gameStarted &&
      !dead &&
      damageCooldown <= 0 &&
      Math.sin(t.userData.phase * 1.15) > 0.985 &&
      targetCanSeePlayer(t)
    )
      hurt();
  }
}
const raycaster = new THREE.Raycaster();
function shotBlockers() {
  const result = [];
  const activeMap = stageMapGroups[stage];
  if (activeMap)
    activeMap.traverse((o) => {
      if (o.isMesh && o.userData.blocksShots) result.push(o);
    });
  for (const o of scene.children)
    if (o.isMesh && o.userData.blocksShots) result.push(o);
  return result;
}
function lineBlocked(start, end) {
  const delta = end.clone().sub(start),
    distance = delta.length();
  if (distance <= 0.01) return false;
  const ray = new THREE.Raycaster(
    start,
    delta.normalize(),
    0.01,
    distance - 0.08,
  );
  return ray.intersectObjects(shotBlockers(), false).length > 0;
}
function targetCanSeePlayer(target) {
  const from = target.position.clone().add(new THREE.Vector3(0, 1.45, 0)),
    to = camera.position.clone().add(new THREE.Vector3(0, -0.35, 0));
  return from.distanceTo(to) <= 26 && !lineBlocked(from, to);
}
function notify(t) {
  const e = document.querySelector("#toast");
  e.textContent = t;
  e.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => e.classList.remove("show"), 1100);
}
function updateAmmo() {
  document.querySelector("#ammo").innerHTML =
    `${String(ammo).padStart(2, "0")} <span>/ ${reserve}</span>`;
}
function tracer(a, b) {
  const g = new THREE.BufferGeometry().setFromPoints([a, b]);
  const m = new THREE.LineBasicMaterial({
    color: 0xffcf8c,
    transparent: true,
    opacity: 0.92,
  });
  const line = new THREE.Line(g, m);
  scene.add(line);
  setTimeout(() => {
    scene.remove(line);
    g.dispose();
    m.dispose();
  }, 95);
}
function bulletHole(hit) {
  const geo = new THREE.CircleGeometry(0.075, 12),
    matHole = new THREE.MeshBasicMaterial({
      color: 0x161614,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  const mark = new THREE.Mesh(geo, matHole);
  mark.position.copy(hit.point).addScaledVector(hit.face.normal, 0.012);
  mark.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    hit.face.normal,
  );
  scene.add(mark);
  setTimeout(() => {
    scene.remove(mark);
    geo.dispose();
    matHole.dispose();
  }, 18000);
}
function bladeScuff(point, normal, heavy = false) {
  const dir = new THREE.Vector3().crossVectors(
    normal,
    new THREE.Vector3(0, 1, 0),
  );
  if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);
  dir.normalize();
  const len = heavy ? 0.44 : 0.3,
    side = new THREE.Vector3().crossVectors(normal, dir).normalize(),
    center = point.clone().addScaledVector(normal, 0.018),
    a = center
      .clone()
      .addScaledVector(dir, -len / 2)
      .addScaledVector(side, -len * 0.18),
    b = center
      .clone()
      .addScaledVector(dir, len / 2)
      .addScaledVector(side, len * 0.18);
  const geo = new THREE.BufferGeometry().setFromPoints([a, b]),
    material = new THREE.LineBasicMaterial({
      color: 0x161918,
      transparent: true,
      opacity: 0.96,
    });
  const slash = new THREE.Line(geo, material);
  scene.add(slash);
  setTimeout(() => {
    scene.remove(slash);
    geo.dispose();
    material.dispose();
  }, 7000);
}
function updateWeaponHud() {
  document.querySelector(".weaponname").textContent = weaponNames[weaponIndex];
  document.querySelector("#ammo").innerHTML =
    weaponIndex === 2
      ? "MELEE <span>/ READY</span>"
      : `${String(weaponAmmo[weaponIndex]).padStart(2, "0")} <span>/ ${weaponIndex === 0 ? reserve : 36}</span>`;
}
function switchWeapon(i) {
  if (i < 0 || i > 2 || i === weaponIndex || weaponAction > 0) return;
  weaponAction = 0.84;
  weaponAnim = {
    type: "switch",
    elapsed: 0,
    duration: 0.84,
    from: weaponIndex,
    to: i,
    switched: false,
  };
  fireHeld = false;
  viewmodel.userData.switching = true;
}
function animateWeapon(dt) {
  if (!weaponAnim) return;
  const a = weaponAnim;
  a.elapsed += dt;
  const t = Math.min(1, a.elapsed / a.duration),
    pulse = Math.sin(Math.PI * t);
  if (a.type === "switch") {
    viewmodel.position.y = -0.31 - 0.35 * pulse;
    viewmodel.rotation.z = -0.22 * pulse;
    viewmodel.rotation.x = -0.12 * pulse;
    if (a.elapsed >= 0.32 && !a.switched) {
      a.switched = true;
      weaponIndex = a.to;
      slots.primary.visible = weaponIndex === 0;
      slots.secondary.visible = weaponIndex === 1;
      slots.melee.visible = weaponIndex === 2;
      updateWeaponHud();
    }
    const rack =
      t > 0.55 ? Math.sin(Math.min(1, (t - 0.55) / 0.3) * Math.PI) : 0;
    primaryBolt.position.z = primaryBoltBaseZ + 0.095 * rack;
    secSlide.position.z = secSlideBaseZ - 0.085 * rack;
  } else {
    viewmodel.position.y =
      -0.31 - 0.22 * Math.sin(Math.PI * Math.min(1, t / 0.76));
    viewmodel.rotation.x = -0.32 * Math.sin(Math.PI * Math.min(1, t / 0.88));
    const drop = t < 0.28 ? t / 0.28 : t < 0.58 ? 1 - (t - 0.28) / 0.3 : 0;
    if (a.magazine === 0)
      ((primaryMagazineMesh.position.y = -0.12 - 0.3 * drop),
        (primaryMagVisual.position.y = primaryMagazineMesh.position.y));
    else secondaryMagazineMesh.position.y = -0.105 - 0.22 * drop;
    const rack =
      t > 0.68 ? Math.sin(Math.min(1, (t - 0.68) / 0.3) * Math.PI) : 0;
    primaryBolt.position.z = primaryBoltBaseZ + 0.11 * rack;
    secSlide.position.z = secSlideBaseZ - 0.09 * rack;
  }
  if (t >= 1) {
    viewmodel.position.y = -0.31;
    viewmodel.rotation.set(0, 0, 0);
    primaryMagazineMesh.position.y = -0.12;
    primaryMagVisual.position.y = -0.12;
    secondaryMagazineMesh.position.y = -0.105;
    primaryBolt.position.z = primaryBoltBaseZ;
    secSlide.position.z = secSlideBaseZ;
    viewmodel.userData.switching = false;
    weaponAnim = null;
  }
}
function shoot() {
  if (!gameStarted || dead || weaponIndex === 2) return;
  if (reloading || weaponAction > 0) return;
  if (!weaponAmmo[weaponIndex]) {
    notify("弹匣已空　·　按 R 装填");
    return;
  }
  weaponAmmo[weaponIndex]--;
  if (weaponIndex === 0) ammo = weaponAmmo[0];
  updateAmmo();
  updateWeaponHud();
  shotCooldown = weaponIndex === 0 ? 0.105 : 0.24;
  recoil = Math.min(recoil + (weaponIndex === 0 ? 0.035 : 0.06), 0.15);
  const origin = camera.position.clone(),
    direction = camera.getWorldDirection(new THREE.Vector3()),
    ray = new THREE.Raycaster(origin, direction, 0, 75);
  const solid = shotBlockers();
  const blockHits = ray.intersectObjects(solid, false);
  let targetHits = raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  targetHits = raycaster.intersectObjects(targets, true);
  const targetHit = targetHits.find(
    (h) =>
      h.object.userData.owner &&
      h.object.userData.hitZone &&
      h.distance < (blockHits[0]?.distance ?? 75),
  );
  const stop =
    targetHit?.point ??
    blockHits[0]?.point ??
    origin.clone().addScaledVector(direction, 45);
  tracer(origin.clone().addScaledVector(direction, 0.55), stop);
  const muzzle = new THREE.PointLight(0xffd49b, 8, 4);
  muzzle.position.copy(origin).addScaledVector(direction, 0.7);
  scene.add(muzzle);
  setTimeout(() => scene.remove(muzzle), 45);
  if (targetHit) {
    const o = targetHit.object.userData.owner;
    const head = targetHit.object.userData.hitZone === "head";
    o.userData.hp -= head ? 2 : 1;
    score += head ? 500 : 100;
    if (o.userData.hp <= 0) {
      targetKilled(o, 0, { headshot: head });
      notify(head ? "爆头 +500　·　目标已清除" : "身体 +100　·　目标已清除");
    } else notify(head ? "爆头 +500　·　确认" : "身体 +100　·　再命中一次");
  } else if (blockHits.length) {
    bulletHole(blockHits[0]);
    notify("弹孔已标记　·　掩体阻挡");
  }
}
function meleeAttack(heavy = false) {
  if (!gameStarted || dead || weaponIndex !== 2 || meleeTimer > 0) return;
  meleeTimer = heavy ? 0.72 : 0.52;
  weaponAction = meleeTimer;
  viewmodel.userData.meleeSwing = heavy ? 1 : -1;
  viewmodel.userData.meleeProgress = 0;
  viewmodel.userData.meleeHeavy = heavy;
  const direction = camera.getWorldDirection(new THREE.Vector3()),
    origin = camera.position.clone(),
    ray = new THREE.Raycaster(origin, direction, 0, heavy ? 3.5 : 2.6),
    hits = ray.intersectObjects(targets, true),
    hit = hits.find(
      (h) => h.object.userData.owner && h.object.userData.hitZone,
    );
  if (hit) {
    const target = hit.object.userData.owner,
      head = hit.object.userData.hitZone === "head";
    target.userData.hp -= heavy || head ? 2 : 1;
    score += head ? 500 : 100;
    bladeScuff(hit.point, hit.face.normal, heavy);
    if (target.userData.hp <= 0) {
      targetKilled(target, 0, { headshot: head });
      notify(
        heavy
          ? "重击前刺命中　·　目标淘汰"
          : head
            ? "轻击爆头 +500　·　目标淘汰"
            : "近战命中 +100　·　目标淘汰",
      );
    } else notify("轻击命中身体　·　再击中一次");
  } else {
    const worldHits = ray.intersectObjects(
      scene.children.filter((o) => o.isMesh && !o.userData.noBullet),
      false,
    );
    if (worldHits.length)
      bladeScuff(worldHits[0].point, worldHits[0].face.normal, heavy);
  }
}
function updateHP() {
  document.querySelector("#hp").textContent = playerHP;
  const bar = document.querySelector("#hpbar");
  bar.style.width = playerHP + "%";
  bar.style.background = playerHP <= 30 ? "#ff675b" : "var(--cyan)";
}
function hurt() {
  if (dead || damageCooldown > 0 || stageState !== "active") return;
  damageCooldown = 1.05;
  playerHP = Math.max(0, playerHP - 10);
  updateHP();
  document.querySelector("#damage").classList.add("hit");
  setTimeout(
    () => document.querySelector("#damage").classList.remove("hit"),
    180,
  );
  if (playerHP === 0) failStage("玩家阵亡");
  else notify("受到命中　·　-10 HP");
}
function reload() {
  if (
    reloading ||
    weaponAction > 0 ||
    weaponIndex === 2 ||
    weaponAmmo[weaponIndex] >= (weaponIndex === 0 ? 30 : 12)
  )
    return;
  const cap = weaponIndex === 0 ? 30 : 12;
  if ((weaponIndex === 0 ? reserve : 36) <= 0) return;
  reloading = true;
  weaponAction = 1.12;
  weaponAnim = {
    type: "reload",
    elapsed: 0,
    duration: 1.12,
    magazine: weaponIndex,
  };
  fireHeld = false;
  notify("退匣　·　更换弹匣　·　拉机柄上膛");
  setTimeout(() => {
    const pool = weaponIndex === 0 ? reserve : 36,
      n = Math.min(cap - weaponAmmo[weaponIndex], pool);
    weaponAmmo[weaponIndex] += n;
    if (weaponIndex === 0) {
      reserve -= n;
      ammo = weaponAmmo[0];
    }
    updateAmmo();
    updateWeaponHud();
    reloading = false;
    weaponAction = 0;
  }, 1120);
}
const playButton = document.querySelector("#play");
playButton.addEventListener("pointerdown", requestPointerLock);
playButton.addEventListener("click", () => {
  if (!gameStarted) requestPointerLock();
});
document.addEventListener("keydown", (e) => {
  if (["KeyW", "KeyA", "KeyS", "KeyD", "Space"].includes(e.code))
    e.preventDefault();
  keys.add(e.code);
  if (e.code === "KeyR") reload();
  if (e.code === "KeyQ") activateShinra();
  if (e.code === "KeyE") activateTreeWorld();
  if (e.code === "Digit1") switchWeapon(0);
  if (e.code === "Digit2") switchWeapon(1);
  if (e.code === "Digit3" || e.code === "KeyV") switchWeapon(2);
  if (e.code === "ControlLeft" || e.code === "ControlRight") {
    crouched = true;
    camera.userData.targetHeight = 0.98;
  }
  if (e.code === "Space" && onGround && gameActive()) {
    slideHop = keys.has("ControlLeft") || keys.has("ControlRight");
    verticalVelocity = slideHop ? 13.4 : 7.1;
    onGround = false;
    if (!slideHop) crouched = false;
    camera.userData.targetHeight = slideHop ? 0.98 : 1.72;
    notify(slideHop ? "超级跳" : "跳跃");
  }
  if (e.code === "Enter" && dead) {
    playerHP = 100;
    dead = false;
    updateHP();
    notify("重新开始　·　训练继续");
  }
});
document.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (e.code === "ControlLeft" || e.code === "ControlRight") {
    crouched = false;
    camera.userData.targetHeight = 1.72;
  }
});
document.addEventListener("mousedown", (e) => {
  if (!gameStarted) {
    if (e.button === 0) {
      dragLook = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    }
    return;
  }
  if (!controls.isLocked && e.button === 0) {
    dragLook = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
  }
  if (e.button === 0) {
    if (weaponIndex === 2) meleeAttack(false);
    else {
      fireHeld = true;
      shoot();
    }
  }
  if (e.button === 2 && (controls.isLocked || gameStarted)) {
    if (weaponIndex === 2) meleeAttack(true);
    else {
      aim = true;
      document.body.classList.add("aim");
      camera.fov = 39;
      camera.updateProjectionMatrix();
    }
  }
});
document.addEventListener("mouseup", (e) => {
  if (e.button === 0) {
    fireHeld = false;
    dragLook = false;
  }
  if (e.button === 2) {
    if (weaponIndex !== 2) {
      aim = false;
      document.body.classList.remove("aim");
      camera.fov = 76;
      camera.updateProjectionMatrix();
    }
  }
});
document.addEventListener("contextmenu", (e) => e.preventDefault());
function updatePlayerMotion(dt) {
  const halfHeight = crouched ? 0.98 : 1.72,
    old = camera.position.clone(),
    feetBefore = camera.position.y - halfHeight;
  const speed = (keys.has("ShiftLeft") ? 9 : 5.4) * dt,
    f = Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
    s = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
  if (f || s) {
    const moveStep = speed * (crouched ? 0.58 : 1),
      forward = camera.getWorldDirection(new THREE.Vector3());
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3()
        .crossVectors(forward, new THREE.Vector3(0, 1, 0))
        .normalize(),
      mx = right.x * s * moveStep + forward.x * f * moveStep,
      mz = right.z * s * moveStep + forward.z * f * moveStep;
    const feet = camera.position.y - halfHeight;
    if (
      !blockedAt(
        camera.position.x + mx,
        camera.position.z,
        feet,
        0.34,
        halfHeight,
      )
    )
      camera.position.x += mx;
    if (
      !blockedAt(
        camera.position.x,
        camera.position.z + mz,
        feet,
        0.34,
        halfHeight,
      )
    )
      camera.position.z += mz;
  }
  verticalVelocity -= 19 * dt;
  camera.position.y += verticalVelocity * dt;
  let landed = false;
  if (verticalVelocity <= 0) {
    const support = roofAt(camera.position.x, camera.position.z, 0.22),
      feetAfter = camera.position.y - halfHeight;
    if (
      support &&
      feetBefore >= support.top - 0.22 &&
      feetAfter <= support.top
    ) {
      camera.position.y = support.top + halfHeight;
      verticalVelocity = 0;
      onGround = true;
      slideHop = false;
      landed = true;
    } else if (feetAfter <= 0) {
      camera.position.y = halfHeight;
      verticalVelocity = 0;
      onGround = true;
      slideHop = false;
      landed = true;
    }
  }
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -16.7, 16.7);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -44, 24);
  if (
    blockedAt(
      camera.position.x,
      camera.position.z,
      camera.position.y - halfHeight,
      0.34,
      halfHeight,
    )
  ) {
    camera.position.x = old.x;
    camera.position.z = old.z;
    if (verticalVelocity <= 0) {
      const support = roofAt(old.x, old.z, 0.22);
      if (
        support &&
        feetBefore >= support.top - 0.22 &&
        camera.position.y - halfHeight <= support.top
      ) {
        camera.position.y = support.top + halfHeight;
        verticalVelocity = 0;
        onGround = true;
        slideHop = false;
        landed = true;
      }
    }
  }
  if (landed && camera.position.y < halfHeight) camera.position.y = halfHeight;
}
let last = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  shotCooldown = Math.max(0, shotCooldown - dt);
  weaponAction = Math.max(0, weaponAction - dt);
  damageCooldown = Math.max(0, damageCooldown - dt);
  animateWeapon(dt);
  if (fireHeld && shotCooldown <= 0 && weaponIndex !== 2) shoot();
  recoil = Math.max(0, recoil - dt * 0.15);
  updateTreeWorld(dt);
  updateBloodEffects(dt);
  updateDebrisEffects(dt);
  if (activeAircraft.length)
    activeAircraft = activeAircraft.filter((jet, index) => {
      jet.position.x += 31 * dt;
      jet.position.y =
        jet.userData.flightBaseY + Math.sin(now * 0.002 + index) * 0.45;
      if (jet.position.x > 64) {
        jet.visible = false;
        return false;
      }
      return true;
    });
  if (gameStarted && stageState === "active") {
    stageTime -= dt;
    if (stageTime <= 0) {
      stageTime = 0;
      failStage("时间耗尽");
    }
    updateStageHud();
  }
  if (stageState === "failed") {
    restartTimer -= dt;
    if (restartTimer <= 0) {
      if (gameStarted) startStage();
      else {
        stageState = "ready";
        stageTime = 60;
        playerHP = 100;
        spawnStageTargets();
        updateHP();
      }
    }
  }
  if (gameStarted && !dead) updatePlayerMotion(dt);
  updateTargets(dt);
  operator.rotation.y = Math.sin(now * 0.00035) * 0.05;
  if (!reloading && !viewmodel.userData.switching) {
    viewmodel.position.y = THREE.MathUtils.lerp(
      viewmodel.position.y,
      crouched ? -0.48 : -0.31,
      0.14,
    );
    viewmodel.position.x = THREE.MathUtils.lerp(
      viewmodel.position.x,
      0.34,
      0.14,
    );
  }
  meleeTimer = Math.max(0, meleeTimer - dt);
  const swing = viewmodel.userData.meleeSwing || 0;
  if (swing !== 0 && meleeTimer <= 0) viewmodel.userData.meleeSwing = 0;
  const activeSwing = viewmodel.userData.meleeSwing || 0;
  if (weaponIndex === 2) {
    const heavy = viewmodel.userData.meleeHeavy,
      progress = activeSwing !== 0 ? 1 - meleeTimer / (heavy ? 0.72 : 0.52) : 0;
    const pulse =
      activeSwing === 0
        ? 0
        : Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI);
    slots.melee.rotation.z = THREE.MathUtils.lerp(
      slots.melee.rotation.z,
      activeSwing === 0 ? 0 : (heavy ? 0 : -0.95) * pulse,
      0.42,
    );
    slots.melee.rotation.x = THREE.MathUtils.lerp(
      slots.melee.rotation.x,
      activeSwing === 0 ? 0 : (heavy ? -0.95 : 0.25) * pulse,
      0.42,
    );
    slots.melee.position.x = THREE.MathUtils.lerp(
      slots.melee.position.x,
      0.1 + (heavy ? 0 : -0.28) * pulse,
      0.4,
    );
    slots.melee.position.z = THREE.MathUtils.lerp(
      slots.melee.position.z,
      activeSwing === 0 ? 0 : (heavy ? -0.48 : -0.06) * pulse,
      0.4,
    );
  }
  operatorPreviewModels.forEach((model, i) => {
    if (model.visible) model.rotation.y = Math.sin(now * 0.001) * 0.08;
  });
  rifleCrystal.emissiveIntensity = 1.4 + 0.6 * Math.sin(now * 0.006);
  primaryCrystalGroup.rotation.z = Math.sin(now * 0.002) * 0.035;
  primaryEnergyLight.intensity =
    1.25 + 0.75 * (0.5 + 0.5 * Math.sin(now * 0.006));
  primaryMagVisual.position.y = primaryMagazineMesh.position.y;
  operatorPreviewRenderer.render(operatorPreviewScene, operatorPreviewCamera);
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
