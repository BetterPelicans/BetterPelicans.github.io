import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from '../vendor/utils/SkeletonUtils.js';
import {
  DASH_ENERGY_MAX,
  DASH_HIT_RADIUS,
  DASH_SPEED,
  PLAYER_SPEED,
  PLAYER_TURN_SPEED,
  TURN_SMOOTHING_RESPONSE,
  cameraFollowOffset,
  dashHitsTarget,
  dashInput,
  forwardForHeading,
  movementDelta,
  petWalkPhase,
  steerHeading,
  speedForInput,
  smoothInput,
  turnInputFromScreenX,
  updateDashEnergy,
} from './game-logic.mjs?v=v6';

const $ = (selector) => document.querySelector(selector);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const WORLD = 112;
const CAMERA_DISTANCE = 12;
const CAMERA_HEIGHT = 7.2;
const CAMERA_FOLLOW_RATE = 8;
const CAMERA_POSITION_RATE = 10;
const CAMERA_LOOK_RATE = 12;
const timer = new THREE.Timer();
timer.connect(document);
const textureLoader = new THREE.TextureLoader();
const mobLoader = new GLTFLoader();
const assetRoot = new URL('../assets/', import.meta.url);
const mobAssetUrls = [
  new URL('mobs/deer.gltf', assetRoot).href,
  new URL('mobs/demon.gltf', assetRoot).href,
  new URL('mobs/bat.gltf', assetRoot).href,
];

const keys = Object.create(null);
const mobAssetPromises = new Map();
let selectedAnimal = 'fox';
let selectedPet = 'puppy';
let started = false;
let diamonds = 0;
let dashPulse = 0;
let dashEnergy = DASH_ENERGY_MAX;
let mobDefeatCount = 0;
let scene;
let camera;
let renderer;
let player;
let playerVisual;
let playerHeading = 0;
let cameraHeading = 0;
let moveInput = new THREE.Vector2();
let smoothedTurnInput = 0;
let pets = [];
let diamondsWorld = [];
let mobs = [];
let collisionProps = [];
let audioCtx = null;

const PET_META = {
  puppy: { name: 'Puppy', emoji: '🐶', price: 10 },
  kitty: { name: 'Kitty', emoji: '🐱', price: 10 },
  chick: { name: 'Chick', emoji: '🐥', price: 12 },
  hedgehog: { name: 'Hedgehog', emoji: '🦔', price: 15 },
  panda: { name: 'Panda', emoji: '🐼', price: 18 },
  dragon: { name: 'Tiny Dragon', emoji: '🐲', price: 25 },
};

function beep(freq = 600, duration = 0.07, type = 'sine', gain = 0.04) {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = freq;
    gainNode.gain.value = gain;
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    oscillator.stop(audioCtx.currentTime + duration);
  } catch {
    // Audio is optional and can be blocked until the first user gesture.
  }
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('showToast');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('showToast'), 1300);
}

function makeMaterial(color, roughness = 0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
}

