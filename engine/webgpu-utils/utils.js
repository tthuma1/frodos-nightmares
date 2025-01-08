export const roundUpToMultipleOf = (v, multiple) =>
    (((v + multiple - 1) / multiple) | 0) * multiple
  
  export function keysOf(obj) {
    return Object.keys(obj)
  }
  
  export function range(count, fn) {
    return new Array(count).fill(0).map((_, i) => fn(i))
  }
  