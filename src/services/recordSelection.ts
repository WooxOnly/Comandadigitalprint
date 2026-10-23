// Cloud records are replaced, never mutated, when their values change. Avoid
// rebuilding derived UI state for notifications about other records or status.
export function sameRecordValues(previous: readonly unknown[] | undefined, next: readonly unknown[]) {
  return previous !== undefined && previous.length === next.length && previous.every((value, index) => value === next[index]);
}
