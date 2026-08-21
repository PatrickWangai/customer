"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const POLL_MS = 8_000;
const SESSION_KEY = "mw_help_session_id";

interface VisitorMessage {
  id: string;
  from: "customer" | "staff";
  content: string;
  occurredAt: string;
}

/**
 * Surfaces a live conversation a staff member started from Live Activity
 * (see staff-chat-panel.tsx's session-based mode) before any ticket
 * exists — separate from HelpChatbot's rule-based bot flow so a real
 * human joining doesn't have to fight the bot's own stage machine. Stays
 * invisible until there's actually a staff message to show; the visitor's
 * own sessionId (same one presence-tracker.tsx already generates) is the
 * only thing tying this together — no login, no ticket number yet.
 */
export function VisitorChatWidget({ apiBase }: { apiBase: string }) {
  const [messages, setMessages] = useState<VisitorMessage[]>([]);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const endpoint = `${apiBase.replace(/\/$/, "")}/api/public/visitor-chat`;

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      let sessionId = localStorage.getItem(SESSION_KEY);
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem(SESSION_KEY, sessionId);
      }
      const res = await fetch(`${endpoint}?sessionId=${encodeURIComponent(sessionId)}`).catch(() => null);
      if (!res || !res.ok || cancelled) return;
      const data = (await res.json().catch(() => null)) as { ok: boolean; messages?: VisitorMessage[] } | null;
      if (data?.ok && data.messages) setMessages(data.messages);
    }
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [endpoint]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const hasStaffMessage = messages.some((m) => m.from === "staff");
  if (!hasStaffMessage) return null;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    const sessionId = localStorage.getItem(SESSION_KEY);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, content }),
    }).catch(() => null);
    setSending(false);
    if (res?.ok) {
      setInput("");
      const data = (await res.json().catch(() => null)) as { message?: VisitorMessage } | null;
      if (data?.message) setMessages((prev) => [...prev, data.message as VisitorMessage]);
    }
  }

  if (!open) {
    return (
      <div className="fixed bottom-20 left-4 z-40 sm:bottom-24 sm:left-6">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-primary/30 bg-card px-4 py-2.5 text-sm font-medium shadow-lg hover:bg-primary/5"
        >
          <MessageCircle className="size-4 text-primary" /> An agent sent you a message
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-4 z-40 flex h-[26rem] w-80 max-h-[70vh] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl sm:bottom-24 sm:left-6">
      <div className="flex items-center justify-between border-b border-border bg-primary/5 px-3 py-2.5">
        <p className="text-sm font-semibold">Chat with our team</p>
        <div className="flex items-center gap-1">
          <button onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary" aria-label="Minimize">
            <X className="size-3.5" />
          </button>
        </div>
      </div>
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === "customer" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-1.5 text-sm ${m.from === "customer" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
              {m.content}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
          className="flex-1 rounded-md border border-input bg-card px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
        <Button type="submit" size="icon" disabled={sending || !input.trim()} aria-label="Send message">
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  );
}
