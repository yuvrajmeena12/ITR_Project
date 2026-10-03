import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { apiError } from '../api/axios';
import { useDocumentTitle } from '../hooks/useAsync';
import { Button, Field, Icon, PasswordField } from '../components/ui';

const validateForm = (f) => {
  const e = {};
  if (!f.name || f.name.trim().length < 2) {
    e.name = 'Please enter your full name (at least 2 letters)';
  }
  if (!f.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) {
    e.email = 'Please enter a valid email address';
  }
  const cleanPhone = f.phone.replace(/[\s\-().]/g, '');
  if (!cleanPhone || !/^\+?[0-9]{7,15}$/.test(cleanPhone)) {
    e.phone = 'Please enter a valid phone number (7-15 digits)';
  }
  if (!f.password || f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/[0-9]/.test(f.password)) {
    e.password = 'Must be 8+ characters and contain both letters and numbers';
  }
  if (f.confirmPassword !== f.password) {
    e.confirmPassword = 'Passwords do not match';
  }
  return e;
};

export default function Register() {
  useDocumentTitle('Create Account');
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');

  const set = (k) => (e) => {
    const next = { ...form, [k]: e.target.value };
    setForm(next);
    if (touched[k] || errors[k]) {
      setErrors(validateForm(next));
    }
  };

  const blur = (k) => () => {
    setTouched((t) => ({ ...t, [k]: true }));
    setErrors(validateForm(form));
  };

  const showErr = (k) => (touched[k] || errors._submitted ? errors[k] : undefined);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const v = validateForm(form);
    if (Object.keys(v).length) {
      setErrors({ ...v, _submitted: true });
      return;
    }
    setBusy(true);
    setServerError('');
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      navigate('/verify-email', {
        state: { email: data.email, resendInSec: data.resendInSec, devOtp: data.devOtp },
        replace: true,
      });
    } catch (err) {
      const e2 = apiError(err);
      setServerError(e2.message);
      setErrors({ ...(e2.fields || {}), _submitted: true });
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
          <h1>Join SkillSwap</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            Create your account to start offering and learning skills.
          </p>
        </div>

        <form className="stack" onSubmit={submit} noValidate>
          <Field
            label="Full Name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            value={form.name}
            onChange={set('name')}
            onBlur={blur('name')}
            error={showErr('name')}
            maxLength={60}
          />

          <Field
            label="Email Address"
            type="email"
            autoComplete="email"
            placeholder="ada@example.com"
            value={form.email}
            onChange={set('email')}
            onBlur={blur('email')}
            error={showErr('email')}
            maxLength={254}
          />

          <Field
            label="Phone Number"
            type="tel"
            autoComplete="tel"
            placeholder="+1 555 123 4567"
            value={form.phone}
            onChange={set('phone')}
            onBlur={blur('phone')}
            error={showErr('phone')}
            help="Used for urgent swap/session schedule alerts."
            maxLength={24}
          />

          <PasswordField
            label="Create Password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={set('password')}
            onBlur={blur('password')}
            error={showErr('password')}
            showStrength
            maxLength={72}
          />

          <PasswordField
            label="Confirm Password"
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            onBlur={blur('confirmPassword')}
            error={showErr('confirmPassword')}
            maxLength={72}
          />

          {serverError && (
            <div className="alert alert-error" role="alert">
              <Icon name="alert" size={18} />
              <span>{serverError}</span>
            </div>
          )}

          <Button type="submit" size="lg" loading={busy} className="btn-block">
            Create Free Account
          </Button>
        </form>

        <div className="divider">or</div>

        <p className="small center muted">
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 700 }}>
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
