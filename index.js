import * as THREE from "three";
import { OrbitControls } from "/three/examples/jsm/controls/OrbitControls.js";
import { FBXLoader } from "/three/examples/jsm/loaders/FBXLoader.js";
import * as CANNON from "cannon-es";
import CannonDebugger from "/cannon-es-debugger/dist/cannon-es-debugger.js";


const ASSETS_DIR = "./assets";
const SKYBOX_ASSETS = [
	"skybox_r.png", "skybox_l.png",
	"skybox_u.png", "skybox_d.png",
	"skybox_f.png", "skybox_b.png"
];
const PERLIN_NOISE_TERRAIN_MAP = "noiseTexture.png";

const TERRAIN_SIZE = new THREE.Vector2(2048, 2048);
const TERRAIN_NOISE_HEIGHT = 512;

const GRAVITY_VECTOR = new CANNON.Vec3(0, -98.2, 0);
const GRAVITATION_VECTOR_UNIT = GRAVITY_VECTOR.unit();

let scene = null;
let camera = null;

let renderer = null;

let control = null;

let physicsWorld = null;
let cannonDebugger = null;

let character = {loaded: false};

function loadSkyboxTexture() {
	let paths = [];
	for (let i = 0; i < SKYBOX_ASSETS.length; i++) {
		paths.push(ASSETS_DIR + "/" + SKYBOX_ASSETS[i]);
	}
	return paths;
}

function clamp(val, min, max) {
	return Math.max(Math.min(val, max), min);
}

function generateTerrain() {

	let terrainPerlinNoise = new Image();
	terrainPerlinNoise.addEventListener("load", function() {
		let tempCanvas = document.createElement("canvas");
		tempCanvas.width = terrainPerlinNoise.width;
		tempCanvas.height = terrainPerlinNoise.height;

		let tempContext = tempCanvas.getContext("2d");
		tempContext.drawImage(terrainPerlinNoise, 0, 0);

		let imageData = tempContext.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
		let mapHeight = [];
		for (let i = 0; i < terrainPerlinNoise.height; i++) {
			mapHeight[i] = [];
			for (let j = 0; j < terrainPerlinNoise.width; j++) {
				let offset = (i * terrainPerlinNoise.width + j) * 4
				mapHeight[i].push((imageData[offset] + imageData[offset + 1] + imageData[offset + 2]) / (3 * imageData[offset + 3]));
			}
		}
		
		let trimeshBuffer = [];
		let trimeshIndex = [];
		let individualVertexSize = new THREE.Vector2(TERRAIN_SIZE.x / mapHeight[0].length, TERRAIN_SIZE.y / mapHeight.length);
		for (let i = 0; i < mapHeight.length + 1; i++) {
			for (let j = 0; j < mapHeight[0].length + 1; j++) {
				let height = 0;
				height += mapHeight[clamp(i - 1, 0, 127)][clamp(j - 1, 0, 127)];
				height += mapHeight[clamp(i - 1, 0, 127)][clamp(j, 0, 127)];
				height += mapHeight[clamp(i, 0, 127)][clamp(j - 1, 0, 127)];
				height += mapHeight[clamp(i, 0, 127)][clamp(j, 0, 127)];
				height /= 4;
				trimeshBuffer.push(individualVertexSize.x * j, TERRAIN_NOISE_HEIGHT * -height, individualVertexSize.y * i);
			}
		}

		for (let i = 0; i < mapHeight.length; i++) {
			let offset = (mapHeight[0].length + 1) * i;
			let offsetNext = (mapHeight[0].length + 1) * (i + 1);
			for (let j = 0; j < mapHeight[0].length; j++) {
				trimeshIndex.push(offsetNext + j, offset + j + 1, offset + j);
				trimeshIndex.push(offsetNext + j, offsetNext + j + 1, offset + j + 1);
			}
		}

		let terrainGeometry = new THREE.BufferGeometry();
		terrainGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(trimeshBuffer), 3));
		terrainGeometry.setIndex(trimeshIndex);
		terrainGeometry.computeVertexNormals();
		let terrainMaterial = new THREE.MeshStandardMaterial({color: 0xff0000});
		let terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
		terrain.castShadow = true;
		terrain.receiveShadow = true;
		terrain.position.set(-1024, 0, -1024);
		scene.add(terrain);

		let body = new CANNON.Body({
			type: CANNON.Body.STATIC,
			shape: new CANNON.Trimesh(trimeshBuffer, trimeshIndex)
		});
		body.position.set(-1024, 0, -1024);
		console.log(body.position);
		physicsWorld.addBody(body);
	});
	terrainPerlinNoise.src = ASSETS_DIR + "/" + PERLIN_NOISE_TERRAIN_MAP;
}

function vector3ToVec3(vector3) {
	return new CANNON.Vec3(vector3.x, vector3.y, vector3.z);
}

function createSkybox() {
	let textureLoader = new THREE.TextureLoader();
	let skyboxMaterialArray = [];
	for (let i = 0; i < SKYBOX_ASSETS.length; i++) {
		let texture = textureLoader.load(ASSETS_DIR + "/" + SKYBOX_ASSETS[i]);
		skyboxMaterialArray.push(new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }));
	}
	let skyboxGeometry = new THREE.BoxGeometry(5000, 5000, 5000);
	let skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterialArray);
	skybox.position.set(0, 0, 0);
	
	scene.add(skybox);
}

