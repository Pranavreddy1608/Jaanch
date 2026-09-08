# Demo script — GeM Bid Compliance Verification Platform (SIH26100)

~4 minutes. Also the shot list if you record a backup video (Windows: `Win + Alt + R`
for the Game Bar recorder, or OBS). Pre-recorded stills are in `../demo-evidence/`.

## Before you start

```bash
npm run dev            # http://localhost:3000
npm run seed           # only if the data looks off — resets tender + 5 bidders
```

- `.env.local` has `GEMINI_API_KEY` set → AI recommendations are live.
- Keep `USE_REAL_DIGILOCKER=false`.
- Have one real-ish PDF certificate ready to upload (or use
  `scripts/fixtures/sample-local-content-certificate.pdf` — it declares 78%).

The demo tender is a **real, live GeM bid — `GEM/2026/B/7983771`**, "Cyber Forensic
Hardware and Software" (C-DAC Thiruvananthapuram / MeitY). Bid window closed
08-09-2026 17:00; the dashboard shows an open/closed badge either way.

Stable demo profile (fixed across re-seeds): **Chennai 100 · Coastal 68 · Bharath 95 · Swift 50 · NovaTech 41**.
Every HIGH-risk bidder is HIGH because of a *real* check failure (GSTIN checksum, PAN
format, blacklist, or GST filing delay) — stub-backed checks only ever flag for review.

---

## 1. Framing (20s, no clicks)

> "Before a CPSE can award a GeM contract, a Procurement Officer manually cross-checks
> the bidder against a long list of statutory facts — GST filing, PAN, Udyam/MSME
> status, blacklists, OEM authorization, and so on, tender by tender. This platform does
> the cross-checking and hands the officer a scored, fully-auditable recommendation. The
> officer still makes the call."

## 2. Sign in (15s)

- Open `http://localhost:3000` → it redirects to **/sign-in**.
- Name: your name. Role: **Procurement Officer**. Sign in.

> "Every decision is tied to a signed-in, role-checked identity — that matters for the
> audit trail. I'll show the Viewer role later."

## 3. The tender + a clean pass — Chennai (50s)

- Dashboard top card: this is **`GEM/2026/B/7983771`**, a real GeM bid — open/closed
  badge, and the real bid facts: **EMD not required**, **MSE preference L1+15% up to 25%
  of quantity**, **Make-in-India *not opted*** with the competent-authority reason
  ("items not available domestically").

  > "The requirement checks below are configured to *this* tender — not generic
  > assumptions. It's independently verifiable on the GeM portal."

- Click **Run Verification** on **Chennai Precision Engineering** → ~5–10s → **Details**.

Point at, in order:
- **100 / 100, LOW RISK**.
- **AI Recommendation** — read the first sentence. Note the last line: *"the final
  qualification and award decision remains entirely your responsibility."*
- **Requirement table** — each row has a plain-English reason and an honesty tag:
  - **GST** and **PAN**: `REAL FORMAT + SIM. REGISTRY`. "These run the actual government
    algorithms — the GSTIN Mod-36 checksum, the PAN format + holder-type rules — not a
    lookup table. The registration layer on top is simulated, and the tag says so."
  - **OEM Authorization**: mandatory for this tender (a required seller document).
  - **Make in India — Local Content**: **`NOT APPLICABLE`** — "the buyer waived it; the
    row shows the competent-authority approval number instead of silently enforcing a
    rule the buyer dropped." It's excluded from the score.
- **Documents** — the uploaded certificate with **AI-extracted fields**.
- **Audit trail** — VERIFICATION_STARTED → per-requirement checks → SCORE_COMPUTED,
  timestamped.

## 4. The inconsistency catch — Bharath (40s)  ← the money shot

- Back to dashboard → **Run Verification** on **Bharath MSME Febricators** → **Details**.
- Score **95, LOW RISK** — but the **AI Recommendation** and the **Udyam / MSME
  Registration** row (**NEEDS REVIEW**) both flag it:

  > "Registered enterprise name *Bharath MSME **Fabricators*** does not match bidder name
  > *Bharath MSME **Febricators***."

> "Financials and tax all pass. The system caught a one-letter mismatch between the Udyam
> record and the bid. For *this* tender Udyam isn't an eligibility gate — it's a global
> tender open to all — but it drives the bidder's MSE purchase-preference eligibility, so
> the officer needs to resolve it before award. That's the 'identify inconsistent
> information' the problem statement asks for."

## 5. What the real algorithms catch — Swift & NovaTech (30s)

- **Swift Supplies Enterprises** → Details → **GST** row, **NOT MET**, tag `REAL ALGORITHM`:
  *"GSTIN validation failed — Mod-36 checksum failed: 15th character is 'A', expected 'C'."*

  > "Not 'missing from our table' — we ran the actual GSTN checksum and the number doesn't
  > check out. A fabricated or fat-fingered GSTIN gets caught here." (Swift is also on the
  > debarment list — **Blacklist: NOT MET**.)

- **NovaTech Industrial Solutions** → Details → **PAN** row, **NOT MET**, tag `REAL ALGORITHM`:
  *"PAN structural validation failed — PAN must be 5 letters, then 4 digits, then 1 letter."*

  > "Their PAN has a letter 'O' where a digit belongs — a real data-entry error the format
  > check catches immediately."

## 6. Record a decision (30s)

- On Chennai, the **PO Decision** panel: *"Recording as \<your name> · Procurement
  Officer"* — no free-text name field.
- Pick **Qualified**, add a remark, **Record Decision**.
- It appears in **Decision History**, and a new **PO_DECISION_RECORDED** line shows in the
  audit trail, attributed to you.

> "The AI never decides. The officer's call is a separate, explicit, logged action."

## 7. Real document upload + extraction (40s)

- Open any bidder → **Documents** → **Choose File** → pick your PDF certificate →
  **Upload & extract**.
- "The file goes straight to a multimodal model — no separate OCR step."
- **Re-run Verification** → open the Documents section → the **AI-extracted fields** now
  show the percentage and certifying agency pulled out of *your* uploaded file.

> "Same extraction pipeline handles any certificate type — for a tender where Make-in-India
> *does* apply, this feeds the local-content check directly."

## 8. Viewer role — the guardrail (20s)

- New tab / incognito → sign in as **Viewer**.
- Open any bidder: the decision panel reads *"You are signed in as a Viewer. Only a
  Procurement Officer can record a qualify / disqualify decision."* — the form isn't
  there. (Also enforced server-side — a forged cookie gets the same treatment.)

## 9. Close — "what's real" (25s)

> "We were deliberate about not faking verification. The **tender is a real, live GeM
> bid** and the requirement set reflects *its* actual terms. **PAN and GST run the real
> government algorithms** — the GSTIN Mod-36 checksum, tested against real published
> GSTINs; the PAN format + holder-type rules from the Income Tax spec. The registration
> layer on top is simulated and every row's tag says which is which. Udyam and blacklist
> are simulated registry lookups on the real rules engine. DigiLocker is wired against
> the real API but needs partner onboarding. The pipeline, the document AI, the audit
> trail and the human decision are all real. Swapping any simulated source for a
> production integration is a one-line change."

---

## If something breaks mid-demo

- **Score didn't update after clicking Run Verification** — refresh the page (F5); the
  verification ran, the data is persisted.
- **AI recommendation looks like a plain template** — Gemini free-tier rate limit was
  hit; the app fell back on purpose. Re-run in ~30s, or narrate from the requirement
  rows (they're not AI-dependent).
- **Venue wifi is down entirely** — the pre-recorded stills in `../demo-evidence/` cover
  every step above.
