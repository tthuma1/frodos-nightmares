export class Sound {
    constructor(sounds) {
        this.sounds = {};
        for (const [key, { src, volume = 0.2 }] of Object.entries(sounds)) {
            this.sounds[key] = new Audio(src);
            this.sounds[key].volume = volume;
        }
    }

    play(key) {
        if (this.sounds[key]) {
            this.sounds[key].play();
        }
    }
}