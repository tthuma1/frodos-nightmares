import { quat } from "../../lib/glm.js";
import { Node } from "../core/Node.js";

export class AnimateRotation {
  constructor(name, node, keyFrames, transformations) {
    this.name = name;
    this.node = node;
    this.keyFrames = keyFrames;
    this.transformations = transformations;
    this.startTime = null;
    this.playAnimation = false;
    this.looped = false;
    this.progressBar = false;
  }

  update(t, dt) {
    if (this.playAnimation) {
      if (this.startTime === null) {
        this.startTime = t;
      }
      this.animate(t - this.startTime);
    } else {
      this.startTime = null;
    }
  }

  animate(currentTime) {
    const totalAnimationTime = this.keyFrames.get(this.keyFrames.count - 1);

    // animation time exceeded
    if (currentTime >= totalAnimationTime) 
    {
      // looped animation
      if (this.looped) 
      {
        this.startTime = null;
        currentTime = 0;
      } 
      // not looped animation
      else 
      {
        this.playAnimation = false;
        this.startTime = null;
        
        // // if object should be removed from scene
        // if (this.node.removeFromScene) 
        // {
        //   // get the items that the object drops
        //   for (let i = 0; i < this.node.items.length; i++) {
        //     inventory.addItem(this.node.items[i]);
        //   }

        //   // remove object from scene
        //   let scene = this.node.parent;
        //   scene.removeChild(this.node);

        //   // create an ObjectRespawner for the object
        //   let objectRespawnerNode = new Node();
        //   let objectRespawner = new ObjectRespawner(this.node, objectRespawnerNode, scene);
        //   objectRespawnerNode.addComponent(objectRespawner);
        //   scene.addChild(objectRespawnerNode);
        // }

      }
    }

    if (this.name.startsWith("PalmAction"))
    {
      soundsController.playSound("palmFalling");
    }

    // code for playing animation
    let keyFrameBefore;
    let keyFrameAfter;
    let keyFrameBeforeIndex;
    let keyFrameAfterIndex;

    for (let i = 0; i < this.keyFrames.count - 1; i++) {
      if (
        this.keyFrames.get(i) <= currentTime &&
        this.keyFrames.get(i + 1) >= currentTime
      ) {
        keyFrameBefore = this.keyFrames.get(i);
        keyFrameAfter = this.keyFrames.get(i + 1);
        keyFrameBeforeIndex = i;
        keyFrameAfterIndex = i + 1;
        break;
      }
    }

    if (keyFrameBefore != null && keyFrameAfter != null) {
      const t =
        (currentTime - keyFrameBefore) / (keyFrameAfter - keyFrameBefore);
      const positionsBefore = this.transformations.get(keyFrameBeforeIndex);
      const positionsAfter = this.transformations.get(keyFrameAfterIndex);


      this.node.components[0]["rotation"] = quat.slerp(
        quat.create(),
        positionsBefore,
        positionsAfter,
        t
      );
    }

    // animate progress bar
    // if (this.progressBar) {
    //   document.getElementById('progress-bar-container').style.visibility = 'visible';
    //   const progress = (currentTime / totalAnimationTime) * 100;
    //   const progressBar = document.getElementById('progress-bar');
    //   progressBar.style.width = `${progress}%`;
    //   if (progress > 99.99) {
    //     document.getElementById('progress-bar-container').style.visibility = 'hidden';
    //   }
    // }
  }
}