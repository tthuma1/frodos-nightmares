import { AnimateRotation } from "../animations/AnimateRotation.js";
import { AnimateTranslation } from "../animations/AnimateTranslation.js";

export class Node {

    constructor() {
        this.parent = null;
        this.children = [];
        this.components = [];
    }

    addChild(node) {
        node.parent?.removeChild(node);
        this.children.push(node);
        node.parent = this;
    }

    removeChild(node) {
        this.children = this.children.filter(child => child !== node);
        node.parent = null;
    }

    remove() {
        this.parent?.removeChild(this);
    }

    traverse(before, after) {
        before?.(this);
        for (const child of this.children) {
            child.traverse(before, after);
        }
        after?.(this);
    }

    linearize() {
        const array = [];
        this.traverse(node => array.push(node));
        return array;
    }

    filter(predicate) {
        return this.linearize().filter(predicate);
    }

    find(predicate) {
        return this.linearize().find(predicate);
    }

    map(transform) {
        return this.linearize().map(transform);
    }

    addComponent(component) {
        this.components.push(component);
    }

    removeComponent(component) {
        this.components = this.components.filter(c => c !== component);
    }

    removeComponentsOfType(type) {
        this.components = this.components.filter(component => !(component instanceof type));
    }

    getComponentOfType(type) {
        return this.components.find(component => component instanceof type);
    }

    getComponentsOfType(type) {
        return this.components.filter(component => component instanceof type);
    }

    getIndexesOfAnimations() {
        let indexes = [];
        for (let i = 0; i < this.components.length; i++) {
            if (this.components[i] instanceof AnimateRotation || this.components[i] instanceof AnimateTranslation) {
                indexes.push(i);
            }
        }
        return indexes;
    }

    findAnimationNodes(node) {
        let animationNodes = [];
        node.children.forEach((child) => {
          child.components.forEach((component) => {
            if (component instanceof AnimateRotation || component instanceof AnimateTranslation) {
              animationNodes.push(component);
            } 
          });
        });
        return animationNodes;
    }

    setAnimation(animationIndexes, names, play, looped, progressBar = false) {
        for (const index of animationIndexes) {
            if (names.includes(this.components[index].name)) {
                this.components[index].playAnimation = play;
                this.components[index].looped = looped;
                this.components[index].progressBar = progressBar;
            }
        }
    }

    setAnimationByComponents(animationComponents, names, play, looped, progressBar = false) {
        for (const node of animationComponents) {
            if (names.includes(node.name)) {
                node.playAnimation = play;
                node.looped = looped;
                node.progressBar = progressBar;
            }
        }
    }
}
