import { roundUpToMultipleOf } from "./utils.js"

export class TypedArrayViewGenerator {
  constructor(sizeInBytes) {
    this.arrayBuffer = new ArrayBuffer(sizeInBytes)
    this.byteOffset = 0
  }
  align(alignment) {
    this.byteOffset = roundUpToMultipleOf(this.byteOffset, alignment)
  }
  pad(numBytes) {
    this.byteOffset += numBytes
  }
  getView(Ctor, numElements) {
    const view = new Ctor(this.arrayBuffer, this.byteOffset, numElements)
    this.byteOffset += view.byteLength
    return view
  }
}

export function subarray(arr, offset, length) {
  return arr.subarray(offset, offset + length)
}

// TODO: fix better?
export const isTypedArray = arr =>
  arr &&
  typeof arr.length === "number" &&
  arr.buffer instanceof ArrayBuffer &&
  typeof arr.byteLength === "number"
