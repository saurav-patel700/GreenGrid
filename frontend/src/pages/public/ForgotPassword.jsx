import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { forgotPasswordApi } from '../../services/api';
import BrandLogo from '../../components/common/BrandLogo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPasswordApi(email);
      setSubmitted(true);
    } catch (err) {
      setSubmitted(true); // Security: do not reveal email status
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 70px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', background: 'var(--color-bg-main)' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <BrandLogo height="52px" showText={true} textColor="var(--color-text-primary)" textSize="1.75rem" textWeight={800} />
          </div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            Reset Password
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Enter your work email address to receive password recovery instructions.
          </p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <CheckCircle2 size={40} color="var(--color-energy-green)" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Instructions Dispatched</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                If an account exists for <strong>{email}</strong>, a password reset link has been dispatched via the email abstraction service.
              </p>
              <Link to="/login" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                <ArrowLeft size={16} />
                Return to Sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.375rem' }}>
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@organization.com"
                  style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}
                />
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0.75rem', justifyContent: 'center', width: '100%' }}>
                {loading ? 'Sending Request...' : 'Send Password Reset Link'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <Link to="/login" style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  <ArrowLeft size={14} /> Back to Sign in
                </Link>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
