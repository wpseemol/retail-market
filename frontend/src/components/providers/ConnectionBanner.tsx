"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAppDispatch, useAppStore } from "@/store/hooks";
import { writeCartCache } from "@/store/cartCache";
import { setOnline } from "@/store/connectionSlice";
import { useI18n } from "@/components/providers/LocaleProvider";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function onlineNow() {
  return navigator.onLine;
}

/** Shop-wide connection banner, and a local copy of the cart for the next visit. */
export default function ConnectionBanner() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const online = useSyncExternalStore(subscribe, onlineNow, () => true);
  const [mounted, setMounted] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    dispatch(setOnline(online));
    if (!online) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      setShowBack(true);
    }
  }, [dispatch, online]);

  useEffect(() => {
    if (!showBack) return;
    const timer = window.setTimeout(() => setShowBack(false), 5000);
    return () => window.clearTimeout(timer);
  }, [showBack]);

  useEffect(() => {
    return store.subscribe(() => {
      const cart = store.getState().cart;
      if (!cart.loaded) return;
      if (cart.items.length === 0 && cart.offlineOps.length === 0 && cart.error) {
        return;
      }
      writeCartCache({
        mode: cart.mode,
        items: cart.items,
        offlineOps: cart.offlineOps,
      });
    });
  }, [store]);

  if (!mounted || (online && !showBack)) return null;

  return (
    <p
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950"
      role="status"
    >
      {online ? t.connection.backOnline : t.connection.offline}
    </p>
  );
}
