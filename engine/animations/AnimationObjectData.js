// Samplers: they specify how the animation values should be interpolated between keyframes.
// The input of a sampler represents the time values (in seconds) at which keyframes occur.
// The output of a sampler represents the animation values at each keyframe.

/**
 * Represents the data for an animation object.
 */
export class AnimationObjectData {
    /**
     * Constructs a new AnimationObjectData instance.
     * @param {string} nodeId - The ID of the animation node.
     * @param {Array} channels - The animation channels.
     * @param {Array} samplers - The animation samplers.
     */
    constructor(nodeId, channels, samplers) {
        this.nodeId = nodeId;
        this.channels = channels;
        this.samplers = samplers;
    }

    /**
     * Gets the ID of the sampler associated with the given channel.
     * @param {Object} channel - The animation channel.
     * @returns {string} - The ID of the sampler.
     */
    getSamplerId(channel) {
        return channel.sampler;
    }

    /**
     * Gets the ID of the input associated with the given sampler.
     * @param {string} samplerId - The ID of the sampler.
     * @returns {string} - The ID of the input.
     */
    getInputId(samplerId) {
        return this.samplers[samplerId].input;
    }

    /**
     * Gets the ID of the output associated with the given sampler.
     * @param {string} samplerId - The ID of the sampler.
     * @returns {string} - The ID of the output.
     */
    getOutputId(samplerId) {
        return this.samplers[samplerId].output;
    }
}