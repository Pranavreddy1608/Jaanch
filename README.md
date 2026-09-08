# GeM Bid Compliance Verification Platform (SIH26100)

AI-assisted decision-support platform for verifying bidder compliance in GeM procurement. Built for a 3-day, 2-person hackathon timeline — see `SIH26100_Problem_Analysis.md` (in the parent folder / sent earlier in chat) for the full problem analysis and the reasoning behind every architectural choice below.

The demo is seeded with a **real, currently-live GeM tender — `GEM/2026/B/7983771`**, "Cyber Forensic Hardware and Software" (Centre for Development of Advanced Computing / MeitY, Thiruvananthapuram, published 03-09-2026). Every tender field in `prisma/seed.ts` is taken verbatim from the published bid document and is independently verifiable on the GeM portal — the requirement set (OEM Authorization mandatory, Make-in-India waived by competent-authority approval, MSE preference L1+15%, no EMD) reflects *that* tender, not generic assumptions. **Its bid window closes 08-09-2026 17:00 IST**, so after that it shows as closed on GeM; the dashboard shows an open/closed badge. The 5 bidders are synthetic.

## The one thing to understand before reading the code

No student team can get production API access to Udyam, GSTN, PAN/Income Tax, MCA21, or EPFO/ESIC during a hackathon (see the analysis doc, Section 3) — the previous attempt at this project broke because it assumed otherwise. So every external "government portal" here is a **mock or stub provider** standing in for what a real registry would say. The mock providers read from a fixture table in `src/lib/fixtures/registryFixtures.ts` and run the real rules-engine logic on top; the stub providers return a clearly-labelled simulated result.

**DigiLocker/API Setu** is the one source with a genuine government sandbox, so its adapter (`src/lib/providers/real/digilocker.ts`) is written against the real API: the file documents the actual user-consent Requester flow step by step, and it returns a **labelled simulated result** because full activation needs partner onboarding (a signed Requester agreement + Partner SOP approval) that takes weeks. With `USE_REAL_DIGILOCKER=true` and sandbox credentials it additionally runs a live reachability probe against the sandbox.

Every provider — mock, stub, or real — implements the same `VerificationProvider` interface (`src/lib/providers/types.ts`). Swapping one for a production integration later is a one-line change in `src/lib/providers/registry.ts` — nothing else in the app needs to change.

## Setup

```bash
npm install
cp .env.example .env.local   # then set GEMINI_API_KEY (free, recommended) — see below
npx prisma generate
npm run db:push              # creates dev.db (SQLite) from prisma/schema.prisma
npm run seed                 # loads the real GEM/2026/B/7983771 tender + 5 synthetic bidders
npm test                     # PAN + GSTIN validators, checked against real published GSTINs
npm run ai:check             # optional — verifies your LLM key works end to end
npm run dev                  # http://localhost:3000
```

(`npm run setup` does all of the above except `dev` in one go.)

Open `http://localhost:3000`. You'll be sent to `/sign-in` — enter any name and pick a role (**Procurement Officer** can record decisions; **Viewer** is read-only), then you land on `/dashboard`. Click **Run Verification** on any bidder, then **Details** to see the per-requirement breakdown, AI recommendation, and audit trail.

### AI provider (`GEMINI_API_KEY` / `ANTHROPIC_API_KEY`)

The AI layer picks a provider by whichever key is set (Gemini wins if both are):

- **`GEMINI_API_KEY`** — Google Gemini, **free tier, no credit card**: get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Default model `gemini-3.5-flash-lite` (Flash-Lite — the full Flash models have almost no free quota). Override with `GEMINI_MODEL`.
- **`ANTHROPIC_API_KEY`** — Claude; needs a funded Anthropic account.
- **Neither** — the app still runs: document extraction falls back to a regex, recommendations to a deterministic template. The demo never breaks on a missing key.

On Gemini's free tier Google may use inputs to improve its models — fine here because every demo bidder is synthetic (analysis doc §9). Don't point the free tier at real PAN/GST/Udyam data.

## What's real vs. simulated in this build

Every requirement row in the UI carries a tag saying how that specific check was produced:

