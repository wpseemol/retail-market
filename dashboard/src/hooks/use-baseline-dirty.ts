import { useRef } from "react";

/**
 * Compares the current edit snapshot with the last loaded or saved one.
 * `ready` must be false until the loaded values are in the snapshot.
 */
export function useBaselineDirty(snapshot: unknown, ready: boolean) {
  const baseline = useRef<string | null>(null);
  const current = JSON.stringify(snapshot);

  if (!ready) {
    baseline.current = null;
  } else if (baseline.current === null) {
    baseline.current = current;
  }

  function markClean(next?: unknown) {
    baseline.current = JSON.stringify(next === undefined ? snapshot : next);
  }

  return {
    dirty: baseline.current !== null && baseline.current !== current,
    markClean,
  };
}
