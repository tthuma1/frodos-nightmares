import { Transform } from './Transform.js';
import { vec3 } from 'glm';

export class MovingPlatform {
    constructor(node) {
        this.node = node;
        this.velocity = [0, 0, 0];
        this._solvedPuzzle = false;
        this.startTime = 0;
    }

    get solvedPuzzle() {
        return this._solvedPuzzle;
    }

    set solvedPuzzle(val) {
        this._solvedPuzzle = val;
        if (val) {
            this.startTime = performance.now() / 1000;
        }
    }

    update(t, dt) {
        if (this._solvedPuzzle){
            this.velocity[0] = Math.sin((t - this.startTime)) * -3;

            const transform = this.node.getComponentOfType(Transform);
            vec3.scaleAndAdd(transform.translation, transform.translation, this.velocity, dt);
        }
    }
}