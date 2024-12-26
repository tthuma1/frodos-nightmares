import {
    Camera,
    Material,
    Model,
    Node,
    Primitive,
    Sampler,
    Texture,
    Transform,
    Light,
    LightView
} from 'engine/core.js';
import { GLTFLoader } from 'engine/loaders/GLTFLoader.js';
import { ResizeSystem } from 'engine/systems/ResizeSystem.js';
import { UpdateSystem } from 'engine/systems/UpdateSystem.js';
import { UnlitRenderer } from 'engine/renderers/UnlitRenderer.js';
import { ThirdPersonController } from "./engine/controllers/ThirdPersonController.js";
import { Physics } from './Physics.js';
import {
    calculateAxisAlignedBoundingBox,
    mergeAxisAlignedBoundingBoxes,
} from 'engine/core/MeshUtils.js';
import {Key} from "./engine/core/Key.js";
import { MovingPlatform } from './engine/core/MovingPlatform.js';
import { TouchController } from './engine/controllers/TouchController.js'
import { quat, vec3, vec4, mat3, mat4 } from './lib/glm.js';

// renderer je edini, ki se ukvarja z webgpu
const canvas = document.querySelector('canvas');
const renderer = new UnlitRenderer(canvas);
await renderer.initialize();

// const gltfLoader = new GLTFLoader();
// await gltfLoader.load(new URL('./models/player/player.gltf', import.meta.url));

const gltfLoader = new GLTFLoader();
await gltfLoader.load(new URL('./frodomap/frodomap.gltf', import.meta.url));




// const resources = await loadResources({
//     'mesh': new URL('./models/floor/floor.json', import.meta.url),
//     'image': new URL('./models/floor/grass.png', import.meta.url),
// });

const scene = gltfLoader.loadScene(gltfLoader.defaultScene);
// scena je vozlisce, na katero so vezane neke komponenete
// const player = scene.find(node => node.getComponentOfType(Model))
const player = gltfLoader.loadNode("Player");
player.isPlayer = true;
const key = gltfLoader.loadNode('key');
key.addComponent(new Key())
const camera = scene.find(node => node.getComponentOfType(Camera)); // najdemo kamero v sceni


// BOXES
const orange_block = gltfLoader.loadNode("orange_block");
const purple_block = gltfLoader.loadNode("purple_block");
const green_block = gltfLoader.loadNode("green_block");

const orange_circle = gltfLoader.loadNode("orange_circle");
const purple_circle = gltfLoader.loadNode("purple_circle");
const green_circle = gltfLoader.loadNode("green_circle");

const blockToCircleDict = new Map([
    [orange_block, orange_circle],
    [purple_block, purple_circle],
    [green_block, green_circle]
]);

// doors
const doors = gltfLoader.loadNode("doors");


// camera.addComponent(new TouchController(camera, canvas));
player.addComponent(camera)
const lanternLight = new Light({
    color: [0.2, 0.07, 0.0],
    type: 0,
    isActive: true,
});
const flashLight = new Light({
    color: [0.5, 0.5, 0.5],
    type: 1,
    isActive: false,
});

player.addComponent(lanternLight);
player.addComponent(flashLight);
player.currentLight = 0;
player.switchLight = () => {
    const lights = player.getComponentsOfType(Light);
    const nextLight = !player.currentLight ? 1 : 0;
    lights[player.currentLight].isActive = false;
    lights[nextLight].isActive = true;
    player.currentLight = nextLight;
};

player.addComponent(new LightView());

const movingPlatform = gltfLoader.loadNode('MovingPlatform');
movingPlatform.isMovingPlatform = true;
movingPlatform.isStatic = true;
movingPlatform.addComponent(new MovingPlatform(movingPlatform));
player.addComponent(new ThirdPersonController(player, canvas));

const draggableObjects =[
    'Cube.017',
    'orange_block',
    'purple_block',
    'green_block',
];
const staticObject = [
    'Floor',
    'Cube.004',
    'wall1',
    'wall2',
    'wall3',
    'wall4',
    'Cube.016',
    'doors',
    'wall4.001',
    'wall4.003',
]

for (const obj of staticObject) {
    gltfLoader.loadNode(obj).isStatic = true;
}

for (const obj of draggableObjects ) {
    gltfLoader.loadNode(obj).isStatic = true;
    gltfLoader.loadNode(obj).isDraggable = true;
}

gltfLoader.loadNode('Trampoline').isTrampoline = true;

scene.traverse(node => {
    const model = node.getComponentOfType(Model);
    if (!model) {
        return;
    }

    const boxes = model.primitives.map(primitive => calculateAxisAlignedBoundingBox(primitive.mesh));
    node.aabb = mergeAxisAlignedBoundingBoxes(boxes);
});

const physics = new Physics(scene, player, key, blockToCircleDict, movingPlatform, doors);
function update(t, dt) {
    scene.traverse(node => {
        for (const component of node.components) {
            component.update?.(t, dt);
        }
    });

    physics.update(t, dt);
}

function render() {
    renderer.render(scene, camera);
}

function resize({ displaySize: { width, height }}) {
    camera.getComponentOfType(Camera).aspect = width / height;
}

new ResizeSystem({ canvas, resize }).start();
new UpdateSystem({ update, render }).start();