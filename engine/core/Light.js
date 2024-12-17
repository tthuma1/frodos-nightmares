export class Light {
    constructor({
        color = [1, 1, 1], // po default bela luč
        intensity = 1,
        range = 20
    } = {}) {
        this.color = color;
        this.intensity = intensity;
        this.range = range;
    }
}