function mesh(geometry, color, roughness = 0.82) {
  const object = new THREE.Mesh(geometry, makeMaterial(color, roughness));
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function addBox(group, size, position, color, rotation = 0) {
  const object = mesh(new THREE.BoxGeometry(...size), color);
  object.position.set(...position);
  object.rotation.y = rotation;
  group.add(object);
  return object;
}

function addSphere(group, radius, position, color, scale = [1, 1, 1]) {
  const object = mesh(new THREE.IcosahedronGeometry(radius, 1), color);
  object.position.set(...position);
  object.scale.set(...scale);
  group.add(object);
  return object;
}

function addCone(group, radius, height, position, color, rotationX = 0) {
  const object = mesh(new THREE.ConeGeometry(radius, height, 6), color);
  object.position.set(...position);
  object.rotation.x = rotationX;
  group.add(object);
  return object;
}

function makeAnimal(kind = 'fox', small = false) {
  const group = new THREE.Group();
  const scale = small ? 0.64 : 1;
  let body = 0xd9793d;
  let belly = 0xffd6ad;
  let dark = 0x3f2c26;
  if (kind === 'bunny') {
    body = 0xe9e4df;
    belly = 0xffffff;
    dark = 0x8c7f78;
  }
  if (kind === 'deer') {
    body = 0xb97845;
    belly = 0xe8c39b;
    dark = 0x5d3e2a;
  }
  if (kind === 'bear') {
    body = 0x805b45;
    belly = 0xb28a70;
    dark = 0x3d2b24;
  }

  const legs = [];
  const ears = [];
  const head = addSphere(group, 0.6, [0, 1.45, 0.95], body);
  addSphere(group, 0.85, [0, 1.05, 0], body, [1.25, 0.9, 1.55]);
  addSphere(group, 0.32, [0, 1.31, 1.48], belly, [1.1, 0.75, 0.8]);
  addSphere(group, 0.1, [-0.18, 1.54, 1.72], 0x1d1d20);
  addSphere(group, 0.1, [0.18, 1.54, 1.72], 0x1d1d20);
  addSphere(group, 0.11, [0, 1.35, 1.78], 0x302521);

  const legGeometry = new THREE.BoxGeometry(0.28, 0.72, 0.32);
  [-0.45, 0.45].forEach((x) => {
    [-0.48, 0.45].forEach((z) => {
      const leg = mesh(legGeometry, body);
      leg.position.set(x, 0.45, z);
      group.add(leg);
      legs.push(leg);
    });
  });

  let tail = null;
  if (kind === 'fox') {
    ears.push(addCone(group, 0.32, 0.7, [-0.35, 2.04, 1], body, -0.15));
    ears.push(addCone(group, 0.32, 0.7, [0.35, 2.04, 1], body, -0.15));
    tail = addCone(group, 0.48, 1.5, [0, 1.15, -1.55], body, Math.PI / 2);
    tail.rotation.z = 0.25;
    addSphere(group, 0.24, [0, 1.35, -2.15], 0xf4eadc);
  } else if (kind === 'bunny') {
    ears.push(addBox(group, [0.28, 1.05, 0.3], [-0.28, 2.22, 0.92], body, -0.05));
    ears.push(addBox(group, [0.28, 1.05, 0.3], [0.28, 2.22, 0.92], body, 0.05));
    tail = addSphere(group, 0.24, [0, 1.18, -1.38], 0xffffff);
  } else if (kind === 'deer') {
    ears.push(addCone(group, 0.22, 0.6, [-0.35, 2, 0.95], dark, -0.12));
    ears.push(addCone(group, 0.22, 0.6, [0.35, 2, 0.95], dark, -0.12));
    const antlerMaterial = makeMaterial(0x6b4931);
    [-1, 1].forEach((side) => {
      const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.72, 6), antlerMaterial);
      antler.position.set(0.27 * side, 2.35, 0.92);
      antler.rotation.z = 0.25 * side;
      group.add(antler);
      const branch = antler.clone();
      branch.scale.y = 0.55;
      branch.position.set(0.47 * side, 2.55, 0.94);
      branch.rotation.z = 0.85 * side;
      group.add(branch);
    });
  } else if (kind === 'bear') {
    ears.push(addSphere(group, 0.21, [-0.42, 1.94, 0.95], body));
    ears.push(addSphere(group, 0.21, [0.42, 1.94, 0.95], body));
  }

  group.scale.setScalar(scale);
  group.userData.petAnimation = { legs, ears, tail, head, phase: rand(0, Math.PI * 2) };
  group.userData.baseY = 0;
  group.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return group;
}

function makePet(kind) {
  if (kind === 'puppy' || kind === 'kitty') {
    const animal = makeAnimal(kind === 'puppy' ? 'fox' : 'bunny', true);
    animal.scale.multiplyScalar(0.72);
    return animal;
  }

  const group = new THREE.Group();
  const animation = { legs: [], wings: [], ears: [], tail: null, head: null, phase: rand(0, Math.PI * 2) };
  if (kind === 'chick') {
    addSphere(group, 0.46, [0, 0.55, 0], 0xffdc45);
    animation.head = addSphere(group, 0.34, [0, 0.88, 0.2], 0xffe66d);
    addCone(group, 0.12, 0.34, [0, 0.85, 0.55], 0xf39a2c, Math.PI / 2);
    addSphere(group, 0.055, [-0.12, 0.97, 0.45], 0x161616);
    addSphere(group, 0.055, [0.12, 0.97, 0.45], 0x161616);
    animation.wings.push(
      addBox(group, [0.16, 0.4, 0.55], [0.42, 0.67, 0.02], 0xf0bd31, 0.3),
      addBox(group, [0.16, 0.4, 0.55], [-0.42, 0.67, 0.02], 0xf0bd31, -0.3),
    );
  } else if (kind === 'hedgehog') {
    addSphere(group, 0.52, [0, 0.55, 0], 0x76553d, [1.1, 0.85, 1.35]);
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const spike = addCone(group, 0.12, 0.38, [Math.cos(angle) * 0.45, 0.76, Math.sin(angle) * 0.45], 0x513b2c);
      spike.rotation.z = Math.PI / 2;
      spike.rotation.y = -angle;
      animation.wings.push(spike);
    }
    animation.head = addSphere(group, 0.28, [0, 0.54, 0.55], 0xc9956f);
    addSphere(group, 0.06, [0, 0.56, 0.84], 0x191919);
  } else if (kind === 'panda') {
    addSphere(group, 0.52, [0, 0.58, 0], 0xf3f1e8, [1, 1.05, 1]);
    animation.head = addSphere(group, 0.28, [0, 0.94, 0.23], 0xf3f1e8);
    animation.ears.push(
      addSphere(group, 0.12, [-0.24, 1.13, 0.22], 0x232323),
      addSphere(group, 0.12, [0.24, 1.13, 0.22], 0x232323),
    );
    addSphere(group, 0.07, [-0.1, 0.98, 0.46], 0x232323);
    addSphere(group, 0.07, [0.1, 0.98, 0.46], 0x232323);
  } else {
    addSphere(group, 0.45, [0, 0.55, 0], 0x62ae74, [1.1, 0.85, 1.35]);
    animation.head = addSphere(group, 0.32, [0, 0.82, 0.47], 0x79ca8c);
    addCone(group, 0.18, 0.5, [-0.28, 1.14, 0.38], 0x5d9d71);
    addCone(group, 0.18, 0.5, [0.28, 1.14, 0.38], 0x5d9d71);
    animation.wings.push(
      addBox(group, [0.16, 0.4, 0.55], [0.42, 0.67, 0.02], 0x4f9362, 0.3),
      addBox(group, [0.16, 0.4, 0.55], [-0.42, 0.67, 0.02], 0x4f9362, -0.3),
    );
  }
  group.scale.setScalar(0.85);
  group.userData.petAnimation = animation;
  group.userData.baseY = 0;
  return group;
}

