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
        this.isJumping = true;
        this.gravity = -20;
        this.ladderGravity = -10;

        this.draggedNode = null;
        this.lastDragTime = 0;
        this.doorAnimation = false;

        this.movingPlatform = null;
        this.jumpOffVelocity = null; // velocity that moving platform had when you jumped off it

        this.lastLightSwitchTime = 0;

        this.initHandlers();

        this.walkAnimators = this.getWalkAnimators();
        this.jumpAnimators = this.getJumpAnimators();

        this.isPlayerOnLadder = false;
        this.isPlayerOnFloor = false;

        this.maxZ = null;

        this.sound = new Sound({
            walk: { src: './sounds/walk.mp3', volume : 0.15 },
            jump: { src: './sounds/jump.mp3', volume : 0.3 },
            bounce: { src: './sounds/bounce.mp3', volume : 0.4} ,
            drag: {src: './sounds/drag.mp3', volume : 0.25 },
        });

        const cameraTranslation = this.node.components[2].getComponentOfType(Transform).translation;
        const playerTranslation = this.node.getComponentOfType(Transform).translation;
        this.zDiffCameraPlayer = cameraTranslation[2] - playerTranslation[2];

        this.armRight = this.gltfLoader.loadNode("armRight");
        this.armLeft = this.gltfLoader.loadNode("armLeft");
        this.hasLantern = false;
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
        if (this.doorAnimation) {
            return;
        }

        if (this.jumpVelocity < -1) {
            this.isJumping = true;
        }

        // Calculate forward and right vectors.
        const cos = Math.cos(0);
        const sin = Math.sin(0);
        const forward = [-sin, 0, -cos];
        const right = [cos, 0, -sin];

        // Map user input to the acceleration vector.
        const acc = vec3.create();
        if (this.keys['KeyW']) {
            if (this.isPlayerOnLadder) {
                this.jumpVelocity = 3;
                this.stopWalkAnimation();
            } else {
                if (!this.isJumping)
                    this.sound.play('walk');
                if (this.draggedNode)
                    this.sound.play('drag');
                vec3.add(acc, acc, forward);
                this.startWalkAnimation();
            }
        }

        if (this.keys['KeyS']) {
            if (this.isPlayerOnLadder && !this.isPlayerOnFloor) {
                this.jumpVelocity = -3;
                this.stopWalkAnimation();
            } else {
                if (!this.isJumping)
                    this.sound.play('walk');
                if (this.draggedNode)
                    this.sound.play('drag');
                vec3.sub(acc, acc, forward);
                this.startWalkAnimation();
            }
        }

        if (this.keys['KeyD']) {
            if (!this.isJumping)
                this.sound.play('walk');
            if (this.draggedNode)
                this.sound.play('drag');
            vec3.add(acc, acc, right);
            this.startWalkAnimation();
        }

        if (this.keys['KeyA']) {
            if (!this.isJumping)
                this.sound.play('walk');
            if (this.draggedNode)
                this.sound.play('drag');
            vec3.sub(acc, acc, right);
            this.startWalkAnimation();
        }

        if (this.keys['Space'] && !this.isJumping && !this.draggedNode) {
            this.sound.play('jump');
            this.isJumping = true;
            this.jumpVelocity = this.jumpForce;
            this.jumpOffVelocity = this.movingPlatform ? this.movingPlatform.getComponentOfType(MovingPlatform).velocity[0] : null;
            
            this.stopWalkAnimation();
            this.startJumpAnimation(t);
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
        }

        if (!this.isPlayerOnLadder) {
            this.jumpVelocity += dt * this.gravity;
        } else if (dt * this.gravity < -0.2) {
            this.jumpVelocity += -0.2; // prevent gravity bug when switching tabs
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

            if (this.isPlayerOnLadder) {
                this.jumpVelocity *= decay;
            }
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
            if (vec3.length(this.velocity) > 1e-3) {
                this.updateYaw();
                quat.rotateY(rotation, rotation, this.yaw);
                quat.rotateX(rotation, rotation, this.pitch);
                transform.rotation = rotation;
            }

            if (this.maxZ !== null && transform.translation[2] > this.maxZ) {
                transform.translation[2] = this.maxZ;
                cameraTranslation[2] = this.maxZ + this.zDiffCameraPlayer;
            }
        }

        if (this.isPlayerOnLadder) {
            this.transformLadderHands();
        } else {
            this.transformNormalHands();
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
        if (node.isBreakable) {
            return;
        }

        this.isPlayerOnFloor = true;

        if (node.isTrampoline) {
            this.jumpVelocity = 10;
            this.isJumping = true;
            this.movingPlatform = null;
            this.sound.play('bounce');
            this.startJumpAnimation(performance.now() / 1000);
        } else {
            this.jumpVelocity = 0;
            this.isJumping = false;
            this.movingPlatform = node.isMovingPlatform ? node : null;
            this.stopJumpAnimation();
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
        if (!this.isPlayerOnLadder) {
            const velX = this.velocity[0];
            const velZ = this.velocity[2];
            this.yaw = Math.atan2(velX, velZ);
        } else {
            this.yaw = Math.PI;
        }
    }

    updateFlashlightDirection() {
        const lights = this.node.children.filter(x => x.getComponentOfType(Light))
        const flashLight = lights.find(x => x.getComponentOfType(Light).type === 1);
        const flashLightComponent = flashLight.getComponentOfType(Light);
        if (this.isPlayerOnLadder) {
            flashLightComponent.direction = [0, 0, -1];
        } else if (vec3.length(this.velocity) > 0.1) {
            flashLightComponent.direction = this.velocity.slice();
        }
    }

    getWalkAnimators() {
        const legRight = this.gltfLoader.loadNode("legRight");
        const legLeft = this.gltfLoader.loadNode("legLeft");
        const armLeft = this.gltfLoader.loadNode("armLeft");
        const armRight = this.gltfLoader.loadNode("armRight");
        const walkAnimationRight = legRight.getComponentOfType(RotateAnimator);
        const walkAnimationLeft = legLeft.getComponentOfType(RotateAnimator);
        const walkAnimationLeftArm = armLeft.getComponentOfType(RotateAnimator);
        const walkAnimationRightArm = armRight.getComponentOfType(RotateAnimator);
        const bodyAnimation = this.node.getComponentOfType(RotateAnimator);
        return [
            walkAnimationRight,
            walkAnimationLeft,
            walkAnimationLeftArm,
            walkAnimationRightArm,
            bodyAnimation,
        ];
    }

    startWalkAnimation() {
        if (!this.isJumping && !this.isPlayerOnLadder) {
            for (const animation of this.walkAnimators) {
                animation.play();
            }
        }
    }

    stopWalkAnimation() {
        for (const animation of this.walkAnimators) {
            animation.stop();
        }
    }

    getJumpAnimators() {
        const armRight = this.gltfLoader.loadNode("armRight");
        const armLeft = this.gltfLoader.loadNode("armLeft");
        const legLeft = this.gltfLoader.loadNode("legLeft");
        const legRight = this.gltfLoader.loadNode("legRight");
        const rightArmAnim = armRight.getComponentsOfType(RotateAnimator)[1];
        const leftArmAnim = armLeft.getComponentsOfType(RotateAnimator)[1];
        const leftLegAnim = legLeft.getComponentsOfType(RotateAnimator)[1];
        const rightLegAnim = legRight.getComponentsOfType(RotateAnimator)[1];

        const ret = [
            rightArmAnim,
            leftLegAnim,
            rightLegAnim,
        ];
        if (leftArmAnim) {
            ret.push(leftArmAnim);
        }

        return ret;
    }

    startJumpAnimation(time) {
        if (this.isPlayerOnLadder) return;

        for (const animation of this.getJumpAnimators()) {
            animation.startTime = time;
            animation.play();
        }
    }

    stopJumpAnimation() {
        for (const animation of this.getJumpAnimators()) {
            animation.startTime = time;
            animation.stop();
        }
    }

    transformLadderHands() {
        const rightTransform = this.armLeft.getComponentOfType(Transform);
        const leftTransform = this.armRight.getComponentOfType(Transform);

        rightTransform.rotation = quat.rotateX(quat.create(), quat.create(), Math.PI)
        leftTransform.rotation = quat.rotateX(quat.create(), quat.create(), Math.PI);
    }

    transformNormalHands() {
        const rightTransform = this.armLeft.getComponentOfType(Transform);
        const leftTransform = this.armRight.getComponentOfType(Transform);

        if (this.hasLantern) {
            rightTransform.rotation = quat.rotateX(quat.create(), quat.create(), -Math.PI / 2);
            leftTransform.rotation = quat.rotateX(quat.create(), quat.create(), 0)
        } else {
            rightTransform.rotation = quat.rotateX(quat.create(), quat.create(), 0)
            leftTransform.rotation = quat.rotateX(quat.create(), quat.create(), 0);
        }
    }
}
