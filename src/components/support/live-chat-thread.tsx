"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveChatMessage } from "@/lib/validation/support";

const POLL_MS = 8_000;
const NO_RESPONSE_MS = 2 * 60_000;
const FALLBACK_TEXT = "Sorry to keep you waiting — unfortunately all of our agents are currently busy or away. Please leave a message and we'll get back to you as soon as possible.";

/**
 * Once a ticket is assigned to a department, the customer can keep talking
 * to whoever picks it up — a real back-and-forth, not just one-way status
 * updates. Talks directly to the CRM's public /api/public/live-chat route
 * (same cross-origin pattern as presence-tracker.tsx) so this same
 * component works unmodified on this app's own /help page (apiBase="") and
 * on the standalone customer app (apiBase=the CRM's absolute URL). Polls
 * frequently (8s) since this is meant to feel live; the 2-minute-no-reply
 * banner is computed purely from message timestamps, no extra state needed.
 */
export function LiveChatThread({ apiBase, ticketNumber, email }: { apiBase: string; ticketNumber: string; email: string }) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const endpoint = `${apiBase.replace(/\/$/, "")}/api/public/live-chat`;

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const res = await fetch(`${endpoint}?ticketNumber=${encodeURIComponent(ticketNumber)}&email=${encodeURIComponent(email)}`).catch(() => null);
      if (!res || !res.ok || cancelled) return;
      const data = (await res.json().catch(() => null)) as { ok: boolean; messages?: LiveChatMessage[] } | null;
      if (data?.ok && data.messages) setMessages(data.messages);
    }
    void tick();
    const id = setInterval(tick, POLL_MS);
    const clock = setInterval(() => setNow(Date.now()), 5_000);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearInterval(clock);
    };
  }, [endpoint, ticketNumber, email]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketNumber, email, content }),
    }).catch(() => null);
    setSending(false);
    if (!res || !res.ok) {
      const data = (await res?.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Couldn't send that — please try again.");
      return;
    }
    setInput("");
    const data = (await res.json().catch(() => null)) as { message?: LiveChatMessage } | null;
    if (data?.message) setMessages((prev) => [...prev, data.message as LiveChatMessage]);
  }

  const lastMessage = messages[messages.length - 1];
  const waitingOnStaff = lastMessage?.from === "customer" && now - new Date(lastMessage.occurredAt).getTime() > NO_RESPONSE_MS;

  return (
    <div className="mt-4 space-y-2 border-t border-border pt-3">
      <p className="text-xs font-medium text-muted-foreground">Chat with the department</p>

      {messages.length > 0 && (
        <div ref={listRef} className="max-h-56 space-y-2 overflow-y-auto rounded-md bg-secondary/30 p-2.5">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.from === "customer" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-1.5 text-sm ${m.from === "customer" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                {m.content}
                <p className={`mt-0.5 text-[10px] ${m.from === "customer" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(m.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          {waitingOnStaff && <p className="rounded-md bg-warning-muted p-2 text-xs text-warning">{FALLBACK_TEXT}</p>}
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2">
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
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