function makeMobFallback(type = 0) {
  const group = new THREE.Group();
  const colors = [0x8d64df, 0xe06e63, 0x54a6c7];
  const color = colors[type % colors.length];
  addSphere(group, 0.72, [0, 0.72, 0], color, [1.2, 0.8, 1.1]);
  addSphere(group, 0.12, [-0.24, 0.92, 0.6], 0xffffff);
  addSphere(group, 0.12, [0.24, 0.92, 0.6], 0xffffff);
  addSphere(group, 0.055, [-0.24, 0.92, 0.69], 0x161616);
  addSphere(group, 0.055, [0.24, 0.92, 0.69], 0x161616);
  addCone(group, 0.16, 0.42, [-0.35, 1.42, 0.05], 0xf3d28e);
  addCone(group, 0.16, 0.42, [0.35, 1.42, 0.05], 0xf3d28e);
  group.userData.baseY = 0;
  return group;
}

function createBiomeMaterial(color, textureName, repeat = 10) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.96, metalness: 0 });
  if (!textureName) return material;
  const texture = textureLoader.load(new URL(`textures/${textureName}`, assetRoot).href, (loaded) => {
    loaded.wrapS = THREE.RepeatWrapping;
    loaded.wrapT = THREE.RepeatWrapping;
    loaded.repeat.set(repeat, repeat);
    loaded.colorSpace = THREE.SRGBColorSpace;
    material.map = loaded;
    material.needsUpdate = true;
  });
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  material.map = texture;
  return material;
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9ed8ff);
  scene.fog = new THREE.Fog(0xaddcf5, 55, 170);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 350);
  camera.position.set(0, 8, -12);
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  document.body.prepend(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xdaf1ff, 0x6f764c, 2.1));
  const sun = new THREE.DirectionalLight(0xfff1cf, 2.2);
  sun.position.set(35, 55, -25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  scene.add(sun);
  buildWorld();
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  $('#loading').classList.add('hidden');
  $('#startScreen').classList.remove('hidden');
  animate();
}

function groundPatch(x, z, radius, color, textureName, repeat = 7) {
  const material = createBiomeMaterial(color, textureName, repeat);
  const patch = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), material);
  patch.rotation.x = -Math.PI / 2;
  patch.position.set(x, 0.015, z);
  patch.receiveShadow = true;
  scene.add(patch);
  return patch;
}

function buildWorld() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD * 2, WORLD * 2),
    createBiomeMaterial(0x9acb78, 'meadow-grass.jpg', 18),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  groundPatch(-47, -38, 34, 0x9bbd86, 'forest-ground.jpg', 8);
  groundPatch(46, -38, 31, 0xd7b879, 'desert-sand.jpg', 8);
  groundPatch(-46, 45, 31, 0xe2eef2, 'snow-field.jpg', 8);
  groundPatch(45, 45, 31, 0x98c97b, 'meadow-grass.jpg', 8);

  for (let i = 0; i < 48; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * 28;
    createTree(-47 + Math.cos(angle) * radius, -38 + Math.sin(angle) * radius, 0);
  }
  for (let i = 0; i < 24; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * 27;
    if (Math.random() < 0.58) createCactus(46 + Math.cos(angle) * radius, -38 + Math.sin(angle) * radius);
    else createRock(46 + Math.cos(angle) * radius, -38 + Math.sin(angle) * radius, 0xb89462);
  }
  for (let i = 0; i < 34; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * 27;
    if (Math.random() < 0.8) createTree(-46 + Math.cos(angle) * radius, 45 + Math.sin(angle) * radius, 1);
    else createRock(-46 + Math.cos(angle) * radius, 45 + Math.sin(angle) * radius, 0xbfd0d8);
  }
  for (let i = 0; i < 40; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * 27;
    if (Math.random() < 0.25) createTree(45 + Math.cos(angle) * radius, 45 + Math.sin(angle) * radius, 2);
    else createFlower(45 + Math.cos(angle) * radius, 45 + Math.sin(angle) * radius);
  }
  for (let i = 0; i < 22; i += 1) createRock(rand(-80, 80), rand(-80, 80), 0x8a8878, 0.55);
  for (let i = 0; i < 46; i += 1) spawnDiamond();
  for (let i = 0; i < 14; i += 1) spawnMob(i % 3);

  const shop = new THREE.Group();
  addBox(shop, [4.6, 2.8, 3.6], [0, 1.4, 0], 0xf5ddb0);
  addCone(shop, 3.5, 2.2, [0, 3.25, 0], 0xc76d55);
  shop.position.set(16, 0, 10);
  scene.add(shop);
  collisionProps.push({ x: 16, z: 10, r: 3 });
  addBox(shop, [2.2, 0.9, 0.18], [0, 2.3, -1.92], 0x6844ff);
}

