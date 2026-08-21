"use client";

import { useEffect } from "react";

const HEARTBEAT_MS = 25_000;
const SESSION_KEY = "mw_help_session_id";

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
 */
export function PresenceTracker({ ticketNumber }: { ticketNumber?: string }) {
  useEffect(() => {
    const crmUrl = process.env.NEXT_PUBLIC_CRM_URL;
    if (!crmUrl) return;

    const sessionId = getSessionId();
    const path = window.location.pathname;
    const endpoint = `${crmUrl.replace(/\/$/, "")}/api/public/presence`;

    const ping = (action: "pageview" | "heartbeat") => {
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, source: "customer", path, ticketNumber, action }),
        keepalive: true,
      }).catch(() => {});
    };

    ping("pageview");
    const interval = setInterval(() => ping("heartbeat"), HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [ticketNumber]);

  return null;
}
