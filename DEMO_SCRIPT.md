# Demo script — GeM Bid Compliance Verification Platform (SIH26100)

~4 minutes. Also the shot list if you record a backup video (Windows: `Win + Alt + R`
for the Game Bar recorder, or OBS). Pre-recorded stills are in `../demo-evidence/`.

## Before you start

```bash
npm run dev            # http://localhost:3000
npm run seed           # only if the data looks off — resets to the 5 demo bidders
```

- `.env.local` has `GEMINI_API_KEY` set → AI recommendations are live.
- Keep `USE_REAL_DIGILOCKER=false`.
- Have one real-ish PDF certificate ready to upload (or use
  `scripts/fixtures/sample-local-content-certificate.pdf` — it declares 78%).

Stable demo profile (fixed across re-seeds): **Chennai 100 · Coastal 54 · Bharath 92 · Swift 46 · NovaTech 38**.

---

## 1. Framing (20s, no clicks)

> "Before CPCL can award a GeM contract, a Procurement Officer manually cross-checks
> a bidder against ~10 statutory sources — Udyam, GST filing, PAN, blacklists,
> Make-in-India local content, and so on. This platform does the cross-checking and
> hands the officer a scored, fully-auditable recommendation. The officer still makes
> the call."

## 2. Sign in (15s)

- Open `http://localhost:3000` → it redirects to **/sign-in**.
- Name: your name. Role: **Procurement Officer**. Sign in.

> "Every decision is tied to a signed-in, role-checked identity — that matters for the
> audit trail. I'll show the Viewer role later."

## 3. Dashboard + a clean pass — Chennai (45s)

- Dashboard: 5 bidders, no scores yet.
- Click **Run Verification** on **Chennai Precision Engineering** → ~5–10s → **Details**.

Point at, in order:
- **100 / 100, LOW RISK**.
- **AI Recommendation** — read the first sentence aloud. Note the last line: *"the final
  qualification and award decision remains entirely your responsibility."*
- **Requirement-by-requirement** table — every row MET, each with a plain-English reason
  and a `SIMULATED` / `LIVE` tag. "Nothing is a black box — every score traces to a row."
- **Documents** — the local-content certificate with **AI-extracted fields**
  (`localContentPercent: 60`, `certifyingAgencyName`).
- **Audit trail** at the bottom — VERIFICATION_STARTED → per-requirement checks →
  DOCUMENT_EXTRACTED → SCORE_COMPUTED, timestamped.

## 4. The inconsistency catch — Bharath (45s)  ← the money shot

- Back to dashboard → **Run Verification** on **Bharath MSME Febricators** → **Details**.

- Score **92, LOW RISK** — but scroll to the **AI Recommendation**:

  > "…a discrepancy requires your attention regarding the MSME registration name, which
  > is spelled Bharath MSME **Fabricators** compared to the bidder name Bharath MSME
  > **Febricators**… you must resolve this naming mismatch before proceeding."

- **Udyam / MSME Registration Status** row → **NEEDS REVIEW**:
  *"Registered enterprise name … does not match bidder name …"*

> "The financials and tax checks all pass, so a quick glance would qualify this bidder.
> The system caught a one-letter mismatch between the Udyam certificate and the bid —
> exactly the 'identify inconsistent information' the problem statement asks for."

## 5. Record a decision (30s)

- On Chennai (or Bharath), the **PO Decision** panel: *"Recording as \<your name> ·
  Procurement Officer"* — no free-text name field.
- Pick **Qualified**, add a remark, **Record Decision**.
- It appears in **Decision History**, and a new **PO_DECISION_RECORDED** line shows in
  the audit trail, attributed to you.

> "The AI never decides. The officer's call is a separate, explicit, logged action."

## 6. Real document upload + extraction (40s)

- Open any bidder → **Documents** → **Choose File** → pick your PDF certificate →
  **Upload & extract**.
- "The file goes straight to a multimodal model — no separate OCR step."
- **Re-run Verification** → open the Documents section → the **AI-extracted fields** now
  show the percentage and agency pulled out of *your* uploaded file, and the
  Make-in-India row reflects it.

## 7. Viewer role — the guardrail (20s)

- New tab / incognito → sign in as **Viewer**.
- Open any bidder: the decision panel reads *"You are signed in as a Viewer. Only a
  Procurement Officer can record a qualify / disqualify decision."* — the form isn't
  there. (It's also enforced server-side — a forged cookie gets the same treatment.)

## 8. Close — "what's real" (20s)

> "Five sources are full mock providers running the real rules engine. DigiLocker is
> wired against the actual government API — the adapter documents the real user-consent
> flow — but full activation needs partner onboarding that takes weeks, so it returns a
> clearly-labelled simulated result. The rest are labelled stubs. The pipeline, the
> document AI, the audit trail, and the human decision are all real. Swapping any mock
> for a production integration is a one-line change — that's the point of the adapter
> layer."

---

## If something breaks mid-demo

- **Score didn't update after clicking Run Verification** — refresh the page (F5); the
  verification ran, the data is persisted.
- **AI recommendation looks like a plain template** — Gemini free-tier rate limit was
  hit; the app fell back on purpose. Re-run in ~30s, or just narrate from the
  requirement rows (they're not AI-dependent).
- **Venue wifi is down entirely** — the pre-recorded stills in `../demo-evidence/`
  cover every step above.
