import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Building2, Globe, Gauge } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateOrganizationApi } from '../../services/api';
import BrandLogo from '../../components/common/BrandLogo';

export default function Onboarding() {
  const { organization, refreshOrg } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR');
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState('commercial');
  const [sqft, setSqft] = useState('50000');
  const [submitting, setSubmitting] = useState(false);

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateOrganizationApi({ timezone, currency });
      refreshOrg();
      setStep(2);
    } catch (err) {
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    navigate('/app', { replace: true });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-main)', padding: '2rem 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <BrandLogo height="52px" showText={true} textColor="var(--color-text-primary)" textSize="1.75rem" textWeight={800} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            Welcome to GreenGrid!
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Let's configure your organization preferences for <strong>{organization?.name || 'your team'}</strong>.
          </p>
        </div>

        {/* Step Wizard Container */}
        <div className="card" style={{ padding: '2.25rem' }}>
          
          {/* Progress Indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: step >= 1 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: step >= 1 ? 'var(--color-primary)' : 'var(--color-bg-subtle)', color: step >= 1 ? '#ffffff' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>1</span>
              Localization
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: step >= 2 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: step >= 2 ? 'var(--color-primary)' : 'var(--color-bg-subtle)', color: step >= 2 ? '#ffffff' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>2</span>
              First Facility
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: step >= 3 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: step >= 3 ? 'var(--color-primary)' : 'var(--color-bg-subtle)', color: step >= 3 ? '#ffffff' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>3</span>
              Complete
            </div>
          </div>

          {step === 1 && (
            <form onSubmit={handleStep1Submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Step 1: Set Organization Units & Timezone
              </h3>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Primary Facility Timezone</label>
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', background: '#ffffff' }}>
                  <option value="America/Chicago">America/Chicago (Central)</option>
                  <option value="America/New_York">America/New_York (Eastern)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (Pacific)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Utility Billing Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', background: '#ffffff' }}>
                  <option value="INR">INR (₹ Indian Rupee)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (€ Euro)</option>
                  <option value="GBP">GBP (£ British Pound)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <button type="button" onClick={() => setStep(2)} className="btn btn-secondary btn-sm">Skip for now</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  Continue to Facility Setup
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Step 2: Confirm Primary Operating Facility
              </h3>

              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                A default primary facility profile has been created for <strong>{organization?.name}</strong>. You can customize building parameters or add additional submeters from the main dashboard shell.
              </p>

              <div style={{ background: 'var(--color-bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>
                  {organization?.name} Primary Facility
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  Type: Commercial Building | Location: Austin, TX | Area: 75,000 sqft
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <button type="button" onClick={() => setStep(1)} className="btn btn-secondary btn-sm">Back</button>
                <button type="button" onClick={() => setStep(3)} className="btn btn-primary">
                  Confirm & Continue
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <CheckCircle2 size={48} color="var(--color-energy-green)" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.5rem' }}>Configuration Complete!</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '420px', margin: '0 auto 2rem auto' }}>
                Your GreenGrid EMIS platform is initialized and ready for real-time telemetry, meter monitoring, and utility billing audit.
              </p>

              <button onClick={handleFinish} className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem', width: '100%', justifyContent: 'center' }}>
                Enter Dashboard Shell
                <ArrowRight size={18} />
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
