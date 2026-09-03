export interface TicketClassification {
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  reason: string;
}

const URGENT_KEYWORDS = ["flood", "fire", "gas leak", "no water", "no power", "break-in", "burglary", "emergency", "electric shock", "collapsed"];
const HIGH_KEYWORDS = ["leak", "broken", "not working", "urgent", "asap", "overflowing", "no access", "locked out", "burst"];
const CATEGORY_KEYWORDS: { category: string; keywords: string[] }[] = [
  // MRE — Real Estate
  { category: "Repairs and Maintenance", keywords: ["leak", "broken", "repair", "fix", "plumbing", "electrical", "faulty", "not working", "maintenance", "burst pipe", "no water", "blocked drain"] },
  { category: "Rent Payment Issue", keywords: ["rent", "invoice", "bill", "payment", "charge", "refund", "receipt", "overcharged", "arrears", "balance"] },
  { category: "Landlord Statement", keywords: ["landlord statement", "owner statement", "remittance", "net proceeds", "landlord account"] },
  { category: "Tenant Statement/Inquiry", keywords: ["tenant statement", "my account", "my balance", "my payments", "tenancy record"] },
  { category: "Lease/Tenancy Agreement", keywords: ["lease", "tenancy agreement", "contract", "renewal", "extension", "terms"] },
  { category: "Property Viewing & Sales Inquiry", keywords: ["buy", "purchase", "interested in", "available units", "price list", "book a viewing", "property for sale", "listing"] },
  { category: "Unit Handover/Vacating", keywords: ["move out", "vacate", "handover", "surrender", "terminate tenancy", "notice to vacate", "end lease"] },
  { category: "Service Charge Inquiry", keywords: ["service charge", "management fee", "caretaker", "security fee", "utilities"] },
  // SACCO
  { category: "Loan Request/Enquiry", keywords: ["loan", "borrow", "credit", "advance", "lend", "finance facility"] },
  { category: "Loan Repayment Inquiry", keywords: ["loan repayment", "loan balance", "outstanding loan", "loan statement", "clearance"] },
  { category: "Shares & Dividends", keywords: ["shares", "dividends", "interest", "contribution", "share capital"] },
  { category: "Membership Application", keywords: ["join sacco", "become a member", "new member", "membership form", "register"] },
  { category: "Savings & Deposits", keywords: ["savings", "deposit", "withdraw", "account balance", "current account"] },
  // Insurance
  { category: "New Policy/Quotation", keywords: ["insurance quote", "new policy", "cover", "get insured", "premium quote"] },
  { category: "Policy Renewal", keywords: ["renewal", "renew policy", "expiring", "lapse"] },
  { category: "Claims", keywords: ["claim", "accident", "loss", "damage", "incident", "compensation", "reimbursement"] },
  { category: "Policy Inquiry", keywords: ["policy", "cover details", "insured amount", "schedule", "certificate"] },
  // General
  { category: "Complaints/Suggestions", keywords: ["complain", "unhappy", "unacceptable", "rude", "disappointed", "noise", "neighbour", "neighbor", "suggest", "feedback"] },
  { category: "IT Support", keywords: ["app", "login", "portal", "website", "password", "system", "technical", "error", "not loading"] },
  { category: "HR & Employment", keywords: ["job", "career", "vacancy", "recruitment", "employment", "internship", "apply for a job", "cv", "resume"] },
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
