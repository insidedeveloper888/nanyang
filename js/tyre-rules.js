// Tyre-based helpers and maps (extracted from logistics-planner.html)
// Exposes global maps and functions for backward compatibility
(function () {
  // Maps
  window.LORRY_TYRE_COUNT_MAP = window.LORRY_TYRE_COUNT_MAP || new Map(); // plate -> tyres
  window.TYRE_TON_RULES = window.TYRE_TON_RULES || new Map(); // key `${tyres}|${product}` -> ton
  
  function normalizeTyreKey(tyres) {
    const ty = String(tyres || '').trim();
    return ty;
  }

  function buildLorryTyreCountMap() {
    try {
      window.LORRY_TYRE_COUNT_MAP = new Map();
      (window.CONFIG && window.CONFIG.lorryTyreCounts || []).forEach(rec => {
        const plate = String((rec && rec.plate) || '').trim();
        let tyres = rec && rec.tyres;
        if (!plate) return;
        if (tyres == null || tyres === '') return;
        tyres = parseInt(tyres, 10);
        if (!Number.isNaN(tyres)) window.LORRY_TYRE_COUNT_MAP.set(plate, tyres);
      });
    } catch (_) { window.LORRY_TYRE_COUNT_MAP = new Map(); }
  }

  function buildTyreTonRulesMap() {
    try {
      window.TYRE_TON_RULES = new Map();
      (window.CONFIG && window.CONFIG.tyreTonRules || []).forEach(rec => {
        let tyres = rec && (rec.tyres ?? rec.tyreCount);
        let ton = rec && rec.ton;
        if (ton != null && ton !== '' && tyres != null && tyres !== '') {
          tyres = parseInt(tyres, 10);
          if (!Number.isNaN(tyres)) {
            const key = normalizeTyreKey(tyres);
            window.TYRE_TON_RULES.set(key, ton);
          }
        }
      });
    } catch (_) { window.TYRE_TON_RULES = new Map(); }
  }

  function getTyreCountForPlate(plate) {
    const p = String(plate || '').trim();
    if (!p) return null;
    return window.LORRY_TYRE_COUNT_MAP.get(p) ?? null;
  }

  function setTyreCountForPlate(plate, tyres) {
    const p = String(plate || '').trim();
    if (!Array.isArray(window.CONFIG.lorryTyreCounts)) window.CONFIG.lorryTyreCounts = [];
    const idx = window.CONFIG.lorryTyreCounts.findIndex(r => String(r.plate).trim() === p);
    const num = parseInt(tyres, 10);
    if (Number.isNaN(num)) {
      if (idx >= 0) window.CONFIG.lorryTyreCounts.splice(idx, 1);
      window.LORRY_TYRE_COUNT_MAP.delete(p);
      return;
    }
    if (idx >= 0) window.CONFIG.lorryTyreCounts[idx] = { plate: p, tyres: num };
    else window.CONFIG.lorryTyreCounts.push({ plate: p, tyres: num });
    window.LORRY_TYRE_COUNT_MAP.set(p, num);
  }

  function getEstimatedTonFromTyreRules(tyres, dateContext) {
    if (!window.TYRE_TON_RULES || window.TYRE_TON_RULES.size === 0) return null;
    const tyN = String(tyres || '').trim();
    if (!tyN) return null;
    const key = normalizeTyreKey(tyres);
    let val = window.TYRE_TON_RULES.get(key);
    if (val == null) return null;
    if (typeof val === 'number' && !isNaN(val)) return String(Number(val).toFixed(2));
    const m = String(val).match(/[0-9]+(?:\.[0-9]+)?/);
    if (!m) return null;
    return String(Number(m[0]).toFixed(2));
  }

  // Expose globals
  window.normalizeTyreKey = window.normalizeTyreKey || normalizeTyreKey;
  window.buildLorryTyreCountMap = window.buildLorryTyreCountMap || buildLorryTyreCountMap;
  window.buildTyreTonRulesMap = window.buildTyreTonRulesMap || buildTyreTonRulesMap;
  window.getTyreCountForPlate = window.getTyreCountForPlate || getTyreCountForPlate;
  window.setTyreCountForPlate = window.setTyreCountForPlate || setTyreCountForPlate;
  window.getEstimatedTonFromTyreRules = window.getEstimatedTonFromTyreRules || getEstimatedTonFromTyreRules;
})();