| Source | Status | Row tag |
|---|---|---|
| **PAN** | **REAL structural validation** — the Income Tax Dept format + holder-type character (`src/lib/validation/pan.ts`), then a **simulated** registration/filing cross-check on top. Confirms the PAN is well-formed and correctly typed; it can't confirm it's *registered* (no open Verify-PAN API). | `REAL FORMAT + SIM. REGISTRY`, or `REAL ALGORITHM` when the format check itself fails |
| **GST** | **REAL** — GSTIN structure + the actual **Mod-36 (Luhn mod 36) checksum** GSTN uses for the 15th character, plus a check that the PAN embedded in the GSTIN matches the bidder's declared PAN (`src/lib/validation/gstin.ts`, verified against real published GSTINs in `gstin.test.ts`). Registration status + return-filing history are a **simulated** layer on top. | `REAL FORMAT + SIM. REGISTRY`, or `REAL ALGORITHM` when the checksum fails |
| Udyam, Blacklist/Debarment | **Simulated** registry lookup (fixture data) + the real rules-engine threshold logic. | `SIMULATED` |
| Make in India — Local Content | For the seeded tender (`GEM/2026/B/7983771`) this is **`NOT APPLICABLE`** — MII Purchase Preference = No, waived by the buyer's competent-authority approval (items not available domestically). The rules engine short-circuits it from the tender config and it's excluded from scoring; the waiver reason is shown on the row. On a tender where MII *does* apply, the provider runs the simulated DPIIT cross-check + the real 50%-local-content threshold. | `NOT APPLICABLE` (this tender) |
| **OEM Authorization** | **Hybrid, same pattern as GST/PAN.** When an OEM authorization certificate is uploaded: a **real** multimodal-LLM content check — does the document plausibly read as an OEM authorization letter, and does the authorised-company name match the bidder — cross-checked in `src/lib/providers/mock/oemAuthorization.ts`. When nothing is uploaded: a **simulated** stub fallback (no OEM-issuer registry exists). Never hard-fails; the real check does not verify the letter's authenticity with the OEM. | `REAL ALGORITHM` (uploaded) / `SIMULATED` (none) |
| DigiLocker | **Adapter written against the real API.** Returns a labelled simulated document result; the code documents the real user-consent Requester flow. `USE_REAL_DIGILOCKER=true` + creds adds a live sandbox reachability probe. Full activation needs partner onboarding (weeks, not days; analysis doc §3). | `SIMULATED` / `LIVE SANDBOX PROBE` |
| MCA21, EPFO/ESIC, NSIC, Startup India | **Stub providers** — labelled simulated results, real integration path in code comments. Certificate-based in reality (no queryable API), so production verifies them from uploaded documents. A stub only ever returns `MET` or `NEEDS_REVIEW` ("flagged for manual document review") — it can never hard-fail a bidder. | `SIMULATED` |
| Document intelligence | **Real** — uploaded PDF/image → multimodal LLM: local-content certificate (declared % + certifying agency, cross-checked against the DPIIT fixture) and OEM authorization letter (plausibility + OEM/authorised-company names, name-matched to the bidder). | — |
| Compliance rules, scoring, audit trail, PO decision | **Real** — deterministic, fully persisted, every step audit-logged. | — |

Per evaluator feedback, the identifier checks (PAN, GST) were moved from fixture lookup to real government-specified algorithms — fewer sources are "fully verified", but what's shown as real *is* real. This is the honest answer to "why doesn't this hit live government APIs," which is what `SIH26100_Problem_Analysis.md` recommends presenting to judges.

## Architecture

