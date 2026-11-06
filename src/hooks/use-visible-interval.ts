"use client";

import { useEffect, useEffectEvent, useRef } from "react";

/**
 * Calls `tick` every `intervalMs` while this tab is visible. A hidden tab
 * makes no requests at all: it ticks once as soon as it's shown again if
 * it's due, then carries on. Nothing a hidden tab fetches can be seen until
 * then anyway, and tabs left open in the background all day were most of
 * the polling this host served.
 *
 * Ticks straight away on mount unless `immediate` is false (for a view that
 * was just server-rendered). Pass `null` to stop. Changing `intervalMs`
 * keeps the time of the last tick, so it doesn't cause an extra one.
 */
export function useVisibleInterval(tick: () => unknown, intervalMs: number | null, { immediate = true }: { immediate?: boolean } = {}) {
  const onTick = useEffectEvent(tick);
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    if (intervalMs === null) return;
    const every = intervalMs;
    lastTickRef.current ??= immediate ? 0 : Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    function schedule() {
      clearTimeout(timer);
      if (document.visibilityState !== "visible") return;
      timer = setTimeout(
        () => {
          lastTickRef.current = Date.now();
          onTick();
          schedule();
        },
        Math.max(0, lastTickRef.current! + every - Date.now()),
      );
    }

    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [intervalMs, immediate]);
}
