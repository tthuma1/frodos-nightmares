import { quat, vec2, vec3, mat4 } from 'glm';

import { Transform } from '../core/Transform.js';
import {Camera} from "../core/Camera.js";
import { MovingPlatform } from '../core/MovingPlatform.js';
import { Light } from '../core/Light.js';
import { Sound } from '../core/Sound.js';
import { RotateAnimator } from '../animators/RotateAnimator.js';

export class ThirdPersonController {

    constructor(node, domElement, gltfLoader, {
        pitch = 0,
        yaw = 0,
        velocity = [0, 0, 0],
        acceleration = 50,
        maxSpeed = 3,
        decay = 0.99999,
    } = {}) {
        this.node = node;
        this.domElement = domElement;
        this.gltfLoader = gltfLoader;

        this.keys = {};

        this.pitch = pitch;
        this.yaw = yaw;

        this.velocity = velocity;
        this.acceleration = acceleration;
        this.maxSpeed = maxSpeed;
        this.decay = decay;


        this.jumpVelocity = 0;
        this.jumpForce = 7;
        this.isJumping = false;
        this.gravity = -20;

        this.draggedNode = null;
        this.lastDragTime = 0;

        this.movingPlatform = null;
        this.jumpOffVelocity = null; // velocity that moving platform had when you jumped off it

        this.lastLightSwitchTime = 0;

        this.initHandlers();

        this.sound = new Sound({
            walk: { src: './sounds/walk.mp3', volume : 0.15 },
            jump: { src: './sounds/jump.mp3', volume : 0.3 },
            bounce: { src: './sounds/bounce.mp3', volume : 0.4} ,
            drag: {src: './sounds/drag.mp3', volume : 0.25 },
        });
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
        const cos = Math.cos(0);
        const sin = Math.sin(0);
        const forward = [-sin, 0, -cos];
        const right = [cos, 0, -sin];

        // const legRight = this.gltfLoader.loadNode("legRight");
        // const legLeft = this.gltfLoader.loadNode("legLeft");
        // const walkAnimation = legRight.getComponentOfType(RotateAnimator);
        // Map user input to the acceleration vector.
        const acc = vec3.create();
        if (this.keys['KeyW']) {
            if (!this.isJumping)
                this.sound.play('walk');
            if (this.draggedNode)
                this.sound.play('drag');
            vec3.add(acc, acc, forward);
            this.startWalkAnimation();
            // walkAnimation.play();
        }
        if (this.keys['KeyS']) {
            if (!this.isJumping)
                this.sound.play('walk');
            if (this.draggedNode)
                this.sound.play('drag');
            vec3.sub(acc, acc, forward);
            this.startWalkAnimation();
            // walkAnimation.play();
        }
        if (this.keys['KeyD']) {
            if (!this.isJumping)
                this.sound.play('walk');
            if (this.draggedNode)
                this.sound.play('drag');
            vec3.add(acc, acc, right);
            this.startWalkAnimation();
            // walkAnimation.play();
        }
        if (this.keys['KeyA']) {
            if (!this.isJumping)
                this.sound.play('walk');
            if (this.draggedNode)
                this.sound.play('drag');
            vec3.sub(acc, acc, right);
            this.startWalkAnimation();
            // walkAnimation.play();
        }
        if (this.keys['Space'] && !this.isJumping && !this.draggedNode) {
            this.sound.play('jump');
            this.isJumping = true;
            this.jumpVelocity = this.jumpForce;
            this.jumpOffVelocity = this.movingPlatform ? this.movingPlatform.getComponentOfType(MovingPlatform).velocity[0] : null;
        }
        if (this.keys['KeyQ']) {
            if (!(this.lastLightSwitchTime && Date.now() - this.lastLightSwitchTime < 200)) { // last light switch was at least 200ms ago q
                this.node.switchLight();
                this.lastLightSwitchTime = Date.now();
            }
        }

        if (this.keys['KeyE'] && this.draggedNode) {
            this.stopDragging();
        }

        if (vec2.length([this.velocity[0], this.velocity[2]]) < 0.1) {
            this.stopWalkAnimation();
            // walkAnimation.stop();
        }

        // prevent switching tabs from breaking game
        // console.log(dt);
        if (dt * this.gravity < -0.2) {
            console.log("a")
            this.jumpVelocity = this.jumpVelocity - 0.2;
        } else {
            this.jumpVelocity = this.jumpVelocity + dt * this.gravity;
        }

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

        this.updateFlashlightDirection();

        const transform = this.node.getComponentOfType(Transform);
        if (transform) {

            this.translateWithVelocity(transform.translation, dt);

            // translate camera with player
            const cameraTranslation = this.node.components[2].getComponentOfType(Transform).translation;
            this.translateWithVelocity(cameraTranslation, dt);

            // translate dragged object
            if(this.draggedNode) {
                const draggedTransform = this.draggedNodeTransform();
                vec3.scaleAndAdd(draggedTransform.translation, draggedTransform.translation, [this.velocity[0], 0, this.velocity[2]], dt);
            }
            // vec3.scaleAndAdd(transform.translation, transform.translation, this.velocity, dt);


            // Update rotation based on the Euler angles.
            const rotation = quat.create();
            this.updateYaw();
            quat.rotateY(rotation, rotation, this.yaw);
            quat.rotateX(rotation, rotation, this.pitch);
            transform.rotation = rotation;
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
            this.jumpVelocity = 10;
            this.movingPlatform = null;
            this.sound.play('bounce');

        } else {
            this.jumpVelocity = 0;
            this.isJumping = false;
            this.movingPlatform = node.isMovingPlatform ? node : null;
        }

        this.jumpOffVelocity = null;
    }