function createTree(x, z, snow = 0) {
  const group = new THREE.Group();
  addBox(group, [0.7, 2.4, 0.7], [0, 1.2, 0], 0x80502f);
  const isSnowfieldTree = snow === 1;
  const isFlowerFieldTree = snow === 2;
  const color = isSnowfieldTree ? 0x8db0a0 : isFlowerFieldTree ? 0x6db85d : 0x397c47;
  addCone(group, 2.1, 4.2, [0, 3.25, 0], color);
  if (isSnowfieldTree) addCone(group, 1.65, 2.8, [0, 4.1, 0], 0xe8f4f7);
  group.position.set(x, 0, z);
  const scale = rand(0.72, 1.28);
  group.scale.setScalar(scale);
  scene.add(group);
  collisionProps.push({ x, z, r: 1.1 * scale });
}

function createCactus(x, z) {
  const group = new THREE.Group();
  addBox(group, [0.75, 3.3, 0.75], [0, 1.65, 0], 0x4c9c61);
  addBox(group, [0.55, 1.5, 0.55], [0.75, 1.65, 0], 0x4c9c61);
  addBox(group, [0.85, 0.5, 0.55], [0.5, 1.1, 0], 0x4c9c61);
  group.position.set(x, 0, z);
  scene.add(group);
  collisionProps.push({ x, z, r: 0.75 });
}

function createRock(x, z, color = 0x858273, scale = 0.8) {
  const rock = mesh(new THREE.DodecahedronGeometry(scale, 0), color);
  rock.scale.set(1.25, 0.7, 1);
  rock.position.set(x, scale * 0.55, z);
  rock.rotation.set(rand(0, 1), rand(0, Math.PI), rand(0, 0.4));
  scene.add(rock);
  collisionProps.push({ x, z, r: scale * 0.8 });
}

function createFlower(x, z) {
  const group = new THREE.Group();
  addBox(group, [0.07, 0.55, 0.07], [0, 0.28, 0], 0x4b9451);
  const colors = [0xff71a8, 0xffdc58, 0x9f82ff, 0xffffff];
  for (let i = 0; i < 4; i += 1) {
    const angle = i * Math.PI / 2;
    addSphere(group, 0.11, [Math.cos(angle) * 0.13, 0.63, Math.sin(angle) * 0.13], colors[(Math.random() * colors.length) | 0]);
  }
  addSphere(group, 0.07, [0, 0.63, 0], 0xffc84d);
  group.position.set(x, 0, z);
  scene.add(group);
}

function makeDiamond() {
  const group = new THREE.Group();
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x4be8ff,
    roughness: 0.06,
    metalness: 0.52,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    emissive: 0x08758c,
    emissiveIntensity: 0.34,
    flatShading: true,
  });
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), material);
  diamond.castShadow = true;
  diamond.userData.baseScale = 1;
  group.add(diamond);
  group.userData.diamond = diamond;
  return group;
}

function randomOpenPos() {
  for (let tries = 0; tries < 50; tries += 1) {
    const x = rand(-94, 94);
    const z = rand(-94, 94);
    if (Math.hypot(x, z) > 7 && collisionProps.every((prop) => Math.hypot(x - prop.x, z - prop.z) > prop.r + 2)) {
      return { x, z };
    }
  }
  return { x: rand(-90, 90), z: rand(-90, 90) };
}

function spawnDiamond() {
  const position = randomOpenPos();
  const group = makeDiamond();
  group.position.set(position.x, 1.05, position.z);
  scene.add(group);
  diamondsWorld.push({ group, phase: rand(0, Math.PI * 2), alive: true, respawn: 0 });
}

function loadMobAsset(type) {
  if (mobAssetPromises.has(type)) return mobAssetPromises.get(type);
  const promise = new Promise((resolve, reject) => {
    mobLoader.load(mobAssetUrls[type], resolve, undefined, reject);
  });
  mobAssetPromises.set(type, promise);
  return promise;
}

function attachMobModel(mob, gltf) {
  const model = cloneSkeleton(gltf.scene);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = 2.1 / Math.max(size.y, 0.001);
  model.scale.setScalar(scale);
  model.position.y = -bounds.min.y * scale;
  model.rotation.y = 0;
  model.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  mob.group.clear();
  mob.group.add(model);
  mob.model = model;
  document.body.dataset.mobModels = String(Number(document.body.dataset.mobModels || 0) + 1);
  if (gltf.animations.length) {
    mob.mixer = new THREE.AnimationMixer(model);
    const clip = gltf.animations.find((candidate) => /walk|run|idle/i.test(candidate.name)) || gltf.animations[0];
    mob.mixer.clipAction(clip).play();
  }
}

function spawnMob(type = 0) {
  const position = randomOpenPos();
  const group = makeMobFallback(type);
  group.position.set(position.x, 0, position.z);
  scene.add(group);
  const mob = {
    group,
    model: null,
    mixer: null,
    hp: 2,
    alive: true,
    direction: rand(-Math.PI, Math.PI),
    turn: rand(1, 4),
    respawn: 0,
    stun: 0,
    type,
    hitFlash: 0,
  };
  mobs.push(mob);
  loadMobAsset(type).then((gltf) => attachMobModel(mob, gltf)).catch(() => {
    // The procedural fallback remains in the scene when a local asset is invalid.
  });
}

