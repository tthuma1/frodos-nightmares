import { vec3, mat4, quat } from 'glm';
import { getGlobalModelMatrix } from 'engine/core/SceneUtils.js';
import {Light, Transform} from 'engine/core.js';
import {Key} from "./engine/core/Key.js";
import { ThirdPersonController } from './engine/controllers/ThirdPersonController.js';
import { MovingPlatform } from './engine/core/MovingPlatform.js';
import { Sound } from './engine/core/Sound.js';
import { RotateAnimator } from './engine/animators/RotateAnimator.js';

export class Physics {
    constructor(scene, player, key, blocksToCircleDict, movingPlatform, finalDoor, firstDoor, lantern, gltfLoader) {
        this.scene = scene;
        this.player = player;
        this.key = key;
        this.controller = this.player.getComponentOfType(ThirdPersonController);
        this.blocksToCircleDict = blocksToCircleDict;
        this.solvedPuzzle = false;
        this.movingPlatform = movingPlatform;
        this.finalDoor = finalDoor;
        this.firstDoor = firstDoor;
        this.lantern = lantern;
        this.sound = new Sound({
            collect: { src: './sounds/collect.mp3', volume : 0.6 },
        });

        this.gltfLoader = gltfLoader;
        this.leftArm = gltfLoader.loadNode("armLeft");
    }

    update(t, dt) {
        this.scene.traverse(node => {
            if (node !== this.player && node.isStatic && node !== this.controller.draggedNode) {
                this.resolveCollision(this.player, node)

                if (this.controller.draggedNode && node !== this.controller.draggedNode) { // second part of && is necessarry, is draggedNode is set while scene is updating
                    this.resolveCollision(this.controller.draggedNode, node);
                }
            }
        })

        if (this.key.getComponentOfType(Key).isCollected === false) {
            this.keyCollision(this.player, this.key)
        }
        
        if (!this.movingPlatform.getComponentOfType(MovingPlatform).solvedPuzzle){
            let counter = 0;
            for (const [block, circle] of this.blocksToCircleDict){
                if (this.blocksCircleCollision(block, circle))
                    counter++;
            }

            if (counter === 3) { // set to 3 when not testing
                this.movingPlatform.getComponentOfType(MovingPlatform).solvedPuzzle = true;

                const transform = this.finalDoor.getComponentOfType(Transform);
                const rotation = quat.create();
                quat.rotateY(rotation, rotation, Math.PI/2);
                transform.rotation = rotation;

                const boundingBox = this.getTransformedAABB(this.finalDoor);
                const width = boundingBox.max[0] - boundingBox.min[0];
                const offPosition = [width/2, 0, -width/2];
            }
        }
    }

    intervalIntersection(min1, max1, min2, max2) {
        return !(min1 > max2 || min2 > max1);
    }

    aabbIntersection(aabb1, aabb2) {
        return this.intervalIntersection(aabb1.min[0], aabb1.max[0], aabb2.min[0], aabb2.max[0])
            && this.intervalIntersection(aabb1.min[1], aabb1.max[1], aabb2.min[1], aabb2.max[1])
            && this.intervalIntersection(aabb1.min[2], aabb1.max[2], aabb2.min[2], aabb2.max[2]);
    }

    getTransformedAABB(node) {
        // Transform all vertices of the AABB from local to global space.
        const matrix = getGlobalModelMatrix(node);
        const { min, max } = node.aabb;
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
        return { min: newmin, max: newmax };
    }

    resolveCollision(a, b) {
        // Get global space AABBs.
        const aBox = this.getTransformedAABB(a);
        const bBox = this.getTransformedAABB(b);

        const bDragBox = this.toDragBox(bBox);

        // Check if there is collision.
        const isColliding = this.aabbIntersection(aBox, bBox);
        const isDragColliding = this.aabbIntersection(aBox, bDragBox);

        if(isDragColliding) {
            this.displayDragText(aBox, bDragBox, b);
        }

        if (!isColliding) {
            return;
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
                startDragText.style.display = "block";
                startDragText.innerText = "Press E to start dragging."
                if (this.controller.keys['KeyE']) {
                    this.controller.startDragging(b);
                }
            } else if (b.isSearchable) {
                startDragText.style.display = "block";
                startDragText.innerText = "Press E to search chest."
                if (this.controller.keys['KeyE']) {
                    this.searchChest(b)
                }
            } else {
                startDragText.style.display = "none";
            }
        } else {
            startDragText.style.display = "none";
        }
    }

    searchChest(chest) {
        chest.isSearchable = false;
        if (chest.hasLantern) {
            const lanternComponent = this.player.children.find(x => x.getComponentOfType(Light)).getComponentOfType(Light);
            lanternComponent.color = [0.2, 0.07, 0.0];

            const doorTransform = this.firstDoor.getComponentOfType(Transform);
            const rotation = quat.create();
            quat.rotateY(rotation, rotation, -Math.PI/2);
            doorTransform.rotation = rotation;
            vec3.add(doorTransform.translation, doorTransform.translation, [-0.5, 0, -0.5])

            const lanternTransform = this.lantern.getComponentOfType(Transform)
            console.log(lanternTransform.translation)
            const playerTransform = this.player.getComponentOfType(Transform)
            console.log(playerTransform.translation)
            vec3.add(lanternTransform.translation, lanternTransform.translation, [0, 29*6.02 - 1.3, 0]);
            console.log(lanternTransform.translation)

            const armRotation = this.leftArm.getComponentOfType(Transform).rotation;
            quat.rotateX(armRotation, armRotation, -Math.PI/2);

            this.leftArm.removeComponentsOfType(RotateAnimator);
        }
    }

    keyCollision(player, key) {
        const playerBox = this.getTransformedAABB(player);
        const keyBox = this.getTransformedAABB(key);

        // Check if there is collision.
        const isColliding = this.aabbIntersection(playerBox, keyBox);
        if (!isColliding) {
            return;
        }
        this.key.getComponentOfType(Key).collectKey()
        this.scene.removeChild(this.key)
        this.sound.play('collect');
        //this.endFunction();
    }

    blocksCircleCollision(block, circle) {
        const blockBox = this.getTransformedAABB(block);
        const circleBox = this.getTransformedAABB(circle);
        
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
}
