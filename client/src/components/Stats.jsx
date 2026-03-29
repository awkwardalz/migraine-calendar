import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement,
  Title, Tooltip, Legend, Filler
);

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Stats({ stats, periods = [] }) {
  if (!stats) return null;

  // Compute average cycle length from period entries
  const validCycles = periods
    .filter(p => p.cycle_length >= 21 && p.cycle_length <= 45)
    .map(p => p.cycle_length);
  const avgCycleLength = validCycles.length
    ? Math.round(validCycles.reduce((a, b) => a + b, 0) / validCycles.length)
    : null;

  // Check if migraine correlates with period (within 2 days of period start)
  let periodMigraineCount = 0;
  if (periods.length > 0) {
    const addD = (d, n) => {
      const dt = new Date(d + 'T00:00:00');
      dt.setDate(dt.getDate() + n);
      return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    };
    const migraineDates = new Set((stats.monthlyCounts || []).length > 0
      ? [] // we don't have per-day from stats, skip correlation if no detail
      : []);
    // Use preventiveMeds array for rough count
    periodMigraineCount = periods.length;
  }

  const monthlyData = {
    labels: stats.monthlyCounts.map(m => m.month),
    datasets: [{
      label: 'Migraine Days',
      data: stats.monthlyCounts.map(m => m.count),
      backgroundColor: 'rgba(240, 96, 96, 0.45)',
      borderColor: '#f06060',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const intensityData = {
    labels: stats.monthlyCounts.map(m => m.month),
    datasets: [{
      label: 'Avg Intensity',
      data: stats.monthlyCounts.map(m => m.avg_intensity),
      borderColor: '#7c6fef',
      backgroundColor: 'rgba(124, 111, 239, 0.15)',
      fill: true,
      tension: 0.3,
      pointRadius: 4,
      pointBackgroundColor: '#7c6fef',
    }],
  };

  const dowData = stats.dayOfWeek.length > 0 ? {
    labels: stats.dayOfWeek.map(d => DAYS[d.dow]),
    datasets: [{
      label: 'Occurrences',
      data: stats.dayOfWeek.map(d => d.count),
      backgroundColor: 'rgba(77, 217, 192, 0.45)',
      borderColor: '#4dd9c0',
      borderWidth: 1,
      borderRadius: 4,
    }],
  } : null;

  const locationLabels = Object.keys(stats.locationCounts);
  const locationData = locationLabels.length > 0 ? {
    labels: locationLabels,
    datasets: [{
      data: locationLabels.map(l => stats.locationCounts[l]),
      backgroundColor: ['#f06060', '#7c6fef', '#4dd9c0', '#f0b860', '#e879a0'],
      borderWidth: 0,
    }],
  } : null;

  const symptomLabels = Object.keys(stats.symptomCounts).sort((a, b) => stats.symptomCounts[b] - stats.symptomCounts[a]).slice(0, 8);
  const symptomData = symptomLabels.length > 0 ? {
    labels: symptomLabels,
    datasets: [{
      label: 'Occurrences',
      data: symptomLabels.map(s => stats.symptomCounts[s]),
      backgroundColor: 'rgba(124, 111, 239, 0.5)',
      borderColor: '#7c6fef',
      borderWidth: 1,
      borderRadius: 4,
    }],
  } : null;

  const triggerLabels = Object.keys(stats.triggerCounts).sort((a, b) => stats.triggerCounts[b] - stats.triggerCounts[a]).slice(0, 8);
  const triggerData = triggerLabels.length > 0 ? {
    labels: triggerLabels,
    datasets: [{
      label: 'Occurrences',
      data: triggerLabels.map(t => stats.triggerCounts[t]),
      backgroundColor: 'rgba(240, 184, 96, 0.5)',
      borderColor: '#f0b860',
      borderWidth: 1,
      borderRadius: 4,
    }],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1, color: '#4e566e' }, grid: { color: '#252a38' } },
      x: { ticks: { maxRotation: 45, minRotation: 0, color: '#4e566e' }, grid: { color: '#252a38' } },
    },
  };

  return (
    <div className="stats">
      <div className="stats-summary">
        <div className="stat-card">
          <div className="stat-value">{stats.totalEntries}</div>
          <div className="stat-label">Total Migraines</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgIntensity ?? '—'}</div>
          <div className="stat-label">Avg Intensity</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.thisMonth?.count || 0}</div>
          <div className="stat-label">This Month</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-value">{stats.migraineFreeDays}</div>
          <div className="stat-label">Migraine-Free Streak</div>
        </div>
        <div className="stat-card cycle-card">
          <div className="stat-value">{avgCycleLength ?? '—'}</div>
          <div className="stat-label">Avg Cycle (days)</div>
        </div>
        <div className="stat-card cycle-card">
          <div className="stat-value">{periods.length}</div>
          <div className="stat-label">Cycles Logged</div>
        </div>
      </div>

      {stats.monthlyCounts.length > 0 && (
        <div className="chart-grid">
          <div className="chart-card">
            <h3>Monthly Frequency</h3>
            <div className="chart-wrapper">
              <Bar data={monthlyData} options={chartOptions} />
            </div>
          </div>

          <div className="chart-card">
            <h3>Intensity Trend</h3>
            <div className="chart-wrapper">
              <Line data={intensityData} options={{
                ...chartOptions,
                scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, max: 10 } },
              }} />
            </div>
          </div>

          {dowData && (
            <div className="chart-card">
              <h3>Day of Week</h3>
              <div className="chart-wrapper">
                <Bar data={dowData} options={chartOptions} />
              </div>
            </div>
          )}

          {locationData && (
            <div className="chart-card">
              <h3>Pain Location</h3>
              <div className="chart-wrapper chart-wrapper-donut">
                <Doughnut data={locationData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom', labels: { padding: 12 } } },
                }} />
              </div>
            </div>
          )}

          {symptomData && (
            <div className="chart-card">
              <h3>Top Symptoms</h3>
              <div className="chart-wrapper">
                <Bar data={symptomData} options={{
                  ...chartOptions,
                  indexAxis: 'y',
                }} />
              </div>
            </div>
          )}

          {triggerData && (
            <div className="chart-card">
              <h3>Top Triggers</h3>
              <div className="chart-wrapper">
                <Bar data={triggerData} options={{
                  ...chartOptions,
                  indexAxis: 'y',
                }} />
              </div>
            </div>
          )}
        </div>
      )}

      {stats.monthlyCounts.length === 0 && (
        <div className="empty-stats">
          <p>No data yet. Start recording your migraines to see insights here.</p>
        </div>
      )}
    </div>
  );
}
