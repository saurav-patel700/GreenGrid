import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileText, Download, Calendar, Plus, CheckCircle, Clock } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import {
  generateReportApi,
  fetchScheduledReportsApi,
  createScheduledReportApi,
  getAccessToken
} from '../../services/api';

export default function EnterpriseReportsPage() {
  const { selectedFacility } = useOutletContext() || {};
  const [reportType, setReportType] = useState('energy');
  const [days, setDays] = useState(30);
  const [reportData, setReportData] = useState(null);
  const [scheduledReports, setScheduledReports] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleFreq, setScheduleFreq] = useState('weekly');
  const [scheduleFormat, setScheduleFormat] = useState('csv');
  const [scheduleEmails, setScheduleEmails] = useState('ops@enterprise.test');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await generateReportApi(reportType, days, selectedFacility);
      setReportData(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduled = async () => {
    try {
      const data = await fetchScheduledReportsApi();
      setScheduledReports(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReport();
    fetchScheduled();
  }, [reportType, days, selectedFacility]);

  const handleExportCSV = () => {
    const token = getAccessToken();
    const facilityParam = selectedFacility && selectedFacility !== 'all' ? `&facility=${selectedFacility}` : '';
    const rawBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').trim().replace(/\/+$/, '');
    const baseUrl = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;
    window.location.href = `${baseUrl}/reports/generate/?report_type=${reportType}&days=${days}&format=csv${facilityParam}&token=${token}`;
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      await createScheduledReportApi({
        title: scheduleTitle || `${reportType.toUpperCase()} Scheduled Digest`,
        report_type: reportType,
        frequency: scheduleFreq,
        format: scheduleFormat,
        recipients: scheduleEmails.split(',').map(e => e.trim())
      });
      setShowScheduleModal(false);
      fetchScheduled();
    } catch (err) {
      alert(err.message);
    }
  };


  const rows = reportData?.rows || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-card)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <FileText size={26} color="var(--color-primary)" /> Enterprise Reports Engine
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Generate, preview, export CSV reports, and configure recurring automated email digests.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleExportCSV}
            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            style={{ background: 'var(--color-primary)', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Calendar size={16} /> Schedule Digest
          </button>
        </div>
      </div>

      {/* Report Controls */}
      <div style={{ background: 'var(--color-bg-card)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Report Type</label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1', fontWeight: 500 }}>
            <option value="executive">Executive Energy Summary Report</option>
            <option value="energy">Energy Consumption & Load Report</option>
            <option value="carbon">Carbon Footprint & Emissions Accounting</option>
            <option value="billing">Bill Reconciliation & Discrepancies</option>
            <option value="device_health">IoT Device Health & Connectivity</option>
            <option value="forecast_accuracy">Forecast Accuracy & ML Model Drift</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Time Range</label>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1', fontWeight: 500 }}>
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Report Preview Data Table */}
      <div style={{ background: 'var(--color-bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '1rem' }}>
          Report Data Preview ({reportData?.metadata?.facility_scope})
        </h2>

        {loading ? (
          <div style={{ padding: '2rem', color: '#94a3b8' }}>Generating report dataset...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '2rem', color: '#64748b' }}>No records found for the selected report filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)' }}>
                  {Object.keys(rows[0]).map((key) => (
                    <th key={key} style={{ padding: '0.75rem' }}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {Object.values(row).map((val, valIdx) => (
                      <td key={valIdx} style={{ padding: '0.75rem' }}>{String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Scheduled Reports List */}
      <div style={{ background: 'var(--color-bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '1rem' }}>
          Active Scheduled Automated Digests
        </h2>

        {scheduledReports.length === 0 ? (
          <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>No recurring scheduled report digests configured yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Digest Title</th>
                <th style={{ padding: '0.75rem' }}>Report Type</th>
                <th style={{ padding: '0.75rem' }}>Frequency</th>
                <th style={{ padding: '0.75rem' }}>Format</th>
                <th style={{ padding: '0.75rem' }}>Recipients</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {scheduledReports.map((sr) => (
                <tr key={sr.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{sr.title}</td>
                  <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{sr.report_type}</td>
                  <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{sr.frequency}</td>
                  <td style={{ padding: '0.75rem', textTransform: 'uppercase' }}>{sr.format}</td>
                  <td style={{ padding: '0.75rem' }}>{Array.isArray(sr.recipients) ? sr.recipients.join(', ') : String(sr.recipients)}</td>
                  <td style={{ padding: '0.75rem' }}><StatusBadge status={sr.is_active ? 'online' : 'offline'} text={sr.is_active ? 'Active' : 'Inactive'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for Scheduling */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 700 }}>Schedule Automated Digest</h3>
            <form onSubmit={handleCreateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Digest Title</label>
                <input type="text" value={scheduleTitle} onChange={(e) => setScheduleTitle(e.target.value)} placeholder="Weekly Executive Energy Digest" required style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Frequency</label>
                <select value={scheduleFreq} onChange={(e) => setScheduleFreq(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }}>
                  <option value="daily">Daily Digest</option>
                  <option value="weekly">Weekly Report</option>
                  <option value="monthly">Monthly Executive Summary</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Format</label>
                <select value={scheduleFormat} onChange={(e) => setScheduleFormat(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }}>
                  <option value="csv">CSV Data File</option>
                  <option value="pdf">Printable Document (PDF)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Recipients (Comma-separated)</label>
                <input type="text" value={scheduleEmails} onChange={(e) => setScheduleEmails(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowScheduleModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1', background: '#ffffff' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-primary)', color: '#ffffff', fontWeight: 600 }}>Save Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
