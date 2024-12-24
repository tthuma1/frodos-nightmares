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

// renderer je edini, ki se ukvarja z webgpu
const canvas = document.querySelector('canvas');
const renderer = new UnlitRenderer(canvas);
await renderer.initialize();

// const gltfLoader = new GLTFLoader();
// await gltfLoader.load(new URL('./models/player/player.gltf', import.meta.url));

const gltfLoader = new GLTFLoader();
await gltfLoader.load(new URL('./scene/scene.gltf', import.meta.url));


// const resources = await loadResources({
//     'mesh': new URL('./models/floor/floor.json', import.meta.url),
//     'image': new URL('./models/floor/grass.png', import.meta.url),
// });

const scene = gltfLoader.loadScene(gltfLoader.defaultScene);
// scena je vozlisce, na katero so vezane neke komponenete
// const player = scene.find(node => node.getComponentOfType(Model))
const player = gltfLoader.loadNode("Player");
player.isPlayer = true;
const key = gltfLoader.loadNode('Torus.001'); //TODO: treba renamat na key
key.addComponent(new Key())
const camera = scene.find(node => node.getComponentOfType(Camera)); // najdemo kamero v sceni


// camera.addComponent(new TouchController(camera, canvas));
player.addComponent(camera)
player.addComponent(new Light({
        color: [0.5, 0.5, 0.5],
    })
);
player.addComponent(new LightView());

// // model je iz primitiva, ki je iz mesha (indeksi vozlišč) in teksture
player.addComponent({
    update(t, dt) {
    }
});


const mp = gltfLoader.loadNode('MovingPlat');
mp.isMovingPlat = true;
mp.beginTranslate = mp.getComponentOfType(Transform).translation;
mp.addComponent(new MovingPlatform(mp));
player.addComponent(new ThirdPersonController(player, canvas, mp));

gltfLoader.loadNode('Floor').isStatic = true;
gltfLoader.loadNode('Trampoline').isStatic = true;
gltfLoader.loadNode('Box.001').isStatic = true;
gltfLoader.loadNode('Box.002').isStatic = true;
gltfLoader.loadNode('Box.003').isStatic = true;
gltfLoader.loadNode('Box.004').isStatic = true;
gltfLoader.loadNode('Box.005').isStatic = true;
gltfLoader.loadNode('Wall.000').isStatic = true;
gltfLoader.loadNode('Wall.001').isStatic = true;
gltfLoader.loadNode('Wall.002').isStatic = true;
gltfLoader.loadNode('Wall.003').isStatic = true;
gltfLoader.loadNode('MovingPlat').isStatic = true;

gltfLoader.loadNode('Trampoline').isDraggable = true;
gltfLoader.loadNode('Box.001').isDraggable = true;
gltfLoader.loadNode('Box.002').isDraggable = true;
gltfLoader.loadNode('Box.003').isDraggable = true;
gltfLoader.loadNode('Box.004').isDraggable = true;
gltfLoader.loadNode('Box.005').isDraggable = true;

gltfLoader.loadNode('Trampoline').isTrampoline = true;
// const beginTranslate = mp.getComponentOfType(Transform).translation;
// gltfLoader.loadNode('MovingPlat').addComponent({
//     update(t, dt) {
//         t = performance.now() / 1000;
//         const node = gltfLoader.loadNode('MovingPlat');
//         const transform = node.getComponentOfType(Transform);
//         const x = Math.sin(t) * 5;
//         this.accX = Math.cos(t) * 5;
//         transform.translation = [beginTranslate[0] + x, beginTranslate[1], beginTranslate[2]];
//     }
// });

// const floor = new Node();
// floor.addComponent(new Transform({
//     scale: [10, 1, 10],
// }));
// floor.addComponent(new Model({
//     primitives: [
//         new Primitive({
//             mesh: resources.mesh,
//             material: new Material({
//                 baseTexture: new Texture({
//                     image: resources.image,
//                     sampler: new Sampler({
//                         minFilter: 'nearest',
//                         magFilter: 'nearest',
//                         addressModeU: 'repeat',
//                         addressModeV: 'repeat',
//                     }),
//                 }),
//             }),
//         }),
//     ],
// }));
// scene.addChild(floor);

scene.traverse(node => {
    const model = node.getComponentOfType(Model);
    if (!model) {
        return;
    }

    const boxes = model.primitives.map(primitive => calculateAxisAlignedBoundingBox(primitive.mesh));
    node.aabb = mergeAxisAlignedBoundingBoxes(boxes);
});

const physics = new Physics(scene, player, key);
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