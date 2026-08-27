"use client";

import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitSupportRequestAction, chatTrackRequestAction } from "@/app/actions";
import { REQUEST_CATEGORIES } from "@/lib/validation/support";
import { classifyTicket } from "@/lib/ai/classify-ticket";
import { TrackingResultCard } from "@/components/support/tracking-result-card";
import { PresenceTracker } from "@/components/support/presence-tracker";
import type { PublicBusinessUnit, SupportFormState, TrackedRequest } from "@/lib/validation/support";

const initialState: SupportFormState = {};

/** Survives navigating away and back (or a refresh) within the same tab — cleared when the tab closes. Just this submitter's own data on their own device. */
const STORAGE_KEY = "masterways-help-last-request";

/** Radix Select needs a non-empty value for every item — this stands in for businessUnit="" ("General / not sure"). */
const GENERAL_BUSINESS_UNIT = "__general__";
/** Same sentinel trick for preferredContactMethod="" ("No preference"). */
const GENERAL_CONTACT_METHOD = "__no_preference__";

interface StoredResult {
  referenceNumber: string;
  contactEmail?: string;
  contactPhone?: string;
  tracking: TrackedRequest;
}

function contactMessage(email?: string, phone?: string): string | null {
  if (email && phone) return `We'll reach out to you at ${email} or ${phone} as your request moves forward.`;
  if (email) return `We'll reach out to you at ${email} as your request moves forward.`;
  if (phone) return `We'll reach out to you at ${phone} as your request moves forward.`;
  return null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className="w-full sm:w-auto">
      Submit request
    </Button>
  );
}

