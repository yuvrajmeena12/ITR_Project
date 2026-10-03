import { useState } from 'react';
import api, { apiError } from '../api/axios';
import { useToast } from '../context/ToastContext';
import { localInputToIso, minLocalInput } from '../utils/format';
import Modal from './Modal';
import { Button, Field, Icon } from './ui';

export default function ScheduleModal({ swap, onClose, onDone }) {
  const toast = useToast();
  const [when, setWhen] = useState('');
  const [duration, setDuration] = useState('60');
  const [details, setDetails] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const rescheduling = swap.status === 'scheduled';

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!when) {
      setFields({ scheduledAt: 'Please choose a target date and time' });
      return;
    }
    setBusy(true);
    setError('');
    setFields({});
    try {
      await api.post('/sessions', {
        swapId: swap.id,
        scheduledAt: localInputToIso(when),
        durationMinutes: Number(duration),
        details,
        meetingLink: link,
      });
      toast.success(rescheduling ? 'Session rescheduled successfully' : 'Session scheduled successfully');
      onDone && onDone();
      onClose();
    } catch (err) {
      const e2 = apiError(err);
      setError(e2.message);
      setFields(e2.fields || {});
      setBusy(false);
    }
  };

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <Modal
      title={rescheduling ? 'Reschedule Exchange Session' : 'Schedule Exchange Session'}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="schedule-form" loading={busy}>
            <Icon name="calendar" size={15} />
            {rescheduling ? 'Save New Schedule' : 'Confirm Session'}
          </Button>
        </>
      }
    >
      <form id="schedule-form" className="stack" onSubmit={submit} noValidate>
        <div
          style={{
            background: 'var(--surface-2)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--line-subtle)',
          }}
        >
          <div className="xs muted">Session Partner</div>
          <div style={{ fontWeight: 750, color: 'var(--ink)', fontSize: '0.96rem' }}>
            {swap.other.name} · {swap.requestedSkill?.name}
          </div>
        </div>

        <Field
          label="Date and Start Time"
          type="datetime-local"
          value={when}
          min={minLocalInput(10)}
          onChange={(e) => {
            setWhen(e.target.value);
            if (fields.scheduledAt) setFields({ ...fields, scheduledAt: undefined });
          }}
          error={fields.scheduledAt}
          help={`Your local detected time zone: ${tz}`}
          required
          autoFocus
        />

        <div className="form-row">
          <Field
            as="select"
            label="Duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            error={fields.durationMinutes}
          >
            {[30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </Field>

          <Field
            label="Virtual Meeting URL (Optional)"
            type="url"
            inputMode="url"
            placeholder="Google Meet, Zoom, or Teams URL"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            error={fields.meetingLink}
          />
        </div>

        <Field
          as="textarea"
          label="Session Agenda / Goals (Optional)"
          maxLength={500}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Briefly outline topics to cover or prerequisites to prepare beforehand."
          help={`${details.length}/500 characters`}
          error={fields.details}
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
