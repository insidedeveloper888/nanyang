// Dashboard stats and chart rendering
// These functions rely on global variables like sb, Chart, and helpers such as parseBoolean.

async function calculateDashboardStats() {
  const startDate = getPeriodStartDate(window.dashboardCurrentDate, window.currentPeriod);
  const endDate = getPeriodEndDate(window.dashboardCurrentDate, window.currentPeriod);

  // 如果 Supabase 未配置，使用本地当前日期的排程数据进行统计回退
  if (!window.sb) {
    // Silent fallback in production
    return calculateStatsFromLocalRange(startDate, endDate);
  }

  try {
    const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
    const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    const { data, error } = await sb
      .from('schedules')
      .select('*')
      .gte('work_date', startDateStr)
      .lte('work_date', endDateStr);

    if (error) {
      console.error('Database query error:', error);
      throw error;
    }

    const vehicleStats = new Map();
    let totalTrips = 0;
    let totalCommission = 0;
    let totalExpenses = 0;
    let totalEstimatedTon = 0;

    if (data && data.length > 0) {
      data.forEach((row) => {
        const plate = String(row.lorry_plate || '').trim();
        if (!vehicleStats.has(plate)) {
          vehicleStats.set(plate, {
            plate: plate,
            trips: 0,
            commission: 0,
            tollFees: 0,
            fuelCosts: 0,
            estimatedTon: 0
          });
        }

        const stats = vehicleStats.get(plate);

        for (let i = 1; i <= 5; i++) {
          const completed = row[`t${i}_completed`];
          const commission = row[`t${i}_commission`];
          if (typeof window.parseBoolean === 'function' ? window.parseBoolean(completed) : completed === true) {
            stats.trips++;
            totalTrips++;
            const commissionValue = parseFloat(commission) || 0;
            stats.commission += commissionValue;
            totalCommission += commissionValue;
            // 计算预计吨位：按该车的轮胎数对应的吨位规则
            try {
              const tyres = (typeof window.getTyreCountForPlate === 'function') ? window.getTyreCountForPlate(plate) : null;
              const tonStr = (typeof window.getEstimatedTonFromTyreRules === 'function') ? window.getEstimatedTonFromTyreRules(tyres) : null;
              const tonVal = parseFloat(tonStr) || 0;
              stats.estimatedTon += tonVal;
              totalEstimatedTon += tonVal;
            } catch (_) { /* ignore */ }
          }
        }

        const tollAmount = parseFloat(row.tol_amount) || 0;
        const petrolAmount = parseFloat(row.petrol_amount) || 0;
        const rowExpenses = tollAmount + petrolAmount;
        stats.tollFees += tollAmount;
        stats.fuelCosts += petrolAmount;
        totalExpenses += rowExpenses;
      });
    }

    return {
      totalVehicles: vehicleStats.size,
      totalTrips,
      totalCommission,
      totalExpenses,
      totalEstimatedTon,
      vehicleData: Array.from(vehicleStats.values())
    };
  } catch (error) {
    console.error('Error calculating dashboard stats:', error);
    // 出错时尝试使用本地数据回退
    try {
      return calculateStatsFromLocalRange(startDate, endDate);
    } catch (_) {
      return {
        totalVehicles: 0,
        totalTrips: 0,
        totalCommission: 0,
        totalExpenses: 0,
        // 确保仪表盘不会显示 '-'，在严重错误时也返回 0
        totalEstimatedTon: 0,
        vehicleData: []
      };
    }
  }
}

// 基于本地排程数据的统计（支持时间范围，优先当天；如果提供了 window.localLoadSchedule 则遍历范围内的所有天）
function calculateStatsFromLocalRange(startDate, endDate) {
  const vehicleStats = new Map();
  let totalTrips = 0;
  let totalCommission = 0;
  let totalExpenses = 0;
  let totalEstimatedTon = 0;

  // 遍历日期范围，优先使用 localStorage 中保存的每天排程，其次回退到当前页面内的 sampleData
  const dates = [];
  const d = new Date(startDate);
  while (d <= endDate) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }

  const hiddenSet = new Set((window.CONFIG && window.CONFIG.hiddenLorryPlates) || []);
  const archivedSet = new Set((window.CONFIG && window.CONFIG.archivedLorryPlates) || []);

  dates.forEach(date => {
    let dayRows = null;
    if (typeof window.localLoadSchedule === 'function') {
      dayRows = window.localLoadSchedule(date);
    }
    // 如果 localStorage 没有该天的数据，则在当前选中日期时回退到页面的 sampleData
    const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if ((!dayRows || dayRows.length === 0) && isSameDay(date, window.dashboardCurrentDate) && Array.isArray(window.sampleData)) {
      dayRows = window.sampleData;
    }
    (dayRows || []).filter(r => !(hiddenSet.has(r.lorryPlate) || archivedSet.has(r.lorryPlate))).forEach(row => {
      const plate = String(row.lorryPlate || '').trim();
      if (!vehicleStats.has(plate)) {
        vehicleStats.set(plate, { plate, trips: 0, commission: 0, tollFees: 0, fuelCosts: 0, estimatedTon: 0 });
      }
      const stats = vehicleStats.get(plate);
      for (let i = 1; i <= 5; i++) {
        const t = row[`trip${i}`] || {};
        const completed = t.completed;
        const commission = t.commission;
        if (typeof window.parseBoolean === 'function' ? window.parseBoolean(completed) : completed === true) {
          stats.trips++; totalTrips++;
          const commissionValue = parseFloat(commission) || 0;
          stats.commission += commissionValue; totalCommission += commissionValue;
          // 预计吨位（根据轮胎规则）
          try {
            const tyres = (typeof window.getTyreCountForPlate === 'function') ? window.getTyreCountForPlate(plate) : null;
            const tonStr = (typeof window.getEstimatedTonFromTyreRules === 'function') ? window.getEstimatedTonFromTyreRules(tyres) : null;
            const tonVal = parseFloat(tonStr) || 0;
            stats.estimatedTon += tonVal; totalEstimatedTon += tonVal;
          } catch (_) { /* ignore */ }
        }
      }
      const tollAmount = parseFloat(row.tol_amount) || 0;
      const petrolAmount = parseFloat(row.petrol_amount) || 0;
      stats.tollFees += tollAmount; stats.fuelCosts += petrolAmount;
      totalExpenses += (tollAmount + petrolAmount);
    });
  });

  return {
    totalVehicles: vehicleStats.size,
    totalTrips,
    totalCommission,
    totalExpenses,
    totalEstimatedTon,
    vehicleData: Array.from(vehicleStats.values())
  };
}