export function PublicSupportForm({ businessUnits }: { businessUnits: PublicBusinessUnit[] }) {
  const [state, formAction] = useActionState(submitSupportRequestAction, initialState);
  const [businessUnit, setBusinessUnit] = useState("");
  const [category, setCategory] = useState<string>("Don't Know");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState("");

  // Keeps the selection valid as the customer edits which contact fields
  // they've actually filled in — e.g. clearing the only phone number they'd
  // entered after picking "SMS" would otherwise leave a dangling preference
  // pointing at a field that's now empty.
  function handleEmailChange(value: string) {
    setEmail(value);
    if (!value && preferredContactMethod === "EMAIL") setPreferredContactMethod("");
  }
  function handlePhoneChange(value: string) {
    setPhone(value);
    if (!value && (preferredContactMethod === "SMS" || preferredContactMethod === "WHATSAPP")) setPreferredContactMethod("");
  }

  const classification = useMemo(() => classifyTicket(subject, description), [subject, description]);
  const suggestionApplied = classification && classification.category === category;

  const [popupOpen, setPopupOpen] = useState(false);

  // Starts null so the server render and the client's first render match
  // (sessionStorage doesn't exist on the server) — restored just after mount
  // below instead, which avoids a hydration mismatch at the cost of a brief
  // flash of the form before it swaps to the tracker on an actual restore.
  const [activeResult, setActiveResult] = useState<StoredResult | null>(null);

  // A fresh, real submission — persist it and show the popup.
  const [prevSuccess, setPrevSuccess] = useState(state.success);
  if (state.success !== prevSuccess) {
    setPrevSuccess(state.success);
    if (state.success && state.tracking && state.referenceNumber) {
      const result: StoredResult = {
        referenceNumber: state.referenceNumber,
        contactEmail: state.contactEmail,
        contactPhone: state.contactPhone,
        tracking: state.tracking,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      setActiveResult(result);
      setPopupOpen(true);
    }
  }

  // Restore whatever was last submitted, once mounted (sessionStorage is a
  // client-only external system, so this can't happen during render without
  // risking a hydration mismatch — see the comment on activeResult above).
  // TrackingResultCard takes over from here with its own background polling
  // (including an immediate refresh on mount) when an email is on file;
  // phone-only submissions keep whatever snapshot was last saved.
  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    let saved: StoredResult;
    try {
      saved = JSON.parse(raw) as StoredResult;
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating local state from sessionStorage, which isn't available during the server/first-client render
    setActiveResult(saved);
  }, []);

  // Persists each polled refresh so a reload picks up the freshest known
  // status instead of the snapshot from whenever the request was submitted.
  const handleTrackingRefresh = useCallback((tracking: TrackedRequest) => {
    setActiveResult((prev) => {
      if (!prev) return prev;
      const updated: StoredResult = { ...prev, tracking };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  function startNewRequest() {
    sessionStorage.removeItem(STORAGE_KEY);
    setActiveResult(null);
  }

  if (activeResult) {
    const contact = contactMessage(activeResult.contactEmail, activeResult.contactPhone);
    return (
      <>
        {popupOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setPopupOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-sm rounded-lg bg-card p-6 text-center shadow-lg" onClick={(e) => e.stopPropagation()}>
              <CheckCircle2 className="mx-auto size-10 text-success" />
              <h3 className="mt-3 text-lg font-semibold">Thank you for choosing Masterways</h3>
              <p className="mt-1 text-sm font-medium">Request received</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Your reference number is <span className="font-mono font-semibold text-foreground">{activeResult.referenceNumber}</span>. Keep it
                — you&apos;ll need it to track your request below.
              </p>
              {contact && <p className="mt-2 text-sm text-muted-foreground">{contact}</p>}
              <Button className="mt-4 w-full" onClick={() => setPopupOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-4">
          <div className="rounded-lg border border-success/30 bg-success-muted/40 p-6 text-center">
            <CheckCircle2 className="mx-auto size-10 text-success" />
            <h3 className="mt-3 text-lg font-semibold">Request received</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your reference number is <span className="font-mono font-semibold text-foreground">{activeResult.referenceNumber}</span>. Keep it —
              you&apos;ll need it to track your request below.
            </p>
            {contact && <p className="mt-2 text-sm text-muted-foreground">{contact}</p>}
          </div>
          <TrackingResultCard
            result={activeResult.tracking}
            email={activeResult.contactEmail}
            refreshAction={chatTrackRequestAction}
            onRefresh={handleTrackingRefresh}
          />
          {/* The page-level tracker only picks up a ticket number via a URL deep-link — a fresh submission here never navigates, so without this the CRM's Live Activity "Chat" button would have nothing to find. Uses the CRM's own ticket number, not this app's local referenceNumber — the CRM only knows tickets by that. */}
          {activeResult.tracking.crmTicketNumber && <PresenceTracker ticketNumber={activeResult.tracking.crmTicketNumber} />}
          <Button variant="outline" className="w-full sm:w-auto" onClick={startNewRequest}>
            Submit another request
          </Button>
        </div>
      </>
    );
  }

  return (
    <form action={formAction} className="relative space-y-4" noValidate>
      {state.error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>}

      {/* Honeypot — hidden from real visitors, left off-screen rather than display:none so more bots still fill it in */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="companyWebsite">Leave this field blank</label>
        <input id="companyWebsite" name="companyWebsite" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" aria-invalid={!!state.fieldErrors?.firstName} />
          {state.fieldErrors?.firstName && <p className="text-xs text-destructive">{state.fieldErrors.firstName[0]}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" aria-invalid={!!state.fieldErrors?.lastName} />
          {state.fieldErrors?.lastName && <p className="text-xs text-destructive">{state.fieldErrors.lastName[0]}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            aria-invalid={!!state.fieldErrors?.email}
          />
          {state.fieldErrors?.email && <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+254 7XX XXX XXX"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            aria-invalid={!!state.fieldErrors?.phone}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Provide at least one of email or phone so we can follow up.</p>

      {(email || phone) && (
        <div className="space-y-1.5">
          <Label htmlFor="preferredContactMethod">How should we reach you?</Label>
          <input type="hidden" name="preferredContactMethod" value={preferredContactMethod} />
          <Select value={preferredContactMethod || GENERAL_CONTACT_METHOD} onValueChange={(v) => setPreferredContactMethod(v === GENERAL_CONTACT_METHOD ? "" : v)}>
            <SelectTrigger id="preferredContactMethod">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GENERAL_CONTACT_METHOD}>No preference</SelectItem>
              {email && <SelectItem value="EMAIL">Email</SelectItem>}
              {phone && <SelectItem value="SMS">SMS</SelectItem>}
              {phone && <SelectItem value="WHATSAPP">WhatsApp</SelectItem>}
            </SelectContent>
          </Select>
          {state.fieldErrors?.preferredContactMethod && <p className="text-xs text-destructive">{state.fieldErrors.preferredContactMethod[0]}</p>}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="businessUnit">Which service is this about?</Label>
        <input type="hidden" name="businessUnit" value={businessUnit} />
        <Select value={businessUnit || GENERAL_BUSINESS_UNIT} onValueChange={(v) => setBusinessUnit(v === GENERAL_BUSINESS_UNIT ? "" : v)}>
          <SelectTrigger id="businessUnit">
            <SelectValue placeholder="Not sure / general" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={GENERAL_BUSINESS_UNIT}>Not sure / general</SelectItem>
            {businessUnits.map((bu) => (
              <SelectItem key={bu.code} value={bu.code}>
                {bu.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <input type="hidden" name="category" value={category} />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REQUEST_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} aria-invalid={!!state.fieldErrors?.subject} />
        {state.fieldErrors?.subject && <p className="text-xs text-destructive">{state.fieldErrors.subject[0]}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Tell us what happened</Label>
        <textarea
          id="description"
          name="description"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Please include as much detail as you can — property/unit, dates, and what you'd like to see happen."
          className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-invalid={!!state.fieldErrors?.description}
        />
        {state.fieldErrors?.description && <p className="text-xs text-destructive">{state.fieldErrors.description[0]}</p>}
      </div>

      {classification && !suggestionApplied && (
        <div className="flex items-start justify-between gap-3 rounded-md border border-primary/30 bg-primary/[0.03] px-3 py-2 text-xs">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">Based on what you&apos;ve written, this looks like: {classification.category}</p>
              <p className="mt-0.5 text-muted-foreground">Switch the category above if this looks right.</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setCategory(classification.category)}>
            Use this
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        We use the details above only to respond to this request and route it to the right team — never for marketing. See our{" "}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Privacy Notice
        </a>{" "}
        for details.
      </p>

      <SubmitButton />
    </form>
  );
}
