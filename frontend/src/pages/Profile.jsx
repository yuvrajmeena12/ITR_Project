import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useAsync';
import SkillManager from '../components/SkillManager';
import { Avatar, Button, Field, Icon, PageHeader, PasswordField, VerifiedBadge } from '../components/ui';

const splitList = (s) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

function AvatarEditor() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  const upload = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Photo size must be 5 MB or smaller');
    if (!/\.(png|jpe?g|webp)$/i.test(file.name)) return toast.error('Please select a PNG, JPG or WebP image');
    const body = new FormData();
    body.append('avatar', file);
    setBusy(true);
    try {
      const { data } = await api.post('/users/me/avatar', body);
      setUser(data.user);
      setVersion((v) => v + 1);
      toast.success('Profile avatar updated');
    } catch (err) {
      toast.error(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const { data } = await api.delete('/users/me/avatar');
      setUser(data.user);
      toast.success('Profile photo removed');
    } catch (err) {
      toast.error(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="row"
      style={{
        gap: 20,
        padding: '16px 20px',
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--line-subtle)',
      }}
    >
      <Avatar
        key={version}
        user={{ id: user.id, name: user.name, hasAvatar: user.hasAvatar }}
        size="lg"
      />
      <div className="stack-sm grow">
        <div className="row-wrap" style={{ gap: 10 }}>
          <input
            ref={input}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            onChange={upload}
            className="sr-only"
            id="avatar-file"
          />
          <Button
            size="sm"
            variant="secondary"
            loading={busy}
            onClick={() => input.current.click()}
          >
            <Icon name="user" size={14} /> {user.hasAvatar ? 'Change Photo' : 'Upload Photo'}
          </Button>
          {user.hasAvatar && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={remove} style={{ color: 'var(--danger)' }}>
              Remove
            </Button>
          )}
        </div>
        <span className="xs muted">Recommended: Square PNG, JPG or WebP up to 5 MB.</span>
      </div>
    </div>
  );
}

