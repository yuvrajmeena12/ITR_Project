import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useAsync';
import OtpForm from '../components/OtpForm';
import { Icon } from '../components/ui';

export default function VerifyEmail() {
  useDocumentTitle('Verify Your Email');
  const { state } = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const toast = useToast();

  if (!state || !state.email) return <Navigate to="/register" replace />;

  const verify = async (otp) => {
    const { data } = await api.post('/auth/verify-email', { email: state.email, otp });
    setUser(data.user);
    toast.success('Email confirmed. Welcome to SkillSwap!');
    navigate('/skills', { replace: true, state: { welcome: true } });
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
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              boxShadow: 'var(--shadow-glow-success)',
            }}
          >
            <Icon name="check" size={22} />
          </div>
          <h1>Verify Your Email</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            Enter the confirmation code to activate your account.
          </p>
        </div>

        <OtpForm
          email={state.email}
          purpose="signup"
          initialCooldown={state.resendInSec ?? 60}
          initialDevOtp={state.devOtp}
          submitLabel="Verify & Enter SkillSwap"
          onVerify={verify}
          onBack={() => navigate('/register')}
        />

        <div className="divider">or</div>

        <p className="small center muted">
          Entered the wrong email?{' '}
          <Link to="/login" style={{ fontWeight: 650 }}>
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