function createPlayer() {
  player = new THREE.Group();
  playerVisual = makeAnimal(selectedAnimal, false);
  player.add(playerVisual);
  player.position.set(0, 0, 0);
  player.rotation.y = playerHeading;
  cameraHeading = playerHeading;
  scene.add(player);
  addPet(selectedPet, true);
  loadLocalFoxAsset();
}

function loadLocalFoxAsset() {
  if (selectedAnimal !== 'fox') return;
  const url = new URL('fox.glb', assetRoot).href;
  new GLTFLoader().load(url, (gltf) => {
    if (!started || selectedAnimal !== 'fox') return;
    const model = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 2 / Math.max(size.y, 0.001);
    model.scale.setScalar(scale);
    model.rotation.y = 0;
    model.position.y = -bounds.min.y * scale;
    model.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    player.remove(playerVisual);
    playerVisual = model;
    player.add(model);
    if (gltf.animations.length) {
      const mixer = new THREE.AnimationMixer(model);
      const clip = gltf.animations.find((candidate) => /walk/i.test(candidate.name)) || gltf.animations[0];
      mixer.clipAction(clip).play();
      player.userData.mixer = mixer;
    }
  }, undefined, () => {
    // Keep the procedural fox silently when the optional local model is unavailable.
  });
}

function addPet(kind, starter = false) {
  if (!starter && pets.some((pet) => pet.kind === kind)) {
    toast('You already have that pet');
    return;
  }
  const group = makePet(kind);
  scene.add(group);
  group.position.copy(player?.position || new THREE.Vector3());
  pets.push({ kind, group, phase: rand(0, Math.PI * 2) });
  updateHUD();
}

function updateEnergyHUD() {
  const bar = $('#energyBar');
  const fill = $('#energyFill');
  if (!bar || !fill) return;
  const percentage = (dashEnergy / DASH_ENERGY_MAX) * 100;
  fill.style.width = `${percentage}%`;
  bar.setAttribute('aria-valuenow', dashEnergy.toFixed(0));
  bar.classList.toggle('low', dashEnergy <= DASH_ENERGY_MAX * 0.24);
}

function updateHUD() {
  $('#diamondCount').textContent = diamonds;
  $('#petCount').textContent = pets.length;
  updateEnergyHUD();
}

function biomeAt(x, z) {
  if (Math.hypot(x + 47, z + 38) < 34) return 'Forest';
  if (Math.hypot(x - 46, z + 38) < 31) return 'Desert';
  if (Math.hypot(x + 46, z - 45) < 31) return 'Snowfield';
  if (Math.hypot(x - 45, z - 45) < 31) return 'Flower Fields';
  return 'Meadow';
}

function resolveCollision(next) {
  next.x = Math.max(-WORLD + 2, Math.min(WORLD - 2, next.x));
  next.z = Math.max(-WORLD + 2, Math.min(WORLD - 2, next.z));
  for (const prop of collisionProps) {
    const dx = next.x - prop.x;
    const dz = next.z - prop.z;
    const distance = Math.hypot(dx, dz);
    const minimum = prop.r + 0.78;
    if (distance < minimum && distance > 0.001) {
      const push = minimum - distance;
      next.x += (dx / distance) * push;
      next.z += (dz / distance) * push;
    }
  }
  for (const mob of mobs) {
    if (!mob.alive) continue;
    const dx = next.x - mob.group.position.x;
    const dz = next.z - mob.group.position.z;
    const distance = Math.hypot(dx, dz);
    const minimum = 1.3;
    if (distance < minimum && distance > 0.001) {
      const push = minimum - distance;
      next.x += (dx / distance) * push;
      next.z += (dz / distance) * push;
    }
  }
  return next;
}

function defeatMob(mob) {
  if (!mob.alive) return false;
  mob.alive = false;
  mob.hp = 0;
  mob.respawn = 7;
  mob.group.visible = false;
  mobDefeatCount += 1;
  document.body.dataset.mobDefeats = String(mobDefeatCount);
  diamonds += 2;
  updateHUD();
  toast('Mob dashed! +2 diamonds');
  beep(740, 0.1, 'triangle', 0.05);
  return true;
}

function defeatMobsInDash(origin, next) {
  const start = { x: origin.x, z: origin.z };
  const end = { x: next.x, z: next.z };
  for (const mob of mobs) {
    if (!mob.alive) continue;
    const target = { x: mob.group.position.x, z: mob.group.position.z };
    if (dashHitsTarget(start, end, target, DASH_HIT_RADIUS)) defeatMob(mob);
  }
}

function keyboardInput() {
  let x = 0;
  let y = 0;
  if (keys.KeyA || keys.ArrowLeft) x -= 1;
  if (keys.KeyD || keys.ArrowRight) x += 1;
  if (keys.KeyW || keys.ArrowUp) y += 1;
  if (keys.KeyS || keys.ArrowDown) y -= 1;
  return { x, y };
}

