import {quat, vec3} from 'glm';
import {getGlobalModelMatrix} from 'engine/core/SceneUtils.js';
import {Camera, Light, Transform} from 'engine/core.js';
import {Key} from "./engine/core/Key.js";
import {ThirdPersonController} from './engine/controllers/ThirdPersonController.js';
import {MovingPlatform} from './engine/core/MovingPlatform.js';
import {Sound} from './engine/core/Sound.js';
import {RotateAnimator} from './engine/animators/RotateAnimator.js';
import {LinearAnimator} from './engine/animators/LinearAnimator.js';

export class Physics {
    constructor(scene, player, firstKey, finalKey, blocksToCircleDict, movingPlatform, finalDoor, firstDoor, keyDoor, lantern, flashlight, gltfLoader, lanternLight, externalLights) {
        this.scene = scene;
        this.player = player;
        this.firstKey = firstKey;
        this.finalKey = finalKey;
        this.controller = this.player.getComponentOfType(ThirdPersonController);
        this.blocksToCircleDict = blocksToCircleDict;
        this.solvedPuzzle = false;
        this.movingPlatform = movingPlatform;
        this.finalDoor = finalDoor;
        this.firstDoor = firstDoor;
        this.keyDoor = keyDoor;
        this.lantern = lantern;
        this.flashlight = flashlight;
        this.sound = new Sound({
            collect: { src: './sounds/collect.mp3', volume : 0.6 },
            floorBreak: {src: './sounds/floorBreak.mp3', volume: 0.2 },
            doorCreek: {src: './sounds/doorCreek.mp3', volume: 0.4 },
            keyUnlock: {src: './sounds/unlock.mp3', volume: 0.6 },
        });

        this.gltfLoader = gltfLoader;
        this.leftArm = gltfLoader.loadNode("armLeft");
        this.lanternLight = lanternLight;

        this.isDragColliding = false;

        this.externalLights = externalLights;
        this.doorsOpened = -1;
    }

    update(t, dt) {
        this.isDragColliding = false;
        this.controller.isPlayerOnLadder = false;
        this.controller.isPlayerOnFloor = false;
        this.scene.traverse(node => {
            if (node !== this.player && node.isStatic && node !== this.controller.draggedNode) {
                this.resolveCollision(this.player, node)

                if (this.controller.draggedNode && node !== this.controller.draggedNode) { // second part of && is necessarry, is draggedNode is set while scene is updating
                    this.resolveCollision(this.controller.draggedNode, node);
                }
            }
        })

        if (!this.firstKey.getComponentOfType(Key).isCollected) {
            const firstKeyRotation = this.firstKey.getComponentOfType(Transform).rotation;
            quat.rotateX(firstKeyRotation, firstKeyRotation, dt * 2);

            this.keyCollision(this.player, this.firstKey, this.keyDoor)
        }

        if (!this.finalKey.getComponentOfType(Key).isCollected) {
            const finalKeyRotation = this.finalKey.getComponentOfType(Transform).rotation;
            quat.rotateX(finalKeyRotation, finalKeyRotation, dt * 2);

            this.keyCollision(this.player, this.finalKey, this.finalDoor)
        }

        if (!this.movingPlatform.getComponentOfType(MovingPlatform).solvedPuzzle){
            this.checkBlockPuzzle()
        }

        const startDragText = document.getElementById("startDrag");
        if (this.isDragColliding) {
            startDragText.style.display = 'block';
        } else {
            startDragText.style.display = 'none';
        }
    }

    checkBlockPuzzle() {
        let counter = 0;
        for (const [block, circle] of this.blocksToCircleDict){
            if (this.blocksCircleCollision(block, circle))
                counter++;
        }

        if (counter === 3) {
            this.movingPlatform.getComponentOfType(MovingPlatform).solvedPuzzle = true;
        }
    }

