export class Light {
    constructor({
        color = [1, 1, 1],
        intensity = 1.0,
        range = 1.0
    } = {}) {
        this.color = color;
        this.intensity = intensity;
        this.range = range;
    }
}