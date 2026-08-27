"use server";

import {
  supportRequestSchema,
  trackRequestSchema,
  REQUEST_CATEGORIES,
  type SupportFormState,
  type TrackRequestFormState,
} from "@/lib/validation/support";
import { submitSupportRequest, trackSupportRequest } from "@/lib/services/support.service";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { generateGeminiReply } from "@/lib/ai/gemini";
import { formatSupportHours, isWithinSupportHours } from "@/lib/support-hours";

function friendlyError(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

const RATE_LIMIT_MESSAGE = "Too many requests from your connection. Please wait a few minutes and try again.";

export async function submitSupportRequestAction(_prev: SupportFormState, formData: FormData): Promise<SupportFormState> {
  // Honeypot: a real visitor never fills this hidden field. Bots that do get a
  // fake "success" response so they don't learn to leave it empty next time.
  if (formData.get("companyWebsite")) {
    return { success: true, referenceNumber: "REQ-000000" };
  }

  if (!checkRateLimit("submit", await getClientIp(), 5)) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const parsed = supportRequestSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    preferredContactMethod: formData.get("preferredContactMethod"),
    businessUnit: formData.get("businessUnit"),
    category: formData.get("category"),
    subject: formData.get("subject"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    const result = await submitSupportRequest(parsed.data);
    return {
      success: true,
      referenceNumber: result.referenceNumber,
      expectedResponseBy: result.expectedResponseBy.toISOString(),
      contactEmail: result.contactEmail ?? undefined,
      contactPhone: result.contactPhone ?? undefined,
      tracking: result.tracking,
    };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function trackSupportRequestAction(_prev: TrackRequestFormState, formData: FormData): Promise<TrackRequestFormState> {
  if (!checkRateLimit("track", await getClientIp(), 20)) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const parsed = trackRequestSchema.safeParse({
    referenceNumber: formData.get("referenceNumber"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };

  const result = await trackSupportRequest(parsed.data.referenceNumber, parsed.data.email);
  if (!result) return { error: "We couldn't find a request matching that reference number and email." };

  return { result, email: parsed.data.email };
}

export interface ChatRequestInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  category: string;
  description: string;
}

export type ChatSubmitResult = { ok: true; referenceNumber: string; expectedResponseBy?: string } | { ok: false; error: string };

/**
 * Same underlying flow as submitSupportRequestAction, but for the chatbot
 * widget, which collects fields turn-by-turn rather than via a single
 * <form> submit. Subject is derived from the description to keep the
 * conversation short (no separate "subject" turn).
 */
export async function chatSubmitRequestAction(input: ChatRequestInput): Promise<ChatSubmitResult> {
  if (!checkRateLimit("submit", await getClientIp(), 5)) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  const subject = input.description.length > 80 ? `${input.description.slice(0, 80)}…` : input.description;

  const parsed = supportRequestSchema.safeParse({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email ?? "",
    phone: input.phone ?? "",
    businessUnit: "",
    category: input.category,
    subject,
    description: input.description,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the details and try again." };

  try {
    const result = await submitSupportRequest(parsed.data);
    return { ok: true, referenceNumber: result.referenceNumber, expectedResponseBy: result.expectedResponseBy.toISOString() };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

export type ChatTrackResult = { ok: true; result: NonNullable<Awaited<ReturnType<typeof trackSupportRequest>>> } | { ok: false };

export async function chatTrackRequestAction(referenceNumber: string, email: string): Promise<ChatTrackResult> {
  if (!checkRateLimit("track", await getClientIp(), 20)) {
    return { ok: false };
  }

  const parsed = trackRequestSchema.safeParse({ referenceNumber, email });
  if (!parsed.success) return { ok: false };

  const result = await trackSupportRequest(parsed.data.referenceNumber, parsed.data.email);
  if (!result) return { ok: false };
  return { ok: true, result };
}

export type ChatAskResult = { ok: true; text: string } | { ok: false };

const ASK_SYSTEM_PROMPT = `You are the Masterways virtual assistant, on the public Help & Support website for Masterways Group of Companies (Real Estate, SACCO, Insurance and Housing).

You have no access to any specific customer's account, ticket, or personal data — never invent a ticket status, balance, or timeline. If someone asks about THEIR OWN specific request, tell them to use "Track my request" (needs their reference number + email) instead of answering directly.

If someone wants to report a problem or file a complaint, tell them to use "File a complaint" instead of describing it to you directly.

Facts you can share:
- Support hours: ${formatSupportHours()} (Africa/Nairobi time). Currently ${isWithinSupportHours() ? "open" : "closed"}.
- Request categories: ${REQUEST_CATEGORIES.join(", ")}.
- Submitting a request creates a real ticket with an estimated response time shown immediately; it can be tracked anytime with the reference number + the email used.

Keep replies under 3 sentences, plain text (no markdown), friendly and concise.`;

/** Free-form Q&A fallback for the "Ask a question" path — grounded in real support-hours/category facts, explicitly barred from inventing account-specific details. Falls back to a plain message if Gemini is unavailable. */
export async function chatAskAction(question: string): Promise<ChatAskResult> {
  if (!checkRateLimit("chat-ask", await getClientIp(), 20)) {
    return { ok: false };
  }

  const text = await generateGeminiReply(ASK_SYSTEM_PROMPT, question);
  if (!text) return { ok: false };
  return { ok: true, text };
}
