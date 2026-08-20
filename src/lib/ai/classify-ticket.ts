export interface TicketClassification {
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  reason: string;
}

const URGENT_KEYWORDS = ["flood", "fire", "gas leak", "no water", "no power", "break-in", "burglary", "emergency", "electric shock", "collapsed"];
const HIGH_KEYWORDS = ["leak", "broken", "not working", "urgent", "asap", "overflowing", "no access", "locked out", "burst"];
const CATEGORY_KEYWORDS: { category: string; keywords: string[] }[] = [
  { category: "Maintenance Request", keywords: ["leak", "broken", "repair", "fix", "plumbing", "electrical", "faulty", "not working", "maintenance"] },
  { category: "Billing Inquiry", keywords: ["invoice", "bill", "payment", "charge", "refund", "receipt", "overcharged"] },
  { category: "Sales & Marketing", keywords: ["buy", "purchase", "interested in", "available units", "price list", "book a viewing", "join the sacco", "membership", "insurance quote", "new customer"] },
  { category: "HR & Administration", keywords: ["job", "career", "vacancy", "recruitment", "employment", "internship", "apply for a job", "cv", "resume"] },
  { category: "Complaint", keywords: ["complain", "unhappy", "unacceptable", "rude", "disappointed", "noise", "neighbor"] },
  { category: "Service Request", keywords: ["request", "need", "install", "upgrade", "access card", "parking"] },
  { category: "Technical Support", keywords: ["app", "login", "portal", "website", "password", "system"] },
  { category: "Account Update", keywords: ["update my", "change my", "contact details", "move out", "vacate"] },
];

/**
 * Deterministic keyword-based classifier — a clearly-labeled rule-based
 * stand-in for a real NLP/LLM call, not a live AI model. Pure and
 * client-safe — no DB dependency — so it can run live as the user types.
 */
export function classifyTicket(subject: string, description: string): TicketClassification | null {
  const text = `${subject} ${description}`.toLowerCase().trim();
  if (text.length < 8) return null;

  let priority: TicketClassification["priority"] = "MEDIUM";
  let matchedKeyword: string | null = null;
  if (URGENT_KEYWORDS.some((k) => text.includes(k))) {
    priority = "URGENT";
    matchedKeyword = URGENT_KEYWORDS.find((k) => text.includes(k)) ?? null;
  } else if (HIGH_KEYWORDS.some((k) => text.includes(k))) {
    priority = "HIGH";
    matchedKeyword = HIGH_KEYWORDS.find((k) => text.includes(k)) ?? null;
  }

  let category = "General Inquiry";
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.keywords.some((k) => text.includes(k))) {
      category = entry.category;
      break;
    }
  }

  const reason = matchedKeyword
    ? `Detected "${matchedKeyword}" — suggesting ${priority.toLowerCase()} priority.`
    : `No urgent language detected — suggesting ${priority.toLowerCase()} priority as a starting point.`;

  return { category, priority, reason };
}
