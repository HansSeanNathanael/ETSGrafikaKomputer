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

let canvas = null;

let scene = null;
let camera = null;

let renderer = null;

let control = null;

let physicsWorld = null;

function loadSkyboxTexture() {
	let paths = [];
	for (let i = 0; i < SKYBOX_ASSETS.length; i++) {
		paths.push(ASSETS_DIR + "/" + SKYBOX_ASSETS[i]);
	}
	return paths;
}

function generateTerrain() {

	let terrainPerlinNoise = new Image();
	terrainPerlinNoise.addEventListener("load", function() {
		let tempCanvas = document.createElement("canvas");
		tempCanvas.width = terrainPerlinNoise.width;
		tempCanvas.height = terrainPerlinNoise.height;

		let tempContext = tempCanvas.getContext("2d");
		tempContext.drawImage(terrainPerlinNoise, 0, 0);

		let imageDataArray = tempContext.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
		
	});
	terrainPerlinNoise.src = ASSETS_DIR + "/" + PERLIN_NOISE_TERRAIN_MAP;

	let terrainGeometry = new THREE.BufferGeometry();
	let terrainVertices = new Float32Array([
		-100, 0, -100,
		-100, 0, 100,
		100, 0, 100,

		100, 0, 100,
		100, 0, -100,
		-100, 0, -100
	]);
	
	terrainGeometry.setAttribute("position", new THREE.BufferAttribute(terrainVertices, 3 ));
	let terrainMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
	let terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
	
	scene.add(terrain);
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
			
			let boundingBox = new THREE.Box3().setFromObject(object);
			let size = boundingBox.min.subVectors(boundingBox.max, boundingBox.min);
			
			control.target = new THREE.Vector3(object.position.x, object.position.y + size.y * 0.75, object.position.z);
			camera.position.z = -16;

			scene.add(object);
		},
		(xhr) => {
			
		},
		(error) => {
			console.log(error);
		}
	)
}

function init() {
	canvas = document.getElementById("main-canvas");
	
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
	
	scene.add(new THREE.AmbientLight(0xffffff, 1.0));

	document.body.appendChild(renderer.domElement);

	physicsWorld = new CANNON.World({
		gravity: new CANNON.Vec3(0, 0, 0)
	});

	const sphereBody = new CANNON.Body({
		mass: 0, // kg
		shape: new CANNON.Sphere(100),
	});
	sphereBody.position.set(0, 0, 0);
	physicsWorld.addBody(sphereBody);
	CannonDebugger(scene, physicsWorld);
	
	createSkybox();
	testCreateCharacter();
	generateTerrain();
}

function mainLoop() {
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	
	control.update();
	renderer.render(scene, camera);
	requestAnimationFrame(mainLoop);
}

init();
mainLoop();