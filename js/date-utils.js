// Date utilities extracted from logistics-planner.html
// NOTE: Kept function names and behavior identical. Attached to window to preserve inline handlers.

// Current date state
let currentDate = new Date();

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
  const dateElement = document.getElementById('currentDate');
  // Show only weekday in Chinese next to the native date input, inside the same box
  if (dateElement) dateElement.textContent = getChineseWeekday(currentDate);
  const picker = document.getElementById('datePicker');
  if (picker) picker.value = formatDateISO(currentDate);
}

async function navigateDate(direction) {
  currentDate.setDate(currentDate.getDate() + direction);
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
window.currentDate = currentDate;
window.getChineseWeekday = getChineseWeekday;
window.formatDateISO = formatDateISO;
window.updateDateDisplay = updateDateDisplay;
window.navigateDate = navigateDate;

// Debug marker to verify script loading order
window.__DATE_UTILS_LOADED__ = true;
try {
  console.debug('[date-utils] loaded. updateDateDisplay type:', typeof window.updateDateDisplay);
} catch (_) {}
