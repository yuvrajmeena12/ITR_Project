import { useState } from 'react';
import api, { apiError } from '../api/axios';
import { useCountdown } from '../hooks/useAsync';
import { Button, Field, Icon } from './ui';

/** 6-digit code entry with resend cooldown. onVerify(code) must return a promise. */
export default function OtpForm({ email, purpose, initialCooldown = 60, initialDevOtp, submitLabel = 'Verify Code', onVerify, onBack }) {
  const [code, setCode] = useState(initialDevOtp || '');
  const [devOtp, setDevOtp] = useState(initialDevOtp || '');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [left, setLeft] = useCountdown(initialCooldown);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!/^\d{6}$/.test(code)) {
      setError('Please enter the complete 6-digit verification code');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onVerify(code);
    } catch (err) {
      setError(apiError(err).message);
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resending || left > 0) return;
    setResending(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.post('/auth/resend-otp', { email, purpose });
      setLeft(data.resendInSec || 60);
      if (data.devOtp) setDevOtp(data.devOtp);
      setNotice('A fresh verification code has been dispatched to your inbox.');
      setCode(data.devOtp || '');
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setResending(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <div
        style={{
          background: 'var(--surface-2)',
          padding: '14px 16px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--line-subtle)',
          textAlign: 'center',
        }}
      >
        <span className="muted small">We sent a 6-digit security code to:</span>
        <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.96rem', marginTop: 2 }}>{email}</div>
      </div>

      {devOtp && (
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
            <Icon name="spark" size={16} />
            <span>Dev code: <strong style={{ letterSpacing: '2px', fontFamily: 'monospace', color: 'var(--primary-light)' }}>{devOtp}</strong></span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { setCode(devOtp); setError(''); }}
            style={{ fontSize: '0.8rem', padding: '4px 8px', height: 'auto' }}
          >
            Fill Code
          </button>
        </div>
      )}

      <Field
        label="Enter 6-Digit Code"
        className="otp-field"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, '').slice(0, 6);
          setCode(next);
          if (error) setError('');
        }}
        placeholder="••••••"
        error={error}
        autoFocus
        style={{
          textAlign: 'center',
          letterSpacing: '0.5em',
          fontSize: '1.6rem',
          fontWeight: 800,
          fontFamily: 'monospace',
          paddingLeft: '0.5em',
        }}
      />

      {notice && (
        <div className="alert alert-success" role="status">
          <Icon name="check" size={17} />
          <span>{notice}</span>
        </div>
      )}

      <Button type="submit" size="lg" loading={busy} className="btn-block">
        {submitLabel}
      </Button>

      <div className="row spread" style={{ marginTop: 6 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={resend}
          disabled={left > 0 || resending}
        >
          {resending ? 'Sending…' : left > 0 ? `Resend code in ${left}s` : 'Resend code'}
        </button>
        {onBack && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
            Change email
          </button>
        )}
      </div>
    </form>
  );
}
