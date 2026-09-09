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

export type SkippedEntry = {
  kind: 'skipped';
  filename: string;
  reason: string;
};

export type ImportEntry = TenderEntry | RecordsEntry | SkippedEntry;

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
