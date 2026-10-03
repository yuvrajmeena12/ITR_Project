import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import api, { apiError } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useAsync';
import OtpForm from '../components/OtpForm';
import { Button, Field, Icon, PasswordField } from '../components/ui';

export default function Login() {
  useDocumentTitle('Log In');
  const { user, setUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state && location.state.from) || '/dashboard';

  const [mode, setMode] = useState('password'); // 'password' | 'otp'
  const [otpStep, setOtpStep] = useState(null); // null | { email, resendInSec }
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={redirectTo} replace />;

  const validate = (needPassword) => {
    const e = {};
    const emailTrim = form.email.trim();
    if (!emailTrim) {
      e.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailTrim)) {
      e.email = 'Please enter a valid email address';
    }
    if (needPassword && !form.password) {
      e.password = 'Password is required to sign in';
    }
    return e;
  };

  const loginWithPassword = async (e) => {
    e.preventDefault();
    if (busy) return;
    const v = validate(true);
    setErrors(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    setServerError('');
    try {
      const { data } = await api.post('/auth/login', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      setUser(data.user);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const e2 = apiError(err);
      if (e2.code === 'EMAIL_NOT_VERIFIED') {
        navigate('/verify-email', {
          state: {
            email: e2.extra?.email || form.email.trim(),
            resendInSec: e2.extra?.resendInSec,
            devOtp: e2.extra?.devOtp,
          },
        });
        return;
      }
      setServerError(e2.message);
      setBusy(false);
    }
  };

  const requestOtp = async (e) => {
    e.preventDefault();
    if (busy) return;
    const v = validate(false);
    setErrors(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    setServerError('');
    try {
      const email = form.email.trim().toLowerCase();
      const { data } = await api.post('/auth/login-otp/request', { email });
      setOtpStep({ email, resendInSec: data.resendInSec, devOtp: data.devOtp });
    } catch (err) {
      setServerError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const verifyLoginOtp = async (otp) => {
    const { data } = await api.post('/auth/login-otp/verify', { email: otpStep.email, otp });
    setUser(data.user);
    navigate(redirectTo, { replace: true });
  };

  const switchMode = (m) => {
    setMode(m);
    setErrors({});
    setServerError('');
    setOtpStep(null);
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card stack fade-in">
        <div className="center">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'var(--brand-gradient)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Icon name="swap" size={24} />
          </div>
          <h1>Welcome back</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            Sign in to access your skills, matches, and swaps.
          </p>
        </div>

        {!otpStep && (
          <div className="seg" role="tablist" aria-label="Login method" style={{ alignSelf: 'stretch' }}>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'password'}
              style={{ flex: 1 }}
              onClick={() => switchMode('password')}
            >
              Password
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'otp'}
              style={{ flex: 1 }}
              onClick={() => switchMode('otp')}
            >
              Email One-Time Code
            </button>
          </div>
        )}

        {otpStep ? (
          <OtpForm
            email={otpStep.email}
            purpose="login"
            initialCooldown={otpStep.resendInSec}
            initialDevOtp={otpStep.devOtp}
            submitLabel="Sign in with Code"
            onVerify={verifyLoginOtp}
            onBack={() => setOtpStep(null)}
          />
        ) : mode === 'password' ? (
          <form className="stack" onSubmit={loginWithPassword} noValidate>
            <Field
              label="Email Address"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              error={errors.email}
              placeholder="you@domain.com"
              maxLength={254}
              autoFocus
            />

            <PasswordField
              label="Password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              error={errors.password}
              placeholder="••••••••"
              maxLength={72}
            />

            <div className="row spread" style={{ marginTop: -4 }}>
              <span />
              <Link to="/forgot-password" className="small" style={{ fontWeight: 600 }}>
                Forgot password?
              </Link>
            </div>

            {serverError && (
              <div className="alert alert-error" role="alert">
                <Icon name="alert" size={18} />
                <span>{serverError}</span>
              </div>
            )}

            <Button type="submit" size="lg" loading={busy} className="btn-block">
              Sign In
            </Button>
          </form>
        ) : (
          <form className="stack" onSubmit={requestOtp} noValidate>
            <Field
              label="Email Address"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              error={errors.email}
              help="We will send a 6-digit code to this email. No password needed."
              placeholder="you@domain.com"
              maxLength={254}
              autoFocus
            />

            {serverError && (
              <div className="alert alert-error" role="alert">
                <Icon name="alert" size={18} />
                <span>{serverError}</span>
              </div>
            )}

            <Button type="submit" size="lg" loading={busy} className="btn-block">
              Send One-Time Code
            </Button>
          </form>
        )}

        <div className="divider">or</div>

        <p className="small center muted">
          New to SkillSwap?{' '}
          <Link to="/register" style={{ fontWeight: 700 }}>
            Create an account for free
          </Link>
        </p>
      </div>
    </div>
  );
}
