// Dashboard period date utilities
// Expose identical function names and behavior

function getPeriodStartDate(date, period) {
  const d = new Date(date);
  switch (period) {
    case 'week':
      const dayOfWeek = d.getDay();
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday start
      return new Date(d.setDate(diff));
    case 'month':
      return new Date(d.getFullYear(), d.getMonth(), 1);
    case 'year':
      return new Date(d.getFullYear(), 0, 1);
    default:
      return d;
  }
}

function getPeriodEndDate(date, period) {
  const d = new Date(date);
  switch (period) {
    case 'week':
      const startOfWeek = getPeriodStartDate(date, period);
      return new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(d.getFullYear(), d.getMonth() + 1, 0);
    case 'year':
      return new Date(d.getFullYear(), 11, 31);
    default:
      return d;
  }
}

function updateDateRange() {
  const startDate = getPeriodStartDate(window.dashboardCurrentDate, window.currentPeriod);
  const endDate = getPeriodEndDate(window.dashboardCurrentDate, window.currentPeriod);

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const dateRangeText = `${formatDate(startDate)} - ${formatDate(endDate)}`;
  const el = document.getElementById('dashboardDateRange');
  if (el) el.textContent = dateRangeText;
}

// Attach to window
window.getPeriodStartDate = getPeriodStartDate;
window.getPeriodEndDate = getPeriodEndDate;
window.updateDateRange = updateDateRange;

