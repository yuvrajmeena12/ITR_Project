import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useAsync, useDocumentTitle } from '../hooks/useAsync';
import { formatDateTime, timeAgo, levelLabel } from '../utils/format';
import { Avatar, CardSkeletons, EmptyState, ErrorState, Icon, ProgressBar, ProgressRing, VerifiedBadge } from '../components/ui';

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(
    () => api.get('/dashboard').then((r) => r.data),
    [],
    { cacheKey: `dashboard:${user?.id || 'me'}`, ttl: 20000 }
  );

  if (loading) {
    return (
      <div className="page">
        <CardSkeletons count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  const {
    stats = {},
    userProfile = {},
    profileProgress = { percentage: 0, completedCount: 0, totalMilestones: 5, checklist: [] },
    mySkills = [],
    verification = { threshold: 5, rated: 0 },
    upcoming = [],
    recentActivity = [],
    topMatches = [],
  } = data || {};

  const verificationPct = Math.min(100, Math.round(((verification.rated || 0) / (verification.threshold || 5)) * 100));

  // Determine greeting based on local time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name ? user.name.split(' ')[0] : 'Learner';

  const tiles = [
    {
      label: 'Skills I Teach',
      value: stats.teachCount ?? 0,
      to: '/skills',
      icon: 'book',
      color: 'var(--primary)',
      sub: 'Offerings in catalogue',
    },
    {
      label: 'Skills to Learn',
      value: stats.learnCount ?? 0,
      to: '/skills?tab=learn',
      icon: 'spark',
      color: '#0891b2',
      sub: 'Desired learning goals',
    },
    {
      label: 'Pending Proposals',
      value: stats.totalPendingRequests ?? stats.incomingRequests ?? 0,
      to: '/swaps?tab=pending',
      icon: 'clock',
      color: '#d97706',
      sub: `${stats.incomingRequests ?? 0} incoming · ${stats.outgoingRequests ?? 0} outgoing`,
    },
    {
      label: 'Active Exchanges',
      value: stats.activeSwaps ?? 0,
      to: '/swaps?tab=active',
      icon: 'swap',
      color: '#6366f1',
      sub: 'Scheduled & in progress',
    },
    {
      label: 'Completed Swaps',
      value: stats.completedSwaps ?? 0,
      to: '/swaps?tab=completed',
      icon: 'check',
      color: '#059669',
      sub: 'Successful peer sessions',
    },
    {
      label: 'Hours Exchanged',
      value: `${stats.totalHoursExchanged ?? 0}h`,
      to: '/swaps?tab=completed',
      icon: 'calendar',
      color: '#8b5cf6',
      sub: 'Total peer learning time',
    },
  ];

  const teachSkills = mySkills.filter((s) => s.type === 'teach');
  const learnSkills = mySkills.filter((s) => s.type === 'learn');

  return (
    <div className="page">
      {/* ---------- WELCOME & ACTION BAR ---------- */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.05) 100%)',
          border: '1px solid var(--line-strong)',
          marginBottom: 24,
          padding: '26px 30px',
        }}
      >
        <div className="row spread" style={{ flexWrap: 'wrap', gap: 20 }}>
          <div className="stack-sm">
            <div className="row-wrap" style={{ gap: 10, alignItems: 'center' }}>
              <h1 style={{ fontSize: 'clamp(1.6rem, 2.4vw, 2.2rem)', margin: 0 }}>
                {greeting}, {firstName}
              </h1>
              {user?.verified && <VerifiedBadge />}
              <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                {profileProgress.percentage === 100 ? 'Profile 100% Complete' : `${profileProgress.percentage}% Profile Readiness`}
              </span>
            </div>
            <p className="muted" style={{ fontSize: '0.96rem', margin: 0 }}>
              Here is your complete live snapshot of skills, exchange progress, upcoming sessions, and partner matches.
            </p>
          </div>

          <div className="row-wrap" style={{ gap: 10 }}>
            <Link to="/explore" className="btn btn-primary">
              <Icon name="search" size={17} /> Explore Skills
            </Link>
            <Link to="/skills" className="btn btn-secondary">
              <Icon name="plus" size={17} /> Add Skill
            </Link>
            <Link to="/smart-match" className="btn btn-ghost">
              <Icon name="spark" size={17} /> Smart Match
            </Link>
          </div>
        </div>
      </div>

      {/* ---------- KPI STATS GRID ---------- */}
      <div className="grid grid-stats" style={{ marginBottom: 24 }}>
        {tiles.map((t) => (
          <Link
            to={t.to}
            className="card card-hover stat"
            key={t.label}
            style={{ color: 'inherit', textDecoration: 'none', padding: '18px 20px' }}
          >
            <div className="row spread" style={{ marginBottom: 10 }}>
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'var(--surface-2)',
                  color: t.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={t.icon} size={18} />
              </span>
              <span className="small muted font-medium">View &rarr;</span>
            </div>
            <div className="stat-value">{t.value}</div>
            <div className="stat-label" style={{ marginBottom: 4 }}>{t.label}</div>
            {t.sub && <div className="xs muted">{t.sub}</div>}
          </Link>
        ))}
      </div>

      {/* ---------- DUAL PROGRESS & MILESTONES SECTION ---------- */}
      <div className="grid grid-2" style={{ marginBottom: 24, gap: 20 }}>
        {/* PROGRESS CARD 1: PROFILE & READINESS CHECKLIST */}
        <section className="card" aria-labelledby="pr-head" style={{ padding: '22px 24px' }}>
          <div className="row spread" style={{ marginBottom: 14, alignItems: 'center' }}>
            <div className="row" style={{ gap: 10 }}>
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: 'rgba(8, 145, 178, 0.12)',
                  color: '#0891b2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="target" size={18} />
              </span>
              <div>
                <h2 id="pr-head" style={{ fontSize: '1.12rem', margin: 0 }}>Profile Readiness</h2>
                <span className="xs muted">
                  {profileProgress.completedCount} of {profileProgress.totalMilestones} steps completed
                </span>
              </div>
            </div>
            <ProgressRing progress={profileProgress.percentage} size={54} />
          </div>

          <ProgressBar value={profileProgress.completedCount} max={profileProgress.totalMilestones} />

          <div className="stack-sm" style={{ marginTop: 16 }}>
            {profileProgress.checklist && profileProgress.checklist.map((item) => (
              <div
                key={item.id}
                className="row spread"
                style={{
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: item.done ? 'rgba(5, 150, 105, 0.05)' : 'var(--surface-2)',
                  border: '1px solid var(--line-subtle)',
                  fontSize: '0.88rem',
                }}
              >
                <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: item.done ? 'var(--success)' : 'var(--line-strong)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                    }}
                  >
                    {item.done ? '✓' : '•'}
                  </span>
                  <span style={{ fontWeight: item.done ? 500 : 600, color: item.done ? 'var(--ink)' : 'var(--ink-muted)' }}>
                    {item.label}
                  </span>
                </div>
                {!item.done && item.to && (
                  <Link to={item.to} className="small" style={{ color: 'var(--primary)', fontWeight: 650 }}>
                    Complete &rarr;
                  </Link>
                )}
                {item.done && <span className="xs muted" style={{ color: 'var(--success)', fontWeight: 600 }}>Done</span>}
              </div>
            ))}
          </div>
        </section>

        {/* PROGRESS CARD 2: ROAD TO VERIFIED MEMBER BADGE */}
        <section className="card" aria-labelledby="dv-head" style={{ padding: '22px 24px' }}>
          <div className="row spread" style={{ marginBottom: 14, alignItems: 'center' }}>
            <div className="row" style={{ gap: 10 }}>
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="shield" size={18} />
              </span>
              <div>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <h2 id="dv-head" style={{ fontSize: '1.12rem', margin: 0 }}>Road to Verified</h2>
                  {user?.verified && <VerifiedBadge />}
                </div>
                <span className="xs muted">5 mutual ratings required for verification</span>
              </div>
            </div>
            <ProgressRing progress={verificationPct} size={54} />
          </div>

          <div className="row spread" style={{ alignItems: 'flex-end', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--ink)', lineHeight: 1.1 }}>
                {Math.min(verification.rated, verification.threshold)}{' '}
                <span className="muted" style={{ fontSize: '0.96rem', fontWeight: 500 }}>
                  / {verification.threshold} Rated Swaps
                </span>
              </div>
            </div>
            <div className="small font-semibold" style={{ color: 'var(--primary)' }}>
              {verificationPct}% Achieved
            </div>
          </div>

          <ProgressBar value={Math.min(verification.rated, verification.threshold)} max={verification.threshold} />

          <div
            style={{
              marginTop: 16,
              padding: '12px 14px',
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-subtle)',
            }}
          >
            <p className="small muted" style={{ margin: 0 }}>
              {user?.verified
                ? '✓ Verified Member: Your track record of authenticated swap completion and peer reviews is recognized platform-wide.'
                : verification.rated >= verification.threshold
                ? 'Milestone reached! Your badge is processing.'
                : `Complete and review ${verification.threshold - verification.rated} more ${
                    verification.threshold - verification.rated === 1 ? 'swap' : 'swaps'
                  } with partners to unlock the official Verified Trust Badge.`}
            </p>
          </div>

          <div className="row spread" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line-subtle)' }}>
            <span className="small muted">Community Trust Rating:</span>
            <span className="small font-bold" style={{ color: 'var(--ink)' }}>
              {stats.ratingAvg > 0 ? `★ ${stats.ratingAvg.toFixed(1)} (${stats.ratingCount} reviews)` : 'No reviews yet'}
            </span>
          </div>
        </section>
      </div>

      {/* ---------- MY ACTIVE SKILLS SUMMARY STRIP ---------- */}
      <section
        className="card"
        style={{
          marginBottom: 24,
          padding: '20px 24px',
          background: 'var(--surface)',
        }}
      >
        <div className="row spread" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', margin: 0 }}>My Listed Skills</h2>
            <p className="xs muted" style={{ margin: '2px 0 0 0' }}>
              Your current public teaching catalog and learning wishlist
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Link to="/skills" className="btn btn-secondary btn-sm">
              <Icon name="book" size={14} /> Manage Teaching ({teachSkills.length})
            </Link>
            <Link to="/skills?tab=learn" className="btn btn-secondary btn-sm">
              <Icon name="spark" size={14} /> Manage Learning ({learnSkills.length})
            </Link>
          </div>
        </div>

        {mySkills.length === 0 ? (
          <EmptyState
            icon="book"
            title="No skills added yet"
            action={
              <Link to="/skills" className="btn btn-primary btn-sm">
                <Icon name="plus" size={14} /> Add your first skill
              </Link>
            }
          >
            Add topics you can teach and what you want to learn so other members can discover you and propose reciprocal swaps.
          </EmptyState>
        ) : (
          <div className="grid grid-2" style={{ gap: 14 }}>
            {/* Teaching Box */}
            <div style={{ background: 'var(--surface-2)', padding: '14px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-subtle)' }}>
              <div className="row spread" style={{ marginBottom: 10 }}>
                <span className="badge badge-teach">
                  <Icon name="book" size={13} /> Teaches ({teachSkills.length})
                </span>
                <Link to="/skills" className="xs muted font-semibold">Edit &rarr;</Link>
              </div>
              {teachSkills.length === 0 ? (
                <p className="xs muted">You have not listed any teaching skills yet.</p>
              ) : (
                <div className="row-wrap" style={{ gap: 8 }}>
                  {teachSkills.map((s) => (
                    <span key={s.id} className="badge" style={{ background: 'var(--surface-3)', color: 'var(--ink)' }}>
                      <strong>{s.name}</strong>
                      <span className="muted" style={{ fontSize: '0.75rem', marginLeft: 4 }}>({levelLabel(s.level)})</span>
                      {s.hasProof && <Icon name="doc" size={12} className="text-success" style={{ marginLeft: 4 }} />}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Learning Box */}
            <div style={{ background: 'var(--surface-2)', padding: '14px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-subtle)' }}>
              <div className="row spread" style={{ marginBottom: 10 }}>
                <span className="badge badge-learn">
                  <Icon name="spark" size={13} /> Wants to Learn ({learnSkills.length})
                </span>
                <Link to="/skills?tab=learn" className="xs muted font-semibold">Edit &rarr;</Link>
              </div>
              {learnSkills.length === 0 ? (
                <p className="xs muted">You have not added any learning goals yet.</p>
              ) : (
                <div className="row-wrap" style={{ gap: 8 }}>
                  {learnSkills.map((s) => (
                    <span key={s.id} className="badge" style={{ background: 'var(--surface-3)', color: 'var(--ink)' }}>
                      <strong>{s.name}</strong>
                      <span className="muted" style={{ fontSize: '0.75rem', marginLeft: 4 }}>({levelLabel(s.level)})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ---------- 2-COLUMN DASHBOARD GRID ---------- */}
      <div className="dash-grid">
        {/* LEFT COLUMN: SMART MATCHES & RECENT ACTIVITY */}
        <div className="stack" style={{ gap: 24 }}>
          {/* Smart Matches Widget */}
          <section className="card" aria-labelledby="dm-head">
            <div className="card-head">
              <div className="row" style={{ gap: 10 }}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="spark" size={17} />
                </span>
                <h2 id="dm-head">Smart Matches for You</h2>
              </div>
              <Link to="/smart-match" className="small font-semibold">
                View all &rarr;
              </Link>
            </div>

            {topMatches.length === 0 ? (
              <EmptyState
                icon="spark"
                title="No active matches yet"
                action={
                  <Link to="/skills" className="btn btn-primary btn-sm">
                    Add skills to match
                  </Link>
                }
              >
                List what you can teach and what you want to learn. Our engine will pair you with compatible members.
              </EmptyState>
            ) : (
              <div className="stack-sm">
                {topMatches.map((m) => (
                  <div
                    className="list-item"
                    key={m.user.id}
                    style={{
                      padding: '14px 16px',
                      background: 'var(--surface-2)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: 8,
                      border: '1px solid var(--line-subtle)',
                    }}
                  >
                    <Avatar user={m.user} />
                    <div className="grow">
                      <div className="row-wrap" style={{ gap: 8, marginBottom: 4 }}>
                        <Link
                          to={`/profile/${m.user.id}`}
                          style={{ fontWeight: 700, color: 'var(--ink)' }}
                        >
                          {m.user.name}
                        </Link>
                        {m.user.verified && <VerifiedBadge />}
                        <span className={`badge ${m.type === 'reciprocal' ? 'badge-completed' : ''}`}>
                          {m.type === 'reciprocal' ? 'Reciprocal Match' : 'One-way Match'}
                        </span>
                      </div>
                      <div className="small muted truncate">
                        {m.theyTeachYou.length > 0 && (
                          <span>
                            <strong>Teaches:</strong> {m.theyTeachYou.map((s) => s.name).join(', ')}
                          </span>
                        )}
                        {m.theyTeachYou.length > 0 && m.youTeachThem.length > 0 && ' · '}
                        {m.youTeachThem.length > 0 && (
                          <span>
                            <strong>Wants:</strong> {m.youTeachThem.map((s) => s.name).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <Link to={`/messages/${m.user.id}`} className="btn btn-secondary btn-sm">
                        <Icon name="chat" size={15} /> Message
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Activity Timeline */}
          <section className="card" aria-labelledby="da-head">
            <div className="card-head">
              <div className="row" style={{ gap: 10 }}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(5, 150, 105, 0.1)',
                    color: 'var(--success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="bell" size={17} />
                </span>
                <h2 id="da-head">Recent Activity & Updates</h2>
              </div>
              <Link to="/notifications" className="small font-semibold">
                All notifications &rarr;
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <p className="muted small" style={{ padding: '12px 0' }}>
                No recent activity yet. When someone sends a swap request, a message, or reviews your session, you will see it here.
              </p>
            ) : (
              recentActivity.map((n) => (
                <div className="list-item" key={n.id}>
                  {!n.read && <span className="dot" aria-label="Unread notification" />}
                  <Link
                    to={n.link || '/notifications'}
                    className="grow"
                    style={{ color: 'var(--ink)', textDecoration: 'none' }}
                  >
                    <div style={{ fontWeight: n.read ? 500 : 650, fontSize: '0.92rem' }}>
                      {n.message}
                    </div>
                    <div className="xs muted" style={{ marginTop: 2 }}>{timeAgo(n.createdAt)}</div>
                  </Link>
                </div>
              ))
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: SESSIONS & SWAP EXCHANGE FUNNEL */}
        <div className="stack" style={{ gap: 24 }}>
          {/* Upcoming Sessions Widget */}
          <section className="card" aria-labelledby="du-head">
            <div className="card-head">
              <div className="row" style={{ gap: 8 }}>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: 'rgba(217, 119, 6, 0.1)',
                    color: 'var(--warn)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="calendar" size={16} />
                </span>
                <h2 id="du-head">Upcoming Sessions</h2>
              </div>
              <Link to="/swaps?tab=active" className="small font-semibold">
                Manage &rarr;
              </Link>
            </div>

            {upcoming.length === 0 ? (
              <EmptyState icon="calendar" title="No upcoming sessions">
                Accepted a swap? Open your active swaps to schedule a session date and video link.
              </EmptyState>
            ) : (
              upcoming.map((s) => (
                <div
                  className="list-item"
                  key={s.id}
                  style={{
                    padding: '14px 16px',
                    background: 'var(--surface-2)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: 10,
                    border: '1px solid var(--line-subtle)',
                  }}
                >
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'var(--surface-3)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    <Icon name="calendar" size={18} />
                  </span>
                  <div className="grow">
                    <div style={{ fontWeight: 700, fontSize: '0.94rem' }} className="truncate">
                      {s.skill || 'Skill Session'}
                      {s.with ? ` with ${s.with.name}` : ''}
                    </div>
                    <div className="xs muted" style={{ marginTop: 2 }}>
                      {formatDateTime(s.scheduledAt)} ({s.durationMinutes || 60} mins)
                    </div>
                    {s.meetingLink && (
                      <div style={{ marginTop: 4 }}>
                        <a href={s.meetingLink} target="_blank" rel="noopener noreferrer" className="xs" style={{ fontWeight: 650 }}>
                          Open Virtual Meeting &rarr;
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Swap Pipeline Overview Funnel */}
          <section className="card" aria-labelledby="df-head">
            <div className="card-head">
              <div className="row" style={{ gap: 8 }}>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="swap" size={16} />
                </span>
                <h2 id="df-head">Exchange Pipeline</h2>
              </div>
              <Link to="/swaps" className="small font-semibold">
                My Swaps &rarr;
              </Link>
            </div>

            <div className="stack-sm">
              <Link to="/swaps?tab=pending" className="row spread card-hover" style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', textDecoration: 'none', color: 'inherit' }}>
                <div className="row" style={{ gap: 10 }}>
                  <span className="dot" style={{ background: '#d97706' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Proposals in Review</span>
                </div>
                <span className="font-bold" style={{ color: 'var(--ink)' }}>
                  {stats.totalPendingRequests ?? 0}
                </span>
              </Link>

              <Link to="/swaps?tab=active" className="row spread card-hover" style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', textDecoration: 'none', color: 'inherit' }}>
                <div className="row" style={{ gap: 10 }}>
                  <span className="dot" style={{ background: '#6366f1' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Active & Scheduled</span>
                </div>
                <span className="font-bold" style={{ color: 'var(--ink)' }}>
                  {stats.activeSwaps ?? 0}
                </span>
              </Link>

              <Link to="/swaps?tab=completed" className="row spread card-hover" style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', textDecoration: 'none', color: 'inherit' }}>
                <div className="row" style={{ gap: 10 }}>
                  <span className="dot" style={{ background: '#059669' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Completed Exchanges</span>
                </div>
                <span className="font-bold" style={{ color: 'var(--ink)' }}>
                  {stats.completedSwaps ?? 0}
                </span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
