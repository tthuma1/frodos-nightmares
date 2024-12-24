export class Light {
    constructor({
        color = [1, 1, 1],
        type = 0,
        isActive = true,
    } = {}) {
        this.color = color;
        this.type = type;
        this.isActive = isActive;
    }
}