    openDoor(key, door) {
        if (this.doorsOpened !== -1) {
            const externalLightComponent = this.externalLights[this.doorsOpened].getComponentOfType(Light);
            externalLightComponent.isActive = true;
        }

        this.doorsOpened += 1;

        this.controller.doorAnimation = true;
        this.controller.stopWalkAnimation();
        const camera = this.scene.find(node => node.getComponentOfType(Camera));

        const doorTransform = door.getComponentOfType(Transform);
        const cameraTransform = camera.getComponentOfType(Transform);
        const keyTransform = key != null ? key.getComponentOfType(Transform) : null;

        const initialCameraTranslation = cameraTransform.translation.slice()

        const moveToDoorAnimator = new LinearAnimator(camera, {
            startPosition: cameraTransform.translation.slice(),
            endPosition: vec3.add(vec3.create(), doorTransform.translation.slice(), [-2, 4, 10]),
            loop: false,
            duration: 2,
            startTime: performance.now() / 1000,
            transform: cameraTransform,
        });

        camera.addComponent(moveToDoorAnimator)
        moveToDoorAnimator.play()

        if (key != null) {
            const doorPosition = doorTransform.translation.slice();
            const keyPosition = keyTransform.translation.slice();

            const isDoorToLeft = doorPosition[0] < keyPosition[0];
            keyTransform.rotation = isDoorToLeft ? [-0.5, -0.5, -0.5, -0.5] : [0.5, 0.5, -0.5, -0.5];

            const endPosition = vec3.create();
            if (isDoorToLeft) {
                keyTransform.rotation = [-0.5, -0.5, -0.5, -0.5];
                vec3.sub(endPosition, doorTransform.translation.slice(), [-0.4, 0, -0.5])
            }else {
                keyTransform.rotation = [0.5, 0.5, -0.5, -0.5];
                vec3.sub(endPosition, doorTransform.translation.slice(), [+0.4, 0, -0.4])
            }
            const moveKeyToDoorAnimator = new LinearAnimator(key, {
                startPosition: keyTransform.translation.slice(),
                endPosition: endPosition,
                loop: false,
                duration: 2,
                startTime: performance.now() / 1000,
                transform: keyTransform,
            });

            key.addComponent(moveKeyToDoorAnimator)
            moveKeyToDoorAnimator.play()

            setTimeout(() => {
                this.sound.play("keyUnlock")
                keyTransform.rotation = isDoorToLeft ? [-0.025, -0.706, -0.025, -0.706] : [0.025, -0.706, -0.025, 0.706]

            }, 2300)

            setTimeout(() => {
                this.scene.removeChild(key)
            }, 2600)
        }

        setTimeout(() => {
            const doorLinearAnimator = new LinearAnimator(door, {
                startPosition: doorTransform.translation.slice(),
                endPosition: vec3.add(vec3.create(), doorTransform.translation.slice(), [-0.5, 0, -0.5]),
                loop: false,
                duration: 1,
                startTime: performance.now() / 1000,
                transform: doorTransform,
            });
            door.addComponent(doorLinearAnimator);
            doorLinearAnimator.play();

            const doorAnimator = new RotateAnimator(door, {
                endRotation: [0, -90, 0],
                loop: false,
                duration: 1,
                startTime: performance.now() / 1000,
                transform: doorTransform,
            });
            door.addComponent(doorAnimator);
            doorAnimator.play();

            this.sound.play("doorCreek");
        }, 3000);

        let moveCameraToPlayerAnimator = null

        setTimeout(() => {
            moveCameraToPlayerAnimator = new LinearAnimator(door, {
               startPosition: cameraTransform.translation.slice(),
               endPosition: initialCameraTranslation,
               loop: false,
               duration: 1,
               startTime: performance.now() / 1000,
               transform: cameraTransform,
            })

            camera.addComponent(moveCameraToPlayerAnimator);
            moveCameraToPlayerAnimator.play()
        }, 4300);

        setTimeout(() => {
            camera.removeComponent(moveToDoorAnimator);
            camera.removeComponent(moveCameraToPlayerAnimator);
            this.controller.doorAnimation = false;
        }, 5300);
    }

    intervalIntersection(min1, max1, min2, max2) {
        return !(min1 > max2 || min2 > max1);
    }

    aabbIntersection(aabb1, aabb2) {
        return this.intervalIntersection(aabb1.min[0], aabb1.max[0], aabb2.min[0], aabb2.max[0])
            && this.intervalIntersection(aabb1.min[1], aabb1.max[1], aabb2.min[1], aabb2.max[1])
            && this.intervalIntersection(aabb1.min[2], aabb1.max[2], aabb2.min[2], aabb2.max[2]);
    }