- **`prisma/schema.prisma`** — Tender (with real bid facts: `bidEndsAt`, `emdRequired`, `miiNote`, `mseNote`), ComplianceRequirement (tender-configurable rules, incl. `ruleConfig.notApplicable`), Bidder, Document (incl. uploaded `fileData`/`mimeType`), VerificationResult, Score, Decision, AuditLog.
- **`src/lib/providers/`** — the provider-adapter layer (`types.ts` is the interface; `mock/`, `stub/`, `real/` are implementations; `registry.ts` maps `sourceType` → provider). Each result carries a `method` (`real` / `real+simulated` / `simulated` / `sandbox-probe`) that surfaces as the honesty tag on every requirement row.
- **`src/lib/validation/`** — real government-specified identifier checks with unit tests: `pan.ts` (Income Tax PAN format + holder type), `gstin.ts` (structure + Mod-36 checksum + embedded-PAN match). `npm test` runs these against real published GSTINs.
- **`src/lib/rulesEngine.ts`** — deterministic, explainable eligibility logic (deliberately NOT a model — procurement decisions need to be auditable). Outcomes: `MET` / `NOT_MET` / `NEEDS_REVIEW` / `NOT_APPLICABLE` (the last set from the tender's `ruleConfig.notApplicable`, excluded from scoring).
- **`src/lib/scoring.ts`** — turns rule outcomes into a 0–100 compliance score + LOW/MEDIUM/HIGH risk tier.
- **`src/lib/ai/`** — `llm.ts` is a small provider layer (Gemini via REST / Claude via SDK / deterministic fallback; see *AI provider* above). `documentExtraction.ts` — `extractLocalContentCertificate` (OCR text), `extractLocalContentCertificateFromFile` and `extractOemAuthorizationFromFile` (uploaded PDF/image → multimodal call) — and `recommendation.ts` (plain-language PO summary) call through it. `npm run ai:check` (`scripts/check-ai.ts`) verifies the configured provider end to end.
- **`src/lib/orchestrator.ts`** — runs the full pipeline for one bidder: extract documents → verify every requirement → evaluate rules → score → AI recommendation → persist everything with an audit-log entry at each step.
- **`src/lib/session.ts` + `src/middleware.ts`** — signed-cookie sign-in (name + `officer`/`viewer` role, HMAC via `SESSION_SECRET`); middleware redirects anonymous visitors to `/sign-in`.
- **`src/lib/actions.ts` / `src/lib/authActions.ts`** — Next.js Server Actions: `runVerification` (throws; `VerifyButton` catches), `uploadDocument` + `recordDecision` (`useFormState` shape, return a status object), `signIn` / `signOut`.
- **`src/app/`** — `/sign-in`, Dashboard (bidder list + score/risk), bidder detail (per-requirement drill-down, AI recommendation, document upload + extracted fields, decision form, audit trail), plus `loading.tsx` skeletons, `error.tsx`, and a bidder `not-found.tsx`.

## What was built on top of the base pipeline

- **Real document upload + extraction** — the bidder page has an upload control per document type the tender needs (PDF / PNG / JPEG / WebP, ≤8 MB); bytes are stored on `Document.fileData` and read directly by a multimodal LLM call (no separate OCR). Two live paths: **local-content certificate** (declared % + agency) and **OEM authorization letter** (does it read as one, and does the authorised name match the bidder — a genuine `method: 'real'` content check). An upload replaces any existing document of that type. When the tender waives a requirement (Make-in-India here), that upload is shown disabled with the reason, so a user never uploads into a dead end.
- **Sign-in + roles** — signed-cookie identity; `recordDecision` enforces `role === 'officer'` server-side and attributes the decision to the signed-in name (no free-text officer field). Not a real auth system (no user store / password) — production would use the organisation's SSO.
- **Demo hardening** — loading skeletons, an app-level error boundary, a friendly bidder not-found page, `VerifyButton` spinner + inline error, form pending/error/success states, dashboard empty state.
- **AI provider layer** — Gemini (free) or Claude, with a deterministic fallback so a missing/rate-limited key never breaks the demo.
- **Real tender data** — the demo tender is the live GeM bid `GEM/2026/B/7983771` (see top of this file). The requirement set is configured to *that* tender: OEM Authorization is mandatory (a required seller document), Udyam/MSME is non-mandatory (purchase-preference signal for a global tender, not a gate), Make-in-India is `NOT APPLICABLE` (waived by competent-authority approval), and there's no EMD check because the bid needs no EMD. The dashboard shows the real bid facts and an open/closed badge.

## Known gaps / genuine next steps

- **Still stub-only:** MCA21, EPFO/ESIC, NSIC, Startup India live-lookup. In reality these are certificate-based (no public API), so the real work is extending the upload + extraction pattern to those document types (EPFO challan, NSIC certificate) and cross-checking — as OEM authorization now is — not building ten API integrations. A stub-backed check can never assert a hard failure: its uncertain branch returns `INCONSISTENT` → `NEEDS_REVIEW` ("flagged for manual document review, not a verified failure"), so a bidder is never scored down or pushed to HIGH risk on a stub's coin flip — only a real check (PAN format, GSTIN checksum, blacklist, GST filing, or an uploaded OEM letter) can gate a bidder.
- **DigiLocker** is adapter-complete but not activated — needs partner onboarding (analysis doc §3). Keep `USE_REAL_DIGILOCKER=false` for a venue demo unless the reachability probe has been tested on that network.
- **Rules coverage:** `evaluateRequirement` in `rulesEngine.ts` special-cases three sourceTypes (`udyam`, `gst`, `makeInIndia`) for threshold checks beyond basic status — extend per additional tender-specific rules. The MSE purchase-preference terms are carried in `UDYAM_STATUS`'s `ruleConfig` (`msePreferencePercent`, `mseQuantityCapPercent`) for display/future use; they don't yet drive award-stage price-preference logic.
- **OEM authorization** has a real content check when a certificate is uploaded (plausibility + name match) but cannot verify the letter is genuinely *from* the OEM — there's no issuer to call, so authenticity stays a manual step. The no-upload case is the labelled stub fallback.
- **Tender configuration** is seed-only — no UI to create a tender or edit its `ComplianceRequirement` rows.
- **Auth** is demo-grade (see above) — real deployment needs SSO + proper user/role management.
- **Gemini free-tier limits:** `gemini-3.5-flash-lite` has a usable quota; if it's exhausted mid-demo the app silently falls back to template recommendations and keeps working.

## Contributor notes

- `recordDecision` / `uploadDocument` / `signIn` are `useFormState` actions returning a status object; `runVerification` throws and its caller catches. Keep new form actions in the form-state shape.
- `src/middleware.ts` runs on the Edge runtime and can't import `src/lib/session.ts` (which uses `node:crypto`) — it only checks cookie *presence*; signature + role are verified server-side in the actions.
- On Windows, stop `next dev` before `npx prisma generate` / `db:push` — the running server locks the query-engine DLL.
