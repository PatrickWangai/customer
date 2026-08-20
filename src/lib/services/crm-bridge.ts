import "server-only";

const BUSINESS_UNIT_CODE_MAP: Record<string, string> = {
  "Real Estate": "MRE",
  SACCO: "MSL",
  Insurance: "MIA",
  Housing: "MHL",
  "General / not sure": "MGC",
};

export interface CrmBridgeInput {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  businessUnit?: string | null;
  category: string;
  subject: string;
  description: string;
}

export type CrmBridgeResult = { ok: true; ticketNumber: string } | { ok: false; error: string };

/**
 * Best-effort server-to-server call into the main Masterways CRM (a
 * separate repo/deployment) so a submission here also creates a real
 * Ticket there, landing in the normal staff queue with SLA matching and a
 * notification — same as if it had been submitted through the CRM's own
 * /help page. Never throws: a failed bridge call must not fail the
 * submitter's own request, which is already saved locally regardless.
 * Requires CRM_API_URL and PUBLIC_API_KEY (shared secret, must match the
 * CRM's own PUBLIC_API_KEY exactly) — without both, this silently no-ops.
 */
export async function forwardToCrm(input: CrmBridgeInput): Promise<CrmBridgeResult> {
  const baseUrl = process.env.CRM_API_URL;
  const apiKey = process.env.PUBLIC_API_KEY;
  if (!baseUrl || !apiKey) {
    return { ok: false, error: "CRM bridge not configured (missing CRM_API_URL or PUBLIC_API_KEY)" };
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/public/support-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email || undefined,
        phone: input.phone || undefined,
        businessUnitCode: input.businessUnit ? BUSINESS_UNIT_CODE_MAP[input.businessUnit] : undefined,
        category: input.category,
        subject: input.subject,
        description: input.description,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `CRM responded ${res.status}: ${body.slice(0, 300)}` };
    }

    const data = (await res.json()) as { ticketNumber?: string };
    if (!data.ticketNumber) return { ok: false, error: "CRM response missing ticketNumber" };
    return { ok: true, ticketNumber: data.ticketNumber };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error calling CRM" };
  }
}

export interface CrmTicketStatus {
  status: string;
  stage: 1 | 2 | 3;
  stageLabel: string;
  businessUnitName: string | null;
}

/**
 * Pulls the live status of a ticket this app already forwarded to the CRM
 * (crmTicketNumber, stored at submission time), so tracking reflects real
 * staff progress instead of the local SupportRequest.status, which nothing
 * ever updates after creation. Returns null on any failure (CRM
 * unreachable, not configured, ticket not found) — caller falls back to
 * the local status.
 */
export async function pullCrmStatus(crmTicketNumber: string): Promise<CrmTicketStatus | null> {
  const baseUrl = process.env.CRM_API_URL;
  const apiKey = process.env.PUBLIC_API_KEY;
  if (!baseUrl || !apiKey) return null;

  try {
    const res = await fetch(
      `${baseUrl.replace(/\/$/, "")}/api/public/support-requests/status?ticketNumber=${encodeURIComponent(crmTicketNumber)}`,
      { headers: { "x-api-key": apiKey }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: string; stage?: 1 | 2 | 3; stageLabel?: string; businessUnitName?: string | null };
    if (!data.status || !data.stage || !data.stageLabel) return null;
    return { status: data.status, stage: data.stage, stageLabel: data.stageLabel, businessUnitName: data.businessUnitName ?? null };
  } catch {
    return null;
  }
}
