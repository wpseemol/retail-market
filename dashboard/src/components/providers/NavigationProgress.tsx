import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import LoadingBar, { type LoadingBarRef } from "react-top-loading-bar";

const MIN_VISIBLE_MS = 450;

function isNewUrl(url: string | URL | null | undefined) {
  if (url == null || url === "") return false;
  try {
    const next = new URL(String(url), window.location.href);
    return (
      next.origin === window.location.origin &&
      (next.pathname !== window.location.pathname || next.search !== window.location.search)
    );
  } catch {
    return false;
  }
}

/**
 * Green top bar on a full reload and on each dashboard route change.
 * Client routes finish instantly, so the bar stays up briefly so the change is visible.
 */
export function NavigationProgress() {
  const ref = useRef<LoadingBarRef>(null);
  const hideTimer = useRef<number | null>(null);
  const startedAt = useRef(0);
  const sawLocation = useRef(false);
  const location = useLocation();

  const api = useRef({
    start() {},
    finish() {},
  });

  api.current.start = () => {
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    startedAt.current = Date.now();
    ref.current?.continuousStart(12, 350);
  };

  api.current.finish = () => {
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt.current));
    if (hideTimer.current != null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      ref.current?.complete();
      hideTimer.current = null;
    }, wait);
  };

  useEffect(() => {
    if (!sawLocation.current) {
      sawLocation.current = true;
      return;
    }
    api.current.finish();
  }, [location.key]);

  useEffect(() => {
    api.current.start();
    const kick = () => api.current.finish();
    if (document.readyState === "complete") {
      const id = window.setTimeout(kick, 80);
      return () => window.clearTimeout(id);
    }
    window.addEventListener("load", kick, { once: true });
    return () => window.removeEventListener("load", kick);
  }, []);

  useEffect(() => {
    const pushState = history.pushState.bind(history);
    const replaceState = history.replaceState.bind(history);

    history.pushState = (data, unused, url) => {
      if (isNewUrl(url)) api.current.start();
      pushState(data, unused, url);
    };
    history.replaceState = (data, unused, url) => {
      if (isNewUrl(url)) api.current.start();
      replaceState(data, unused, url);
    };

    const onPop = () => api.current.start();
    window.addEventListener("popstate", onPop);

    return () => {
      history.pushState = pushState;
      history.replaceState = replaceState;
      window.removeEventListener("popstate", onPop);
      if (hideTimer.current != null) window.clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <LoadingBar
      ref={ref}
      color="#00B207"
      height={3}
      shadow
      waitingTime={180}
      loaderSpeed={200}
      transitionTime={200}
      containerClassName="nav-progress"
    />
  );
}
