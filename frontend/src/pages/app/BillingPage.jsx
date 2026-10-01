import React, { useState, useEffect } from 'react';
import {
  CreditCard, FileText, CheckCircle2, AlertCircle, RefreshCw, Upload,
  TrendingUp, Layers, Zap, IndianRupee, Calculator, Download, Plus, Filter,
  Search, ShieldAlert, ArrowRightLeft, Clock, BarChart3, AlertTriangle, Eye, Trash2
} from 'lucide-react';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import StatusBadge from '../../components/common/StatusBadge';
import {
  fetchBillsApi, createBillApi, calculateBillApi, reconcileBillApi, uploadBillDocumentApi,
  fetchTariffsApi, createTariffApi, updateTariffApi, createTouPeriodApi, deleteTouPeriodApi,
  createDemandRuleApi, fetchBillingSummaryApi, fetchBillingCostTimeseriesApi,
  fetchBillingCostByFacilityApi, fetchBillingCostByMeterApi, fetchBillingTouBreakdownApi,
  fetchBillingDemandCostApi, fetchBillingVarianceApi, runTariffScenarioApi,
  getBillingExportUrl, fetchFacilities
} from '../../services/api';

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'bills', 'tariffs', 'demand', 'reconciliation', 'analysis', 'scenarios'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState('all');

  // Overview Data
  const [summaryData, setSummaryData] = useState(null);

  // Bills List
  const [bills, setBills] = useState([]);
  const [searchInvoice, setSearchInvoice] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);

  // Tariffs List
  const [tariffs, setTariffs] = useState([]);
  const [selectedTariff, setSelectedTariff] = useState(null);

  // Analytics & Scenarios Data
  const [facilityCosts, setFacilityCosts] = useState([]);
  const [meterCosts, setMeterCosts] = useState([]);
  const [touBreakdown, setTouBreakdown] = useState(null);
  const [demandBreakdown, setDemandBreakdown] = useState(null);
  const [discrepantBills, setDiscrepantBills] = useState([]);

  // Modals state
  const [showCreateBillModal, setShowCreateBillModal] = useState(false);
  const [showCreateTariffModal, setShowCreateTariffModal] = useState(false);
  const [showAddTouModal, setShowAddTouModal] = useState(false);
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [selectedDocFile, setSelectedDocFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);

  // New Bill Form
  const [billForm, setBillForm] = useState({
    facility: '',
    utility_provider: '',
    invoice_number: '',
    account_reference: '',
    billing_period_start: '',
    billing_period_end: '',
    billed_consumption_kwh: '',
    billed_demand_kw: '',
    billed_amount: '',
    notes: ''
  });

  // New Tariff Form
  const [tariffForm, setTariffForm] = useState({
    name: '',
    utility_name: '',
    utility_account_reference: '',
    currency: 'INR',
    billing_cycle: 'monthly',
    effective_from: '',
    fixed_monthly_charge: '0.00',
    tax_percentage: '0.00'
  });

  // New TOU Period Form
  const [touForm, setTouForm] = useState({
    name: '',
    period_type: 'OFF_PEAK',
    start_time: '22:00:00',
    end_time: '06:00:00',
    days_of_week: '0,1,2,3,4,5,6',
    rate: '0.0800',
    priority: 1
  });

  // Scenario Form
  const [scenarioForm, setScenarioForm] = useState({
    facility: '',
    primary_tariff: '',
    alternative_tariff: '',
    start_date: '',
    end_date: ''
  });
  const [scenarioResult, setScenarioResult] = useState(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [selectedFacility]);

  async function loadInitialData() {
    setLoading(true);
    setError(null);
    try {
      const [facsRes, summaryRes, billsRes, tariffsRes] = await Promise.all([
        fetchFacilities().catch(() => []),
        fetchBillingSummaryApi(selectedFacility).catch(() => null),
        fetchBillsApi(selectedFacility).catch(() => []),
        fetchTariffsApi().catch(() => [])
      ]);

      setFacilities(facsRes);
      setSummaryData(summaryRes);
      setBills(Array.isArray(billsRes) ? billsRes : []);
      setTariffs(Array.isArray(tariffsRes) ? tariffsRes : []);

      if (facsRes.length > 0 && !billForm.facility) {
        setBillForm(prev => ({ ...prev, facility: facsRes[0].id }));
        setScenarioForm(prev => ({ ...prev, facility: facsRes[0].id }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load billing information.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadAnalytics() {
    try {
      const [facCostsRes, meterCostsRes, touRes, demandRes, varRes] = await Promise.all([
        fetchBillingCostByFacilityApi().catch(() => ({ facilities: [] })),
        fetchBillingCostByMeterApi(selectedFacility).catch(() => ({ meters: [] })),
        fetchBillingTouBreakdownApi(selectedFacility).catch(() => null),
        fetchBillingDemandCostApi(selectedFacility).catch(() => null),
        fetchBillingVarianceApi().catch(() => ({ discrepant_bills: [] }))
      ]);

      setFacilityCosts(facCostsRes.facilities || []);
      setMeterCosts(meterCostsRes.meters || []);
      setTouBreakdown(touRes?.tou_breakdown || null);
      setDemandBreakdown(demandRes?.demand_breakdown || null);
      setDiscrepantBills(varRes.discrepant_bills || []);
    } catch (err) {
      console.error(err);
    }
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (['reconciliation', 'analysis', 'scenarios'].includes(tab)) {
      handleLoadAnalytics();
    }
  };

  async function handleCreateBill(e) {
    e.preventDefault();
    try {
      const created = await createBillApi(billForm);
      setBills(prev => [created, ...prev]);
      setShowCreateBillModal(false);
      setBillForm({
        facility: facilities[0]?.id || '',
        utility_provider: '',
        invoice_number: '',
        account_reference: '',
        billing_period_start: '',
        billing_period_end: '',
        billed_consumption_kwh: '',
        billed_demand_kw: '',
        billed_amount: '',
        notes: ''
      });
      loadInitialData();
    } catch (err) {
      alert(`Failed to create bill: ${err.message}`);
    }
  }

  async function handleCreateTariff(e) {
    e.preventDefault();
    try {
      const created = await createTariffApi(tariffForm);
      setTariffs(prev => [created, ...prev]);
      setShowCreateTariffModal(false);
      setTariffForm({
        name: '',
        utility_name: '',
        utility_account_reference: '',
        currency: 'INR',
        billing_cycle: 'monthly',
        effective_from: '',
        fixed_monthly_charge: '0.00',
        tax_percentage: '0.00'
      });
    } catch (err) {
      alert(`Failed to create tariff plan: ${err.message}`);
    }
  }

  async function handleAddTouPeriod(e) {
    e.preventDefault();
    if (!selectedTariff) return;
    try {
      const created = await createTouPeriodApi(selectedTariff.id, touForm);
      setTariffs(prev => prev.map(t => {
        if (t.id === selectedTariff.id) {
          return { ...t, tou_periods: [...(t.tou_periods || []), created] };
        }
        return t;
      }));
      setShowAddTouModal(false);
    } catch (err) {
      alert(`Failed to add TOU period: ${err.message}`);
    }
  }

  async function handleReconcileBill(billId) {
    try {
      const result = await reconcileBillApi(billId, 2.0);
      setBills(prev => prev.map(b => b.id === billId ? { ...b, ...result, reconciliation_status: result.reconciliation_status } : b));
      if (selectedBill && selectedBill.id === billId) {
        setSelectedBill(prev => ({ ...prev, ...result }));
      }
    } catch (err) {
      alert(`Reconciliation failed: ${err.message}`);
    }
  }

  async function handleUploadDocument(e) {
    e.preventDefault();
    if (!selectedBill || !selectedDocFile) return;
    setUploadingDoc(true);
    setOcrResult(null);
    try {
      const res = await uploadBillDocumentApi(selectedBill.id, selectedDocFile);
      setOcrResult(res.ocr_result);
      setSelectedDocFile(null);
      loadInitialData();
    } catch (err) {
      alert(`Document upload failed: ${err.message}`);
    } finally {
      setUploadingDoc(false);
    }
  }

  async function handleRunScenario(e) {
    e.preventDefault();
    setScenarioLoading(true);
    setScenarioResult(null);
    try {
      const res = await runTariffScenarioApi(scenarioForm);
      setScenarioResult(res);
    } catch (err) {
      alert(`Scenario calculation failed: ${err.message}`);
    } finally {
      setScenarioLoading(false);
    }
  }

  const filteredBills = bills.filter(b => {
    const matchesSearch = !searchInvoice || b.invoice_number.toLowerCase().includes(searchInvoice.toLowerCase()) || b.utility_provider.toLowerCase().includes(searchInvoice.toLowerCase());
    const matchesStatus = !filterStatus || b.reconciliation_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Energy Cost & Utility Billing' }]} />

      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IndianRupee size={24} style={{ color: 'var(--color-brand-primary, #00C853)' }} />
            Utility Billing, Tariffs & Cost Management
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Time-of-Use rates, peak demand charges, server-side bill calculation, and document OCR reconciliation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            className="input-select"
            value={selectedFacility}
            onChange={e => setSelectedFacility(e.target.value)}
            style={{ width: '200px' }}
          >
            <option value="all">All Facilities</option>
            {facilities.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          <a href={getBillingExportUrl()} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">
            <Download size={16} />
            Export CSV
          </a>

          <button className="btn btn-secondary" onClick={() => setShowCreateTariffModal(true)}>
            <Plus size={16} />
            New Tariff
          </button>

          <button className="btn btn-primary" onClick={() => setShowCreateBillModal(true)}>
            <Plus size={16} />
            Enter Utility Bill
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border-subtle, #333)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'bills', label: 'Bills & Invoices', icon: FileText },
          { id: 'tariffs', label: 'Tariffs & TOU Rates', icon: Layers },
          { id: 'demand', label: 'Demand Charges', icon: Zap },
          { id: 'reconciliation', label: 'Bill Reconciliation', icon: CheckCircle2 },
          { id: 'analysis', label: 'Cost Analysis', icon: TrendingUp },
          { id: 'scenarios', label: 'Tariff Scenarios', icon: ArrowRightLeft }
        ].map(t => {
          const IconComponent = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                border: 'none',
                background: 'none',
                color: isActive ? 'var(--color-brand-primary, #00C853)' : 'var(--color-text-muted, #888)',
                borderBottom: isActive ? '2px solid var(--color-brand-primary, #00C853)' : '2px solid transparent',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <IconComponent size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Global Error Banner */}
      {error && (
        <div style={{ padding: '1rem', background: '#3b1212', border: '1px solid #7f1d1d', borderRadius: '6px', color: '#fca5a5', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Spinner */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
          <p>Loading billing data and tariff engines...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Billed Invoice Cost</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>
                    {summaryData?.currency || 'INR'} ₹{summaryData?.total_billed_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    Total verified utility bills
                  </div>
                </div>

                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modeled Telemetry Cost</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>
                    {summaryData?.currency || 'INR'} ₹{summaryData?.total_calculated_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    Calculated server tariff rate
                  </div>
                </div>

                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reconciliation Variance</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: summaryData?.total_variance_amount > 0 ? '#ef4444' : '#10b981', marginTop: '0.25rem' }}>
                    {summaryData?.currency || 'INR'} ₹{summaryData?.total_variance_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    Invoice vs telemetry difference
                  </div>
                </div>

                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reconciliation Status</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                    <span style={{ color: '#10b981' }}>{summaryData?.bills_reconciled?.matched_count || 0} Matched</span>
                    <span style={{ color: '#ef4444' }}>{summaryData?.bills_reconciled?.variance_count || 0} Variance</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    {summaryData?.bills_reconciled?.pending_count || 0} pending review
                  </div>
                </div>
              </div>

              {/* Charge Components Breakdown */}
              <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Bill Component Breakdown</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Energy Charges (kWh)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>₹{summaryData?.energy_charges?.toFixed(2) || '0.00'}</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Demand Charges (kW)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>₹{summaryData?.demand_charges?.toFixed(2) || '0.00'}</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Fixed Charges</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>₹{summaryData?.fixed_charges?.toFixed(2) || '0.00'}</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Taxes & Surcharges</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>₹{summaryData?.tax_amount?.toFixed(2) || '0.00'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BILLS LIST & DETAIL */}
          {activeTab === 'bills' && (
            <div>
              {/* Filter controls */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#888' }} />
                  <input
                    type="text"
                    className="input"
                    placeholder="Search invoice number or utility provider..."
                    value={searchInvoice}
                    onChange={e => setSearchInvoice(e.target.value)}
                    style={{ paddingLeft: '2.25rem' }}
                  />
                </div>
                <select className="input-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '200px' }}>
                  <option value="">All Reconciliation Statuses</option>
                  <option value="MATCHED">MATCHED</option>
                  <option value="VARIANCE">VARIANCE</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>

              {filteredBills.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  <FileText size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <p style={{ fontWeight: 600 }}>No billing data available for this period.</p>
                  <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Enter a utility invoice or click "Generate Demo Data" in management commands.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Facility</th>
                        <th>Utility Provider</th>
                        <th>Billing Period</th>
                        <th>Billed kWh</th>
                        <th>Billed kW</th>
                        <th>Billed Amount</th>
                        <th>Calculated</th>
                        <th>Variance</th>
                        <th>Reconciliation</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBills.map(b => (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{b.invoice_number}</td>
                          <td style={{ fontWeight: 600 }}>{b.facility_name}</td>
                          <td>{b.utility_provider}</td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {b.billing_period_start} to {b.billing_period_end}
                          </td>
                          <td>{(b.billed_consumption_kwh || b.total_consumption_kwh)?.toLocaleString()} kWh</td>
                          <td>{(b.billed_demand_kw || b.peak_demand_kw)} kW</td>
                          <td style={{ fontWeight: 700 }}>
                            ₹{(b.billed_amount || b.total_cost_usd)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ color: 'var(--color-text-muted)' }}>
                            ₹{b.calculated_amount ? Number(b.calculated_amount).toFixed(2) : '--'}
                          </td>
                          <td style={{ color: b.variance_amount > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                            {b.variance_amount ? `₹${Number(b.variance_amount).toFixed(2)}` : '--'}
                          </td>
                          <td>
                            <StatusBadge status={b.reconciliation_status} />
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedBill(b)} title="View Detail">
                                <Eye size={14} />
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={() => handleReconcileBill(b.id)} title="Reconcile">
                                <CheckCircle2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bill Detail Drawer/Modal */}
              {selectedBill && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ width: '600px', background: 'var(--color-bg-card, #1e1e1e)', height: '100%', padding: '2rem', overflowY: 'auto', borderLeft: '1px solid var(--color-border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Bill Details: {selectedBill.invoice_number}</h2>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedBill(null)}>Close</button>
                    </div>

                    <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Facility: <strong>{selectedBill.facility_name}</strong></div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Utility Provider: <strong>{selectedBill.utility_provider}</strong></div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Billing Period: <strong>{selectedBill.billing_period_start} to {selectedBill.billing_period_end}</strong></div>
                      <div style={{ marginTop: '0.5rem' }}><StatusBadge status={selectedBill.reconciliation_status} /></div>
                    </div>

                    {/* Variance Table */}
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Utility Invoice vs Telemetry Calculation</h3>
                    <table className="table" style={{ marginBottom: '1.5rem' }}>
                      <thead>
                        <tr>
                          <th>Metric</th>
                          <th>Utility Invoice</th>
                          <th>Calculated</th>
                          <th>Variance</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Consumption</td>
                          <td>{selectedBill.billed_consumption_kwh || selectedBill.total_consumption_kwh} kWh</td>
                          <td>{selectedBill.calculated_consumption_kwh || '--'} kWh</td>
                          <td>{selectedBill.billed_consumption_kwh && selectedBill.calculated_consumption_kwh ? (selectedBill.billed_consumption_kwh - selectedBill.calculated_consumption_kwh).toFixed(2) : '--'} kWh</td>
                        </tr>
                        <tr>
                          <td>Peak Demand</td>
                          <td>{selectedBill.billed_demand_kw || selectedBill.peak_demand_kw} kW</td>
                          <td>{selectedBill.calculated_demand_kw || '--'} kW</td>
                          <td>{selectedBill.billed_demand_kw && selectedBill.calculated_demand_kw ? (selectedBill.billed_demand_kw - selectedBill.calculated_demand_kw).toFixed(2) : '--'} kW</td>
                        </tr>
                        <tr>
                          <td>Total Cost</td>
                          <td style={{ fontWeight: 700 }}>₹{selectedBill.billed_amount || selectedBill.total_cost_usd}</td>
                          <td style={{ fontWeight: 700 }}>₹{selectedBill.calculated_amount || '--'}</td>
                          <td style={{ fontWeight: 700, color: selectedBill.variance_amount > 0 ? '#ef4444' : '#10b981' }}>
                            ₹{selectedBill.variance_amount || '--'} ({selectedBill.variance_percentage || '0'}%)
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Upload Document / OCR Section */}
                    <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Upload size={16} /> Upload Invoice PDF / Image (OCR)
                      </h4>
                      <form onSubmit={handleUploadDocument}>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={e => setSelectedDocFile(e.target.files[0])}
                          style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}
                        />
                        <br />
                        <button className="btn btn-primary btn-sm" type="submit" disabled={!selectedDocFile || uploadingDoc}>
                          {uploadingDoc ? 'Processing OCR...' : 'Upload & Extract'}
                        </button>
                      </form>

                      {ocrResult && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', fontSize: '0.875rem' }}>
                          <div style={{ fontWeight: 600, color: '#f59e0b', marginBottom: '0.25rem' }}>OCR Status: {ocrResult.status} (Confidence: {ocrResult.overall_confidence * 100}%)</div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{ocrResult.notes}</p>
                          <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem', fontSize: '0.75rem' }}>
                            {Object.entries(ocrResult.extracted_fields || {}).map(([k, v]) => (
                              <li key={k}><strong>{k}:</strong> {v.value || 'Not found'} (conf: {v.confidence})</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button className="btn btn-primary" onClick={() => handleReconcileBill(selectedBill.id)}>
                        <CheckCircle2 size={16} /> Reconcile Bill
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TARIFFS & TOU */}
          {activeTab === 'tariffs' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Active Organization Tariffs</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCreateTariffModal(true)}>
                  <Plus size={14} /> Create Tariff
                </button>
              </div>

              {tariffs.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  <Layers size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <p>No tariff plans configured for this organization.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
                  {tariffs.map(t => (
                    <div key={t.id} className="card" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{t.name}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Utility: {t.utility_name} ({t.currency})</span>
                        </div>
                        <StatusBadge status={t.status} />
                      </div>

                      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                        <div>Fixed Monthly Charge: <strong>₹{t.fixed_monthly_charge}</strong></div>
                        <div>Tax Percentage: <strong>{t.tax_percentage}%</strong></div>
                        <div>Billing Cycle: <strong>{t.billing_cycle}</strong></div>
                      </div>

                      <h5 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Time-of-Use Periods ({t.tou_periods?.length || 0})</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                        {(t.tou_periods || []).map(p => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', fontSize: '0.75rem' }}>
                            <div>
                              <strong>{p.name}</strong> ({p.period_type})<br />
                              <span style={{ color: '#888' }}>{p.start_time} - {p.end_time}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <strong style={{ color: 'var(--color-brand-primary, #00C853)' }}>₹{p.rate}/kWh</strong>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedTariff(t); setShowAddTouModal(true); }}>
                        <Plus size={14} /> Add TOU Period
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DEMAND CHARGES */}
          {activeTab === 'demand' && (
            <div>
              <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={20} style={{ color: '#f59e0b' }} /> Demand Charge Rules & Monthly Peak Metrics
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                  Demand charges are billed based on maximum 15-minute average power demand (kW) during the billing period.
                </p>

                {demandBreakdown ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Peak Demand</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{demandBreakdown.peak_kw} kW</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Demand Threshold</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{demandBreakdown.threshold_kw} kW</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Billable Demand</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{demandBreakdown.billable_kw} kW</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Calculated Demand Charge</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>₹{demandBreakdown.cost}</div>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Select a facility to view active demand charge calculations.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: RECONCILIATION */}
          {activeTab === 'reconciliation' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Utility Invoice Discrepancy & Reconciliation Engine</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Factual verification comparing utility invoice totals against telemetry calculation.</p>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Facility</th>
                      <th>Period</th>
                      <th>Billed Amount</th>
                      <th>Calculated Amount</th>
                      <th>Variance (₹)</th>
                      <th>Variance (%)</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discrepantBills.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                          No discrepant bills found. All invoices matched within tolerance.
                        </td>
                      </tr>
                    ) : (
                      discrepantBills.map(b => (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{b.invoice_number}</td>
                          <td>{b.facility_name}</td>
                          <td style={{ fontSize: '0.75rem' }}>{b.billing_period_start} to {b.billing_period_end}</td>
                          <td style={{ fontWeight: 700 }}>₹{b.billed_amount || b.total_cost_usd}</td>
                          <td>₹{b.calculated_amount || '0.00'}</td>
                          <td style={{ color: '#ef4444', fontWeight: 700 }}>₹{b.variance_amount || '0.00'}</td>
                          <td style={{ color: '#ef4444', fontWeight: 700 }}>{b.variance_percentage || '0'}%</td>
                          <td><StatusBadge status={b.reconciliation_status} /></td>
                          <td>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleReconcileBill(b.id)}>
                              Re-Reconcile
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: COST ANALYSIS */}
          {activeTab === 'analysis' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Facility Energy Cost Intensity</h4>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Facility</th>
                        <th>Total Cost</th>
                        <th>Total kWh</th>
                        <th>₹/kWh</th>
                        <th>₹/sqft</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facilityCosts.map(f => (
                        <tr key={f.facility_id}>
                          <td style={{ fontWeight: 600 }}>{f.facility_name}</td>
                          <td>₹{f.total_cost.toLocaleString()}</td>
                          <td>{f.total_kwh.toLocaleString()}</td>
                          <td>₹{f.cost_per_kwh}</td>
                          <td>₹{f.cost_per_sqft}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Meter Estimated Energy Cost</h4>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Meter</th>
                        <th>Facility</th>
                        <th>kWh</th>
                        <th>Est Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meterCosts.map(m => (
                        <tr key={m.meter_id}>
                          <td style={{ fontWeight: 600 }}>{m.meter_name}</td>
                          <td>{m.facility_name}</td>
                          <td>{m.total_kwh.toLocaleString()}</td>
                          <td>₹{m.estimated_cost.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: TARIFF SCENARIOS */}
          {activeTab === 'scenarios' && (
            <div>
              <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ArrowRightLeft size={20} style={{ color: 'var(--color-brand-primary, #00C853)' }} /> Tariff Scenario Cost Modeling
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
                  Compare factual modeled energy cost for a facility between two configured tariffs.
                </p>

                <form onSubmit={handleRunScenario} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Facility</label>
                    <select
                      className="input-select"
                      value={scenarioForm.facility}
                      onChange={e => setScenarioForm(prev => ({ ...prev, facility: e.target.value }))}
                      required
                    >
                      <option value="">Select Facility</option>
                      {facilities.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Primary Tariff</label>
                    <select
                      className="input-select"
                      value={scenarioForm.primary_tariff}
                      onChange={e => setScenarioForm(prev => ({ ...prev, primary_tariff: e.target.value }))}
                      required
                    >
                      <option value="">Select Tariff 1</option>
                      {tariffs.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Alternative Tariff</label>
                    <select
                      className="input-select"
                      value={scenarioForm.alternative_tariff}
                      onChange={e => setScenarioForm(prev => ({ ...prev, alternative_tariff: e.target.value }))}
                      required
                    >
                      <option value="">Select Tariff 2</option>
                      {tariffs.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <button className="btn btn-primary" type="submit" disabled={scenarioLoading}>
                    {scenarioLoading ? 'Comparing...' : 'Run Scenario Comparison'}
                  </button>
                </form>

                {scenarioResult && (
                  <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Comparison Result</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                      {scenarioResult.variance?.summary}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                        <h5 style={{ fontWeight: 600 }}>{scenarioResult.primary_tariff?.name}</h5>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>₹{scenarioResult.primary_tariff?.total_cost}</div>
                      </div>
                      <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                        <h5 style={{ fontWeight: 600 }}>{scenarioResult.alternative_tariff?.name}</h5>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>₹{scenarioResult.alternative_tariff?.total_cost}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* CREATE BILL MODAL */}
      {showCreateBillModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '500px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Enter Utility Bill</h3>
            <form onSubmit={handleCreateBill}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Facility</label>
                <select className="input-select" value={billForm.facility} onChange={e => setBillForm({ ...billForm, facility: e.target.value })} required>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Utility Provider</label>
                  <input type="text" className="input" value={billForm.utility_provider} onChange={e => setBillForm({ ...billForm, utility_provider: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Invoice Number</label>
                  <input type="text" className="input" value={billForm.invoice_number} onChange={e => setBillForm({ ...billForm, invoice_number: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Period Start</label>
                  <input type="date" className="input" value={billForm.billing_period_start} onChange={e => setBillForm({ ...billForm, billing_period_start: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Period End</label>
                  <input type="date" className="input" value={billForm.billing_period_end} onChange={e => setBillForm({ ...billForm, billing_period_end: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Billed kWh</label>
                  <input type="number" step="0.01" className="input" value={billForm.billed_consumption_kwh} onChange={e => setBillForm({ ...billForm, billed_consumption_kwh: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Billed Peak kW</label>
                  <input type="number" step="0.01" className="input" value={billForm.billed_demand_kw} onChange={e => setBillForm({ ...billForm, billed_demand_kw: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Billed Amount (₹)</label>
                  <input type="number" step="0.01" className="input" value={billForm.billed_amount} onChange={e => setBillForm({ ...billForm, billed_amount: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateBillModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save & Reconcile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TARIFF MODAL */}
      {showCreateTariffModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '500px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Create Tariff Plan</h3>
            <form onSubmit={handleCreateTariff}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Tariff Name</label>
                <input type="text" className="input" value={tariffForm.name} onChange={e => setTariffForm({ ...tariffForm, name: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Utility Name</label>
                  <input type="text" className="input" value={tariffForm.utility_name} onChange={e => setTariffForm({ ...tariffForm, utility_name: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Effective From</label>
                  <input type="date" className="input" value={tariffForm.effective_from} onChange={e => setTariffForm({ ...tariffForm, effective_from: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Fixed Monthly Charge (₹)</label>
                  <input type="number" step="0.01" className="input" value={tariffForm.fixed_monthly_charge} onChange={e => setTariffForm({ ...tariffForm, fixed_monthly_charge: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Tax Percentage (%)</label>
                  <input type="number" step="0.01" className="input" value={tariffForm.tax_percentage} onChange={e => setTariffForm({ ...tariffForm, tax_percentage: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateTariffModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Tariff</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD TOU PERIOD MODAL */}
      {showAddTouModal && selectedTariff && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '480px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Add TOU Period to {selectedTariff.name}</h3>
            <form onSubmit={handleAddTouPeriod}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Period Name</label>
                <input type="text" className="input" value={touForm.name} onChange={e => setTouForm({ ...touForm, name: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Type</label>
                  <select className="input-select" value={touForm.period_type} onChange={e => setTouForm({ ...touForm, period_type: e.target.value })}>
                    <option value="OFF_PEAK">OFF_PEAK</option>
                    <option value="SHOULDER">SHOULDER</option>
                    <option value="ON_PEAK">ON_PEAK</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Rate (₹/kWh)</label>
                  <input type="number" step="0.0001" className="input" value={touForm.rate} onChange={e => setTouForm({ ...touForm, rate: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Start Time</label>
                  <input type="time" className="input" value={touForm.start_time} onChange={e => setTouForm({ ...touForm, start_time: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>End Time</label>
                  <input type="time" className="input" value={touForm.end_time} onChange={e => setTouForm({ ...touForm, end_time: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddTouModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add TOU Period</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
