import { z } from "zod";

// Must match the CRM's TICKET_CATEGORIES exactly, string for string — these
// cross the server-to-server bridge as plain strings and are validated
// there against its own enum (see the CRM's publicSupportRequestSchema).
export const REQUEST_CATEGORIES = ["Finance", "Property Management", "Sales & Marketing", "HR & Administration", "Technical Support", "Complaint", "Customer Care", "Don't Know"] as const;

/** A business unit as fetched live from the CRM's /api/public/business-units — see crm-bridge.ts's fetchCrmBusinessUnits. Business units are admin-creatable/deletable in the CRM, so this list is never hardcoded here. */
export interface PublicBusinessUnit {
  code: string;
  name: string;
}

export const supportRequestSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(60),
    lastName: z.string().trim().min(1, "Last name is required").max(60),
    email: z.string().trim().toLowerCase().email("Enter a valid email").optional().or(z.literal("")),
    phone: z.string().trim().min(7, "Enter a valid phone number").max(20).optional().or(z.literal("")),
    businessUnit: z.string().optional().or(z.literal("")),
    category: z.enum(REQUEST_CATEGORIES),
    subject: z.string().trim().min(1, "Subject is required").max(150),
    description: z.string().trim().min(10, "Please provide a few more details (at least 10 characters)").max(2000),
  })
  .refine((data) => !!data.email || !!data.phone, {
    message: "Provide an email or phone number so we can follow up",
    path: ["email"],
  });

export type SupportRequestInput = z.infer<typeof supportRequestSchema>;

export interface TrackedRequest {
  referenceNumber: string;
  subject: string;
  category: string;
  // Deliberately no `priority` — internal triage detail, only depts should
  // see it (matches the CRM's own PublicTicketStatus).
  status: string;
  stage: 1 | 2 | 3;
  stageLabel: string;
  createdAt: string;
  expectedResponseBy: string | null;
  /** The CRM's own ticket number (different from referenceNumber above), once bridging succeeds — needed to talk to the CRM's live-chat API, which only knows tickets by this number. Null until/unless the bridge call succeeded. */
  crmTicketNumber: string | null;
}

export interface SupportFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  referenceNumber?: string;
  expectedResponseBy?: string;
  contactEmail?: string;
  contactPhone?: string;
  /** Live tracking snapshot for the just-created request, so the submitter sees real status immediately without re-entering their reference number and email. */
  tracking?: TrackedRequest;
}

export const trackRequestSchema = z.object({
  referenceNumber: z.string().trim().min(1, "Enter your reference number"),
  email: z.string().trim().toLowerCase().email("Enter the email you used when submitting"),
});

export type TrackRequestInput = z.infer<typeof trackRequestSchema>;

export interface TrackRequestFormState {
  error?: string;
  result?: TrackedRequest;
  email?: string;
}

/** Mirrors the CRM's own LiveChatMessage — the shape returned by its /api/public/live-chat route, which this app's LiveChatThread calls directly cross-origin. */
export interface LiveChatMessage {
  id: string;
  from: "customer" | "staff";
  content: string;
  occurredAt: string;
}
