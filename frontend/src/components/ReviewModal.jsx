import { useState } from 'react';
import api, { apiError } from '../api/axios';
import { useToast } from '../context/ToastContext';
import Modal from './Modal';
import StarRating from './StarRating';
import { Button, Field, Icon } from './ui';

export default function ReviewModal({ swap, onClose, onDone }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!rating) {
      setFields({ rating: 'Please select a star rating (1 to 5)' });
      return;
    }
    setBusy(true);
    setError('');
    setFields({});
    try {
      await api.post('/reviews', { swapId: swap.id, rating, text });
      toast.success('Your review was successfully submitted. Thank you for building trust!');
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
      title={`Review & Rate ${swap.other.name}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="review-form" loading={busy}>
            <Icon name="check" size={15} /> Submit Review
          </Button>
        </>
      }
    >
      <form id="review-form" className="stack" onSubmit={submit} noValidate>
        <p className="small muted">
          How was your exchange session for <strong>{swap.requestedSkill?.name}</strong>? Genuine peer reviews directly fuel our trust and verification badges.
        </p>

        <div
          className="stack-sm center"
          style={{
            background: 'var(--surface-2)',
            padding: '20px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--line-subtle)',
          }}
        >
          <span className="label" id="rating-label" style={{ justifyContent: 'center' }}>
            Rate your experience
          </span>
          <StarRating
            value={rating}
            onChange={(r) => {
              setRating(r);
              if (fields.rating) setFields({});
            }}
            label="Rate your experience"
          />
          {fields.rating && (
            <span className="error-text" style={{ justifyContent: 'center' }}>
              <Icon name="alert" size={14} /> {fields.rating}
            </span>
          )}
        </div>

        <Field
          as="textarea"
          label="Detailed Feedback (Optional)"
          maxLength={600}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What went especially well? Did they explain topics clearly and respect your agreed timeline?"
          help={`${text.length}/600 characters`}
          error={fields.text}
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
