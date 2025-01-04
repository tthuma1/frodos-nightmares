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
import { RotateAnimator } from './engine/animators/RotateAnimator.js';
import { ImageLoader } from './engine/loaders/ImageLoader.js';
import * as EasingFunctions from 'engine/animators/EasingFunctions.js';

const gltfLoader = new GLTFLoader();
const canvas = document.querySelector('canvas');
const renderer = new UnlitRenderer(canvas);
await renderer.initialize();

const imageLoader = new ImageLoader();
const environmentImages = await Promise.all([
    'px.webp',
    'nx.webp',
    'py.webp',
    'ny.webp',
    'pz.webp',
    'nz.webp',
].map(url => imageLoader.load(url)));
renderer.setEnvironment(environmentImages);


async function startGame(instantStart) {
    await gltfLoader.load(new URL('./frodomap/frodomap.gltf', import.meta.url));

    const scene = gltfLoader.loadScene(gltfLoader.defaultScene);
    const player = gltfLoader.loadNode("Player");
    player.isPlayer = true;
    const firstKey = gltfLoader.loadNode('key1');
    const finalKey = gltfLoader.loadNode('key2');
    firstKey.addComponent(new Key())
    finalKey.addComponent(new Key())
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
    const finalDoor = gltfLoader.loadNode("doors");
    const firstDoor = gltfLoader.loadNode("doors.001")
    const keyDoor = gltfLoader.loadNode("doors.002")

    // camera.addComponent(new TouchController(camera, canvas));
    player.addComponent(camera)
    const lanternLight = new Node();
    lanternLight.addComponent(new Light({
        color: [0.01, 0.01, 0.01],
        type: 0,
        isActive: false,
        intensity: 2,
    }));
    const flashLight = new Node();
    flashLight.addComponent(new Light({
        color: [0.5, 0.5, 0.5],
        type: 1,
        isActive: true,
        intensity: 3,
    }));

    player.addChild(lanternLight);
    player.addChild(flashLight);

    player.currentLight = 0;
    player.canSwitchLight = false;
    player.switchLight = () => {
        if (!player.canSwitchLight) {
            return;
        }

        const lights = [lanternLight.getComponentOfType(Light), flashLight.getComponentOfType(Light)];
        const nextLight = !player.currentLight ? 1 : 0;
        lights[player.currentLight].isActive = false;
        lights[nextLight].isActive = true;
        player.currentLight = nextLight;
    };


    const legRight = gltfLoader.loadNode("legRight");
    const legLeft = gltfLoader.loadNode("legLeft");
    const armRight = gltfLoader.loadNode("armRight");
    const armLeft = gltfLoader.loadNode("armLeft");

    /*** begin walk animators ***/
    legRight.addComponent(new RotateAnimator(legRight, {
        startRotation: [-20, 0, 0],
        endRotation: [20, 0, 0],
        duration: 0.3,
    }));
    legLeft.addComponent(new RotateAnimator(legLeft, {
        startRotation: [-20, 0, 0],
        endRotation: [20, 0, 0],
        duration: 0.3,
        startTime: 0.3,
    }));
    armLeft.addComponent(new RotateAnimator(armLeft, {
        startRotation: [-20, 0, 0],
        endRotation: [20, 0, 0],
        duration: 0.3,
    }));
    armRight.addComponent(new RotateAnimator(armRight, {
        startRotation: [-20, 0, 0],
        endRotation: [20, 0, 0],
        duration: 0.3,
        startTime: 0.3,
    }));
    player.addComponent(new RotateAnimator(player, {
        startRotation: [0, 15, 0],
        endRotation: [0, -15, 0],
        duration: 0.3,
    }))
    /*** end walk animators ***/

    /*** begin jump animators ***/
    armRight.addComponent(new RotateAnimator(armRight, {
        startRotation: [0, 0, 0],
        endRotation: [0, 0, -60],
        duration: 0.3,
        easeFunction: EasingFunctions.polyEaseInOut,
    }));
    armLeft.addComponent(new RotateAnimator(armLeft, {
        startRotation: [0, 0, 0],
        endRotation: [0, 0, 60],
        duration: 0.3,
        easeFunction: EasingFunctions.polyEaseInOut,
    }));
    legRight.addComponent(new RotateAnimator(legRight, {
        startRotation: [0, 0, 0],
        endRotation: [0, 0, 20],
        duration: 0.3,
        easeFunction: EasingFunctions.polyEaseInOut,
    }));
    legLeft.addComponent(new RotateAnimator(legLeft, {
        startRotation: [0, 0, 0],
        endRotation: [0, 0, -20],
        duration: 0.3,
        easeFunction: EasingFunctions.polyEaseInOut,
    }));
    /*** end jump animators ***/

    const movingPlatform = gltfLoader.loadNode('MovingPlatform');
    movingPlatform.isMovingPlatform = true;
    movingPlatform.isStatic = true;
    movingPlatform.addComponent(new MovingPlatform(movingPlatform));

    player.addComponent(new ThirdPersonController(player, canvas, gltfLoader));

    const draggableObjects =[
        'Cube.010',
        'orange_block',
        'purple_block',
        'green_block',
    ];

    const staticObject = [
        'Trampoline',
        'floor',
        'Cube.005',
        'Cube.006',
        'Cube.008',
        'Cube.001',
        'Cube.009',
        'doors',
        'doors.001',
        'doors.002',
        'wall1',
        'wall2',
        'wall3',
        'wall4',
        'wall5',
        'wall6',
        'wall7',
        'wall8',
        'wall10',
        'wall11',
        'wall13',
        'wall14',
        'wall15',
        'wall16',
        'wall17',
        'wall18',
        'wall19',
        'wall20',
        'wall21',
        'wall22',
    ];

    const searchableObjects = [
        'chest.01',
        'chest.02',
        'chest.03',
        'chest.04',
        'chest.05',
    ]

    for (const obj of staticObject) {
        gltfLoader.loadNode(obj).isStatic = true;
    }

    for (const obj of draggableObjects ) {
        gltfLoader.loadNode(obj).isStatic = true;
        gltfLoader.loadNode(obj).isDraggable = true;
    }

    gltfLoader.loadNode("BreakingFloor").isBreakable = true;
    gltfLoader.loadNode("BreakingFloor").isStatic = true;

    gltfLoader.loadNode("Ladder").isClimbable = true;
    gltfLoader.loadNode("Ladder").isStatic = true;

    const lanternIndex = Math.floor(Math.random() * searchableObjects.length);

    for (let i = 0; i < searchableObjects.length; i++) {
        gltfLoader.loadNode(searchableObjects.at(i)).isStatic = true;
        gltfLoader.loadNode(searchableObjects.at(i)).isSearchable = true;
        if (i === lanternIndex) {
            gltfLoader.loadNode(searchableObjects.at(i)).hasLantern = true;
        }
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

    const mirrorBall = gltfLoader.loadNode("MirrorBall")
    const mirrorMaterial = mirrorBall.getComponentOfType(Model).primitives[0].material;
    mirrorMaterial.isMirror = true;

    const lantern = gltfLoader.loadNode("Lantern");

    const physics = new Physics(scene, player, firstKey, finalKey, blockToCircleDict, movingPlatform, finalDoor, firstDoor, keyDoor, lantern, flashLight, gltfLoader, lanternLight);

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
    const updateSystem = new UpdateSystem({ update, render });

    const startGameTime = Date.now();
    physics.endFunction = () => {
        winGame(updateSystem, startGameTime);
    }

    if (instantStart) {
        updateSystem.start();
    } else {
        document.getElementById("start-btn").addEventListener("click", () => {
            document.getElementById("game").style.display = "block";
            document.getElementById("menu").style.display = "none";
            updateSystem.start();
        }, { once: true });
    }
}

function winGame(updateSystem, startTime) {
    updateSystem.stop();
    document.getElementById("startDrag").style.display = "none";
    document.getElementById("stopDrag").style.display = "none";
    document.getElementById("end").style.display = "block";

    const time = parseInt((Date.now() - startTime) / 1000);
    const minutes = parseInt(time / 60).toString().padStart(2, "0");
    const seconds = (time % 60).toString().padStart(2, "0");
    document.getElementById("time").innerText = minutes + ":" + seconds;

    document.getElementById("restart-btn").addEventListener("click", async () => {
        await startGame(true);
        document.getElementById("end").style.display = "none";
    }, { once: true });
}

startGame(false);