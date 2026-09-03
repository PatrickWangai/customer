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
  const [view, setView] = useState<"home" | "chat">("home");
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
    if (!open) {
      setView("home");
    }
    setOpen((o) => !o);
  }

  function startFlow(reply: string) {
    setView("chat");
    if (messages.length === 0 && !isWithinSupportHours()) {
      bot(closedHoursMessage());
    }
    if (messages.length === 0) {
      setStage("greeting");
    }
    void handleQuickReply(reply);
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
          category: draft.current.category ?? "General Inquiry",
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

  const PANEL = "fixed bottom-20 right-4 z-50 flex w-[348px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:bottom-24 sm:right-6";
  const PANEL_HEIGHT = { maxHeight: "min(36rem, calc(100vh - 6rem))" };

  /* ── Shared header ── */
  const Header = ({ onBack }: { onBack?: () => void }) => (
    <div className="flex items-center gap-2.5 border-b px-4 py-3" style={{ borderColor: "#e5e7eb" }}>
      {onBack && (
        <button onClick={onBack} className="mr-0.5 rounded-md p-1 text-gray-400 hover:text-gray-600" aria-label="Back">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}
      <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white">
        <Image src="/logo.png" alt="Masterways" width={28} height={28} className="size-full object-contain" />
      </div>
      <span className="flex-1 text-[15px] font-bold text-gray-900">Masterways</span>
      <button onClick={() => setOpen(false)} className="rounded-md p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
        <X className="size-4" />
      </button>
    </div>
  );

  return (
    <>
      {open && view === "home" && (
        <div className={PANEL} style={PANEL_HEIGHT} role="dialog" aria-modal="true" aria-label="Masterways support">
          <Header />

          {/* Greeting */}
          <div className="px-5 pt-6 pb-4">
            <p className="text-2xl font-bold leading-snug text-gray-900">Hi there 👋</p>
            <p className="text-2xl font-bold leading-snug text-gray-900">How can we help?</p>
          </div>

          {/* Option cards */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
            {[
              { label: "File a complaint", sub: "Log a complaint or service request", reply: "File a complaint", icon: "📝" },
              { label: "Track a request", sub: "Check the status of an existing request", reply: "Track my request", icon: "🔍" },
              { label: "Ask a question", sub: "AI-assisted answers, instantly", reply: "Ask a question", icon: "💬" },
              { label: "Chat with our team", sub: "Connect to a live agent", reply: "Chat with our team", icon: "👤" },
            ].map((card) => (
              <button
                key={card.label}
                onClick={() => startFlow(card.reply)}
                className="flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors hover:bg-gray-50"
                style={{ borderColor: "#e5e7eb" }}
              >
                <span className="text-xl leading-none">{card.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{card.label}</p>
                  <p className="text-xs text-gray-500">{card.sub}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-gray-400"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            ))}
          </div>

          {/* Bottom nav */}
          <div className="flex border-t" style={{ borderColor: "#e5e7eb" }}>
            <button className="flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-medium" style={{ color: "#111827" }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7A1 1 0 003 11h1v6a1 1 0 001 1h4v-4h2v4h4a1 1 0 001-1v-6h1a1 1 0 00.707-1.707l-7-7z"/></svg>
              Home
            </button>
            <button onClick={() => { if (messages.length > 0) setView("chat"); }} className="flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-medium text-gray-400">
              <MessageCircle className="size-[18px]" />
              Messages
            </button>
          </div>
        </div>
      )}

      {open && view === "chat" && (
        <div className={PANEL} style={PANEL_HEIGHT} role="dialog" aria-modal="true" aria-label="Masterways virtual assistant">
          <Header onBack={() => setView("home")} />

          {/* Messages */}
          <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto p-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                  style={m.from === "bot" ? { background: "#111827", color: "#fff" } : { background: "#e5e7eb", color: "#111827" }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm" style={{ background: "#111827", color: "#9ca3af" }}>
                  <Loader2 className="size-3.5 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Quick replies */}
          {quickReplies.length > 0 && !busy && (
            <div className="flex flex-wrap gap-1.5 border-t px-3 py-2.5" style={{ borderColor: "#e5e7eb" }}>
              {quickReplies.map((r) => (
                <button
                  key={r}
                  onClick={() => handleQuickReply(r)}
                  className="rounded-full border px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  style={{ borderColor: "#d1d5db" }}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); void handleSend(); }} className="flex items-center gap-2 border-t p-3" style={{ borderColor: "#e5e7eb" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              placeholder="Ask a question…"
              autoFocus
              className="flex-1 rounded-xl border px-3.5 py-2 text-sm outline-none transition-shadow disabled:opacity-50"
              style={{ borderColor: "#e5e7eb", background: "#f9fafb", color: "#111827" }}
              onFocus={e => (e.currentTarget.style.boxShadow = "0 0 0 2px #111827")}
              onBlur={e => (e.currentTarget.style.boxShadow = "none")}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="flex size-8 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-40"
              style={{ background: "#111827", color: "#fff" }}
            >
              <Send className="size-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Invite nudge */}
      {showInvite && !open && (
        <div className="fixed bottom-20 right-4 z-40 flex max-w-[calc(100vw-2rem)] items-start gap-2 rounded-xl border bg-white p-3 shadow-lg sm:bottom-24 sm:right-6 sm:max-w-64" style={{ borderColor: "#e5e7eb" }}>
          <p className="text-sm text-gray-700">Need help? Chat with our virtual assistant.</p>
          <button onClick={dismissInvite} className="shrink-0 rounded-md p-0.5 text-gray-400 hover:text-gray-600" aria-label="Dismiss">
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
          style={{ background: "#111827", color: "#fff" }}
        >
          {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
        </button>
      </div>
    </>
  );
}
