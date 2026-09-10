import type { TenderExtraction, SpreadsheetExtraction } from '@/lib/ai/documentExtraction';

export type ImportMode = 'add' | 'replace-all';

/** Required Tender columns - a null here blocks the row from being committed. */
export const REQUIRED_TENDER_FIELDS = ['referenceNo', 'title', 'organization', 'department', 'category'] as const;

export type TenderEntry = {
  kind: 'tender';
  filename: string;
  mimeType: string;
  extraction: TenderExtraction;
  /** Required fields that came back null - non-empty means this row can't be committed. */
  blockers: string[];
};

export type RecordsEntry = {
  kind: 'records';
  filename: string;
  mimeType: string;
  extraction: SpreadsheetExtraction;
};

/**
 * A single PDF inside a ZIP that a manifest.json at the ZIP root identified as
 * a bidder-scoped supporting document (OEM authorization letter, local-content
 * certificate, etc.) rather than a tender document. Never routed through the
 * tender-extraction LLM call - it is attached directly to the named bidder at
 * commit time. Deliberately carries no file bytes (only metadata) so reviewJson
 * stays small regardless of how large the ZIP is.
 */
export type BidderDocumentEntry = {
  kind: 'bidderDocument';
  filename: string; // path within the ZIP, e.g. "Tender02_.../bluewave-defence...pdf"
  tenderReferenceNo: string;
  companySlug: string;
  docType: string;
  mimeType: string;
  sizeBytes: number;
};

export type SkippedEntry = {
  kind: 'skipped';
  filename: string;
  reason: string;
};

export type ImportEntry = TenderEntry | RecordsEntry | BidderDocumentEntry | SkippedEntry;

export interface ImportReview {
  sourceFilename: string;
  sourcePath: string; // path within the dataset-uploads bucket
  sourceMimeType: string;
  entries: ImportEntry[];
  warnings: string[];
  llmAvailable: boolean;
}

export interface CommitResult {
  importBatchId: string;
  recordsCreated: number;
  summary: string;
  notes: string[];
}
