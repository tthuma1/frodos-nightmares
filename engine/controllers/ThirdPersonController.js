import { quat, vec3, mat4 } from 'glm';

import { Transform } from '../core/Transform.js';
import {Camera} from "../core/Camera.js";
import { MovingPlatform } from '../core/MovingPlatform.js';

export class ThirdPersonController {

    constructor(node, domElement, {
        pitch = 0,
        yaw = 0,
        velocity = [0, 0, 0],
        acceleration = 50,
        maxSpeed = 5,
        decay = 0.99999,
    } = {}) {
        this.node = node;
        this.domElement = domElement;

        this.keys = {};

        this.pitch = pitch;
        this.yaw = yaw;

        this.velocity = velocity;
        this.acceleration = acceleration;
        this.maxSpeed = maxSpeed;
        this.decay = decay;


        this.jumpVelocity = 0;
        this.jumpForce = 10;
        this.isJumping = false;
        this.gravity = -20;

        this.draggedNode = null;
        this.lastDragTime = 0;

        this.movingPlatform = null;
        this.jumpOffVelocity = null; // velocity that moving platform had when you jumped off it

        this.initHandlers();
    }

    initHandlers() {

        this.keydownHandler = this.keydownHandler.bind(this);
        this.keyupHandler = this.keyupHandler.bind(this);

        const element = this.domElement;
        const doc = element.ownerDocument;

        doc.addEventListener('keydown', this.keydownHandler);
        doc.addEventListener('keyup', this.keyupHandler);
    }

    update(t, dt) {
        // Calculate forward and right vectors.
        const cos = Math.cos(this.yaw);
        const sin = Math.sin(this.yaw);
        const forward = [-sin, 0, -cos];
        const right = [cos, 0, -sin];

        // Map user input to the acceleration vector.
        const acc = vec3.create();
        if (this.keys['KeyW']) {
            vec3.add(acc, acc, forward);
        }
        if (this.keys['KeyS']) {
            vec3.sub(acc, acc, forward);
        }
        if (this.keys['KeyD']) {
            vec3.add(acc, acc, right);
        }
        if (this.keys['KeyA']) {
            vec3.sub(acc, acc, right);
        }
        if (this.keys['Space'] && !this.isJumping && !this.draggedNode) {
            this.isJumping = true;
            this.jumpVelocity = this.jumpForce;
            this.jumpOffVelocity = this.movingPlatform ? this.movingPlatform.getComponentOfType(MovingPlatform).velocity[0] : null;
        }

        if (this.keys['KeyE'] && this.draggedNode) {
            this.stopDragging();
        }

        this.jumpVelocity = this.jumpVelocity + dt * this.gravity;

        // Update velocity based on acceleration.
        vec3.scaleAndAdd(this.velocity, this.velocity, acc, dt * this.acceleration);

        // If there is no user input, apply decay.
        if (!this.keys['KeyW'] &&
            !this.keys['KeyS'] &&
            !this.keys['KeyD'] &&
            !this.keys['KeyA'])
        {
            const decay = Math.exp(dt * Math.log(1 - this.decay));
            vec3.scale(this.velocity, this.velocity, decay);
        }

        // Limit speed to prevent accelerating to infinity and beyond.
        const speed = vec3.length(this.velocity);
        if (speed > this.maxSpeed) {
            vec3.scale(this.velocity, this.velocity, this.maxSpeed / speed);
        }

        const transform = this.node.getComponentOfType(Transform);
        if (transform) {

            vec3.scaleAndAdd(transform.translation, transform.translation, [this.movingPlatformXVelocity(), 0, 0], dt);
            vec3.scaleAndAdd(transform.translation, transform.translation, this.velocity, dt);
            vec3.scaleAndAdd(transform.translation, transform.translation, [0, this.jumpVelocity, 0], dt);

            // translate camera with player
            const cameraTranslation = this.node.components[2].getComponentOfType(Transform);
            vec3.scaleAndAdd(cameraTranslation.translation,
                cameraTranslation.translation, this.velocity, dt);
            vec3.scaleAndAdd(cameraTranslation.translation, cameraTranslation.translation, [this.movingPlatformXVelocity(), 0, 0], dt);

            // translate dragged object
            if(this.draggedNode) {
                const draggedTransform = this.draggedNodeTransform();
                vec3.scaleAndAdd(draggedTransform.translation, draggedTransform.translation, [this.velocity[0], 0, this.velocity[2]], dt);
            }
            // vec3.scaleAndAdd(transform.translation, transform.translation, this.velocity, dt);


            // Update rotation based on the Euler angles.
            const rotation = quat.create();
            quat.rotateY(rotation, rotation, this.yaw);
            quat.rotateX(rotation, rotation, this.pitch);
            transform.rotation = rotation;

            // semi prevent weird bug that brakes gravity when switching tabs
            if (transform.translation[1] < 1) {
                transform.translation[1] = 1;
                this.isJumping = false;
                this.movingPlatform = null;
            }
        }
    }

    startDragging(draggedNode) {
        if (this.lastDragTime && Date.now() - this.lastDragTime < 200) return; // wait for 200 ms before being able to drag again
        this.draggedNode = draggedNode;

        const startDragText = document.getElementById("startDrag");
        startDragText.style.display = "none";

        const stopDragText = document.getElementById("stopDrag");
        stopDragText.style.display = "block";

        this.lastDragTime = Date.now();
    }

    stopDragging() {
        if (this.lastDragTime && Date.now() - this.lastDragTime < 200) return; // wait for 200 ms before being able to stop drag
        this.draggedNode = null;

        const stopDragText = document.getElementById("stopDrag");
        stopDragText.style.display = "none";

        this.lastDragTime = Date.now();
    }

    draggedNodeTransform()
    {
        return this.draggedNode?.getComponentOfType(Transform);
    }

    finishJump(node)
    {
        if (node.isTrampoline) {
            this.jumpVelocity = 15;
            this.movingPlatform = null;
        } else if (node.isMovingPlatform) {
            this.jumpVelocity = 0;
            this.isJumping = false;
            this.movingPlatform = node;
        } else {
            this.jumpVelocity = 0;
            this.isJumping = false;
            this.movingPlatform = null;
        }

        this.jumpOffVelocity = null;
    }

    keydownHandler(e) {
        this.keys[e.code] = true;
    }

    keyupHandler(e) {
        this.keys[e.code] = false;
    }

    movingPlatformXVelocity()
    {
        if (!this.movingPlatform) {
            return 0;
        }

        // if player jumped off moving platform, apply velocity that it had on jump
        return this.jumpOffVelocity !== null ? this.jumpOffVelocity : this.movingPlatform.getComponentOfType(MovingPlatform).velocity[0]
    }
}
