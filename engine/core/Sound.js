export class Sound {
    constructor(sounds) {
        this.sounds = {};
        for (const [key, { src, volume = 0.2, loop = false }] of Object.entries(sounds)) {
            this.sounds[key] = new Audio(src);
            this.sounds[key].volume = volume;
            this.sounds[key].loop = loop;
        }
    }

    play(key) {
        if (this.sounds[key]) {
            this.sounds[key].play();
        }
    }
}