function testCreateCharacter() {
	const loader = new FBXLoader();
	loader.load(ASSETS_DIR + "/character.fbx", 
		(object) => {
			object.traverse( function ( child ) {
				if ( child.isMesh ) {
					child.castShadow = true;
					child.receiveShadow = true;
				}
			});
			object.scale.set(0.1, 0.1, 0.1);

			scene.add(object);
			character.obj = object;
			character.getBoundingBox = function() {
				return new THREE.Box3().setFromObject(this.obj);
			}
			character.getSize = function() {
				let boundingBox = this.getBoundingBox();
				return boundingBox.min.subVectors(boundingBox.max, boundingBox.min);
			}
			character.getCameraCenter = function() {
				return new THREE.Vector3(this.obj.position.x, this.obj.position.y + this.getSize().y * 0.75, this.obj.position.z);
			}
			character.getFeet = function() {
				return new THREE.Vector3(this.obj.position.x, this.obj.position.y - 3, this.obj.position.z);
			}
			
			control.target = character.getCameraCenter();
			camera.position.z = -16;

			let bodyBox = new CANNON.Body({
				mass: 80, // kg
				type: CANNON.Body.DYNAMIC,
				shape: new CANNON.Sphere(3)
			});
			bodyBox.position = vector3ToVec3(character.getFeet());
			physicsWorld.addBody(bodyBox);

			character.bodyBox = bodyBox;
			character.updatePositionFromBodyBox = function() {
				this.obj.position.copy(this.bodyBox.position);
				this.obj.position.y -= 3;
			}
			bodyBox.velocity.set(0, -1, 0);

			character.loaded = true;

			character.castShadow = true;
			character.receiveShadow = true;
		},
		(xhr) => {
			
		},
		(error) => {
			console.log(error);
		}
	)
}

function init() {
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0xababab);
	
	camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 9000);
	camera.position.set(0, 0, 0);
	
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	
	control = new OrbitControls(camera, renderer.domElement);
	control.listenToKeyEvents( window );
	control.enableDamping = true;
	control.dampingFactor = 0.09;
	control.enablePan = false;

	control.maxDistance = 32;
	control.minDistance = 16;
	
	let light = new THREE.PointLight(0xffffff, 1.0);
	light.castShadow = true;
	light.position.set(1000, 2000, 1000);
	scene.add(light);

	document.body.appendChild(renderer.domElement);

	physicsWorld = new CANNON.World({
		gravity: GRAVITY_VECTOR
	});

	// const groundBody = new CANNON.Body({
	// 	type: CANNON.Body.STATIC,
	// 	shape: new CANNON.Plane()
	// });
	// groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
	// physicsWorld.addBody(groundBody);

	cannonDebugger = new CannonDebugger(scene, physicsWorld);
	
	createSkybox();
	testCreateCharacter();
	generateTerrain();
}

let directionVector = new THREE.Vector3(0, 0, 0);
let characterMoving = false;
let startFalling = false;

function keyDown(e) {
	if (character.loaded) {
		let cameraTarget;
		if (e.key == "w") {
			character.bodyBox.wakeUp();
			cameraTarget = vector3ToVec3(directionVector.subVectors(control.target.clone(), camera.position.clone())).unit();

			character.bodyBox.velocity.set(100 * cameraTarget.x, character.bodyBox.velocity.y, 100 * cameraTarget.z);

			characterMoving = true;
		}
		else if (e.key == "a") {
			character.bodyBox.wakeUp();
			directionVector.subVectors(control.target.clone(), camera.position.clone());
			directionVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
			cameraTarget = vector3ToVec3(directionVector).unit();

			character.bodyBox.velocity.set(100 * cameraTarget.x, character.bodyBox.velocity.y, 100 * cameraTarget.z);

			characterMoving = true;
		}
		else if (e.key == "s") {
			character.bodyBox.wakeUp();
			directionVector.subVectors(control.target.clone(), camera.position.clone());
			directionVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
			cameraTarget = vector3ToVec3(directionVector).unit();

			character.bodyBox.velocity.set(100 * cameraTarget.x, character.bodyBox.velocity.y, 100 * cameraTarget.z);

			characterMoving = true;
		}
		else if (e.key == "d") {
			character.bodyBox.wakeUp();
			directionVector.subVectors(control.target.clone(), camera.position.clone());
			directionVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
			cameraTarget = vector3ToVec3(directionVector).unit();

			character.bodyBox.velocity.set(100 * cameraTarget.x, character.bodyBox.velocity.y, 100 * cameraTarget.z);

			characterMoving = true;
		}
	}
}

function keyUp(e) {
	character.bodyBox.velocity.set(0, 0, 0);
	character.bodyBox.applyForce(GRAVITY_VECTOR);
	characterMoving = false;

	startFalling = false;
}

window.addEventListener("keydown", keyDown);
window.addEventListener("keyup", keyUp);

function mainLoop() {
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	cannonDebugger.update();

	if (character.loaded) {
		character.updatePositionFromBodyBox();
		
		control.target = character.getCameraCenter();
		
		if (!characterMoving) {

			if (!startFalling) {
				character.bodyBox.sleep();
				character.bodyBox.velocity.set(0, -1, 0);
				character.bodyBox.wakeUp();
				character.bodyBox.velocity.set(0, -1, 0);
				startFalling = true;
			}
			let vec = character.bodyBox.velocity.unit();
			if (startFalling && Math.abs(vec.dot(GRAVITATION_VECTOR_UNIT)) < 0.75 && vec.length() > 0 && character.bodyBox.sleepState == CANNON.BODY_SLEEP_STATES.AWAKE) {
				character.bodyBox.sleep();
			}
		}
	}

	physicsWorld.fixedStep();
	
	control.update();
	renderer.render(scene, camera);
	requestAnimationFrame(mainLoop);
}

init();
mainLoop();