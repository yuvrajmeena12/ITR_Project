import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import usePaginated from '../hooks/usePaginated';
import { useDocumentTitle } from '../hooks/useAsync';
import RequestSwapModal from '../components/RequestSwapModal';
import StarRating from '../components/StarRating';
import { Avatar, Button, CardSkeletons, EmptyState, ErrorState, Icon, PageHeader, VerifiedBadge } from '../components/ui';

function MatchCard({ match, onRequest }) {
  const navigate = useNavigate();
  const { user } = match;
  const reciprocal = match.type === 'reciprocal';

  return (
    <article
      className="card card-hover stack"
      style={{
        padding: 24,
        border: reciprocal ? '1.5px solid rgba(99, 102, 241, 0.35)' : '1px solid var(--line)',
        background: reciprocal
          ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)'
          : 'var(--bg-card)',
      }}
      aria-label={`Match with ${user.name}`}
    >
      {/* Top Header */}
      <div className="row spread" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 12 }}>
          <Avatar user={user} size="lg" />
          <div>
            <div className="row-wrap" style={{ gap: 6 }}>
              <Link
                to={`/profile/${user.id}`}
                style={{ fontWeight: 750, color: 'var(--ink)', fontSize: '1.05rem' }}
              >
                {user.name}
              </Link>
              {user.verified && <VerifiedBadge />}
            </div>
            <div className="row xs muted" style={{ gap: 6, marginTop: 2 }}>
              {user.ratingCount > 0 ? (
                <>
                  <StarRating value={user.ratingAvg} size="0.82rem" />
                  <span>
                    {user.ratingAvg.toFixed(1)} ({user.ratingCount} reviews)
                  </span>
                </>
              ) : (
                <span>New member</span>
              )}
            </div>
          </div>
        </div>

        <span className={`badge ${reciprocal ? 'badge-completed' : 'badge-teach'}`}>
          <Icon name={reciprocal ? 'spark' : 'arrow'} size={13} />
          {reciprocal ? 'Reciprocal Synergy' : 'One-way Match'}
        </span>
      </div>

      {/* Reciprocal Visual Exchange Flow */}
      <div
        style={{
          background: 'var(--surface-2)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 16px',
          border: '1px solid var(--line-subtle)',
        }}
        className="stack-sm"
      >
        <span className="xs muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Match Compatibility Breakdown
        </span>

        {match.theyTeachYou.length > 0 && (
          <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
            <span style={{ color: 'var(--primary)', marginTop: 2 }}>
              <Icon name="check" size={16} />
            </span>
            <div className="small">
              <span className="muted">They teach you: </span>
              <strong style={{ color: 'var(--ink)' }}>
                {match.theyTeachYou.map((s) => s.name).join(', ')}
              </strong>
            </div>
          </div>
        )}

        {match.youTeachThem.length > 0 && (
          <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
            <span style={{ color: 'var(--success)', marginTop: 2 }}>
              <Icon name="check" size={16} />
            </span>
            <div className="small">
              <span className="muted">You teach them: </span>
              <strong style={{ color: 'var(--ink)' }}>
                {match.youTeachThem.map((s) => s.name).join(', ')}
              </strong>
            </div>
          </div>
        )}

        {!reciprocal && (
          <p className="xs muted" style={{ marginTop: 4 }}>
            {match.theyTeachYou.length
              ? 'They have not specified an interest in your teaching topics yet, but you can message them.'
              : 'They teach other topics outside your wishlist.'}
          </p>
        )}
      </div>

      {/* Action Footer */}
      <div className="row-wrap" style={{ marginTop: 'auto', paddingTop: 10, gap: 10 }}>
        {match.theyTeachYou.map((s) => (
          <button
            key={s.id}
            type="button"
            className="btn btn-primary btn-sm grow"
            onClick={() => onRequest({ id: s.id, name: s.name, owner: user })}
          >
            <Icon name="swap" size={15} /> Request {s.name}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigate(`/messages/${user.id}`)}
        >
          <Icon name="chat" size={15} /> Message
        </button>
      </div>
    </article>
  );
}

export default function SmartMatch() {
  useDocumentTitle('Smart Match Engine');
  const [filter, setFilter] = useState('');
  const [target, setTarget] = useState(null);
  const query = useMemo(() => ({ type: filter || undefined }), [filter]);
  const list = usePaginated('/matches', query, filter, { limit: 9 });
  const meta = list.extra || {};

  return (
    <div className="page">
      <PageHeader
        title="Smart Match"
        subtitle="Our algorithmic synergy engine pairs what you offer with what other members crave."
      >
        <div className="seg" role="group" aria-label="Match filter type">
          <button
            type="button"
            aria-pressed={filter === ''}
            onClick={() => setFilter('')}
          >
            All Matches
          </button>
          <button
            type="button"
            aria-pressed={filter === 'reciprocal'}
            onClick={() => setFilter('reciprocal')}
          >
            <Icon name="spark" size={14} /> Reciprocal Only
          </button>
          <button
            type="button"
            aria-pressed={filter === 'one_way'}
            onClick={() => setFilter('one_way')}
          >
            One-way Matches
          </button>
        </div>
      </PageHeader>

      {list.loading ? (
        <CardSkeletons count={6} />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : list.items.length === 0 ? (
        !meta.hasSkills ? (
          <EmptyState
            icon="spark"
            title="Add skills to generate Smart Matches"
            action={
              <Link to="/skills" className="btn btn-primary">
                <Icon name="plus" size={16} /> Add Skills Now
              </Link>
            }
          >
            Smart Match computes reciprocal pairs between what you teach and what you want to learn. Add at least one teaching skill and one learning topic to get started!
          </EmptyState>
        ) : (
          <EmptyState
            icon="search"
            title="No direct matches found right now"
            action={
              <div className="row" style={{ gap: 10 }}>
                <Link to="/skills" className="btn btn-secondary">
                  Add more skills
                </Link>
                <Link to="/explore" className="btn btn-primary">
                  Browse Explore
                </Link>
              </div>
            }
          >
            {!meta.hasLearn
              ? 'Add a topic you want to learn to identify suitable teachers. '
              : !meta.hasTeach
              ? 'Add a skill you can teach to unlock 100% reciprocal pairs. '
              : ''}
            New peers join daily. Check back soon or broaden your list of learning goals!
          </EmptyState>
        )
      ) : (
        <>
          <div className="grid grid-3">
            {list.items.map((m) => (
              <MatchCard key={m.user.id} match={m} onRequest={setTarget} />
            ))}
          </div>

          {list.hasMore && (
            <div className="center" style={{ marginTop: 32 }}>
              <Button variant="secondary" onClick={list.loadMore} loading={list.loadingMore} size="lg">
                Load More Matches
              </Button>
            </div>
          )}
        </>
      )}

      {target && <RequestSwapModal skill={target} onClose={() => setTarget(null)} />}
    </div>
  );
}