function DetailsForm() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone || '',
    bio: user.bio || '',
    about: user.about || '',
    qualification: user.qualification || '',
    hobbies: (user.hobbies || []).join(', '),
    awards: (user.awards || []).join(', '),
  });
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (form.name.trim().length < 2) {
      return setFields({ name: 'Please enter your full name (2+ characters)' });
    }
    setBusy(true);
    setFields({});
    setError('');
    try {
      const { data } = await api.put('/users/me', {
        ...form,
        name: form.name.trim(),
        hobbies: splitList(form.hobbies),
        awards: splitList(form.awards),
      });
      setUser(data.user);
      toast.success('Profile information saved');
    } catch (err) {
      const e2 = apiError(err);
      setError(e2.message);
      setFields(e2.fields || {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card stack" onSubmit={submit} noValidate>
      <div className="card-head" style={{ marginBottom: 10 }}>
        <h2>Personal Details</h2>
      </div>

      <AvatarEditor />

      <div className="form-row">
        <Field
          label="Full Name"
          value={form.name}
          onChange={set('name')}
          maxLength={60}
          error={fields.name}
          required
        />
        <Field
          label="Phone Number"
          type="tel"
          value={form.phone}
          onChange={set('phone')}
          error={fields.phone}
          placeholder="+1 555 123 4567"
        />
      </div>

      <Field
        label="Account Email"
        value={user.email}
        disabled
        help="Email address is fixed to your authentication account and cannot be edited here."
      />

      <Field
        label="Headline / Short Bio"
        value={form.bio}
        onChange={set('bio')}
        maxLength={160}
        help={`${form.bio.length}/160 characters`}
        error={fields.bio}
        placeholder="e.g. Senior Frontend Engineer & UI Enthusiast"
      />

      <Field
        as="textarea"
        label="Extended About & Background"
        value={form.about}
        onChange={set('about')}
        maxLength={1500}
        error={fields.about}
        help={`${form.about.length}/1500 characters`}
        placeholder="Share your experience, preferred tools, and teaching philosophy."
      />

      <Field
        label="Professional Qualification / Degree"
        value={form.qualification}
        onChange={set('qualification')}
        maxLength={120}
        error={fields.qualification}
        placeholder="e.g. B.Tech Computer Science / Self-Taught Creator"
      />

      <div className="form-row">
        <Field
          label="Hobbies & Interests"
          value={form.hobbies}
          onChange={set('hobbies')}
          help="Separate entries with commas (e.g. Chess, Hiking, Synthesizers)"
          error={fields.hobbies}
        />
        <Field
          label="Honors & Achievements"
          value={form.awards}
          onChange={set('awards')}
          help="Separate entries with commas (e.g. Hackathon Winner, Open Source Contributor)"
          error={fields.awards}
        />
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <Icon name="alert" size={18} />
          <span>{error}</span>
        </div>
      )}

      <div>
        <Button type="submit" loading={busy} size="md">
          Save Profile Changes
        </Button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const toast = useToast();
  const empty = { currentPassword: '', newPassword: '', confirmPassword: '' };
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const local = {};
    if (!form.currentPassword) local.currentPassword = 'Enter your current password';
    if (form.newPassword.length < 8 || !/[A-Za-z]/.test(form.newPassword) || !/\d/.test(form.newPassword)) {
      local.newPassword = 'Must contain 8+ characters with a letter and a number';
    }
    if (form.newPassword !== form.confirmPassword) {
      local.confirmPassword = 'New passwords do not match';
    }
    if (Object.keys(local).length) return setFields(local);

    setBusy(true);
    setFields({});
    setError('');
    try {
      await api.post('/auth/change-password', form);
      setForm(empty);
      toast.success('Password changed successfully. All other active sessions signed out.');
    } catch (err) {
      const e2 = apiError(err);
      setError(e2.message);
      setFields(e2.fields || {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card stack" onSubmit={submit} noValidate>
      <div className="card-head" style={{ marginBottom: 10 }}>
        <h2>Security & Password</h2>
      </div>

      <PasswordField
        label="Current Password"
        autoComplete="current-password"
        value={form.currentPassword}
        onChange={set('currentPassword')}
        error={fields.currentPassword}
      />

      <div className="form-row">
        <PasswordField
          label="New Password"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={set('newPassword')}
          error={fields.newPassword}
          showStrength
        />
        <PasswordField
          label="Confirm New Password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={set('confirmPassword')}
          error={fields.confirmPassword}
        />
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <Icon name="alert" size={18} />
          <span>{error}</span>
        </div>
      )}

      <div>
        <Button type="submit" variant="secondary" loading={busy}>
          Update Password
        </Button>
      </div>
    </form>
  );
}

export default function Profile() {
  useDocumentTitle('Manage Profile');
  const { user } = useAuth();

  return (
    <div className="page page-narrow">
      <PageHeader
        title="Account Profile"
        subtitle="Manage personal information, skill listings, and account security."
      >
        <Link to={`/profile/${user.id}`} className="btn btn-secondary">
          <Icon name="grid" size={16} /> Preview Public Profile
        </Link>
      </PageHeader>

      <div className="stack" style={{ gap: 24 }}>
        {/* Verification Status Banner */}
        <div
          className="card row spread"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)',
            border: '1px solid var(--line-strong)',
            padding: '20px 24px',
          }}
        >
          <div className="stack-sm">
            <div className="row-wrap" style={{ gap: 8 }}>
              <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>Member Verification Status</strong>
              {user.verified ? <VerifiedBadge /> : <span className="badge">Not Yet Verified</span>}
            </div>
            <p className="small muted">
              {user.ratingCount} {user.ratingCount === 1 ? 'review' : 'reviews'} · {user.completedSwaps} completed{' '}
              {user.completedSwaps === 1 ? 'swap' : 'swaps'}. Verification is unlocked by 5 completed, rated peer swaps.
            </p>
          </div>
        </div>

        <DetailsForm />

        <div className="card">
          <SkillManager type="teach" />
        </div>

        <div className="card">
          <SkillManager type="learn" />
        </div>

        <PasswordForm />
      </div>
    </div>
  );
}
