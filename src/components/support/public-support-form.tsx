"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitSupportRequestAction } from "@/app/actions";
import { REQUEST_CATEGORIES, BUSINESS_UNITS } from "@/lib/validation/support";
import { classifyTicket } from "@/lib/ai/classify-ticket";
import type { SupportFormState } from "@/lib/validation/support";

const initialState: SupportFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className="w-full sm:w-auto">
      Submit request
    </Button>
  );
}

export function PublicSupportForm() {
  const [state, formAction] = useActionState(submitSupportRequestAction, initialState);
  const [businessUnit, setBusinessUnit] = useState("");
  const [category, setCategory] = useState<string>(REQUEST_CATEGORIES[3]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const classification = useMemo(() => classifyTicket(subject, description), [subject, description]);
  const suggestionApplied = classification && classification.category === category;

  if (state.success) {
    return (
      <div className="rounded-lg border border-success/30 bg-success-muted/40 p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" />
        <h3 className="mt-3 text-lg font-semibold">Request received</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Your reference number is <span className="font-mono font-semibold text-foreground">{state.referenceNumber}</span>. Keep it — you&apos;ll
          need it to track your request below.
        </p>
        {state.expectedResponseBy && (
          <p className="mt-2 text-sm text-muted-foreground">Expected response by {new Date(state.expectedResponseBy).toLocaleString()}.</p>
        )}
      </div>
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
          <Input id="email" name="email" type="email" placeholder="you@example.com" aria-invalid={!!state.fieldErrors?.email} />
          {state.fieldErrors?.email && <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" placeholder="+254 7XX XXX XXX" aria-invalid={!!state.fieldErrors?.phone} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Provide at least one of email or phone so we can follow up.</p>

      <div className="space-y-1.5">
        <Label htmlFor="businessUnit">Which service is this about?</Label>
        <input type="hidden" name="businessUnit" value={businessUnit} />
        <Select value={businessUnit} onValueChange={setBusinessUnit}>
          <SelectTrigger id="businessUnit">
            <SelectValue placeholder="Not sure / general" />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_UNITS.map((bu) => (
              <SelectItem key={bu} value={bu}>
                {bu}
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
