import AdmZip from 'adm-zip';
import {
  extractTenderFromPdf,
  extractRecordsFromSpreadsheet,
  EMPTY_TENDER_EXTRACTION,
  type TenderExtraction,
} from '@/lib/ai/documentExtraction';
import { hasLLM } from '@/lib/ai/llm';
import { mimeForFilename } from './mime';
import { REQUIRED_TENDER_FIELDS, type ImportEntry, type ImportReview, type TenderEntry } from './types';

const SPREADSHEET_EXT = new Set(['xlsx', 'xls', 'csv']);

function extOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function tenderEntry(filename: string, extraction: TenderExtraction): TenderEntry {
  const blockers = REQUIRED_TENDER_FIELDS.filter((f) => extraction[f] == null);
  return { kind: 'tender', filename, mimeType: 'application/pdf', extraction, blockers };
}

/** Routes one dataset file to the right extractor. ZIPs are expanded one level. */
export async function readImportFile(filename: string, buffer: Buffer): Promise<ImportReview> {
  const ext = extOf(filename);
  const base: Omit<ImportReview, 'entries' | 'warnings'> = {
    sourceFilename: filename,
    sourcePath: filename,
    sourceMimeType: mimeForFilename(filename),
    llmAvailable: hasLLM(),
  };
  const warnings: string[] = [];
  const entries: ImportEntry[] = [];

  if (ext === 'pdf') {
    if (!hasLLM()) warnings.push('No LLM provider is configured, so tender extraction returned nothing. Set GEMINI_API_KEY (or ANTHROPIC_API_KEY) and re-open this file.');
    const extraction = hasLLM() ? await extractTenderFromPdf(buffer) : { ...EMPTY_TENDER_EXTRACTION };
    entries.push(tenderEntry(filename, extraction));
    return { ...base, entries, warnings };
  }

  if (SPREADSHEET_EXT.has(ext)) {
    const extraction = extractRecordsFromSpreadsheet(buffer);
    entries.push({ kind: 'records', filename, mimeType: mimeForFilename(filename), extraction });
    return { ...base, entries, warnings };
  }

  if (ext === 'zip') {
    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch (err) {
      return { ...base, entries: [{ kind: 'skipped', filename, reason: `Not a readable ZIP: ${err instanceof Error ? err.message : err}` }], warnings };
    }
    const zipEntries = zip.getEntries().filter((e) => !e.isDirectory);
    if (zipEntries.length === 0) warnings.push('ZIP is empty.');

    for (const ze of zipEntries) {
      const inner = ze.entryName.split('/').pop() ?? ze.entryName;
      if (inner.startsWith('.') || inner.startsWith('__MACOSX')) continue; // metadata cruft
      const iext = extOf(inner);
      const data = ze.getData();
      if (iext === 'pdf') {
        if (!hasLLM()) warnings.push(`"${inner}": no LLM provider configured - tender extraction returned nothing.`);
        const extraction = hasLLM() ? await extractTenderFromPdf(data) : { ...EMPTY_TENDER_EXTRACTION };
        entries.push(tenderEntry(inner, extraction));
      } else if (SPREADSHEET_EXT.has(iext)) {
        entries.push({ kind: 'records', filename: inner, mimeType: mimeForFilename(inner), extraction: extractRecordsFromSpreadsheet(data) });
      } else {
        entries.push({ kind: 'skipped', filename: inner, reason: `Unsupported type ".${iext || '?'}" inside the ZIP - not a PDF/Excel/CSV.` });
        warnings.push(`"${inner}" was skipped (unsupported type).`);
      }
    }
    return { ...base, entries, warnings };
  }

  return {
    ...base,
    entries: [{ kind: 'skipped', filename, reason: `Unsupported file type ".${ext || '?'}". The import tool handles PDF, Excel (.xlsx/.xls), CSV, and ZIP.` }],
    warnings: [`"${filename}" is not a type the import tool can read.`],
  };
}
