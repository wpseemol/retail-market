import { create } from "zustand";

/**
 * Dashboard session state stays in the auth store.
 * This store tracks the browser connection and which edit screens have unsaved edits.
 */
type ConnectionState = {
  online: boolean;
  dirtyPages: Record<string, boolean>;
  setOnline: (online: boolean) => void;
  setPageDirty: (id: string, dirty: boolean) => void;
};

export const useConnectionStore = create<ConnectionState>((set) => ({
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  dirtyPages: {},
  setOnline: (online) => set({ online }),
  setPageDirty: (id, dirty) =>
    set((state) => ({
      dirtyPages: { ...state.dirtyPages, [id]: dirty },
    })),
}));

export function selectHasUnsavedEdits(state: ConnectionState) {
  return Object.values(state.dirtyPages).some(Boolean);
}
