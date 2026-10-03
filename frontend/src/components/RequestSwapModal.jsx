import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../api/axios';
import { useToast } from '../context/ToastContext';
import Modal from './Modal';
import { Button, Field, Icon } from './ui';

export default function RequestSwapModal({ skill, onClose, onDone }) {
  const toast = useToast();
  const [mine, setMine] = useState(null);
  const [offered, setOffered] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});

  useEffect(() => {
    let alive = true;
    api
      .get('/skills/mine')
      .then((r) => alive && setMine(r.data.teach))
      .catch(() => alive && setMine([]));
    return () => {
      alive = false;
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setFields({});
    try {
      await api.post('/swaps', {
        skillId: skill.id,
        offeredSkillId: offered || undefined,
        message,
      });
      toast.success(`Swap request successfully dispatched to ${skill.owner.name}`);
      onDone && onDone();
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
      title="Propose a Skill Swap"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="swap-form" loading={busy}>
            <Icon name="swap" size={15} /> Send Swap Request
          </Button>
        </>
      }
    >
      <form id="swap-form" className="stack" onSubmit={submit} noValidate>
        {/* Selected Skill Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, var(--surface-2) 0%, #f1f5f9 100%)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--line)',
          }}
        >
          <div className="xs muted" style={{ textTransform: 'uppercase', fontWeight: 700 }}>
            You Wish to Learn
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--ink)', marginTop: 2 }}>
            {skill.name}
          </div>
          <div className="small muted">Offered by {skill.owner.name}</div>
        </div>

        {mine === null ? (
          <p className="small muted">Loading your available skills…</p>
        ) : mine.length === 0 ? (
          <div className="alert alert-info">
            <Icon name="spark" size={18} />
            <span>
              Offering a skill from your own inventory creates a much stronger reciprocal match.{' '}
              <Link to="/skills" style={{ fontWeight: 650 }}>
                Add a skill to teach
              </Link>{' '}
              (or propose now and agree later in chat).
            </span>
          </div>
        ) : (
          <Field
            as="select"
            label="What will you teach in return? (Optional)"
            value={offered}
            onChange={(e) => setOffered(e.target.value)}
            error={fields.offeredSkillId}
          >
            <option value="">I will agree on this via direct chat</option>
            {mine.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.category})
              </option>
            ))}
          </Field>
        )}

        <Field
          as="textarea"
          label="Personal Introduction Note (Optional)"
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Say hello! Mention your current familiarity with the topic and what times work best for you."
          help={`${message.length}/500 characters`}
          error={fields.message}
        />

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