function animateAnimalVisual(visual, time, moving) {
  const animation = visual?.userData?.petAnimation;
  if (!animation) return;
  const phase = petWalkPhase(time, animation.phase, moving ? 8 : 2.2);
  const amount = moving ? 0.38 : 0.08;
  animation.legs?.forEach((leg, index) => {
    leg.rotation.x = Math.sin(time * (moving ? 11 : 2.2) + index * Math.PI) * amount;
  });
  animation.wings?.forEach((wing, index) => {
    wing.rotation.z = (index % 2 ? -1 : 1) * (0.3 + phase * (moving ? 0.3 : 0.06));
  });
  animation.ears?.forEach((ear, index) => {
    ear.rotation.z = (index % 2 ? -1 : 1) * phase * (moving ? 0.04 : 0.02);
  });
  if (animation.tail) animation.tail.rotation.x = phase * (moving ? 0.12 : 0.05);
  if (animation.head) animation.head.rotation.x = phase * (moving ? 0.03 : 0.02);
}

function updatePlayer(dt, time) {
  const keyboard = keyboardInput();
  const rawInput = Math.hypot(keyboard.x, keyboard.y) > 0.01 ? keyboard : { x: moveInput.x, y: moveInput.y };
  const dashHeld = Boolean(keys.Space);
  const dashing = Boolean(dashHeld && dashEnergy > 0.001);
  const input = dashInput(rawInput, dashing);
  const targetTurnInput = turnInputFromScreenX(input.x);
  smoothedTurnInput = smoothInput(smoothedTurnInput, targetTurnInput, dt, TURN_SMOOTHING_RESPONSE);
  if (Math.abs(smoothedTurnInput) > 0.005) {
    playerHeading = steerHeading(playerHeading, smoothedTurnInput, dt, PLAYER_TURN_SPEED);
  }
  const forward = forwardForHeading(playerHeading);
  const direction = { x: forward.x * input.y, z: forward.z * input.y };
  const moving = Math.abs(input.y) > 0.01;
  const speed = speedForInput(dashing, PLAYER_SPEED, dashEnergy);
  dashEnergy = updateDashEnergy(dashEnergy, dashHeld, dt);
  updateEnergyHUD();
  player.rotation.y = playerHeading;
  if (moving) {
    const origin = player.position.clone();
    const next = player.position.clone();
    const delta = movementDelta(direction, speed, dt);
    next.x += delta.x;
    next.z += delta.z;
    if (dashing) {
      dashPulse = 1;
      defeatMobsInDash(origin, next);
    }
    resolveCollision(next);
    player.position.copy(next);
  }
  animateAnimalVisual(playerVisual, time, moving);
  if (player.userData.mixer) player.userData.mixer.update(dt * (moving ? 1 : 0));
  if (dashPulse > 0) {
    dashPulse = Math.max(0, dashPulse - dt * 5);
    playerVisual.rotation.x = lerp(playerVisual.rotation.x, -0.18, Math.min(1, dt * 10));
  } else {
    playerVisual.rotation.x = lerp(playerVisual.rotation.x, 0, Math.min(1, dt * 12));
  }
  $('#biomeName').textContent = biomeAt(player.position.x, player.position.z);
  document.body.dataset.playerX = player.position.x.toFixed(3);
  document.body.dataset.playerZ = player.position.z.toFixed(3);
  document.body.dataset.playerHeading = playerHeading.toFixed(3);
  document.body.dataset.playerTurnInput = smoothedTurnInput.toFixed(3);
  document.body.dataset.dashing = String(dashing);
  document.body.dataset.playerSpeed = String(speed);
  document.body.dataset.playerNormalSpeed = String(PLAYER_SPEED);
  document.body.dataset.dashSpeed = String(DASH_SPEED);
  document.body.dataset.dashEnergy = dashEnergy.toFixed(2);
  document.body.dataset.dashEnergyMax = String(DASH_ENERGY_MAX);
}

function updatePets(dt, time) {
  pets.forEach((pet, index) => {
    const back = 2.5 + index * 0.55;
    const side = (index % 2 ? 1 : -1) * (1.2 + Math.floor(index / 2) * 0.35);
    const target = new THREE.Vector3(
      player.position.x - Math.sin(playerHeading) * back + Math.cos(playerHeading) * side,
      0,
      player.position.z - Math.cos(playerHeading) * back - Math.sin(playerHeading) * side,
    );
    const delta = target.clone().sub(pet.group.position);
    const distance = delta.length();
    const moving = distance > 0.08;
    const blend = 1 - Math.pow(distance > 10 ? 0.0000001 : 0.015, dt);
    pet.group.position.lerp(target, blend);
    pet.group.position.y = 0.04 + Math.sin(time * 3 + pet.phase) * (moving ? 0.1 : 0.06);
    if (moving) pet.group.rotation.y = Math.atan2(delta.x, delta.z);
    animateAnimalVisual(pet.group, time, moving);
    if (distance > 18) pet.group.position.copy(target);
    document.body.dataset.petPhase = (Math.sin(time * 3 + pet.phase)).toFixed(3);
  });
}

