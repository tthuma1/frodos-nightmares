import { quat } from 'glm';
import { Camera, Model, Transform, Node, Light } from 'engine/core.js';
import { GLTFLoader } from 'engine/loaders/GLTFLoader.js';
import { ResizeSystem } from 'engine/systems/ResizeSystem.js';
import { UpdateSystem } from 'engine/systems/UpdateSystem.js';
import { UnlitRenderer } from 'engine/renderers/UnlitRenderer.js';
import {FirstPersonController} from "./engine/controllers/FirstPersonController.js";

// renderer je edini, ki se ukvarja z webgpu
const canvas = document.querySelector('canvas');
const renderer = new UnlitRenderer(canvas);
await renderer.initialize();

const gltfLoader = new GLTFLoader();
await gltfLoader.load(new URL('./models/player/player.gltf', import.meta.url));

const scene = gltfLoader.loadScene(gltfLoader.defaultScene);
// scena je vozlisce, na katero so vezane neke komponenete
const player = scene.find(node => node.getComponentOfType(Model))
const camera = scene.find(node => node.getComponentOfType(Camera)); // najdemo kamero v sceni

// model je iz primitiva, ki je iz mesha (indeksi vozlišč) in teksture

const model = scene.find(node => node.getComponentOfType(Model));
model.addComponent({
    update(t, dt) {
        // const transform = model.getComponentOfType(Transform);
        // const scale = 1;
        // transform.scale = [scale, scale, scale];
        // const x = Math.sin(t);
        // transform.translation = [x, 0, 0];
    }
});

model.addComponent(new FirstPersonController(model, canvas))

const light = new Node();
light.addComponent(new Transform());
light.addComponent(new Light({
    color: [1, 0, 0],
}));
light.addComponent(new Transform({
    translation: [0, 5, 0],
}));
light.addComponent({
    update(t, dt) {
        const lightComponent = light.getComponentOfType(Light);
        const red = (Math.sin(t) ** 2) * 5;
        lightComponent.color = [red, 1, 1];
    }
})
scene.addChild( light )

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
