"use client";

import { useEffect, useState, type RefObject } from "react";

const DEFAULT_DELTA = 6;
const DEFAULT_HIDE_AFTER_STUCK = 64;

type Options = {
  /** Sticky chrome element — used to compute when it pins under the viewport top. */
  chromeRef: RefObject<HTMLElement | null>;
  /** Keep chrome visible (e.g. mobile drawer open). */
  forceShow?: boolean;
  /** Min scroll delta (px) before direction counts. */
  deltaThreshold?: number;
  /** Extra scroll past stick point before hide-on-down is allowed. */
  hideAfterStuckPx?: number;
};

/**
 * Hide storefront chrome when scrolling down; show when scrolling up or near the top.
 * Drives both the sticky header and the mobile bottom tab bar.
 */
export function useScrollChrome({
  chromeRef,
  forceShow = false,
  deltaThreshold = DEFAULT_DELTA,
  hideAfterStuckPx = DEFAULT_HIDE_AFTER_STUCK,
}: Options) {
  const [stuck, setStuck] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const chrome = chromeRef.current;
    if (!chrome) return;

    let threshold = 0;
    let lastY = window.scrollY;
    let stuckLocal = false;
    let hiddenLocal = false;

    const show = () => {
      if (!hiddenLocal) return;
      hiddenLocal = false;
      setHidden(false);
    };

    const hide = () => {
      if (hiddenLocal || forceShow) return;
      hiddenLocal = true;
      setHidden(true);
    };

    const mark = () => {
      if (!stuckLocal) {
        threshold = chrome.getBoundingClientRect().top + window.scrollY;
      }

      const y = window.scrollY;
      const nextStuck = y > threshold;

      if (nextStuck !== stuckLocal) {
        stuckLocal = nextStuck;
        setStuck(nextStuck);
      }

      if (!nextStuck || forceShow) {
        show();
      } else {
        const delta = y - lastY;
        if (delta > deltaThreshold && y > threshold + hideAfterStuckPx) {
          hide();
        } else if (delta < -deltaThreshold) {
          show();
        }
      }

      lastY = y;
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof Node && chrome.contains(target)) show();
    };

    mark();
    window.addEventListener("scroll", mark, { passive: true });
    window.addEventListener("resize", mark);
    chrome.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("scroll", mark);
      window.removeEventListener("resize", mark);
      chrome.removeEventListener("focusin", onFocusIn);
    };
  }, [chromeRef, forceShow, deltaThreshold, hideAfterStuckPx]);

  useEffect(() => {
    if (forceShow) setHidden(false);
  }, [forceShow]);

  return { stuck, hidden: forceShow ? false : hidden };
}
