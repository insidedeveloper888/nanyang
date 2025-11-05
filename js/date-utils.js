// Date utilities extracted from logistics-planner.html
// NOTE: Kept function names and behavior identical. Attached to window to preserve inline handlers.

// Current date state binding shared between global lexical scope and window
// Many parts of logistics-planner.html reference `currentDate` directly (global binding),
// so we maintain BOTH the lexical binding and window.currentDate, kept in sync.
let currentDate = (window.currentDate instanceof Date) ? window.currentDate : new Date();
window.currentDate = currentDate;

function getChineseWeekday(date) {
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return days[date.getDay()];
}

function formatDateISO(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

function updateDateDisplay() {
  const d = currentDate instanceof Date ? currentDate : new Date();
  const dateElement = document.getElementById('currentDate');
  // Show only weekday in Chinese next to the native date input, inside the same box
  if (dateElement) dateElement.textContent = getChineseWeekday(d);
  const picker = document.getElementById('datePicker');
  if (picker) picker.value = formatDateISO(d);
}

async function navigateDate(direction) {
  currentDate.setDate(currentDate.getDate() + direction);
  window.currentDate = currentDate; // keep in sync
  updateDateDisplay();
  // supabaseLoadSchedule and populateTable are defined elsewhere; we call them here identically.
  if (typeof window.supabaseLoadSchedule === 'function') {
    await window.supabaseLoadSchedule(currentDate);
  }
  if (typeof window.populateTable === 'function') {
    window.populateTable();
  }
}

// Expose to global for existing inline event handlers
// Ensure window.currentDate mirrors our lexical binding
window.getChineseWeekday = getChineseWeekday;
window.formatDateISO = formatDateISO;
window.updateDateDisplay = updateDateDisplay;
window.navigateDate = navigateDate;

// Debug marker to verify script loading order
window.__DATE_UTILS_LOADED__ = true;
// Removed debug console output for production
