import { llmComplete, hasLLM } from './llm';

export interface LocalContentExtraction {
  localContentPercent: number | null;
  certifyingAgencyName: string | null;
}

const EXTRACTION_INSTRUCTION =
  'Extract structured data from this Local Content / Make in India certificate. ' +
  'Respond with ONLY a JSON object of the shape ' +
  '{"localContentPercent": number|null, "certifyingAgencyName": string|null}, no other text. ' +
  'localContentPercent is the declared local content percentage as a number. ' +
  'certifyingAgencyName is the name of the CA firm / agency that certified it, if stated.';

/** Tolerant JSON parse - strips ```json fences the model sometimes adds. */
function parseExtraction(text: string): LocalContentExtraction {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  return {
    localContentPercent: typeof parsed.localContentPercent === 'number' ? parsed.localContentPercent : null,
    certifyingAgencyName: typeof parsed.certifyingAgencyName === 'string' ? parsed.certifyingAgencyName : null,
  };
}

/** Last-resort deterministic fallback used whenever the AI path is unavailable. */
function regexFallback(rawText: string): LocalContentExtraction {
  const match = rawText.match(/(\d{1,3})\s*%/);
  return { localContentPercent: match ? Number(match[1]) : null, certifyingAgencyName: null };
}

/**
 * Turns simulated-OCR text (Document.rawText) into structured fields.
 * In a real deployment, an OCR step runs first (e.g. on a scanned
 * certificate image) and its output text is what gets passed in here -
 * this function's contract doesn't change either way, which is the
 * whole point of keeping OCR and extraction as separate steps.
 *
 * For documents uploaded as an actual file (PDF/image), use
 * extractLocalContentCertificateFromFile instead - it sends the file
 * straight to a multimodal call and returns the same shape.
 */
export async function extractLocalContentCertificate(rawText: string): Promise<LocalContentExtraction> {
  if (!hasLLM()) {
    // Deterministic fallback so the pipeline still produces something
    // usable without any LLM provider configured.
    return regexFallback(rawText);
  }

  try {
    const text = await llmComplete({
      prompt: `${EXTRACTION_INSTRUCTION}\n\n---\n${rawText}\n---`,
      json: true,
      maxTokens: 300,
    });
    return parseExtraction(text);
  } catch (err) {
    console.warn('[ai] text extraction failed, using regex fallback:', err instanceof Error ? err.message : err);
    return regexFallback(rawText);
  }
}

/**
 * Same extraction contract as extractLocalContentCertificate, but reads an
 * uploaded file directly via a multimodal call - no separate OCR step.
 * Handles images and PDFs. Falls back to a null result if no LLM provider
 * is set or the call fails, so an upload never breaks the pipeline.
 */
export async function extractLocalContentCertificateFromFile(
  fileBase64: string,
  mimeType: string,
): Promise<LocalContentExtraction> {
  const emptyResult: LocalContentExtraction = { localContentPercent: null, certifyingAgencyName: null };

  if (!hasLLM()) {
    // Nothing to regex against - a binary file needs the multimodal call.
    return emptyResult;
  }

  try {
    const text = await llmComplete({
      prompt: EXTRACTION_INSTRUCTION,
      file: { base64: fileBase64, mimeType },
      json: true,
      maxTokens: 300,
    });
    return parseExtraction(text);
  } catch (err) {
    console.warn('[ai] file extraction failed, returning null result:', err instanceof Error ? err.message : err);
    return emptyResult;
  }
}

// --- OEM authorization letter -------------------------------------------

export interface OemAuthorizationExtraction {
  /** null = the LLM could not be consulted (no provider / call failed). */
  looksLikeOemAuthLetter: boolean | null;
  oemName: string | null;
  authorizedBidderName: string | null;
}

const OEM_INSTRUCTION =
  'You are checking an OEM (Original Equipment Manufacturer) authorization letter submitted with a government ' +
  'procurement bid. Respond with ONLY a JSON object of the shape ' +
  '{"looksLikeOemAuthLetter": boolean, "oemName": string|null, "authorizedBidderName": string|null}, no other text.\n' +
  '- looksLikeOemAuthLetter: true ONLY if this document is plausibly an OEM / manufacturer authorization or ' +
  'dealership letter that authorises a company to bid for, supply, or resell the manufacturer’s products. ' +
  'false for anything else (invoices, datasheets, screenshots, timetables, price lists, unrelated or blank documents).\n' +
  '- oemName: the manufacturer / OEM issuing the authorization, or null.\n' +
  '- authorizedBidderName: the company / dealer / reseller being authorised, or null.';

function parseOemExtraction(text: string): OemAuthorizationExtraction {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    looksLikeOemAuthLetter: typeof parsed.looksLikeOemAuthLetter === 'boolean' ? parsed.looksLikeOemAuthLetter : null,
    oemName: str(parsed.oemName),
    authorizedBidderName: str(parsed.authorizedBidderName),
  };
}

/**
 * Reads an uploaded OEM authorization letter (PDF/image) via the multimodal
 * LLM: (a) does it plausibly read as an OEM authorization letter at all, and
 * (b) if so, who is the OEM and who is being authorised. Returns
 * `looksLikeOemAuthLetter: null` when no LLM provider is configured or the
 * call fails - the caller then falls back to the labelled stub.
 */
export async function extractOemAuthorizationFromFile(
  fileBase64: string,
  mimeType: string,
): Promise<OemAuthorizationExtraction> {
  const empty: OemAuthorizationExtraction = { looksLikeOemAuthLetter: null, oemName: null, authorizedBidderName: null };
  if (!hasLLM()) return empty;

  try {
    const text = await llmComplete({
      prompt: OEM_INSTRUCTION,
      file: { base64: fileBase64, mimeType },
      json: true,
      maxTokens: 300,
    });
    return parseOemExtraction(text);
  } catch (err) {
    console.warn('[ai] OEM-letter extraction failed, returning null verdict:', err instanceof Error ? err.message : err);
    return empty;
  }
}
