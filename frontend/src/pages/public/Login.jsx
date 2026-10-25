import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../../components/common/BrandLogo';

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoNotice, setInfoNotice] = useState('');

  const googleBtnContainerRef = useRef(null);
  const gsiInitializedRef = useRef(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const from = location.state?.from?.pathname || '/app';

  const [pendingGoogleCredential, setPendingGoogleCredential] = useState(null);
  const [newOrgName, setNewOrgName] = useState('');

  // Initialize Google Identity Services (GIS)
  useEffect(() => {
    // If Google Client ID is configured, load and initialize GIS SDK
    if (!googleClientId) return;

    let isMounted = true;

    const handleGoogleCredentialResponse = async (response) => {
      if (!response || !response.credential) {
        setError('No credential received from Google authentication.');
        return;
      }

      setGoogleLoading(true);
      setError('');
      setInfoNotice('');

      try {
        await loginWithGoogle(response.credential, null, null, true);
        if (isMounted) {
          navigate(from, { replace: true });
        }
      } catch (err) {
        if (isMounted) {
          const errMsg = err.message || '';
          if (err.code === 'UNAUTHORIZED_ORGANIZATION' || errMsg.includes('No GreenGrid organization account found')) {
            setPendingGoogleCredential(response.credential);
            setInfoNotice('Google identity verified! Since this is your first time signing in, enter your organization name below to create your workspace.');
          } else {
            setError(errMsg || 'Google authentication failed. Please try again.');
          }
        }
      } finally {
        if (isMounted) {
          setGoogleLoading(false);
        }
      }
    };

    const initializeGsi = () => {
      if (!window.google?.accounts?.id) return;

      try {
        if (!gsiInitializedRef.current) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          gsiInitializedRef.current = true;
        }

        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(
            googleBtnContainerRef.current,
            {
              theme: 'outline',
              size: 'large',
              type: 'standard',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 368,
            }
          );
        }
      } catch (e) {
        console.warn('Google Identity Services initialization notice:', e);
      }
    };

    // Load GIS script if not present
    if (!window.google?.accounts?.id) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGsi;
      document.body.appendChild(script);
    } else {
      initializeGsi();
    }

    return () => {
      isMounted = false;
    };
  }, [googleClientId, loginWithGoogle, navigate, from]);

  // Primary Google button click handler
  const handlePrimaryGoogleClick = () => {
    if (!googleClientId) {
      setInfoNotice(
        'Google OAuth Client ID is not configured yet. Add VITE_GOOGLE_CLIENT_ID to your frontend/.env and backend/.env to connect Google Cloud OAuth. You can use email and password sign-in below in the meantime.'
      );
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // If One Tap prompt cannot display (e.g. 3rd-party cookie restriction or dismissed), trigger container click
          const renderedBtn = googleBtnContainerRef.current?.querySelector('div[role="button"]');
          if (renderedBtn) {
            renderedBtn.click();
          }
        }
      });
    } else {
      setError('Google Identity Services is initializing. Please wait a moment and try again.');
    }
  };

  // Secondary email/password submit handler
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfoNotice('');

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials provided.');
    } finally {
      setLoading(false);
    }
  };

  // Complete Google Registration for first-time Google sign-ins
  const handleCompleteGoogleRegistration = async (e) => {
    e.preventDefault();
    if (!pendingGoogleCredential || !newOrgName.trim()) return;

    setGoogleLoading(true);
    setError('');
    setInfoNotice('');

    try {
      await loginWithGoogle(pendingGoogleCredential, newOrgName.trim());
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to initialize workspace with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 70px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1.5rem',
        background: 'var(--color-bg-main)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Brand & Welcome Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <BrandLogo height="52px" showText={true} textColor="var(--color-text-primary)" textSize="1.75rem" textWeight={800} />
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.025em',
              marginBottom: '0.375rem',
            }}
          >
            Welcome back
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            Sign in to your energy management workspace.
          </p>
        </div>

        {/* Authentication Card */}
        <div
          className="card"
          style={{
            padding: '2.25rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
            borderRadius: 'var(--radius-lg, 12px)',
          }}
        >
          {/* Error Banner */}
          {error && (
            <div
              style={{
                background: 'var(--color-danger-red-bg, #fef2f2)',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '0.875rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.625rem',
                fontSize: '0.8125rem',
                color: 'var(--color-danger-red, #dc2626)',
                lineHeight: 1.45,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          {/* Informational Setup Notice */}
          {infoNotice && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '0.875rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.625rem',
                fontSize: '0.8125rem',
                color: '#15803d',
                lineHeight: 1.45,
              }}
            >
              <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{infoNotice}</span>
            </div>
          )}

          {/* PRIMARY OPTION: Continue with Google (Single Element) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {googleClientId ? (
              <div
                ref={googleBtnContainerRef}
                id="google-signin-btn-container"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  width: '100%',
                  minHeight: '44px',
                }}
              />
            ) : (
              <button
                id="btn-continue-with-google"
                type="button"
                disabled={googleLoading || loading}
                onClick={handlePrimaryGoogleClick}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.25rem',
                  background: '#ffffff',
                  border: '1px solid #dadce0',
                  borderRadius: 'var(--radius-md, 8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.875rem',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: '#3c4043',
                  cursor: googleLoading ? 'wait' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(60, 64, 67, 0.08), 0 1px 2px rgba(60, 64, 67, 0.16)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{googleLoading ? 'Authenticating with Google...' : 'Continue with Google'}</span>
              </button>
            )}

            {/* New User Google Workspace Setup Prompt */}
            {pendingGoogleCredential && (
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '1.25rem',
                  background: 'var(--color-bg-subtle, #f8fafc)',
                  border: '1px solid var(--color-brand-primary, #00C853)',
                  borderRadius: 'var(--radius-md, 8px)',
                  boxShadow: '0 4px 12px rgba(0, 200, 83, 0.08)',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#15803d', fontWeight: 700, fontSize: '0.875rem' }}>
                  <ShieldCheck size={18} />
                  <span>Google Account Verified!</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted, #64748b)', marginBottom: '0.875rem', lineHeight: 1.45 }}>
                  First time signing in with Google? Name your energy workspace to complete setup:
                </p>
                <form onSubmit={handleCompleteGoogleRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Clean Energy"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      border: '1px solid var(--color-border, #cbd5e1)',
                      borderRadius: 'var(--radius-md, 6px)',
                      fontSize: '0.875rem',
                      background: '#ffffff',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="submit"
                      disabled={googleLoading || !newOrgName.trim()}
                      className="btn btn-primary btn-sm"
                      style={{
                        flex: 1,
                        padding: '0.625rem 1rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {googleLoading ? 'Creating Workspace...' : 'Create Workspace & Sign In'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingGoogleCredential(null);
                        setInfoNotice('');
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.625rem 0.75rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* DIVIDER: OR */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '1.5rem 0',
              color: 'var(--color-text-muted, #64748b)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border, #e2e8f0)' }} />
            <span style={{ padding: '0 1rem' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border, #e2e8f0)' }} />
          </div>

          {/* WORK ACCOUNT EMAIL & PASSWORD FORM (Directly Visible) */}
          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.375rem',
                }}
              >
                Work Email Address or Username
              </label>
              <input
                id="input-login-email"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '0.75rem', color: 'var(--color-primary, #059669)', fontWeight: 500 }}
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="input-login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                padding: '0.75rem',
                justifyContent: 'center',
                width: '100%',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              {loading ? 'Authenticating credentials...' : (
                <>
                  <LogIn size={16} />
                  Sign in to Application
                </>
              )}
            </button>
          </form>

          {/* Registration Footer */}
          <div
            style={{
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--color-border, #e2e8f0)',
              textAlign: 'center',
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted, #64748b)',
            }}
          >
            Need an organization account?{' '}
            <Link to="/register" style={{ color: 'var(--color-primary, #059669)', fontWeight: 600 }}>
              Create Organization Account
            </Link>
          </div>
        </div>

        {/* Security & Compliance Links */}
        <div
          style={{
            marginTop: '1.5rem',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
          }}
        >
          <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>
            Terms of Service
          </Link>
          <span>•</span>
          <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