function updateDashboardStats(stats) {
  document.getElementById('totalVehicles').textContent = stats.totalVehicles;
  document.getElementById('totalTrips').textContent = stats.totalTrips;
  // 显示总预计吨位（如果页面有该元素）
  const estEl = document.getElementById('totalEstimatedTon');
  if (estEl) {
    // 如果 totalEstimatedTon 未提供，尝试从车辆数据求和，最后回退为 0
    let tonTotal = (typeof stats.totalEstimatedTon !== 'undefined')
      ? stats.totalEstimatedTon
      : (Array.isArray(stats.vehicleData)
        ? stats.vehicleData.reduce((sum, v) => sum + (parseFloat(v.estimatedTon) || 0), 0)
        : 0);
    estEl.textContent = (parseFloat(tonTotal) || 0).toFixed(2);
  }
  document.getElementById('totalCommission').textContent = `RM ${stats.totalCommission.toFixed(2)}`;
  document.getElementById('totalExpenses').textContent = `RM ${stats.totalExpenses.toFixed(2)}`;
}

function updateDashboardChart(vehicleData) {
  const canvas = document.getElementById('vehicleStatsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (window.dashboardChart) {
    window.dashboardChart.destroy();
  }
  const labels = vehicleData.map(v => v.plate);
  const tripsData = vehicleData.map(v => v.trips);
  const commissionData = vehicleData.map(v => v.commission);
  const expensesData = vehicleData.map(v => v.tollFees + v.fuelCosts);
  const estimatedTonData = vehicleData.map(v => v.estimatedTon || 0);

  window.dashboardChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Trip数量', data: tripsData, backgroundColor: 'rgba(54, 162, 235, 0.8)', borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 1, yAxisID: 'y' },
        { label: '预计吨位 (吨)', data: estimatedTonData, backgroundColor: 'rgba(13, 148, 136, 0.7)', borderColor: 'rgba(13, 148, 136, 1)', borderWidth: 1, yAxisID: 'y' },
        { label: '车税 (RM)', data: commissionData, backgroundColor: 'rgba(75, 192, 192, 0.8)', borderColor: 'rgba(75, 192, 192, 1)', borderWidth: 1, yAxisID: 'y1' },
        { label: '总开销 (RM)', data: expensesData, backgroundColor: 'rgba(255, 99, 132, 0.8)', borderColor: 'rgba(255, 99, 132, 1)', borderWidth: 1, yAxisID: 'y1' }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { display: true, title: { display: true, text: '车牌号' } },
        y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Trip / 吨位' } },
        y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: '金额 (RM)' }, grid: { drawOnChartArea: false } }
      },
      plugins: {
        title: { display: true, text: `车辆统计 - ${getPeriodDisplayName(window.currentPeriod)}` },
        legend: { display: true, position: 'top' }
      }
    }
  });
}

function updateVehicleTable(vehicleData) {
  const tbody = document.querySelector('#vehicleStatsTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const data = (vehicleData || []).slice();
  const key = window.vehicleSort?.key || null;
  const dir = window.vehicleSort?.direction || 'none';

  if (key && dir !== 'none') {
    data.sort((a, b) => {
      const getVal = (obj) => {
        if (key === 'totalExpenses') return (parseFloat(obj.tollFees) || 0) + (parseFloat(obj.fuelCosts) || 0);
        return obj[key];
      };
      const va = getVal(a);
      const vb = getVal(b);
      if (key === 'plate') {
        const pa = String(va || '').trim();
        const pb = String(vb || '').trim();
        const cmp = pa.localeCompare(pb, undefined, { numeric: true, sensitivity: 'base' });
        return dir === 'asc' ? cmp : -cmp;
      } else {
        const na = parseFloat(va) || 0;
        const nb = parseFloat(vb) || 0;
        const cmp = na - nb;
        return dir === 'asc' ? cmp : -cmp;
      }
    });
  }

  data.forEach(vehicle => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${String(vehicle.plate || '').trim()}</td>
      <td>${vehicle.trips}</td>
      <td>${(vehicle.estimatedTon || 0).toFixed(2)}</td>
      <td>${vehicle.commission.toFixed(2)}</td>
      <td>${vehicle.tollFees.toFixed(2)}</td>
      <td>${vehicle.fuelCosts.toFixed(2)}</td>
      <td>${(vehicle.tollFees + vehicle.fuelCosts).toFixed(2)}</td>
    `;
    tbody.appendChild(row);
  });
}

// Expose globally
window.calculateDashboardStats = calculateDashboardStats;
window.updateDashboardStats = updateDashboardStats;
window.updateDashboardChart = updateDashboardChart;
window.updateVehicleTable = updateVehicleTable;