    resolveCollision(a, b) {
        // Get global space AABBs.
        const aBox = getTransformedAABB(a);
        const bBox = getTransformedAABB(b);

        const bDragBox = this.toDragBox(bBox);
        // Check if there is collision.
        let isColliding = this.aabbIntersection(aBox, bBox);
        if (b.isBreakable) {
            const bBreakBox = this.toBreakBox(bBox);
            isColliding = this.aabbIntersection(aBox, bBreakBox);
        }

        const isDragColliding = this.aabbIntersection(aBox, bDragBox);
        if (isDragColliding) {
            this.displayDragText(aBox, bDragBox, b);

            if (b.isClimbable) {
                this.controller.isPlayerOnLadder = true;
            }
        }

        if (!isColliding) {
            return;
        }

        //Handles breaking floor logic
        if (b.isBreakable) {
            this.sound.play("floorBreak");
            this.flashlight.getComponentOfType(Light).isActive = false;

            const floorTransform = b.getComponentOfType(Transform)
            floorTransform.translation = [-100, -100, -100];

            const lantern = this.lanternLight.getComponentOfType(Light)

            setTimeout(() => {
                const lightAnimator = new LinearAnimator(lantern, {
                    startPosition: vec3.clone([0, 0, 0]),
                    endPosition: vec3.clone([0.01, 0.01, 0.01]),
                    loop: false,
                    duration: 1,
                    startTime: performance.now() / 1000,
                    transform: lantern.color,
                });
                this.player.addComponent(lightAnimator);
                lightAnimator.play();
                this.lanternLight.getComponentOfType(Light).isActive = true;
            }, 4000)
        } else if (b.isFloorOutside) {
            this.endFunction();
        }

        const minDirection = this.getMinDirection(aBox, bBox);

        // player hit his head in an object
        if (this.controller.jumpVelocity > 0 && minDirection[1] < -1e-4) {
            this.controller.jumpVelocity = 0;
        }
        // player is on top of object and is falling (you can only land if you're falling)
        if (this.controller.jumpVelocity < 0 && minDirection[1] > 1e-4) {
            this.controller.finishJump(b);
        }

        // transform player
        const transform = this.player.getComponentOfType(Transform);
        if (!transform) {
            return;
        }
        vec3.add(transform.translation, transform.translation, minDirection);

        // transform dragged node
        if (this.controller.draggedNode) {
            const draggedTransform = this.controller.draggedNodeTransform();
            vec3.add(draggedTransform.translation, draggedTransform.translation, [minDirection[0], 0, minDirection[2]]);
        }

        // transform camera with player
        const cameraTranslation = this.player.components[2].getComponentOfType(Transform).translation;
        vec3.add(cameraTranslation, cameraTranslation, minDirection);
    }

    displayDragText(aBox, bDragBox, b) {
        // check if collision is with draggable item
        const minDragDirection = this.getMinDirection(aBox, bDragBox);
        const startDragText = document.getElementById("startDrag");

        if (
            (Math.abs(minDragDirection[0]) > 1e-4 || Math.abs(minDragDirection[2]) > 1e-4) &&
            !this.controller.draggedNode &&
            this.controller.jumpVelocity < 1e-4
        ) {
            if (b.isDraggable) {
                startDragText.innerText = "Press E to start dragging."
                if (this.controller.keys['KeyE']) {
                    this.controller.startDragging(b);
                }
                this.isDragColliding = true;
            } else if (b.isSearchable) {
                startDragText.innerText = "Press E to search chest."
                if (this.controller.keys['KeyE']) {
                    this.searchChest(b)
                }
                this.isDragColliding = true;
            }
        }
    }

    searchChest(chest) {
        chest.isSearchable = false;
        const chestAnim = new RotateAnimator(chest.children[0], {
            endRotation: [0, 0, -55],
            loop: false,
            duration: 0.7,
            startTime: performance.now() / 1000,
            transform: chest.children[0].getComponentOfType(Transform),
        });
        chest.children[0].addComponent(chestAnim);
        chestAnim.play();

        if (chest.hasLantern) {
            const lanternComponent = this.player.children.find(x => x.getComponentOfType(Light)).getComponentOfType(Light);
            lanternComponent.color = [0.2, 0.07, 0.01];

            this.openDoor(null, this.firstDoor)

            const lanternTransform = this.lantern.getComponentOfType(Transform)
            vec3.add(lanternTransform.translation, lanternTransform.translation, [0, 29*6.02 - 1.3, 0]);

            const armRotation = this.leftArm.getComponentOfType(Transform).rotation;
            quat.rotateX(armRotation, armRotation, -Math.PI/2);

            this.leftArm.removeComponentsOfType(RotateAnimator);

            this.lanternLight.addComponent(new Transform({
                translation: [1.5, 0.5, 1.5],
            }));

            this.updatePlayerAABB();
            this.player.canSwitchLight = true;
            this.controller.hasLantern = true;
        }
    }

