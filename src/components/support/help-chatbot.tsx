"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { classifyTicket } from "@/lib/ai/classify-ticket";
import { REQUEST_CATEGORIES } from "@/lib/validation/support";
import { chatSubmitRequestAction, chatTrackRequestAction, chatAskAction } from "@/app/actions";
import { isWithinSupportHours, closedHoursMessage } from "@/lib/support-hours";
import { OPEN_LIVE_CHAT_EVENT } from "@/lib/live-chat-events";

type Stage =
  | "greeting"
  | "collect_description"
  | "confirm_category"
  | "collect_name"
  | "collect_contact"
  | "submitting"
  | "track_number"
  | "track_email"
  | "track_submitting"
  | "ask_question"
  | "idle";

interface Message {
  id: number;
  from: "bot" | "user";
  text: string;
}

let nextId = 1;

const INVITE_DISMISSED_KEY = "mw_help_chat_invite_dismissed";

export function HelpChatbot({ supportEmail }: { supportEmail: string }) {
  const [open, setOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stage, setStage] = useState<Stage>("greeting");
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const draft = useRef<{ description?: string; category?: string; firstName?: string; lastName?: string; email?: string; phone?: string; referenceNumber?: string }>({});

  useEffect(() => {
    if (localStorage.getItem(INVITE_DISMISSED_KEY)) return;
    const timer = setTimeout(() => setShowInvite(true), 4_000);
    return () => clearTimeout(timer);
  }, []);

  function dismissInvite() {
    setShowInvite(false);
    localStorage.setItem(INVITE_DISMISSED_KEY, "1");
  }

  function toggleOpen() {
    dismissInvite();
    const next = !open;
    if (next && messages.length === 0) {
      if (!isWithinSupportHours()) {
        bot(closedHoursMessage());
      }
      bot("Hi! I'm the Masterways virtual assistant. How can I help?", ["File a complaint", "Track my request", "Ask a question", "Chat with our team", "Contact & hours"]);
      setStage("greeting");
    }
    setOpen(next);
  }

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function bot(text: string, replies: string[] = []) {
    setMessages((m) => [...m, { id: nextId++, from: "bot", text }]);
    setQuickReplies(replies);
  }

  function user(text: string) {
    setMessages((m) => [...m, { id: nextId++, from: "user", text }]);
    setQuickReplies([]);
  }

  async function handleSend(rawText?: string) {
    const text = (rawText ?? input).trim();
    if (!text || busy) return;
    user(text);
    setInput("");
    await advance(text);
  }

  async function advance(text: string) {
    switch (stage) {
      case "greeting":
      case "idle": {
        if (/^track/i.test(text) || /^REQ-\d+/i.test(text)) {
          bot("Sure — what's your reference number? (e.g. REQ-000123)");
          setStage("track_number");
          return;
        }
        if (/contact|hours|email|phone/i.test(text)) {
          bot(`You can reach us at ${supportEmail}. Response time depends on priority — you'll get an estimate once your request is logged.`, [
            "File a complaint",
            "Track my request",
            "Chat with our team",
          ]);
          setStage("idle");
          return;
        }
        if (/complaint|request|issue|problem/i.test(text) && text.split(" ").length <= 4) {
          bot("Sorry to hear that. Please briefly describe what happened.");
          setStage("collect_description");
          return;
        }
        draft.current.description = text;
        return handleDescriptionCollected(text);
      }

      case "collect_description": {
        draft.current.description = text;
        return handleDescriptionCollected(text);
      }

      case "confirm_category": {
        const match = REQUEST_CATEGORIES.find((c) => c.toLowerCase() === text.toLowerCase());
        draft.current.category = match ?? text;
        bot("Got it. What's your first and last name?");
        setStage("collect_name");
        return;
      }

      case "collect_name": {
        const [firstName, ...rest] = text.split(" ");
        draft.current.firstName = firstName || text;
        draft.current.lastName = rest.join(" ") || "—";
        bot("And the best email or phone number to reach you?");
        setStage("collect_contact");
        return;
      }

      case "collect_contact": {
        const isEmail = text.includes("@");
        if (isEmail) draft.current.email = text;
        else draft.current.phone = text;
        setStage("submitting");
        setBusy(true);
        bot("One moment while I log this...");
        const result = await chatSubmitRequestAction({
          firstName: draft.current.firstName ?? "Website",
          lastName: draft.current.lastName ?? "Visitor",
          email: draft.current.email,
          phone: draft.current.phone,
          category: draft.current.category ?? "Customer Care",
          description: draft.current.description ?? text,
        });
        setBusy(false);
        if (result.ok) {
          const eta = result.expectedResponseBy ? ` Expected response by ${new Date(result.expectedResponseBy).toLocaleString()}.` : "";
          bot(`Done! I've logged this as ${result.referenceNumber}.${eta} You can track it anytime here or on the Track tab.`, [
            "File another complaint",
            "Track a request",
            "Chat with our team",
          ]);
        } else {
          bot(`Sorry, something went wrong: ${result.error}. Please try the form above instead.`);
        }
        draft.current = {};
        setStage("idle");
        return;
      }

      case "track_number": {
        draft.current.referenceNumber = text;
        bot("And the email you used when submitting?");
        setStage("track_email");
        return;
      }

      case "track_email": {
        setStage("track_submitting");
        setBusy(true);
        const result = await chatTrackRequestAction(draft.current.referenceNumber ?? "", text);
        setBusy(false);
        if (result.ok) {
          bot(
            `${result.result.subject}\nStage: ${result.result.stageLabel} (${result.result.stage}/3)\nSubmitted ${new Date(result.result.createdAt).toLocaleString()}`,
          );
        } else {
          bot("I couldn't find a request matching that reference number and email. Double-check them and try again, or use the Track tab above.");
        }
        draft.current = {};
        setStage("idle");
        return;
      }

      case "ask_question": {
        setBusy(true);
        const result = await chatAskAction(text);
        setBusy(false);
        if (result.ok) {
          bot(result.text, ["Ask another question", "File a complaint", "Track my request"]);
        } else {
          bot("I'm not able to answer that right now — try File a complaint or Track my request instead, or email us directly.", [
            "File a complaint",
            "Track my request",
          ]);
        }
        return;
      }

      default:
        return;
    }
  }

  function handleDescriptionCollected(description: string) {
    const suggestion = classifyTicket(description, description);
    if (suggestion) {
      bot(`Thanks. This sounds like it might be: ${suggestion.category}. Is that right?`, [suggestion.category, "Something else"]);
      setStage("confirm_category");
    } else {
      bot("Which category best fits?", [...REQUEST_CATEGORIES]);
      setStage("confirm_category");
    }
  }

  async function handleQuickReply(reply: string) {
    if (reply === "Something else") {
      user(reply);
      bot("Which category best fits?", [...REQUEST_CATEGORIES]);
      setStage("confirm_category");
      return;
    }
    if (reply === "File a complaint" || reply === "File another complaint") {
      user(reply);
      bot("Please briefly describe what happened.");
      setStage("collect_description");
      return;
    }
    if (reply === "Track my request" || reply === "Track a request") {
      user(reply);
      bot("Sure — what's your reference number? (e.g. REQ-000123)");
      setStage("track_number");
      return;
    }
    if (reply === "Ask a question" || reply === "Ask another question") {
      user(reply);
      bot("Sure — what would you like to know?");
      setStage("ask_question");
      return;
    }
    if (reply === "Contact & hours") {
      user(reply);
      bot(`You can reach us at ${supportEmail}. Response time depends on priority — you'll get an estimate once your request is logged.`, [
        "File a complaint",
        "Track my request",
        "Chat with our team",
      ]);
      setStage("idle");
      return;
    }
    if (reply === "Chat with our team") {
      user(reply);
      window.dispatchEvent(new CustomEvent(OPEN_LIVE_CHAT_EVENT));
      setOpen(false);
      return;
    }
    await handleSend(reply);
  }

  return (
    <>
      {/* Floating panel — anchored bottom-right above the FAB, no backdrop */}
      {open && (
        <div
          data-testid="help-chatbot-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Masterways virtual assistant"
          className="fixed bottom-20 right-4 z-50 flex w-80 flex-col overflow-hidden rounded-2xl shadow-2xl sm:bottom-24 sm:right-6 sm:w-96"
          style={{ maxHeight: "min(34rem, calc(100vh - 6rem))" }}
        >
          {/* Header — dark branded band */}
          <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: "#0f1117" }}>
            {/* Logo */}
            <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
              <Image src="/logo.png" alt="Masterways" width={32} height={32} className="size-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight text-white">Masterways</p>
              <p className="text-[11px] leading-tight" style={{ color: "#8b95a8" }}>The team can also help</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-md p-1 transition-colors"
              style={{ color: "#8b95a8" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
              onMouseLeave={e => (e.currentTarget.style.color = "#8b95a8")}
              aria-label="Close chat"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto p-4" style={{ background: "#ffffff" }}>
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                  style={
                    m.from === "bot"
                      ? { background: "#0f1117", color: "#ffffff" }
                      : { background: "#e5e7eb", color: "#111827" }
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm" style={{ background: "#f3f4f6", color: "#6b7280" }}>
                  <Loader2 className="size-3.5 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Quick replies */}
          {quickReplies.length > 0 && !busy && (
            <div className="flex flex-wrap gap-1.5 border-t px-3 py-2.5" style={{ background: "#ffffff", borderColor: "#e5e7eb" }}>
              {quickReplies.map((r) => (
                <button
                  key={r}
                  onClick={() => handleQuickReply(r)}
                  className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                  style={{ borderColor: "#d1d5db", color: "#374151", background: "#ffffff" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#f9fafb"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#ffffff"; }}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); void handleSend(); }}
            className="flex items-center gap-2 border-t p-3"
            style={{ background: "#ffffff", borderColor: "#e5e7eb" }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              placeholder="Ask a question…"
              autoFocus
              className="flex-1 rounded-xl border px-3.5 py-2 text-sm outline-none transition-shadow disabled:opacity-50"
              style={{ borderColor: "#e5e7eb", background: "#f9fafb", color: "#111827" }}
              onFocus={e => (e.currentTarget.style.boxShadow = "0 0 0 2px #0f1117")}
              onBlur={e => (e.currentTarget.style.boxShadow = "none")}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send message"
              className="flex size-8 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-40"
              style={{ background: "#0f1117", color: "#ffffff" }}
            >
              <Send className="size-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Invite nudge */}
      {showInvite && !open && (
        <div className="fixed bottom-20 right-4 z-40 flex max-w-[calc(100vw-2rem)] items-start gap-2 rounded-xl border border-border bg-card p-3 shadow-lg sm:bottom-24 sm:right-6 sm:max-w-64">
          <p className="text-sm text-foreground">Need help? Chat with our virtual assistant.</p>
          <button onClick={dismissInvite} className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:bg-secondary" aria-label="Dismiss">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
        <button
          onClick={toggleOpen}
          aria-label={open ? "Close chat" : "Open chat"}
          className="flex size-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{ background: "#0f1117", color: "#ffffff" }}
        >
          {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
        </button>
      </div>
    </>
  );
}
