import { Transform } from './Transform.js';
import { vec3 } from 'glm';

export class MovingPlatform {
    constructor(node) {
        this.node = node;
        this.velocity = [0, 0, 0];
        this.solvedPuzzle = false;
    }

    update(t, dt) {
        if (this.solvedPuzzle){
            const time = performance.now() / 1000;
            this.velocity[0] = Math.sin(time) * 5;

            const transform = this.node.getComponentOfType(Transform);
            vec3.scaleAndAdd(transform.translation, transform.translation, this.velocity, dt);
        }
    }
}