    keydownHandler(e) {
        this.keys[e.code] = true;
    }

    keyupHandler(e) {
        this.keys[e.code] = false;
    }

    translateWithVelocity(translationVector, dt) {
        // Update translation based on velocity.
        vec3.scaleAndAdd(translationVector, translationVector, [this.movingPlatformXVelocity(), 0, 0], dt);
        vec3.scaleAndAdd(translationVector, translationVector, this.velocity, dt);
        vec3.scaleAndAdd(translationVector, translationVector, [0, this.jumpVelocity, 0], dt);
    }

    movingPlatformXVelocity()
    {
        if (!this.movingPlatform) {
            return 0;
        }

        // if player jumped off moving platform, apply velocity that it had on jump
        return this.jumpOffVelocity !== null ? this.jumpOffVelocity : this.movingPlatform.getComponentOfType(MovingPlatform).velocity[0]
    }

    updateYaw() {
        const velX = this.velocity[0];
        const velZ = this.velocity[2];
        this.yaw = Math.atan2(velX, velZ);
    }

    updateFlashlightDirection() {
        const light = this.node.getComponentsOfType(Light).find(x => x.type === 1);
        if (vec3.length(this.velocity) > 0.1) {
            light.direction = this.velocity.slice();
        }
    }

    startWalkAnimation() {
        const legRight = this.gltfLoader.loadNode("legRight");
        const legLeft = this.gltfLoader.loadNode("legLeft");
        const walkAnimationRight = legRight.getComponentOfType(RotateAnimator);
        const walkAnimationLeft = legLeft.getComponentOfType(RotateAnimator);
        walkAnimationRight.play();
        walkAnimationLeft.play();
    }

    stopWalkAnimation() {
        const legRight = this.gltfLoader.loadNode("legRight");
        const legLeft = this.gltfLoader.loadNode("legLeft");
        const walkAnimationRight = legRight.getComponentOfType(RotateAnimator);
        const walkAnimationLeft = legLeft.getComponentOfType(RotateAnimator);
        walkAnimationRight.stop();
        walkAnimationLeft.stop();
    }
}
