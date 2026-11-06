"use client";

import { useEffect } from "react";
import { useVisibleInterval } from "@/hooks/use-visible-interval";

const HEARTBEAT_MS = 25_000;
const SESSION_KEY = "mw_help_session_id";
const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL;
const ENDPOINT = CRM_URL ? `${CRM_URL.replace(/\/$/, "")}/api/public/presence` : null;

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Invisible — sends a "someone is on this page" beacon to the main CRM
 * (a separate deployment) so Customer Care's live-activity view there shows
 * this app's visitors too. Cross-origin fetch to NEXT_PUBLIC_CRM_URL; the
 * CRM's /api/public/presence route is deliberately open (no api-key) since
 * this payload is non-sensitive telemetry — see that route's own comment.
 * Heartbeats stop while the tab is hidden, so a visitor who has switched
 * away shows as Idle after a minute and as Live again the moment they're back.
 */
export function PresenceTracker({ ticketNumber }: { ticketNumber?: string }) {
  function ping(action: "pageview" | "heartbeat") {
    if (!ENDPOINT) return;
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: getSessionId(), source: "customer", path: window.location.pathname, ticketNumber, action }),
      keepalive: true,
    }).catch(() => {});
  }

  useEffect(() => {
    ping("pageview");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ping only closes over ticketNumber
  }, [ticketNumber]);

  useVisibleInterval(() => ping("heartbeat"), ENDPOINT ? HEARTBEAT_MS : null, { immediate: false });

  return null;
}
