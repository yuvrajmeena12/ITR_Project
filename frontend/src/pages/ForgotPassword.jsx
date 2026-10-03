import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { apiError } from '../api/axios';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useAsync';
import OtpForm from '../components/OtpForm';
import { Button, Field, Icon, PasswordField } from '../components/ui';

export default function ForgotPassword() {
  useDocumentTitle('Reset Password');
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'password'
  const [email, setEmail] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const [devOtp, setDevOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [pw, setPw] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const requestCode = async (e) => {
    e.preventDefault();
    if (busy) return;
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
      setErrors({ email: 'Please enter a valid registered email address' });
      return;
    }
    setBusy(true);
    setErrors({});
    setServerError('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email: clean });
      setEmail(clean);
      setCooldown(data.resendInSec || 60);
      if (data.devOtp) setDevOtp(data.devOtp);
      setStep('otp');
    } catch (err) {
      setServerError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (otp) => {
    const { data } = await api.post('/auth/forgot-password/verify', { email, otp });
    setResetToken(data.resetToken);
    setStep('password');
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (busy) return;
    const v = {};
    if (pw.password.length < 8 || !/[A-Za-z]/.test(pw.password) || !/[0-9]/.test(pw.password)) {
      v.password = 'Must be 8+ characters and contain both letters and numbers';
    }
    if (pw.password !== pw.confirmPassword) {
      v.confirmPassword = 'Passwords do not match';
    }
    setErrors(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    setServerError('');
    try {
      await api.post('/auth/reset-password', { email, resetToken, ...pw });
      toast.success('Your password has been successfully updated. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      const e2 = apiError(err);
      setServerError(e2.message);
      setErrors(e2.fields || {});
      setBusy(false);
    }
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
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
            }}
          >
            <Icon name="shield" size={22} />
          </div>
          <h1>
            {step === 'email' && 'Reset Password'}
            {step === 'otp' && 'Verify Identity'}
            {step === 'password' && 'Create New Password'}
          </h1>
          <p className="muted" style={{ marginTop: 4 }}>
            {step === 'email' && "Enter your registered email and we'll send a one-time reset code."}
            {step === 'otp' && 'Enter the 6-digit security code sent to your inbox.'}
            {step === 'password' && 'Choose a strong new password for your SkillSwap account.'}
          </p>
        </div>

        {step === 'email' && (
          <form className="stack" onSubmit={requestCode} noValidate>
            <Field
              label="Account Email Address"
              type="email"
              autoComplete="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({});
              }}
              error={errors.email}
              autoFocus
              maxLength={254}
            />

            {serverError && (
              <div className="alert alert-error" role="alert">
                <Icon name="alert" size={18} />
                <span>{serverError}</span>
              </div>
            )}

            <Button type="submit" size="lg" loading={busy} className="btn-block">
              Send Verification Code
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <OtpForm
            email={email}
            purpose="reset"
            initialCooldown={cooldown}
            initialDevOtp={devOtp}
            submitLabel="Confirm Code"
            onVerify={verifyCode}
            onBack={() => setStep('email')}
          />
        )}

        {step === 'password' && (
          <form className="stack" onSubmit={savePassword} noValidate>
            <PasswordField
              label="New Password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={pw.password}
              onChange={(e) => {
                setPw({ ...pw, password: e.target.value });
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              error={errors.password}
              showStrength
              maxLength={72}
              autoFocus
            />

            <PasswordField
              label="Confirm New Password"
              autoComplete="new-password"
              placeholder="Re-enter new password"
              value={pw.confirmPassword}
              onChange={(e) => {
                setPw({ ...pw, confirmPassword: e.target.value });
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
              }}
              error={errors.confirmPassword}
              maxLength={72}
            />

            {serverError && (
              <div className="alert alert-error" role="alert">
                <Icon name="alert" size={18} />
                <span>{serverError}</span>
              </div>
            )}

            <Button type="submit" size="lg" loading={busy} className="btn-block">
              Save New Password
            </Button>
          </form>
        )}

        <div className="divider">or</div>

        <p className="small center muted">
          Remember your password?{' '}
          <Link to="/login" style={{ fontWeight: 650 }}>
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
