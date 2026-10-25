import { useEffect } from "react";
import { toast } from "sonner";
import { useHasUnsavedEdits } from "@/hooks/use-edit-save";
import { useConnectionStore } from "@/store/connection";

/** Keeps the online flag current and warns before a tab close throws away edits. */
export function ConnectionWatcher() {
  const setOnline = useConnectionStore((state) => state.setOnline);
  const unsaved = useHasUnsavedEdits();
  const online = useConnectionStore((state) => state.online);

  useEffect(() => {
    function sync(next: boolean) {
      const previous = useConnectionStore.getState().online;
      setOnline(next);
      if (next && !previous) {
        toast.success("You're back online. You can save the edits still on this page.");
      }
    }

    function onOnline() {
      sync(true);
    }
    function onOffline() {
      sync(false);
    }

    setOnline(navigator.onLine);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [setOnline]);

  useEffect(() => {
    if (!unsaved) return;
    function onLeave(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [unsaved]);

  if (online) return null;

  return (
    <p
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950"
      role="status"
    >
      You're offline. You can keep editing. Save changes turns on when the
      connection is back.
    </p>
  );
}
