import { vec3, quat } from 'glm';

import { Transform } from '../core/Transform.js';
import * as EasingFunctions from 'engine/animators/EasingFunctions.js';

export class RotateAnimator {

    constructor(node, {
        startRotation = [0, 0, 0], // in euler angles (degrees), not quaternions, not radians
        endRotation = [0, 0, 0],
        startTime = 0,
        duration = 1,
        loop = true,
        transform = null,
        easeFunction = EasingFunctions.linear
    } = {}) {
        this.node = node;

        quat.fromEuler(startRotation, ...startRotation);
        quat.fromEuler(endRotation, ...endRotation);
        this.startRotation = startRotation;
        this.endRotation = endRotation;

        this.startTime = startTime;
        this.duration = duration;
        this.loop = loop;

        this.easeFunction = easeFunction;

        this.playing = false;
        if (transform) {
            this.transform = transform;
        } else {
            this.transform = new Transform({ rotation: [...startRotation] });
            this.node.addComponent(this.transform);
        }

        this.direction = 1;
    }

    stop() {
        this.playing = false;
        this.transform.rotation = [0, 0, 0, 1];
    }

    play() {
        this.playing = true;
    }

    pause() {
        this.playing = false;
    }

    update(t, dt) {
        if (!this.playing) {
            return;
        }

        const linearInterpolation = (t - this.startTime) / this.duration;
        let clampedInterpolation = Math.min(Math.max(linearInterpolation, 0), 2);
        clampedInterpolation = Math.min(clampedInterpolation, 1);
        const loopedInterpolation = this.getLoopedInterpolation(linearInterpolation);
        this.updateNode(this.loop ? loopedInterpolation : clampedInterpolation);
    }

    getLoopedInterpolation(n) {
        const range = Math.floor(n);
        const valueInRange = n - range;
        
        if (range % 2 === 0) {
            return valueInRange;
        } else {
            return 1 - valueInRange;
        }
    }
    

    updateNode(interpolation) {
        const transform = this.transform;
        if (!transform) {
            return;
        }

        quat.slerp(transform.rotation, this.startRotation, this.endRotation, this.easeFunction(interpolation));
    }
}
