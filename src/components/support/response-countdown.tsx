"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/**
 * Status line tied to the CRM's SLA deadline for this request, mirrored from
 * the CRM repo's identical component — kept in sync manually since these
 * are separate codebases (see lib/support-stage.ts for the same note).
 * Deliberately doesn't surface the raw deadline timestamp or a precise
 * countdown — that read as a technical SLA promise rather than a
 * reassurance. Only renders when the bridge successfully pulled a live
 * deadline from the CRM (see crm-bridge.ts#pullCrmStatus) — no local SLA
 * data exists here to fall back to.
 */
export function ResponseCountdown({ expectedResponseBy, stage }: { expectedResponseBy: string | null; stage: 1 | 2 | 3 }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!expectedResponseBy || stage === 3) return null;

  const due = new Date(expectedResponseBy).getTime();
  const remaining = due - now;
  const overdue = remaining <= 0;

  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="size-3.5 shrink-0" />
      {overdue ? (
        <span>Response window has passed — our team is still on it.</span>
      ) : (
        <span>Sent to our team — we&apos;ll get back to you soon.</span>
      )}
    </p>
  );
}
