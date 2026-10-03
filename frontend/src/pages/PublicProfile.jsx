import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import api from '../api/axios';
import { useAsync, useDocumentTitle } from '../hooks/useAsync';
import { formatDate, levelLabel, timeAgo } from '../utils/format';
import RequestSwapModal from '../components/RequestSwapModal';
import StarRating from '../components/StarRating';
import { Avatar, Button, ErrorState, Icon, ListSkeleton, VerifiedBadge } from '../components/ui';

export default function PublicProfile() {
  const { id } = useParams();
  const [target, setTarget] = useState(null);
  const [reviewPage, setReviewPage] = useState(1);
  const profile = useAsync(() => api.get(`/users/${id}`).then((r) => r.data.profile), [id]);
  const skills = useAsync(() => api.get(`/skills/user/${id}`).then((r) => r.data), [id]);
  const reviews = useAsync(() => api.get(`/reviews/user/${id}`, { params: { page: 1, limit: 5 } }).then((r) => r.data), [id]);
  const [more, setMore] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  useDocumentTitle(profile.data ? profile.data.name : 'Member Profile');

  if (profile.loading) {
    return (
      <div className="page page-narrow">
        <ListSkeleton rows={4} />
      </div>
    );
  }

  if (profile.error) {
    return (
      <div className="page page-narrow">
        <ErrorState error={profile.error} onRetry={profile.reload} title="Profile Unavailable" />
      </div>
    );
  }

  const p = profile.data;

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = reviewPage + 1;
      const { data } = await api.get(`/reviews/user/${id}`, { params: { page: next, limit: 5 } });
      setMore((m) => [...m, ...data.items]);
      setReviewPage(next);
      reviews.setData({ ...reviews.data, hasMore: data.hasMore });
    } finally {
      setLoadingMore(false);
    }
  };

  const allReviews = reviews.data ? [...reviews.data.items, ...more] : [];

  return (
    <div className="page page-narrow">
      {/* Profile Header Hero Card */}
      <div className="card profile-card" style={{ marginBottom: 26 }}>
        <div className="profile-cover" />

        <div className="profile-head">
          <Avatar
            user={{ id: p.id, name: p.name, hasAvatar: p.hasAvatar }}
            size="xl"
          />

          <div className="grow" style={{ paddingTop: 56 }}>
            <div className="row-wrap" style={{ gap: 8 }}>
              <h1 style={{ fontSize: '1.75rem' }}>{p.name}</h1>
              {p.verified && <VerifiedBadge />}
            </div>
            {p.bio && <p className="muted" style={{ fontSize: '0.96rem', marginTop: 4 }}>{p.bio}</p>}
          </div>

          <div className="row-wrap" style={{ paddingTop: 56 }}>
            {p.isMe ? (
              <Link to="/profile" className="btn btn-secondary">
                <Icon name="user" size={16} /> Edit Profile
              </Link>
            ) : (
              <Link to={`/messages/${p.id}`} className="btn btn-primary">
                <Icon name="chat" size={16} /> Send Message
              </Link>
            )}
          </div>
        </div>

        {/* Profile Statistics Ribbon */}
        <div className="profile-body stack">
          <div
            className="row-wrap"
            style={{
              gap: 20,
              padding: '14px 18px',
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-subtle)',
            }}
          >
            <span className="row" style={{ gap: 8 }}>
              <StarRating value={p.ratingAvg} size="1rem" />
              <strong style={{ fontSize: '0.94rem' }}>
                {p.ratingCount
                  ? `${p.ratingAvg.toFixed(1)} (${p.ratingCount} ${
                      p.ratingCount === 1 ? 'review' : 'reviews'
                    })`
                  : 'No ratings yet'}
              </strong>
            </span>
            <span style={{ color: 'var(--line)' }}>|</span>
            <span className="small muted font-semibold">
              <strong style={{ color: 'var(--ink)' }}>{p.completedSwaps}</strong> completed{' '}
              {p.completedSwaps === 1 ? 'swap' : 'swaps'}
            </span>
            <span style={{ color: 'var(--line)' }}>|</span>
            <span className="small muted">Member since {formatDate(p.memberSince)}</span>
          </div>

          {p.about && (
            <div style={{ marginTop: 12 }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: 6 }}>About</h3>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--ink-secondary)' }}>
                {p.about}
              </p>
            </div>
          )}

          <div className="grid grid-2" style={{ marginTop: 12 }}>
            {p.qualification && (
              <div>
                <div className="xs muted font-bold" style={{ textTransform: 'uppercase' }}>
                  Qualification
                </div>
                <div style={{ fontWeight: 650, marginTop: 2 }}>{p.qualification}</div>
              </div>
            )}
            {p.hobbies.length > 0 && (
              <div>
                <div className="xs muted font-bold" style={{ textTransform: 'uppercase', marginBottom: 6 }}>
                  Hobbies & Interests
                </div>
                <div className="row-wrap">
                  {p.hobbies.map((h) => (
                    <span className="chip" key={h}>
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {p.awards.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="xs muted font-bold" style={{ textTransform: 'uppercase', marginBottom: 6 }}>
                  Honors & Achievements
                </div>
                <div className="row-wrap">
                  {p.awards.map((a) => (
                    <span className="chip" key={a}>
                      <Icon name="award" size={13} /> {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skills Offered Section */}
      <section style={{ marginTop: 28 }} aria-labelledby="pt">
        <h2 id="pt" style={{ marginBottom: 16 }}>
          Skills Offered to Teach
        </h2>
        {skills.loading ? (
          <ListSkeleton rows={2} />
        ) : skills.error ? (
          <ErrorState error={skills.error} onRetry={skills.reload} />
        ) : skills.data.teach.length === 0 ? (
          <p className="muted">This member has not listed any teaching skills yet.</p>
        ) : (
          <div className="stack-sm">
            {skills.data.teach.map((s) => (
              <div
                className="card row spread"
                key={s.id}
                style={{
                  alignItems: 'flex-start',
                  padding: '18px 22px',
                  borderLeft: '4px solid var(--primary)',
                }}
              >
                <div className="grow stack-sm">
                  <div className="row-wrap" style={{ gap: 8 }}>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>{s.name}</strong>
                    <span className="badge">{s.category}</span>
                    <span className="badge">{levelLabel(s.level)}</span>
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
                {!p.isMe && (
                  <Button
                    size="sm"
                    onClick={() => setTarget({ ...s, owner: { id: p.id, name: p.name } })}
                  >
                    <Icon name="swap" size={14} /> Request Swap
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Wants to Learn Wishlist */}
        {skills.data && skills.data.learn.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h2 style={{ marginBottom: 14 }}>Wants to Learn</h2>
            <div className="row-wrap">
              {skills.data.learn.map((s) => (
                <span
                  className="chip"
                  key={s.id}
                  style={{ background: 'rgba(6, 182, 212, 0.08)', color: '#0891b2', borderColor: '#a5f3fc', fontWeight: 600 }}
                >
                  <Icon name="spark" size={13} /> {s.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Reviews Section */}
      <section style={{ marginTop: 36 }} aria-labelledby="pr">
        <h2 id="pr" style={{ marginBottom: 16 }}>
          Peer Reviews & Endorsements
        </h2>
        {reviews.loading ? (
          <ListSkeleton rows={2} />
        ) : reviews.error ? (
          <ErrorState error={reviews.error} onRetry={reviews.reload} />
        ) : allReviews.length === 0 ? (
          <p className="muted">No peer reviews logged yet. Reviews appear automatically after completed swaps.</p>
        ) : (
          <div className="stack-sm">
            {allReviews.map((r) => (
              <div className="card stack-sm" key={r.id} style={{ padding: '18px 22px' }}>
                <div className="row spread">
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar user={r.reviewer} size="sm" />
                    <strong style={{ fontSize: '0.94rem' }}>
                      {r.reviewer ? r.reviewer.name : 'Community Member'}
                    </strong>
                  </div>
                  <span className="xs muted">{timeAgo(r.createdAt)}</span>
                </div>
                <StarRating value={r.rating} size="0.88rem" />
                {r.text && <p className="small" style={{ lineHeight: 1.5, color: 'var(--ink-secondary)' }}>{r.text}</p>}
              </div>
            ))}

            {reviews.data.hasMore && (
              <div className="center" style={{ marginTop: 18 }}>
                <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                  Show More Reviews
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      {target && <RequestSwapModal skill={target} onClose={() => setTarget(null)} />}
    </div>
  );
}
