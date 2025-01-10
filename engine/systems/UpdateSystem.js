export class UpdateSystem {

    constructor(application) {
        this._update = this._update.bind(this);
        this._render = this._render.bind(this);

        this.application = application;
        this.running = false;
    }

    start() {
        if (this.running) {
            return;
        }

        this.application.start?.();

        this._time = performance.now() / 1000;

        this._updateFrame = setInterval(this._update, 0);
        this._renderFrame = requestAnimationFrame(this._render);
        this.running = true;
    }

    stop() {
        if (!this.running) {
            return;
        }

        this.application.stop?.();

        this._updateFrame = clearInterval(this._updateFrame);
        this._renderFrame = cancelAnimationFrame(this._render);
        this.running = false;
    }

    _update() {
        const time = performance.now() / 1000;
        const dt = time - this._time;
        this._time = time;

        // frame rate is too slow and will break physics
        if (dt > 0.1) return;

        this.application.update?.(time, dt);
    }

    _render() {
        this._renderFrame = requestAnimationFrame(this._render);

        this.application.render?.();
    }

}
