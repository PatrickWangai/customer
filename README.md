# Masterways Help & Support

Standalone, public-facing complaint/support-request portal for Masterways Group of Companies. No login, no staff view — this app only collects requests (via a form or a rule-based chatbot) and lets submitters track them by reference number + email.

**Deliberately independent** of the internal Masterways CRM: separate codebase, separate database, no shared authentication or data. If you need submissions here to reach staff, either check the database directly for now, or build an integration/API bridge to the CRM.

**Stack:** Next.js 16 (App Router, TypeScript) · PostgreSQL · Prisma 6 · Tailwind v4 · Radix UI

## Getting started

```bash
npm install
cp .env.example .env   # then set DATABASE_URL to a local Postgres database
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000 — the whole site is the Help & Support page.

## What it does

- **Submit a request**: name, email/phone, category, subject, description. A deterministic keyword-based classifier (`src/lib/ai/classify-ticket.ts`) suggests a category live as you type, and independently sets the priority server-side (never from a client-submitted field, so a submitter can't self-escalate). Returns a reference number (`REQ-000123`) and a rough response-time estimate based on priority.
- **Track a request**: reference number + the email used at submission. Returns null on any mismatch (not "wrong reference" vs "wrong email") so it can't be used to enumerate valid reference numbers.
- **Chatbot**: a floating widget offering the same two flows conversationally. It's a rule-based state machine, not a live LLM — there's no AI API key anywhere in this project, and the UI says so.
- **Spam protection**: an off-screen honeypot field. Real visitors never fill it; bots that do get a fake success response with no record created.

## Key scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Create/apply a Prisma migration |
| `npm run db:studio` | Open Prisma Studio (only way to view submissions right now — no staff UI) |

## Deploying

`render.yaml` provisions a free Postgres database and a web service wired together. In the Render dashboard: **New → Blueprint**, connect this repo, apply. First build runs migrations and the Next.js build.
