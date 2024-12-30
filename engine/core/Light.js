export class Light {
    constructor({
        color = [1, 1, 1],
        direction = [0, 0, -1],
        intensity = 2,
        type = 0,
        isActive = true,
    } = {}) {
        this.color = color;
        this.direction = direction;
        this.type = type;
        this.isActive = isActive;
        this.intensity = intensity;
    }
}