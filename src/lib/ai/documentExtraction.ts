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