function updateDiamonds(dt, time) {
  for (const item of diamondsWorld) {
    if (item.alive) {
      item.group.rotation.y += dt * 2.1;
      item.group.position.y = 1.05 + Math.sin(time * 2 + item.phase) * 0.18;
      const scale = 1 + Math.sin(time * 4 + item.phase) * 0.08;
      item.group.userData.diamond.scale.setScalar(scale);
      if (item.group.position.distanceTo(player.position) < 1.65) {
        item.alive = false;
        item.group.visible = false;
        item.respawn = 10 + Math.random() * 7;
        diamonds += 1;
        updateHUD();
        toast('Diamond collected!');
        beep(850, 0.08, 'sine', 0.045);
      }
    } else {
      item.respawn -= dt;
      if (item.respawn <= 0) {
        const position = randomOpenPos();
        item.group.position.set(position.x, 1, position.z);
        item.alive = true;
        item.group.visible = true;
      }
    }
  }
}

function updateMobs(dt, time) {
  for (const mob of mobs) {
    if (!mob.alive) {
      mob.respawn -= dt;
      if (mob.respawn <= 0) {
        const position = randomOpenPos();
        mob.group.position.set(position.x, 0, position.z);
        mob.hp = 2;
        mob.alive = true;
        mob.group.visible = true;
        mob.direction = rand(-Math.PI, Math.PI);
      }
      continue;
    }
    if (mob.mixer) mob.mixer.update(dt * (mob.stun > 0 ? 0.15 : 1));
    if (mob.hitFlash > 0) mob.hitFlash -= dt;
    if (mob.stun > 0) {
      mob.stun -= dt;
      mob.group.position.y = Math.sin(time * 12) * 0.08;
      continue;
    }
    mob.turn -= dt;
    if (mob.turn <= 0) {
      mob.turn = rand(1.5, 4);
      mob.direction += rand(-1.5, 1.5);
    }
    const next = mob.group.position.clone();
    next.x += Math.sin(mob.direction) * dt * 1.1;
    next.z += Math.cos(mob.direction) * dt * 1.1;
    if (Math.abs(next.x) > WORLD - 4 || Math.abs(next.z) > WORLD - 4) {
      mob.direction += Math.PI;
    } else {
      let blocked = false;
      for (const prop of collisionProps) {
        if (Math.hypot(next.x - prop.x, next.z - prop.z) < prop.r + 0.8) {
          blocked = true;
          break;
        }
      }
      if (blocked) mob.direction += rand(1.8, 3.8);
      else mob.group.position.copy(next);
    }
    mob.group.rotation.y = mob.direction;
    mob.group.position.y = Math.sin(time * 2 + mob.type) * 0.06;
  }
}

function updateCamera(dt) {
  const headingDelta = Math.atan2(Math.sin(playerHeading - cameraHeading), Math.cos(playerHeading - cameraHeading));
  cameraHeading += headingDelta * (1 - Math.exp(-CAMERA_FOLLOW_RATE * dt));
  const offset = cameraFollowOffset(cameraHeading, CAMERA_DISTANCE, CAMERA_HEIGHT);
  const desired = player.position.clone().add(new THREE.Vector3(offset.x, offset.y, offset.z));
  camera.position.lerp(desired, 1 - Math.exp(-CAMERA_POSITION_RATE * dt));
  const lookAhead = new THREE.Vector3(Math.sin(playerHeading) * 1.1, 1.2, Math.cos(playerHeading) * 1.1);
  const target = player.position.clone().add(lookAhead);
  const look = camera.userData.look || target.clone();
  look.lerp(target, 1 - Math.exp(-CAMERA_LOOK_RATE * dt));
  camera.userData.look = look;
  camera.lookAt(look);
  document.body.dataset.cameraHeading = cameraHeading.toFixed(3);
  document.body.dataset.cameraX = camera.position.x.toFixed(3);
  document.body.dataset.cameraY = camera.position.y.toFixed(3);
  document.body.dataset.cameraZ = camera.position.z.toFixed(3);
}

function animate(timestamp) {
  requestAnimationFrame(animate);
  timer.update(timestamp);
  const dt = Math.min(timer.getDelta(), 0.04);
  const time = performance.now() / 1000;
  if (started) {
    updatePlayer(dt, time);
    updatePets(dt, time);
    updateDiamonds(dt, time);
    updateMobs(dt, time);
    updateCamera(dt);
  }
  renderer.render(scene, camera);
}

function resetGame() {
  location.reload();
}

function openShop() {
  renderShop();
  $('#shopShade').classList.remove('hidden');
}

function renderShop() {
  const grid = $('#shopGrid');
  grid.innerHTML = '';
  for (const [kind, pet] of Object.entries(PET_META)) {
    const owned = pets.some((candidate) => candidate.kind === kind);
    if (pet.price === 0 && owned) continue;
    const card = document.createElement('div');
    card.className = 'shopItem';
    card.innerHTML = `<div class="big">${pet.emoji}</div><h3>${pet.name}</h3><p>${owned ? 'Already exploring with you.' : 'A new friend for your pack.'}</p><button class="buy" ${owned || diamonds < pet.price ? 'disabled' : ''}>${owned ? 'Owned' : `💎 ${pet.price}`}</button>`;
    const button = card.querySelector('button');
    button.onclick = () => {
      if (owned || diamonds < pet.price) return;
      diamonds -= pet.price;
      addPet(kind);
      updateHUD();
      renderShop();
      toast(`${pet.name} joined your pack!`);
      beep(520, 0.12, 'triangle', 0.05);
    };
    grid.appendChild(card);
  }
}

