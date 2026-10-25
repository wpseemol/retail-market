import { useEffect, useId } from "react";
import { selectHasUnsavedEdits, useConnectionStore } from "@/store/connection";

export function editSaveState(options: {
  dirty: boolean;
  online: boolean;
  busy?: boolean;
  idle: string;
  dirtyHint?: string;
}) {
  const blockedReason = !options.online
    ? "You're offline. Save turns on when you're back online."
    : !options.dirty
      ? "Change something before saving."
      : undefined;

  return {
    canSave: options.dirty && options.online && !options.busy,
    hint: !options.online
      ? "You're offline. Your edits stay on this page. Save changes turns on when you're back online."
      : options.dirty
        ? (options.dirtyHint ?? "Unsaved changes.")
        : options.idle,
    blockedReason,
  };
}

function useRegisterDirty(dirty: boolean) {
  const id = useId();
  const setPageDirty = useConnectionStore((state) => state.setPageDirty);
  useEffect(() => {
    setPageDirty(id, dirty);
    return () => setPageDirty(id, false);
  }, [id, dirty, setPageDirty]);
}

/** Save is allowed only after a real edit, and only while the browser is online. */
export function useEditSave(
  dirty: boolean,
  busy: boolean,
  idle: string,
  dirtyHint?: string,
) {
  const online = useConnectionStore((state) => state.online);
  useRegisterDirty(dirty);
  return editSaveState({ dirty, online, busy, idle, dirtyHint });
}

export function useHasUnsavedEdits() {
  return useConnectionStore(selectHasUnsavedEdits);
}
