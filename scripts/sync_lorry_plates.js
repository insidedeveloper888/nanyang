const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

function sanitizePlate(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Accept ONLY numeric vehicle codes (1–6 digits). Reject phrases/reasons.
  if (/^\d{1,6}$/.test(s)) return s;
  return null;
}

function extractRange(workbook, { sheetName, col = 'A', startRow = 2, endRow = 59 }) {
  let chosenSheetName = sheetName;
  let sheet = workbook.Sheets[chosenSheetName || workbook.SheetNames[0]];
  if (!sheet) throw new Error(`Sheet not found: ${chosenSheetName}`);
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const colIndex = col.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
  const set = new Set();
  for (let r = startRow; r <= endRow; r++) {
    const rowArr = rows[r - 1];
    if (!rowArr) continue;
    const cell = rowArr[colIndex];
    const plate = sanitizePlate(cell);
    if (plate) set.add(plate);
  }
  return { plates: Array.from(set), sheetName: chosenSheetName || workbook.SheetNames[0] };
}

async function fetchCurrentPlates(supabase) {
  const { data, error } = await supabase
    .from('lorry_plates')
    .select('plate_no');
  if (error) throw error;
  return (data || []).map(d => d.plate_no);
}

async function insertPlates(supabase, plates) {
  if (!plates.length) return;
  const rows = plates.map(p => ({ plate_no: p }));
  const { error } = await supabase.from('lorry_plates').insert(rows, { returning: 'minimal' });
  if (error) throw error;
}

async function deletePlates(supabase, plates) {
  if (!plates.length) return;
  const { error } = await supabase
    .from('lorry_plates')
    .delete()
    .in('plate_no', plates);
  if (error) throw error;
}

function diffSets(sourceList, dbList) {
  const src = new Set(sourceList);
  const db = new Set(dbList);
  const toAdd = [];
  const toRemove = [];
  for (const p of src) if (!db.has(p)) toAdd.push(p);
  for (const p of db) if (!src.has(p)) toRemove.push(p);
  return { toAdd, toRemove };
}

async function runSync({ excelPath, col, start, end, intervalMs }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
    process.exit(1);
  }
  const supabase = createClient(url, key);
  const abs = path.resolve(excelPath);
  if (!fs.existsSync(abs)) {
    console.error(`Excel not found: ${abs}`);
    process.exit(1);
  }
  const options = { col, startRow: start, endRow: end };

  async function syncOnce() {
    try {
      const workbook = xlsx.readFile(abs);
      // Auto-detect best sheet if not specified: choose sheet with most numeric entries in range
      if (!optsSheetDetected(options, workbook)) {
        const best = detectBestSheet(workbook, options);
        options.sheetName = best;
      }
      const { plates: srcPlates, sheetName } = extractRange(workbook, options);
      const dbPlates = await fetchCurrentPlates(supabase);
      const { toAdd, toRemove } = diffSets(srcPlates, dbPlates);
      if (toAdd.length) await insertPlates(supabase, toAdd);
      if (toRemove.length) await deletePlates(supabase, toRemove);
      console.log(`Sync complete. Sheet: ${sheetName}. Added: ${toAdd.length}, Removed: ${toRemove.length}. Total source: ${srcPlates.length}`);
    } catch (err) {
      console.error('Sync error:', err.message || err);
    }
  }

  await syncOnce(); // initial
  console.log(`Watching ${abs} every ${intervalMs}ms for changes (range ${col}${start}-${col}${end})`);
  setInterval(syncOnce, intervalMs);
}

function optsSheetDetected(options, workbook) {
  if (options.sheetName) return true;
  return false;
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
      if (sanitizePlate(cell)) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      bestName = name;
    }
  }
  return bestName;
}

// CLI
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node scripts/sync_lorry_plates.js <excelPath> [--col A] [--start 2] [--end 59] [--interval 3000]');
  process.exit(1);
}
const excelPath = args[0];
let col = 'A';
let start = 2;
let end = 59;
let intervalMs = 3000;
for (let i = 1; i < args.length; i++) {
  const k = args[i];
  const v = args[i + 1];
  if (k === '--col') { col = v; i++; }
  else if (k === '--start') { start = Number(v); i++; }
  else if (k === '--end') { end = Number(v); i++; }
  else if (k === '--interval') { intervalMs = Number(v); i++; }
}

runSync({ excelPath, col, start, end, intervalMs });