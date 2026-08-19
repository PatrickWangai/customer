import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { RequestPriority } from "@prisma/client";
import { classifyTicket } from "@/lib/ai/classify-ticket";
import { forwardToCrm } from "@/lib/services/crm-bridge";
import type { SupportRequestInput, TrackedRequest } from "@/lib/validation/support";

async function nextReferenceNumber(): Promise<string> {
  const count = await prisma.supportRequest.count();
  return `REQ-${String(count + 1).padStart(6, "0")}`;
}

/** Rough, static response-time promise by priority — no SLA admin system in this standalone app. */
const ETA_HOURS: Record<RequestPriority, number> = { URGENT: 4, HIGH: 24, MEDIUM: 72, LOW: 120 };

function cleanStr(v?: string | null): string | null {
  return v && v.length > 0 ? v : null;
}

export interface SubmitResult {
  referenceNumber: string;
  expectedResponseBy: Date;
}

/**
 * Entry point for the public Help & Support site. No auth, no staff view —
 * this app only captures requests into its own database. Priority is always
 * set by the deterministic classifier from the wording alone, never from a
 * client-submitted field, so a submitter can't self-escalate priority.
 */
export async function submitSupportRequest(input: SupportRequestInput): Promise<SubmitResult> {
  const classification = classifyTicket(input.subject, input.description);
  const priority: RequestPriority = classification?.priority ?? "MEDIUM";

  const record = await prisma.supportRequest.create({
    data: {
      referenceNumber: await nextReferenceNumber(),
      firstName: input.firstName,
      lastName: input.lastName,
      email: cleanStr(input.email) ?? undefined,
      phone: cleanStr(input.phone) ?? undefined,
      businessUnit: cleanStr(input.businessUnit) ?? undefined,
      category: input.category,
      subject: input.subject,
      description: input.description,
      priority,
      status: "SUBMITTED",
    },
  });

  const bridgeResult = await forwardToCrm({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    businessUnit: input.businessUnit,
    category: input.category,
    subject: input.subject,
    description: input.description,
  });
  await prisma.supportRequest.update({
    where: { id: record.id },
    data: bridgeResult.ok ? { crmTicketNumber: bridgeResult.ticketNumber } : { crmSyncError: bridgeResult.error },
  });

  return { referenceNumber: record.referenceNumber, expectedResponseBy: new Date(Date.now() + ETA_HOURS[priority] * 60 * 60 * 1000) };
}

/**
 * Unauthenticated status lookup. The (referenceNumber, email) pair acts as a
 * shared secret only the submitter should know — returns null on any
 * mismatch rather than distinguishing "wrong reference" from "wrong email"
 * so a guesser can't enumerate valid reference numbers.
 */
export async function trackSupportRequest(referenceNumber: string, email: string): Promise<TrackedRequest | null> {
  const record = await prisma.supportRequest.findUnique({ where: { referenceNumber } });
  if (!record || !record.email || record.email.toLowerCase() !== email.toLowerCase()) {
    return null;
  }

  return {
    referenceNumber: record.referenceNumber,
    subject: record.subject,
    category: record.category,
    priority: record.priority,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
  };
}
