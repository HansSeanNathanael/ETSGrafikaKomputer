const ASSETS_DIR = "./assets";
const SKYBOX_ASSETS = [
	"skybox_r.png", "skybox_l.png",
	"skybox_u.png", "skybox_d.png",
	"skybox_f.png", "skybox_b.png"
];

let canvas = null;

let scene = null;
let camera = null;

let renderer = null;

let control = null;

function loadSkyboxTexture() {
	let paths = [];
	for (let i = 0; i < SKYBOX_ASSETS.length; i++) {
		paths.push(ASSETS_DIR + "/" + SKYBOX_ASSETS[i]);
	}
	return paths;
}

function createSkybox() {
	let textureLoader = new THREE.TextureLoader();
	let skyboxMaterialArray = [];
	for (let i = 0; i < SKYBOX_ASSETS.length; i++) {
		let texture = textureLoader.load(ASSETS_DIR + "/" + SKYBOX_ASSETS[i]);
		skyboxMaterialArray.push(new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }));
	}
	let skyboxGeometry = new THREE.BoxGeometry(900, 900, 900);
	let skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterialArray);
	
	scene.add(skybox);
}

function testCreateCharacter() {
	const loader = new THREE.FBXLoader();
	loader.load(ASSETS_DIR + "/character.fbx", 
		(object) => {
			object.traverse( function ( child ) {
				if ( child.isMesh ) {
					child.castShadow = true;
					child.receiveShadow = true;
				}
			});
			
			scene.add(object)
		},
		(xhr) => {
			
		},
		(error) => {
			console.log(error)
		}
	)
}

function init() {
	canvas = document.getElementById("main-canvas");
	
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0xababab);
	
	camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 2000);
	camera.position.set(0, 0, 10);
	
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	
	control = new THREE.OrbitControls(camera, renderer.domElement);
	control.listenToKeyEvents( window );
	control.enableDamping = true;
	control.dampingFactor = 0.09;
	
	scene.add(new THREE.AmbientLight(0xffffff, 1.0));
	
	document.body.appendChild(renderer.domElement);
	
	createSkybox();
	testCreateCharacter();
}

function mainLoop() {
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	
	renderer.render(scene, camera);
	requestAnimationFrame(mainLoop);
}

init();
mainLoop();