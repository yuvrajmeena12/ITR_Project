import { useState } from 'react';
import api, { apiError, cachedGet } from '../api/axios';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { levelLabel } from '../utils/format';
import Modal from './Modal';
import { Button, EmptyState, ErrorState, Field, Icon, ListSkeleton } from './ui';

const MAX_PROOF = 5 * 1024 * 1024;
const PROOF_EXT = /\.(pdf|png|jpe?g|webp)$/i;

const LEVEL_COLORS = {
  beginner: '#0284c7',
  intermediate: '#4f46e5',
  advanced: '#7c3aed',
  expert: '#059669',
};

function SkillForm({ type, skill, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(skill);
  const { data: meta } = useAsync(() => cachedGet('/skills/categories', { ttl: 5 * 60000 }), []);
  const [form, setForm] = useState({
    name: skill?.name || '',
    category: skill?.category || '',
    level: skill?.level || 'intermediate',
    description: skill?.description || '',
  });
  const [file, setFile] = useState(null);
  const [removeProof, setRemoveProof] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    setFields((x) => ({ ...x, file: undefined }));
    if (!f) return setFile(null);
    if (!PROOF_EXT.test(f.name)) {
      setFields((x) => ({ ...x, file: 'Supported formats: PDF, PNG, JPG or WebP' }));
      e.target.value = '';
      return setFile(null);
    }
    if (f.size > MAX_PROOF) {
      setFields((x) => ({ ...x, file: 'File size must be 5 MB or smaller' }));
      e.target.value = '';
      return setFile(null);
    }
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const local = {};
    if (form.name.trim().length < 2) local.name = 'Please provide a skill name (2+ characters)';
    if (!form.category) local.category = 'Please choose a category';
    if (Object.keys(local).length) return setFields(local);

    const body = new FormData();
    if (!editing) body.append('type', type);
    Object.entries(form).forEach(([k, v]) => body.append(k, v.trim ? v.trim() : v));
    if (file) body.append('proof', file);
    if (removeProof) body.append('removeProof', 'true');

    setBusy(true);
    setError('');
    setFields({});
    try {
      if (editing) await api.put(`/skills/${skill.id}`, body);
      else await api.post('/skills', body);
      toast.success(editing ? 'Skill updated successfully' : 'Skill added to your inventory');
      onSaved();
      onClose();
    } catch (err) {
      const e2 = apiError(err);
      setError(e2.message);
      setFields(e2.fields || {});
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`${editing ? 'Edit' : 'Add'} ${
        type === 'teach' ? 'a Skill I Can Teach' : 'a Skill I Want to Learn'
      }`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="skill-form" loading={busy}>
            {editing ? 'Save Changes' : 'Add Skill'}
          </Button>
        </>
      }
    >
      <form id="skill-form" className="stack" onSubmit={submit} noValidate>
        <Field
          label="Skill or Topic Name"
          value={form.name}
          onChange={set('name')}
          maxLength={60}
          placeholder={type === 'teach' ? 'e.g. Modern React, UI Design, Japanese' : 'e.g. Docker, Public Speaking'}
          error={fields.name}
          required
          autoFocus
        />

        <div className="form-row">
          <Field
            as="select"
            label="Category"
            value={form.category}
            onChange={set('category')}
            error={fields.category}
            required
          >
            <option value="">Select category…</option>
            {(meta ? meta.categories : []).map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </Field>

          <Field
            as="select"
            label={type === 'teach' ? 'Proficiency Level' : 'Current Starting Level'}
            value={form.level}
            onChange={set('level')}
            error={fields.level}
          >
            {['beginner', 'intermediate', 'advanced', 'expert'].map((l) => (
              <option key={l} value={l}>
                {levelLabel(l)}
              </option>
            ))}
          </Field>
        </div>

        <Field
          as="textarea"
          label="Description / Curriculum / Goals"
          value={form.description}
          onChange={set('description')}
          maxLength={500}
          placeholder={
            type === 'teach'
              ? 'What specific sub-topics, tools, or techniques can you teach? Describe your preferred teaching style.'
              : 'What do you hope to accomplish or build with this skill?'
          }
          help={`${form.description.length}/500 characters`}
          error={fields.description}
        />

        {type === 'teach' && (
          <div className="field">
            <label htmlFor="proof">Certificate or Portfolio Proof (Optional)</label>
            <input
              id="proof"
              className="input"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={onFile}
              aria-invalid={fields.file ? 'true' : undefined}
            />
            <span className="help">
              PDF, PNG, JPG or WebP up to 5 MB. Provides helpful proof for prospective swap partners.
            </span>
            {fields.file && <span className="error-text">{fields.file}</span>}
            {editing && skill.hasProof && !file && (
              <label className="row small" style={{ gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={removeProof}
                  onChange={(e) => setRemoveProof(e.target.checked)}
                />{' '}
                Remove attached file ({skill.proofName})
              </label>
            )}
          </div>
        )}

        {error && (
          <div className="alert alert-error" role="alert">
            <Icon name="alert" size={18} />
            <span>{error}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}

export default function SkillManager({ type, onChanged }) {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(
    () => api.get('/skills/mine').then((r) => r.data[type]),
    [type],
    { cacheKey: `skills:mine:${type}`, ttl: 30000 }
  );
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const teach = type === 'teach';

  const saved = () => {
    reload({ silent: true });
    onChanged && onChanged();
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api.delete(`/skills/${confirm.id}`);
      toast.success('Skill removed');
      setConfirm(null);
      saved();
    } catch (err) {
      toast.error(apiError(err).message);
      setConfirm(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section aria-label={teach ? 'Skills I can teach' : 'Skills I want to learn'}>
      <div className="card-head" style={{ marginBottom: 20 }}>
        <div>
          <h2>{teach ? 'Skills I Can Teach' : 'Skills I Want to Learn'}</h2>
          <p className="small muted">
            {teach
              ? 'Published to Explore so members can discover and request swaps with you.'
              : 'Used by the Smart Match engine to find your ideal mentors and partners.'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setForm({})}
        >
          <Icon name="plus" size={16} /> Add Skill
        </button>
      </div>

      {loading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <EmptyState
          icon={teach ? 'spark' : 'search'}
          title={teach ? 'No teaching skills listed yet' : 'No learning targets added yet'}
          action={
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setForm({})}
            >
              <Icon name="plus" size={16} /> {teach ? 'Add a Skill I Can Teach' : 'Add a Learning Goal'}
            </button>
          }
        >
          {teach
            ? 'Share your expertise so other members can find your profile and propose reciprocal swaps.'
            : 'Tell us what you want to learn so Smart Match can connect you with skilled teachers.'}
        </EmptyState>
      ) : (
        <div className="stack-sm">
          {data.map((s) => (
            <div
              className="card row spread"
              key={s.id}
              style={{
                alignItems: 'flex-start',
                padding: '18px 22px',
                borderLeft: `4px solid ${LEVEL_COLORS[s.level] || 'var(--primary)'}`,
              }}
            >
              <div className="grow stack-sm">
                <div className="row-wrap" style={{ gap: 8 }}>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>{s.name}</strong>
                  <span className="badge">{s.category}</span>
                  <span
                    className="badge"
                    style={{
                      background: 'rgba(99, 102, 241, 0.08)',
                      color: LEVEL_COLORS[s.level] || 'var(--primary)',
                      fontWeight: 700,
                    }}
                  >
                    {levelLabel(s.level)}
                  </span>
                  {s.hasProof && (
                    <a
                      className="badge badge-completed"
                      href={`/api/skills/${s.id}/proof`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon name="doc" size={12} /> Proof Attached
                    </a>
                  )}
                </div>
                {s.description && (
                  <p className="small muted" style={{ lineHeight: 1.5, marginTop: 4 }}>
                    {s.description}
                  </p>
                )}
              </div>

              <div className="row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setForm({ skill: s })}
                  aria-label={`Edit ${s.name}`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirm(s)}
                  aria-label={`Remove ${s.name}`}
                  style={{ color: 'var(--danger)' }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <SkillForm
          type={type}
          skill={form.skill}
          onClose={() => setForm(null)}
          onSaved={saved}
        />
      )}

      {confirm && (
        <Modal
          title="Remove Skill Confirmation"
          onClose={() => setConfirm(null)}
          busy={deleting}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirm(null)} disabled={deleting}>
                Keep Skill
              </Button>
              <Button variant="danger" onClick={remove} loading={deleting}>
                Confirm Removal
              </Button>
            </>
          }
        >
          <p>
            Are you sure you want to remove <strong>{confirm.name}</strong>? This skill will no longer appear on your profile or in Explore search.
          </p>
        </Modal>
      )}
    </section>
  );
}
