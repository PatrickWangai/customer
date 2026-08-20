"use client";

import { useEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { SupportStageStepper } from "@/components/support/support-stage-stepper";
import { ResponseCountdown } from "@/components/support/response-countdown";
import type { TrackedRequest } from "@/lib/validation/support";

const POLL_MS = 45_000;

type RefreshAction = (referenceNumber: string, email: string) => Promise<{ ok: boolean; result?: TrackedRequest }>;

/**
 * The live status view — stepper, countdown, submitted-at — shared between
 * a manual lookup (Track a request) and the automatic view shown right
 * after submitting, so both stay in sync as one component. When
 * `refreshAction` and `email` are both given, polls in the background every
 * 45s (the "track" rate limit is 20/10min, so this leaves headroom for a
 * manual lookup too) and stops once the request reaches its final stage —
 * nothing left to refresh once it's Done. Phone-only submissions have no
 * email to poll with, so they just show whatever snapshot was last fetched.
 * Mirrored from the CRM repo's identical component — kept in sync manually
 * since these are separate codebases (see lib/support-stage.ts for the
 * same note).
 */
export function TrackingResultCard({
  result,
  email,
  refreshAction,
  onRefresh,
}: {
  result: TrackedRequest;
  email?: string | null;
  refreshAction?: RefreshAction;
  onRefresh?: (result: TrackedRequest) => void;
}) {
  const [live, setLive] = useState(result);
  const firedInitialRef = useRef(false);

  // A fresh `result` prop (e.g. the parent re-ran a manual lookup) always
  // wins over whatever polling last fetched — set during render rather than
  // in an effect, per React's guidance for adjusting state from props.
  const [prevResult, setPrevResult] = useState(result);
  if (result !== prevResult) {
    setPrevResult(result);
    setLive(result);
  }

  useEffect(() => {
    if (!refreshAction || !email || live.stage === 3) return;
    let cancelled = false;
    const referenceNumber = result.referenceNumber;
    async function tick() {
      const res = await refreshAction!(referenceNumber, email!);
      if (cancelled || !res.ok || !res.result) return;
      setLive(res.result);
      onRefresh?.(res.result);
    }
    if (!firedInitialRef.current) {
      firedInitialRef.current = true;
      void tick();
    }
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onRefresh intentionally excluded: callers should useCallback it, but if they don't, we'd rather keep polling on a stable cadence than restart the interval on every parent render
  }, [refreshAction, email, live.stage, result.referenceNumber]);

  const isLive = !!refreshAction && !!email && live.stage !== 3;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{live.subject}</p>
          <p className="text-xs text-muted-foreground">
            {live.referenceNumber} &middot; {live.category}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-success">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-success" />
              </span>
              Live
            </span>
          )}
          <StatusBadge status={live.priority} />
        </div>
      </div>

      <div className="mt-4 mb-1">
        <SupportStageStepper stage={live.stage} activeLabel={live.stageLabel} />
      </div>
      <ResponseCountdown expectedResponseBy={live.expectedResponseBy} stage={live.stage} />

      <p className="mt-3 text-xs text-muted-foreground">Submitted {new Date(live.createdAt).toLocaleString()}</p>
    </div>
  );
}
