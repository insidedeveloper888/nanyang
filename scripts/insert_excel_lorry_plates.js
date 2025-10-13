const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

function sanitizePlate(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Accept any non-empty string; dedupe after trim
  return s;
}

function extractRange(workbook, { sheetName, col = 'A', startRow = 2, endRow = 59 }) {
  const selectedSheet = sheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[selectedSheet];
  if (!sheet) throw new Error(`Sheet not found: ${selectedSheet}`);
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const colIndex = col.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
  const set = new Set();
  for (let r = startRow; r <= endRow; r++) {
    const rowArr = rows[r - 1];
    if (!rowArr) continue;
    const cell = rowArr[colIndex];
    const plate = sanitizePlate(cell);
    if (plate && /^\d{1,6}$/.test(plate)) set.add(plate); // respect DB numeric-only constraint
  }
  return { plates: Array.from(set), sheetName: selectedSheet };
}

function detectBestSheet(workbook, { col = 'A', startRow = 2, endRow = 59 }) {
  const colIndex = col.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
  let bestName = workbook.SheetNames[0];
  let bestCount = -1;
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    let count = 0;
    for (let r = startRow; r <= endRow; r++) {
      const rowArr = rows[r - 1];
      if (!rowArr) continue;
      const cell = rowArr[colIndex];
      const s = sanitizePlate(cell);
      if (s && /^\d{1,6}$/.test(s)) count++;
    }
    if (count > bestCount) { bestCount = count; bestName = name; }
  }
  return { bestName, bestCount };
}

function detectBestSheetAndColumn(workbook, { columns = ['A','B','C','D'], startRow = 2, endRow = 59 }) {
  let bestSheet = workbook.SheetNames[0];
  let bestCol = columns[0];
  let bestCount = -1;
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    for (const col of columns) {
      const idx = col.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
      let count = 0;
      for (let r = startRow; r <= endRow; r++) {
        const rowArr = rows[r - 1];
        if (!rowArr) continue;
        const cell = rowArr[idx];
        const s = sanitizePlate(cell);
        if (s && /^\d{1,6}$/.test(s)) count++;
      }
      if (count > bestCount) { bestCount = count; bestSheet = name; bestCol = col; }
    }
  }
  return { bestSheet, bestCol, bestCount };
}

async function upsertPlates(supabase, plates) {
  if (!plates.length) return { count: 0 };
  const rows = plates.map(p => ({ plate_no: p, active: true }));
  const { error } = await supabase
    .from('lorry_plates')
    .upsert(rows, { onConflict: 'plate_no' });
  if (error) throw error;
  return { count: rows.length };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node scripts/insert_excel_lorry_plates.js <excelPath> [--sheet <name>] [--col A] [--start 2] [--end 59]');
    process.exit(1);
  }
  const excelPath = path.resolve(args[0]);
  let sheetName = null;
  let col = 'A';
  let startRow = 2;
  let endRow = 59;
  for (let i = 1; i < args.length; i++) {
    const k = args[i];
    const v = args[i + 1];
    if (k === '--sheet') { sheetName = v; i++; }
    else if (k === '--col') { col = v; i++; }
    else if (k === '--start') { startRow = Number(v); i++; }
    else if (k === '--end') { endRow = Number(v); i++; }
  }

  if (!fs.existsSync(excelPath)) {
    console.error(`Excel not found: ${excelPath}`);
    process.exit(1);
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    const workbook = xlsx.readFile(excelPath);
    let usedSheet = sheetName;
    // If no sheet specified, auto-detect; if none found in given column, search other columns
    if (!usedSheet) {
      const { bestName, bestCount } = detectBestSheet(workbook, { col, startRow, endRow });
      usedSheet = bestName;
      if (bestCount <= 0) {
        const fallback = detectBestSheetAndColumn(workbook, { columns: ['A','B','C','D','E'], startRow, endRow });
        usedSheet = fallback.bestSheet;
        col = fallback.bestCol;
        if (fallback.bestCount <= 0) {
          console.error(`No numeric plates detected across sheets/columns for range ${col}${startRow}-${col}${endRow}.`);
        } else {
          console.log(`Auto-detected sheet '${usedSheet}' and column '${col}' containing ${fallback.bestCount} numeric entries.`);
        }
      }
    }
    const { plates } = extractRange(workbook, { sheetName: usedSheet, col, startRow, endRow });
    if (!plates.length) {
      console.error(`No valid numeric plates found in ${excelPath} (sheet: ${usedSheet}, range: ${col}${startRow}-${col}${endRow})`);
      process.exit(2);
    }
    const { count } = await upsertPlates(supabase, plates);
    console.log(`Upserted ${count} plate(s) into lorry_plates from ${excelPath} (sheet: ${usedSheet}, range: ${col}${startRow}-${col}${endRow}).`);
  } catch (err) {
    console.error('Import error:', err.message || err);
    process.exit(1);
  }
}

main();