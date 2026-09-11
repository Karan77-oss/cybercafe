import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  TrendingUp, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Layers, 
  DollarSign, 
  FileSpreadsheet,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { adminApi } from '../api/admin';

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState('total_revenue');
  const [period, setPeriod] = useState('this_month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reportsList = [
    { key: 'total_revenue', label: '1. Total Revenue Report', category: 'Financial' },
    { key: 'platform_commission', label: '2. Platform Commission Report', category: 'Financial' },
    { key: 'worker_payouts', label: '3. Worker Payouts Report', category: 'Financial' },
    { key: 'order_volume', label: '4. Order Volume Report', category: 'Operations' },
    { key: 'service_popularity', label: '5. Service Popularity Report', category: 'Operations' },
    { key: 'worker_performance', label: '6. Worker Performance Report', category: 'Operations' },
    { key: 'turnaround_time', label: '7. Order Turnaround Time Report', category: 'Operations' },
    { key: 'customer_growth', label: '8. Customer Growth Report', category: 'Growth' },
    { key: 'customer_retention', label: '9. Customer Retention Report', category: 'Growth' },
    { key: 'complaints_disputes', label: '10. Complaints & Disputes Report', category: 'Quality' },
    { key: 'worker_activity', label: '11. Worker Attendance & Activity', category: 'Operations' },
    { key: 'cancellation_rate', label: '12. Cancellation Rate Report', category: 'Quality' },
    { key: 'refund_summary', label: '13. Refund Summary Report', category: 'Financial' },
    { key: 'demand_forecast', label: '14. Service Demand Forecast', category: 'Growth' }
  ];

  const loadReport = () => {
    setLoading(true);
    adminApi.getReports({
      type: selectedReport,
      period,
      fromDate: period === 'custom' ? fromDate : undefined,
      toDate: period === 'custom' ? toDate : undefined
    })
      .then(res => {
        setReportData(res.report || null);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to generate report');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadReport();
  }, [selectedReport, period]);

  const handleCustomDateSubmit = (e) => {
    e.preventDefault();
    if (period === 'custom' && fromDate && toDate) {
      loadReport();
    }
  };

  const exportCSV = () => {
    if (!reportData || !reportData.rows) return;
    const headers = reportData.columns || ['Metric', 'Value', 'Date / Detail'];
    const rows = reportData.rows.map(r => Array.isArray(r) ? r : Object.values(r));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedReport}_${period}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentReportMeta = reportsList.find(r => r.key === selectedReport);

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Reports & Analytics</h1>
          <p className="subtitle">Official reporting suite across 14 financial, operational, and customer performance metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={exportCSV} disabled={!reportData || loading}>
            <Download size={16} /> Export Report (CSV / Excel)
          </button>
        </div>
      </div>

      {/* Report Selector and Date Controls */}
      <div className="data-table-container" style={{ marginBottom: '24px', padding: '18px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              SELECT REPORT TYPE (14 STANDARD PLATFORM AUDITS)
            </label>
            <select
              className="status-filter"
              style={{ width: '100%', fontSize: '0.95rem', fontWeight: 600, padding: '10px 14px' }}
              value={selectedReport}
              onChange={e => setSelectedReport(e.target.value)}
            >
              {reportsList.map(r => (
                <option key={r.key} value={r.key}>{r.label} [{r.category}]</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              TIME PERIOD
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { key: 'today', label: 'Today' },
                { key: 'yesterday', label: 'Yesterday' },
                { key: 'last_7_days', label: 'Last 7 Days' },
                { key: 'this_month', label: 'This Month' },
                { key: 'last_month', label: 'Last Month' },
                { key: 'this_year', label: 'This Year' },
                { key: 'custom', label: 'Custom' }
              ].map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`btn ${period === p.key ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {period === 'custom' && (
          <form onSubmit={handleCustomDateSubmit} style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>From Date</label>
              <input type="date" className="search-box" style={{ width: '160px' }} value={fromDate} onChange={e => setFromDate(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>To Date</label>
              <input type="date" className="search-box" style={{ width: '160px' }} value={toDate} onChange={e => setToDate(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>Apply Date Range</button>
          </form>
        )}
      </div>

      {/* KPI Cards for Report */}
      {reportData && reportData.kpis && (
        <div className="stats-grid compact">
          {reportData.kpis.map((kpi, idx) => (
            <StatCard 
              key={idx} 
              title={kpi.label} 
              value={kpi.value} 
              icon={TrendingUp} 
              color={idx === 0 ? 'purple' : idx === 1 ? 'blue' : idx === 2 ? 'green' : 'orange'} 
            />
          ))}
        </div>
      )}

      {/* Report Data Table */}
      <div className="data-table-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              {currentReportMeta?.label}
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Period: {period.replace(/_/g, ' ').toUpperCase()} {period === 'custom' && fromDate ? `(${fromDate} to ${toDate})` : ''}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Generating report data...
          </div>
        ) : error ? (
          <div style={{ padding: '40px', color: 'red', textAlign: 'center' }}>{error}</div>
        ) : !reportData || !reportData.rows || reportData.rows.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No records found for this reporting interval.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {(reportData.columns || ['Metric / Dimension', 'Value', 'Status', 'Date']).map((col, idx) => (
                  <th key={idx}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {(Array.isArray(row) ? row : Object.values(row)).map((val, cIdx) => (
                    <td key={cIdx}>
                      {cIdx === 0 ? (
                        <span style={{ fontWeight: 600 }}>{String(val)}</span>
                      ) : (
                        <span>{String(val)}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
