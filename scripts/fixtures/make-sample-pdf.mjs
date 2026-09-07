/**
 * Regenerates sample-local-content-certificate.pdf - a minimal one-page PDF
 * used by `npm run ai:check` to test multimodal document extraction.
 * Run: node scripts/fixtures/make-sample-pdf.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));

const lines = [
  'LOCAL CONTENT CERTIFICATE',
  '',
  'This is to certify that the goods offered under bid',
  'GEM/2026/B/CPCL-REFINERY-VALVES-001 contain 78% local content',
  'as computed per the Public Procurement (Make in India) Order 2017',
  'and the DPIIT guidelines thereunder.',
  '',
  'Certified by: Meenakshi Sundaram & Co, DPIIT-registered Cost Accountants.',
  'Membership No. 30214  |  Date: 12 August 2026',
];

const esc = (s) => s.replace(/([()\\])/g, '\\$1');
const body = ['BT', '/F1 12 Tf', '50 740 Td', '16 TL', ...lines.map((l) => `(${esc(l)}) Tj T*`), 'ET'].join('\n');

const objs = [
  '<</Type/Catalog/Pages 2 0 R>>',
  '<</Type/Pages/Kids[3 0 R]/Count 1>>',
  '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>',
  '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
  `<</Length ${Buffer.byteLength(body)}>>\nstream\n${body}\nendstream`,
];

let pdf = '%PDF-1.4\n';
const offsets = [];
objs.forEach((o, i) => {
  offsets.push(Buffer.byteLength(pdf));
  pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
});
const xrefStart = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
offsets.forEach((o) => {
  pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
});
pdf += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;

const out = path.join(here, 'sample-local-content-certificate.pdf');
fs.writeFileSync(out, Buffer.from(pdf, 'latin1'));
console.log(`wrote ${out} (${Buffer.byteLength(pdf)} bytes)`);
