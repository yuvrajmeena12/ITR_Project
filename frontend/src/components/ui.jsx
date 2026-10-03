import { useId, useState } from 'react';
import { initials } from '../utils/format';

export const PATHS = {
  swap: 'M7 7h11l-3-3M17 17H6l3 3',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  bell: 'M18 9a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10.3 21a2 2 0 0 0 3.4 0',
  user: 'M20 21a8 8 0 0 0-16 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 13l4 4L19 7',
  search: 'M21 21l-4.3-4.3M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z',
  plus: 'M12 5v14M5 12h14',
  doc: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5',
  calendar: 'M8 3v4M16 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  spark: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  inbox: 'M3 13l3-8h12l3 8M3 13v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6M3 13h5l1 3h6l1-3h5',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  trend: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  award: 'M12 15c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zM8.21 13.89L7 23l5-3 5 3-1.21-9.12',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  eyeOff: 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
};

export function Icon({ name, size = 20, className = '' }) {
  const path = PATHS[name] || PATHS.spark;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export function Spinner({ large = false, label = 'Loading' }) {
  return <span className={`spinner${large ? ' spinner-lg' : ''}`} role="status" aria-label={label} />;
}

export function Button({ loading = false, children, className = '', variant = 'primary', size, disabled, ...rest }) {
  const cls = `btn btn-${variant}${size ? ` btn-${size}` : ''} ${className}`.trim();
  return (
    <button className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Spinner label="Working" />}
      {children}
    </button>
  );
}

export function Avatar({ user, size = '', className = '' }) {
  const [failed, setFailed] = useState(false);
  const name = (user && user.name) || '';
  const cls = `avatar ${size ? `avatar-${size}` : ''} ${className}`.trim();
  if (user && user.hasAvatar && user.id && !failed) {
    return (
      <img
        className={cls}
        src={`/api/users/${user.id}/avatar`}
        alt={name ? `${name}'s photo` : ''}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className={cls} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function VerifiedBadge({ className = '' }) {
  return (
    <span className={`verified ${className}`.trim()} title="Earned through 5 completed, rated swaps">
      <Icon name="check" size={13} /> Verified
    </span>
  );
}

export function ProgressRing({ progress = 0, size = 52, stroke = 4, className = '' }) {
  const normalizedRadius = (size - stroke * 2) / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <div className={`progress-ring-wrap ${className}`.trim()} style={{ width: size, height: size }}>
      <svg height={size} width={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          stroke="var(--surface-2)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke="var(--primary)"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.6s ease' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="progress-ring-label">{Math.round(progress)}%</span>
    </div>
  );
}

export function ProgressBar({ value = 0, max = 100, label, showPercent = false, className = '' }) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  return (
    <div className={`stack-sm ${className}`.trim()}>
      {(label || showPercent) && (
        <div className="row spread small">
          {label && <span className="muted font-medium">{label}</span>}
          {showPercent && <span style={{ fontWeight: 700 }}>{pct}%</span>}
        </div>
      )}
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Skeleton({ h = 16, w = '100%', r = '8px' }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r }} aria-hidden="true" />;
}

export function CardSkeletons({ count = 6 }) {
  return (
    <div className="grid grid-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div className="card stack" key={i}>
          <div className="row">
            <Skeleton h={44} w={44} r="50%" />
            <div className="grow stack-sm">
              <Skeleton h={15} w="65%" />
              <Skeleton h={12} w="40%" />
            </div>
          </div>
          <Skeleton h={20} w="75%" />
          <Skeleton h={14} w="90%" />
          <Skeleton h={14} w="60%" />
          <div className="row" style={{ marginTop: 'auto', paddingTop: 10 }}>
            <Skeleton h={36} w="50%" />
            <Skeleton h={36} w="50%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div className="card row" key={i}>
          <Skeleton h={42} w={42} r="50%" />
          <div className="grow stack-sm">
            <Skeleton h={15} w="45%" />
            <Skeleton h={12} w="70%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, children, action }) {
  return (
    <div className="state card fade-in">
      <div className="state-icon">
        <Icon name={icon} size={28} />
      </div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "We couldn't load this" }) {
  return (
    <div className="state card fade-in" role="alert">
      <div className="state-icon err">
        <Icon name="alert" size={28} />
      </div>
      <h3>{title}</h3>
      <p>{(error && error.message) || 'Something went wrong. Please try again.'}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => onRetry()}>
          Try again
        </button>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="row-wrap">{children}</div>}
    </div>
  );
}

/** Form control with helper, validation states, and accessible errors */
export function Field({ label, error, help, as = 'input', children, className = '', ...rest }) {
  const id = useId();
  const describedBy = [error ? `${id}-err` : null, help ? `${id}-help` : null].filter(Boolean).join(' ') || undefined;
  const common = { id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy, ...rest };
  let control;
  if (as === 'textarea') control = <textarea className="textarea" {...common} />;
  else if (as === 'select') control = <select className="select" {...common}>{children}</select>;
  else control = <input className="input" {...common} />;

  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`.trim()}>
      {label && <label htmlFor={id}>{label}</label>}
      {control}
      {help && !error && <span id={`${id}-help`} className="help">{help}</span>}
      {error && (
        <span id={`${id}-err`} className="error-text">
          <Icon name="alert" size={14} /> {error}
        </span>
      )}
    </div>
  );
}

export function PasswordField({ label = 'Password', error, help, showStrength = false, value = '', ...rest }) {
  const id = useId();
  const [show, setShow] = useState(false);
  const describedBy = [error ? `${id}-err` : null, help ? `${id}-help` : null].filter(Boolean).join(' ') || undefined;

  // Real-time password strength calculation
  let strength = 0;
  if (value.length >= 8) strength++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) strength++;
  if (/\d/.test(value)) strength++;
  if (/[^A-Za-z0-9]/.test(value)) strength++;

  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input
          id={id}
          className="input"
          type={show ? 'text' : 'password'}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          value={value}
          {...rest}
        />
        <button
          type="button"
          className="input-toggle"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          <Icon name={show ? 'eyeOff' : 'eye'} size={16} />
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="pw-strength-bar" title={`Password strength: ${strength}/4`}>
          <div className={`pw-strength-segment ${strength >= 1 ? (strength === 1 ? 'pw-strength-weak' : strength === 2 ? 'pw-strength-fair' : 'pw-strength-strong') : ''}`} />
          <div className={`pw-strength-segment ${strength >= 2 ? (strength === 2 ? 'pw-strength-fair' : 'pw-strength-strong') : ''}`} />
          <div className={`pw-strength-segment ${strength >= 3 ? 'pw-strength-strong' : ''}`} />
          <div className={`pw-strength-segment ${strength >= 4 ? 'pw-strength-strong' : ''}`} />
        </div>
      )}

      {help && !error && <span id={`${id}-help`} className="help">{help}</span>}
      {error && (
        <span id={`${id}-err`} className="error-text">
          <Icon name="alert" size={14} /> {error}
        </span>
      )}
    </div>
  );
}
