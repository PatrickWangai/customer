/**
 * Browser CustomEvent name used to hand off from HelpChatbot's "Chat with
 * our team" quick reply into VisitorChatWidget's panel — the two are
 * deliberately separate components (see visitor-chat-widget.tsx's doc
 * comment) so a real human joining doesn't have to fight the bot's own
 * stage machine, but the bot still needs a way to open the live-chat panel
 * without importing it directly.
 */
export const OPEN_LIVE_CHAT_EVENT = "mw-open-live-chat";
