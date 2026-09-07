# GeM Bid Compliance Verification Platform (SIH26100 — CPCL)

AI-assisted decision-support platform for verifying bidder compliance in GeM procurement. Built for a 3-day, 2-person hackathon timeline — see `SIH26100_Problem_Analysis.md` (in the parent folder / sent earlier in chat) for the full problem analysis and the reasoning behind every architectural choice below.

## The one thing to understand before reading the code

No student team can get production API access to Udyam, GSTN, PAN/Income Tax, MCA21, or EPFO/ESIC during a hackathon (see the analysis doc, Section 3) — the previous attempt at this project broke because it assumed otherwise. So every external "government portal" here is a **mock provider** reading from a fixture table in `src/lib/fixtures/registryFixtures.ts`, standing in for what a real registry would say. **DigiLocker/API Setu** is the exception — it has a genuine public sandbox, and `src/lib/providers/real/digilocker.ts` is wired to attempt a real call, falling back to a mock automatically if it's not configured (so a missing key never breaks the demo).

Every provider — mock or real — implements the same `VerificationProvider` interface (`src/lib/providers/types.ts`). Swapping a mock for a production integration later is a one-line change in `src/lib/providers/registry.ts` — nothing else in the app needs to change.

## Setup

```bash
npm install
cp .env.example .env.local   # optionally set GEMINI_API_KEY (free) or ANTHROPIC_API_KEY - app works without either
npx prisma generate
npm run db:push              # creates dev.db (SQLite) from prisma/schema.prisma
npm run seed                 # loads 1 demo tender + 5 demo bidders
npm run ai:check             # optional - verifies your LLM key works end to end
npm run dev                  # http://localhost:3000
```

(`npm run setup` does all of the above except `dev` in one go.)

Open `http://localhost:3000`. You'll be sent to `/sign-in` — enter any name and pick a role (**Procurement Officer** can record decisions; **Viewer** is read-only), then you land on `/dashboard`. Click **Run Verification** on any bidder, then **Details** to see the per-requirement breakdown, AI recommendation, and audit trail.

## What's real vs. simulated in this build

| Source | Status |
|---|---|
| Udyam, GST, PAN, Blacklist/Debarment, Make in India (local content) | Full mock providers with realistic fixture data + real rules-engine logic |
| DigiLocker | Labelled simulated document result. The adapter (`src/lib/providers/real/digilocker.ts`) documents the real user-consent Requester flow step by step; with `USE_REAL_DIGILOCKER=true` + sandbox creds it also runs a reachability probe against the government sandbox. Full activation needs partner onboarding (signed Requester agreement + Partner SOP approval), which is weeks, not days — see the analysis doc §3. |
| MCA21, EPFO/ESIC, NSIC, Startup India, OEM authorization | Stub providers — clearly labelled simulated results, with the real integration path documented in code comments |

This isn't a shortcut being hidden — it's the honest, defensible answer to "why doesn't this hit live government APIs," and it's exactly what `SIH26100_Problem_Analysis.md` recommends presenting to judges.

## Architecture

- **`prisma/schema.prisma`** — Tender, ComplianceRequirement (tender-configurable rules), Bidder, Document, VerificationResult, Score, Decision, AuditLog.
- **`src/lib/providers/`** — the provider-adapter layer (`types.ts` is the interface; `mock/`, `stub/`, `real/` are implementations; `registry.ts` maps `sourceType` → provider).
- **`src/lib/rulesEngine.ts`** — deterministic, explainable eligibility logic (deliberately NOT a model — procurement decisions need to be auditable).
- **`src/lib/scoring.ts`** — turns rule outcomes into a 0–100 compliance score + LOW/MEDIUM/HIGH risk tier.
- **`src/lib/ai/`** — the actual AI. `llm.ts` is a small provider layer: it uses **Gemini** if `GEMINI_API_KEY` is set (free tier, no card — [aistudio.google.com/apikey](https://aistudio.google.com/apikey); `gemini-3.5-flash-lite` via REST — Flash-Lite because the full Flash models have almost no free quota — one retry on rate-limit then graceful fallback), **Claude** if `ANTHROPIC_API_KEY` is set, otherwise nothing. `documentExtraction.ts` (`extractLocalContentCertificate` from OCR text, `extractLocalContentCertificateFromFile` from an uploaded PDF/image via a multimodal call) and `recommendation.ts` (plain-language PO summary) call through it and fall back to deterministic templates / null results when no provider is configured. `npm run ai:check` verifies the configured provider end to end.
- **`src/lib/orchestrator.ts`** — runs the full pipeline for one bidder: extract documents → verify every requirement → evaluate rules → score → AI recommendation → persist everything with an audit-log entry at each step.
- **`src/lib/actions.ts`** — Next.js Server Actions (`runVerification`, `recordDecision`) called directly from the UI.
- **`src/app/`** — Dashboard (bidder list + score/risk) and bidder detail (per-requirement drill-down, AI recommendation, documents, decision form, audit trail).

## Known gaps / next steps for the remaining hackathon time

- Real file upload is wired for the local-content certificate: the bidder detail page has an upload control (PDF / PNG / JPEG / WebP, ≤8 MB), the file bytes are stored on `Document.fileData`, and `extractLocalContentCertificateFromFile` sends them straight to a **multimodal Claude call** (vision for images, PDF document input for PDFs) — no separate OCR step. This needs `ANTHROPIC_API_KEY` set; without a key an uploaded file extracts to a null result (there is nothing to regex), whereas the seeded demo bidders still work via their simulated-OCR `rawText`. The seeded `rawText` path and its contract are unchanged. Extending the same pattern to other document types (OEM authorization letter, GST return acknowledgement) is the next step.
- Auth is a **minimal signed-cookie sign-in** (`src/lib/session.ts`, `src/middleware.ts`): a name + role (`officer` / `viewer`), HMAC-signed so a viewer can't edit the cookie to become an officer. `recordDecision` enforces `role === 'officer'` server-side and attributes the decision to the signed-in name (no more free-text officer field). It is **not** a real auth system — no user store, no password; production would use the organisation's SSO. Set `SESSION_SECRET` in `.env.local`.
- `evaluateRequirement` in `rulesEngine.ts` currently special-cases three sourceTypes (`udyam`, `gst`, `makeInIndia`) for threshold checks beyond basic status — extend this per additional tender-specific rules as needed.
- Before a live demo on unreliable venue wifi, keep `USE_REAL_DIGILOCKER=false` unless you've tested the sandbox reachability probe ahead of time — it fails safe either way, but a rehearsed demo should know which path it's on.
- `src/lib/actions.ts` and `src/lib/orchestrator.ts` use two different action shapes: `recordDecision` / `uploadDocument` are `useFormState` actions returning a status object; `runVerification` still throws (the caller, `VerifyButton`, catches it). Keep new form actions in the form-state shape.
