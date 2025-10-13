const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

function sanitizePlate(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  // Accept ONLY numeric vehicle codes (1–6 digits). Reject phrases/reasons.
  const match = s.match(/^\d{1,6}$/);
  if (!match) return null;
  return s;
}

function extractPlatesFromSheetRange(workbook, options = {}) {
  const sheetName = options.sheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const set = new Map(); // key: normalized upper, value: original normalized

  // Column A => index 0. Allow custom column via letter.
  const colLetter = (options.col || 'A').toUpperCase();
  const colIndex = colLetter.charCodeAt(0) - 'A'.charCodeAt(0);
  const startRow = Number(options.startRow) || 2; // Excel row numbering
  const endRow = Number(options.endRow) || 59;

  // Iterate only the requested row range
  for (let excelRow = startRow; excelRow <= endRow; excelRow++) {
    const rowArr = rows[excelRow - 1]; // header:1 -> zero-based array
    if (!rowArr) continue;
    const cell = rowArr[colIndex];
    const plate = sanitizePlate(cell);
    if (!plate) continue;
    const key = plate.toUpperCase();
    if (!set.has(key)) set.set(key, plate);
  }

  return Array.from(set.values());
}

function buildInsertSQL(plates) {
  if (!plates.length) return '';
  const values = plates
    .map(p => `('${p.replace(/'/g, "''")}')`)
    .join(',\n');
  return `INSERT INTO public.lorry_plates (plate_no)\n${plates.length === 1 ? 'VALUES' : 'VALUES'}\n${values}\nON CONFLICT (plate_no) DO NOTHING;`;
}

function main() {
  const excelPath = process.argv[2];
  const args = process.argv.slice(3);
  if (!excelPath) {
    console.error('Usage: node scripts/import_lorry_plates.js <path-to-excel> [--sheet <name>] [--col <A>] [--start <2>] [--end <59>] [--chunk <N>]');
    process.exit(1);
  }
  const abs = path.resolve(excelPath);
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    process.exit(1);
  }

  // Simple CLI option parsing
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    const val = args[i + 1];
    if (key === '--sheet') { opts.sheetName = val; i++; }
    else if (key === '--col') { opts.col = val; i++; }
    else if (key === '--start') { opts.startRow = Number(val); i++; }
    else if (key === '--end') { opts.endRow = Number(val); i++; }
    else if (key === '--chunk') { opts.chunkSize = Number(val); i++; }
  }
  const chunkSize = Number(opts.chunkSize) > 0 ? Number(opts.chunkSize) : 200;

  const workbook = xlsx.readFile(abs);
  const plates = extractPlatesFromSheetRange(workbook, opts);
  const sql = buildInsertSQL(plates);

  // Write helper outputs
  fs.writeFileSync(path.resolve('scripts', 'plates.json'), JSON.stringify(plates, null, 2));
  fs.writeFileSync(path.resolve('scripts', 'plates.sql'), sql);

  // Write chunked SQL files for easier consumption
  let chunkIndex = 0;
  for (let i = 0; i < plates.length; i += chunkSize) {
    const chunk = plates.slice(i, i + chunkSize);
    const chunkSql = buildInsertSQL(chunk);
    const filename = `plates_chunk_${String(++chunkIndex).padStart(3, '0')}.sql`;
    fs.writeFileSync(path.resolve('scripts', filename), chunkSql);
  }

  console.log(sql);
  console.error(`Extracted ${plates.length} unique plates from ${abs} (sheet: ${opts.sheetName || 'default'}, col: ${opts.col || 'A'}, rows: ${opts.startRow || 2}-${opts.endRow || 59})`);
  console.error(`Wrote ${chunkIndex} chunk file(s) at scripts/plates_chunk_*.sql (size: ${chunkSize})`);
}

main();