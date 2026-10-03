import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { apiError } from '../api/axios';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useAsync';
import usePaginated from '../hooks/usePaginated';
import { STATUS_LABEL, formatDate, formatDateTime } from '../utils/format';
import ReviewModal from '../components/ReviewModal';
import ScheduleModal from '../components/ScheduleModal';
import StarRating from '../components/StarRating';
import { Avatar, Button, EmptyState, ErrorState, Icon, ListSkeleton, PageHeader, VerifiedBadge } from '../components/ui';

const TABS = [
  ['pending', 'Pending Requests'],
  ['active', 'Accepted & Scheduled'],
  ['completed', 'Completed Swaps'],
  ['closed', 'Declined & Cancelled'],
  ['all', 'All History'],
];

function SwapCard({ swap, onAction, busyKey, openSchedule, openReview }) {
  const { actions, other, session } = swap;
  const busy = (k) => busyKey === `${swap.id}:${k}`;
  const started = session && new Date(session.scheduledAt).getTime() <= Date.now();

  return (
    <article className="swap-card card-hover" aria-label={`Swap with ${other.name}`}>
      {/* Header */}
      <div className="row spread" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 12 }}>
          <Avatar user={other} size="md" />
          <div>
            <div className="row-wrap" style={{ gap: 6 }}>
              <Link
                to={`/profile/${other.id}`}
                style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '1rem' }}
              >
                {other.name}
              </Link>
              {other.verified && <VerifiedBadge />}
            </div>
            <div className="xs muted" style={{ marginTop: 2 }}>
              {swap.direction === 'sent' ? 'You requested' : 'Requested you'} · {formatDate(swap.createdAt)}
            </div>
          </div>
        </div>

        <span className={`badge badge-${swap.status}`}>
          {STATUS_LABEL[swap.status]}
        </span>
      </div>

      {/* Reciprocal Exchange Representation */}
      <div className="swap-exchange">
        <div>
          <div className="xs muted" style={{ fontWeight: 650, textTransform: 'uppercase' }}>
            {swap.direction === 'sent' ? 'You Learn' : 'You Teach'}
          </div>
          <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>
            {swap.requestedSkill ? swap.requestedSkill.name : 'Removed skill'}
          </strong>
        </div>

        <span className="arrow" aria-hidden="true">
          ⇄
        </span>

        <div>
          <div className="xs muted" style={{ fontWeight: 650, textTransform: 'uppercase' }}>
            {swap.direction === 'sent' ? 'You Offer' : 'They Offer'}
          </div>
          <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>
            {swap.offeredSkill ? swap.offeredSkill.name : 'To be arranged in chat'}
          </strong>
        </div>
      </div>

      {/* Intro Message */}
      {swap.message && (
        <div
          style={{
            background: 'var(--surface-2)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '3px solid var(--primary-light)',
            fontSize: '0.9rem',
            fontStyle: 'italic',
          }}
        >
          “{swap.message}”
        </div>
      )}

      {/* Scheduled Session Info Banner */}
      {session && ['accepted', 'scheduled', 'in_progress'].includes(swap.status) && (
        <div className="alert alert-info">
          <Icon name="calendar" size={20} />
          <div className="grow">
            <div>
              <strong>{formatDateTime(session.scheduledAt)}</strong> · {session.durationMinutes} min session
            </div>
            {session.details && <div className="small" style={{ marginTop: 2 }}>{session.details}</div>}
            {session.meetingLink && (
              <div className="small" style={{ marginTop: 4 }}>
                <a href={session.meetingLink} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 650 }}>
                  Open Virtual Meeting Link &rarr;
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {swap.awaitingOther && (
        <div className="alert alert-info" role="status">
          <Icon name="clock" size={18} />
          <span>You confirmed this session. Waiting for {other.name} to confirm completion.</span>
        </div>
      )}

      {swap.myReview && (
        <div className="row small muted" style={{ gap: 8 }}>
          <StarRating value={swap.myReview.rating} size="0.9rem" />
          <span>Your review: “{swap.myReview.text}”</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="swap-actions">
        {actions.accept && (
          <Button size="sm" loading={busy('accept')} onClick={() => onAction(swap, 'accept')}>
            <Icon name="check" size={14} /> Accept Request
          </Button>
        )}
        {actions.reject && (
          <Button size="sm" variant="secondary" loading={busy('reject')} onClick={() => onAction(swap, 'reject')}>
            Decline
          </Button>
        )}
        {actions.schedule && (
          <Button
            size="sm"
            variant={session ? 'secondary' : 'primary'}
            onClick={() => openSchedule(swap)}
          >
            <Icon name="calendar" size={14} />
            {session ? 'Reschedule Session' : 'Schedule Session'}
          </Button>
        )}
        {actions.complete && session && (
          <Button
            size="sm"
            loading={busy('complete')}
            disabled={!started}
            title={started ? undefined : 'Available once the session start time has passed'}
            onClick={() => onAction(swap, 'complete')}
          >
            <Icon name="check" size={14} /> Mark Completed
          </Button>
        )}
        {actions.review && !swap.myReview && (
          <Button size="sm" onClick={() => openReview(swap)}>
            <Icon name="star" size={14} /> Leave a Review
          </Button>
        )}
        {session && session.status === 'scheduled' && ['scheduled', 'in_progress'].includes(swap.status) && (
          <Button
            size="sm"
            variant="ghost"
            loading={busy('cancelSession')}
            onClick={() => onAction(swap, 'cancelSession')}
          >
            Cancel Session
          </Button>
        )}
        {actions.cancel && (
          <Button
            size="sm"
            variant="ghost"
            loading={busy('cancel')}
            onClick={() => onAction(swap, 'cancel')}
            style={{ color: 'var(--danger)' }}
          >
            {swap.status === 'pending' ? 'Withdraw Request' : 'Cancel Swap'}
          </Button>
        )}
        <Link to={`/messages/${other.id}`} className="btn btn-secondary btn-sm">
          <Icon name="chat" size={14} /> Chat
        </Link>
      </div>

      {actions.complete && session && !started && (
        <p className="xs muted">
          Completion confirmation unlocks once the scheduled start time arrives. Both partners must confirm.
        </p>
      )}
    </article>
  );
}

export default function MySwaps() {
  useDocumentTitle('My Swaps');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'pending';
  const [counts, setCounts] = useState(null);
  const [busyKey, setBusyKey] = useState('');
  const [scheduling, setScheduling] = useState(null);
  const [reviewing, setReviewing] = useState(null);

  const query = useMemo(() => ({ tab }), [tab]);
  const list = usePaginated('/swaps', query, tab, { limit: 10 });

  const loadCounts = useCallback(() => {
    api.get('/swaps/counts').then((r) => setCounts(r.data.counts)).catch(() => {});
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const refresh = () => {
    list.reload();
    loadCounts();
    window.dispatchEvent(new Event('counts:refresh'));
  };

  const act = async (swap, action) => {
    if (busyKey) return;
    const calls = {
      accept: () => api.patch(`/swaps/${swap.id}/accept`),
      reject: () => api.patch(`/swaps/${swap.id}/reject`),
      cancel: () => api.patch(`/swaps/${swap.id}/cancel`),
      cancelSession: () => api.patch(`/sessions/${swap.session.id}/cancel`),
      complete: () => api.patch(`/sessions/${swap.session.id}/complete`),
    };
    const done = {
      accept: 'Swap request accepted! You can now coordinate and schedule your session.',
      reject: 'Swap request declined.',
      cancel: swap.status === 'pending' ? 'Request withdrawn.' : 'Swap cancelled.',
      cancelSession: 'Scheduled session cancelled.',
      complete: 'Swap session confirmed as completed.',
    };
    setBusyKey(`${swap.id}:${action}`);
    try {
      const { data } = await calls[action]();
      toast.success(
        action === 'complete' && data.awaitingOther
          ? 'Confirmed by you. Waiting for your partner to confirm completion.'
          : done[action]
      );
      refresh();
    } catch (err) {
      toast.error(apiError(err).message);
    } finally {
      setBusyKey('');
    }
  };

  return (
    <div className="page page-narrow">
      <PageHeader
        title="Swap Management"
        subtitle="Track incoming proposals, active scheduled sessions, and your verified exchange milestones."
      />

      {/* Tabs */}
      <div className="tabs" role="tablist" aria-label="Swap status tabs">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === key}
            onClick={() => setParams({ tab: key })}
          >
            {label}
            {counts && counts[key] > 0 && <span className="count-pill">{counts[key]}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {list.loading ? (
        <ListSkeleton rows={3} />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : list.items.length === 0 ? (
        <EmptyState
          icon="swap"
          title="No swaps in this view"
          action={
            <Link to="/explore" className="btn btn-primary">
              <Icon name="search" size={16} /> Explore Skills to Learn
            </Link>
          }
        >
          {tab === 'pending'
            ? 'Incoming and outgoing swap proposals will appear here until accepted or declined.'
            : 'No exchanges currently match this filter state.'}
        </EmptyState>
      ) : (
        <div className="stack">
          {list.items.map((s) => (
            <SwapCard
              key={s.id}
              swap={s}
              onAction={act}
              busyKey={busyKey}
              openSchedule={setScheduling}
              openReview={setReviewing}
            />
          ))}
          {list.hasMore && (
            <div className="center" style={{ marginTop: 24 }}>
              <Button variant="secondary" onClick={list.loadMore} loading={list.loadingMore} size="lg">
                Load More Swaps
              </Button>
            </div>
          )}
        </div>
      )}

      {scheduling && <ScheduleModal swap={scheduling} onClose={() => setScheduling(null)} onDone={refresh} />}
      {reviewing && <ReviewModal swap={reviewing} onClose={() => setReviewing(null)} onDone={refresh} />}
    </div>
  );
}
