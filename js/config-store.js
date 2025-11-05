// Config storage and trip color utilities (extracted from logistics-planner.html)
// Exposes global defaultConfig, loadConfig, saveConfig, applyTripColors
(function () {
  const defaultConfig = {
    lorryPlates: ["8722", "8915", "4250", "907", "5708"],
    hiddenLorryPlates: [],
    archivedLorryPlates: [],
    // When true, prefer local lorryPlates over DB values on load
    overrideLorryPlates: false,
    // New: per-lorry tyre counts and tyre-based ton rules
    // Example: [{ plate: '8722', tyres: 10 }, { plate: '8915', tyres: 12 }]
    lorryTyreCounts: [],
    // Example: [{ tyres: 10, product: '3/4 Agg', destination: 'Kajang Setia Mix', ton: 28 }]
    tyreTonRules: [],
    pickUps: [
      "", "Highway Quarry", "Majumas Bestari", "RCJ", "LORI ROSAK", "CST",
      "IJM", "Takali Sunway", "Pepsi", "Hanson Cheras", "Guna"
    ],
    products: [
      "", "3/4 Agg", "C/Sand", "C/run", "Icp kapar", "Kajang Setia Mix",
      "Langat Tong Ooi", "Kuchai Ytl", "Nilai MDC", "Belakong Ytl", "Setia mix semen",
      "Subang Gy two", "Puchong ulus wt"
    ],
    destinations: [
      "", "Nilai MDC", "Subang Gy two", "B. Jalil", "Tasik Selatan", "Icp kebun",
      "kapar k345 lucat", "K345 Lucas", "sps chong", "Kuchai Ytl", "Kajang Setia Mix",
      "Langat Tong Ooi", "Belakong Ytl", "Setia mix semen", "Suntiga Sg Rasa",
      "Kapar U wajar", "kapar k345 lucat", "Puchong ulus wt", "K Garden Kapar"
    ],
    commissions: ["5.50", "10.00", "10.50", "11.50", "13.50", "14.00"],
    defaultCompletion: false,
    tripColors: {
      trip1: '#e3f2fd',
      trip2: '#f3e5f5',
      trip3: '#e8f5e8',
      trip4: '#fff3e0',
      trip5: '#fce4ec'
    }
  };

  function loadConfig() {
    try {
      const raw = localStorage.getItem('nanyang_config');
      if (!raw) return { ...defaultConfig };
      const parsed = JSON.parse(raw);
      return { ...defaultConfig, ...parsed };
    } catch (e) {
      // Silent fallback to defaults in production
      return { ...defaultConfig };
    }
  }

  function applyTripColors(cfg) {
    const colors = (cfg && cfg.tripColors) ? cfg.tripColors : defaultConfig.tripColors;
    const root = document.documentElement;
    root.style.setProperty('--trip1-bg', colors.trip1);
    root.style.setProperty('--trip2-bg', colors.trip2);
    root.style.setProperty('--trip3-bg', colors.trip3);
    root.style.setProperty('--trip4-bg', colors.trip4);
    root.style.setProperty('--trip5-bg', colors.trip5);
  }

  function saveConfig(cfg) {
    try {
      localStorage.setItem('nanyang_config', JSON.stringify(cfg));
    } catch (e) {
      if (e.name !== 'QuotaExceededError') {
        console.error('Failed to save config to localStorage:', e);
      }
      // Suppress non-critical warning logs in production
    }
    // Keep in-memory maps in sync immediately after saves
    try {
      if (typeof window.buildLorryTyreCountMap === 'function') window.buildLorryTyreCountMap();
      if (typeof window.buildTyreTonRulesMap === 'function') window.buildTyreTonRulesMap();
    } catch (_) { /* non-critical */ }
  }

  // Expose globals
  window.defaultConfig = window.defaultConfig || defaultConfig;
  window.loadConfig = window.loadConfig || loadConfig;
  window.saveConfig = window.saveConfig || saveConfig;
  window.applyTripColors = window.applyTripColors || applyTripColors;
})();
