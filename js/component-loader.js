// Lightweight component loader to inject HTML partials into the existing page.
// Safe-by-default: only runs when feature flag is enabled.
(function () {
  const urlFlag = new URLSearchParams(location.search).get('v') === 'components';
  const localFlag = (typeof localStorage !== 'undefined') && localStorage.getItem('USE_COMPONENTS') === '1';
  const ENABLED = urlFlag || localFlag;
  if (!ENABLED) return; // Do nothing unless explicitly enabled

  const components = [
    { selector: '.top-right-tabs', path: 'components/common/tabs.html' },
    { selector: '#toastContainer', path: 'components/common/toast.html' },
    { selector: '#appLoadingOverlay', path: 'components/common/loading-overlay.html' },
    { selector: '.toolbar', path: 'components/planner/toolbar.html' },
    { selector: '.table-container', path: 'components/planner/table.html' },
    { selector: '#tripOverviewContainer', path: 'components/planner/trip-board.html' },
    { selector: '#commissionModal', path: 'components/modals/commission-modal.html' },
    { selector: '#dashboardModal', path: 'components/modals/dashboard-modal.html' },
    // Config modal is large; we'll extract in a second pass once reviewed.
  ];

  async function fetchText(path) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
    return await res.text();
  }

  async function replaceWithComponent({ selector, path }) {
    const el = document.querySelector(selector);
    if (!el) return; // Element not present; skip
    try {
      const html = await fetchText(path);
      // Replace the whole element, ensuring IDs/classes are defined in the partial
      el.outerHTML = html;
    } catch (e) {
      console.warn('[components] load failed', selector, e);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    // Replace serially to avoid race conditions
    (async () => {
      for (const c of components) {
        await replaceWithComponent(c);
      }
      console.info('[components] Componentized layout loaded');
    })();
  });
})();