$('#animalChoices').addEventListener('click', (event) => {
  const button = event.target.closest('[data-animal]');
  if (!button) return;
  selectedAnimal = button.dataset.animal;
  document.querySelectorAll('[data-animal]').forEach((candidate) => candidate.classList.toggle('selected', candidate === button));
});

$('#petChoices').addEventListener('click', (event) => {
  const button = event.target.closest('[data-pet]');
  if (!button) return;
  selectedPet = button.dataset.pet;
  document.querySelectorAll('[data-pet]').forEach((candidate) => candidate.classList.toggle('selected', candidate === button));
});

$('#startBtn').onclick = () => {
  started = true;
  $('#startScreen').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  createPlayer();
  updateHUD();
  toast('Find diamonds and explore!');
};

$('#shopBtn').onclick = openShop;
$('#shopClose').onclick = () => $('#shopShade').classList.add('hidden');
$('#shopShade').addEventListener('click', (event) => {
  if (event.target === $('#shopShade')) $('#shopShade').classList.add('hidden');
});
$('#resetBtn').onclick = resetGame;

addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if (event.code === 'Space') event.preventDefault();
});
addEventListener('keyup', (event) => {
  keys[event.code] = false;
});
addEventListener('blur', () => {
  Object.keys(keys).forEach((key) => { keys[key] = false; });
  moveInput.set(0, 0);
  smoothedTurnInput = 0;
  if (joystickPointerId !== null) resetJoystick();
});

const joystick = $('#joystick');
const stick = $('#stick');
const JOYSTICK_RADIUS = 64;
const JOYSTICK_MAX = 43;
let joystickPointerId = null;

function updateJoystick(event) {
  const rect = joystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  let dx = event.clientX - centerX;
  let dy = event.clientY - centerY;
  const length = Math.hypot(dx, dy) || 1;
  const magnitude = Math.min(JOYSTICK_MAX, length);
  dx = (dx / length) * magnitude;
  dy = (dy / length) * magnitude;
  stick.style.transform = `translate(${dx}px, ${dy}px)`;
  moveInput.set(Math.max(-1, Math.min(1, dx / JOYSTICK_MAX)), Math.max(-1, Math.min(1, -dy / JOYSTICK_MAX)));
}

function placeJoystick(clientX, clientY) {
  const edge = 12;
  const x = Math.max(JOYSTICK_RADIUS + edge, Math.min(window.innerWidth - JOYSTICK_RADIUS - edge, clientX));
  const y = Math.max(JOYSTICK_RADIUS + edge, Math.min(window.innerHeight - JOYSTICK_RADIUS - edge, clientY));
  joystick.style.left = `${x}px`;
  joystick.style.top = `${y}px`;
}

function resetJoystick(event) {
  if (event?.pointerId != null && event.pointerId !== joystickPointerId) return;
  joystickPointerId = null;
  stick.style.transform = '';
  joystick.classList.remove('visible');
  joystick.setAttribute('aria-hidden', 'true');
  joystick.style.left = '';
  joystick.style.top = '';
  moveInput.set(0, 0);
}

function canStartJoystick(event) {
  if (!started || joystickPointerId !== null) return false;
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('#dash, #shopShade, #startScreen, button, a, input, select, textarea')) return false;
  return event.pointerType !== 'mouse' || matchMedia('(pointer: coarse)').matches;
}

function beginJoystick(event) {
  if (!canStartJoystick(event)) return;
  event.preventDefault();
  joystickPointerId = event.pointerId;
  placeJoystick(event.clientX, event.clientY);
  joystick.classList.add('visible');
  joystick.setAttribute('aria-hidden', 'false');
  try {
    joystick.setPointerCapture(event.pointerId);
  } catch {
    // Pointer capture is optional; window listeners still track the active pointer.
  }
  updateJoystick(event);
}

function moveJoystick(event) {
  if (event.pointerId !== joystickPointerId) return;
  event.preventDefault();
  updateJoystick(event);
}

addEventListener('pointerdown', beginJoystick, { passive: false });
addEventListener('pointermove', moveJoystick, { passive: false });
addEventListener('pointerup', resetJoystick);
addEventListener('pointercancel', resetJoystick);
joystick.addEventListener('lostpointercapture', resetJoystick);

const dashButton = $('#dash');
dashButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  keys.Space = true;
  try {
    dashButton.setPointerCapture(event.pointerId);
  } catch {
    // Pointer capture is optional; the held state is still cleared on pointerup/cancel.
  }
});
dashButton.addEventListener('pointerup', () => { keys.Space = false; });
dashButton.addEventListener('pointercancel', () => { keys.Space = false; });
dashButton.addEventListener('lostpointercapture', () => { keys.Space = false; });
dashButton.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' && event.code !== 'Enter') return;
  event.preventDefault();
  keys.Space = true;
});
dashButton.addEventListener('keyup', (event) => {
  if (event.code === 'Space' || event.code === 'Enter') keys.Space = false;
});

init();
