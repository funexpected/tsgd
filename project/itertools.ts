export function partition<T>(
  arr: T[],
  predicate: (item: T) => boolean
): [T[], T[]] {
  return arr.reduce(
    (acc: [T[], T[]], currentItem: T) => {
      if (predicate(currentItem)) {
        acc[0].push(currentItem) // Add to the 'true' array
      } else {
        acc[1].push(currentItem) // Add to the 'false' array
      }
      return acc
    },
    [[], []] // Initial accumulator: a tuple of two empty arrays
  )
}
