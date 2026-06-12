// Sorted, unique set numbers present in a list of items tagged with `set_index`.
export function setNumbers(items) {
  return [...new Set(items.map((x) => x.set_index || 1))].sort((a, b) => a - b)
}
