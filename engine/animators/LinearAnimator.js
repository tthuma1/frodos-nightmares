import { vec3, quat } from 'glm';

import { Transform } from '../core/Transform.js';
import {Light} from "../core/Light.js";

export class LinearAnimator {

    constructor(node, {
        startPosition = [0, 0, 0],
        endPosition = [0, 0, 0],
        startTime = 0,
        duration = 1,
        loop = true,
        transform = null,
    } = {}) {
        this.node = node;

        this.startPosition = startPosition;
        this.endPosition = endPosition;

        this.startTime = startTime;
        this.duration = duration;
        this.loop = loop;

        this.playing = false;
        if (transform) {
            this.transform = transform;
        } else {
            this.transform = new Transform({ translation: [...endPosition] });
            this.node.addComponent(this.transform);
        }

        this.direction = 1;
    }

    stop() {
        this.playing = false;
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
        if (!this.loop) {
            clampedInterpolation = Math.min(clampedInterpolation, 1);
        }
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

        if (this.node instanceof Light) {
            vec3.lerp(transform, this.startPosition, this.endPosition, interpolation);
        } else {
            vec3.lerp(transform.translation, this.startPosition, this.endPosition, interpolation);
        }
    }
}

