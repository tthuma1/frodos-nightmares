import { quat } from 'glm';
import {
    Camera,
    Material,
    Model,
    Node,
    Primitive,
    Sampler,
    Texture,
    Transform,
    Light
} from 'engine/core.js';
import { GLTFLoader } from 'engine/loaders/GLTFLoader.js';
import { ResizeSystem } from 'engine/systems/ResizeSystem.js';
import { UpdateSystem } from 'engine/systems/UpdateSystem.js';
import { UnlitRenderer } from 'engine/renderers/UnlitRenderer.js';
import { ThirdPersonController } from "./engine/controllers/ThirdPersonController.js";
import { TouchController } from "./engine/controllers/TouchController.js";
import { loadResources } from 'engine/loaders/resources.js';

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
// const player = gltfLoader.loadNode("Player");
const camera = scene.find(node => node.getComponentOfType(Camera)); // najdemo kamero v sceni
camera.addComponent(new Transform({
    translation: [
        0,15,15
    ],
    rotation: [
        -0.25,0,0,1
    ],
}));


// camera.addComponent(new TouchController(camera, canvas));
// player.addComponent(camera)

// // model je iz primitiva, ki je iz mesha (indeksi vozlišč) in teksture
// player.addComponent({
//     update(t, dt) {
//     }
// });

// player.addComponent(new ThirdPersonController(player, canvas));


const light = new Node();
light.addComponent(new Transform());
light.addComponent(new Light({
    color: [0.5, 0.5, 0.5],
}));
light.addComponent(new Transform({
    translation: [0, 5, 0],
}));
light.addComponent({
    update(t, dt) {
        const lightComponent = light.getComponentOfType(Light);
        const red = (Math.sin(t) ** 2);
        lightComponent.color = [red, 0.1, 0.1];
    }
})
scene.addChild( light )

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

function update(t, dt) {
    scene.traverse(node => {
        for (const component of node.components) {
            component.update?.(t, dt);
        }
    });
}

function render() {
    renderer.render(scene, camera);
}

function resize({ displaySize: { width, height }}) {
    camera.getComponentOfType(Camera).aspect = width / height;
}

new ResizeSystem({ canvas, resize }).start();
new UpdateSystem({ update, render }).start();
