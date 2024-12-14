//Maybe naumo rabl
export class Key {

    constructor() {
        this.isCollected = false;
    }

    collectKey() {
        this.isCollected = true;
        console.log("Key was collected")
    }

}