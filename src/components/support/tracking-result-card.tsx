import { StatusBadge } from "@/components/status-badge";
import { SupportStageStepper } from "@/components/support/support-stage-stepper";
import { ResponseCountdown } from "@/components/support/response-countdown";
import type { TrackedRequest } from "@/lib/validation/support";

/** The live status view — stepper, countdown, submitted-at — shared between a manual lookup (Track a request) and the automatic view shown right after submitting, so both stay in sync as one component. */
export function TrackingResultCard({ result }: { result: TrackedRequest }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{result.subject}</p>
          <p className="text-xs text-muted-foreground">
            {result.referenceNumber} &middot; {result.category}
          </p>
        </div>
        <StatusBadge status={result.priority} />
      </div>

      <div className="mt-4 mb-1">
        <SupportStageStepper stage={result.stage} activeLabel={result.stageLabel} />
      </div>
      <ResponseCountdown expectedResponseBy={result.expectedResponseBy} stage={result.stage} />

      <p className="mt-3 text-xs text-muted-foreground">Submitted {new Date(result.createdAt).toLocaleString()}</p>
    </div>
  );
}
