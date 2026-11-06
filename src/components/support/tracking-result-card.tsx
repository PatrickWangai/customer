"use client";

import { useState } from "react";
import { SupportStageStepper } from "@/components/support/support-stage-stepper";
import { ResponseCountdown } from "@/components/support/response-countdown";
import { LiveChatThread } from "@/components/support/live-chat-thread";
import { useVisibleInterval } from "@/hooks/use-visible-interval";
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
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL;
  const [live, setLive] = useState(result);

  // A fresh `result` prop (e.g. the parent re-ran a manual lookup) always
  // wins over whatever polling last fetched — set during render rather than
  // in an effect, per React's guidance for adjusting state from props.
  const [prevResult, setPrevResult] = useState(result);
  if (result !== prevResult) {
    setPrevResult(result);
    setLive(result);
  }

  const isLive = !!refreshAction && !!email && live.stage !== 3;

  // Paused while the tab is hidden, which also leaves more of the help-track
  // rate limit for manual lookups.
  useVisibleInterval(
    async () => {
      if (!refreshAction || !email) return;
      const res = await refreshAction(result.referenceNumber, email).catch(() => null);
      if (!res?.ok || !res.result) return;
      setLive(res.result);
      onRefresh?.(res.result);
    },
    isLive ? POLL_MS : null,
  );

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
        </div>
      </div>

      <div className="mt-4 mb-1">
        <SupportStageStepper stage={live.stage} activeLabel={live.stageLabel} />
      </div>
      <ResponseCountdown expectedResponseBy={live.expectedResponseBy} stage={live.stage} />

      <p className="mt-3 text-xs text-muted-foreground">Submitted {new Date(live.createdAt).toLocaleString()}</p>

      {crmUrl && email && live.crmTicketNumber && live.stage >= 2 && <LiveChatThread apiBase={crmUrl} ticketNumber={live.crmTicketNumber} email={email} />}
    </div>
  );
}