    keyCollision(player, key, door) {
        const playerBox = getTransformedAABB(player);
        const keyBox = getTransformedAABB(key);

        // Check if there is collision.
        const isColliding = this.aabbIntersection(playerBox, keyBox);
        if (!isColliding) {
            return;
        }


        key.getComponentOfType(Key).collectKey()
        this.openDoor(key, door)
        this.sound.play('collect');
    }

    blocksCircleCollision(block, circle) {
        const blockBox = getTransformedAABB(block);
        const circleBox = getTransformedAABB(circle);

        const isColliding = this.aabbIntersection(blockBox, circleBox);
        if (!isColliding) {
            return false;
        }
        return true;

    }

    getMinDirection(aBox, bBox) {
        // Move node A minimally to avoid collision.
        const diffa = vec3.sub(vec3.create(), bBox.max, aBox.min);
        const diffb = vec3.sub(vec3.create(), aBox.max, bBox.min);


        let minDiff = Infinity;
        let minDirection = [0, 0, 0];
        if (diffa[0] >= 0 && diffa[0] < minDiff) {
            minDiff = diffa[0];
            minDirection = [minDiff, 0, 0];
        }
        if (diffa[1] >= 0 && diffa[1] < minDiff) {
            minDiff = diffa[1];
            minDirection = [0, minDiff, 0];
        }
        if (diffa[2] >= 0 && diffa[2] < minDiff) {
            minDiff = diffa[2];
            minDirection = [0, 0, minDiff];
        }
        if (diffb[0] >= 0 && diffb[0] < minDiff) {
            minDiff = diffb[0];
            minDirection = [-minDiff, 0, 0];
        }
        if (diffb[1] >= 0 && diffb[1] < minDiff) {
            minDiff = diffb[1];
            minDirection = [0, -minDiff, 0];
        }
        if (diffb[2] >= 0 && diffb[2] < minDiff) {
            minDiff = diffb[2];
            minDirection = [0, 0, -minDiff];
        }

        return minDirection;
    }

    toDragBox(box) {
        return {
            min: [box.min[0] - 0.5, box.min[1] - 0.5, box.min[2] - 0.5],
            max: [box.max[0] + 0.5, box.max[1] + 0.5, box.max[2] + 0.5],
        }
    }

    toBreakBox(box) {
        return {
            min: [box.min[0] + 0.5, box.min[1] + 0.5, box.min[2] + 0.5],
            max: [box.max[0] - 0.5, box.max[1] - 0.5, box.max[2] - 0.5],
        }
    }

    updatePlayerAABB() {
        this.player.aabb.max[2] = this.lantern.aabb.max[2];
    }
}

export function getTransformedAABB(node) {
    // Transform all vertices of the AABB from local to global space.
    const matrix = getGlobalModelMatrix(node);
    const {min, max} = node.aabb;
    const vertices = [
        [min[0], min[1], min[2]],
        [min[0], min[1], max[2]],
        [min[0], max[1], min[2]],
        [min[0], max[1], max[2]],
        [max[0], min[1], min[2]],
        [max[0], min[1], max[2]],
        [max[0], max[1], min[2]],
        [max[0], max[1], max[2]],
    ].map(v => vec3.transformMat4(v, v, matrix));

    // Find new min and max by component.
    const xs = vertices.map(v => v[0]);
    const ys = vertices.map(v => v[1]);
    const zs = vertices.map(v => v[2]);
    const newmin = [Math.min(...xs), Math.min(...ys), Math.min(...zs)];
    const newmax = [Math.max(...xs), Math.max(...ys), Math.max(...zs)];
    return {min: newmin, max: newmax};
}