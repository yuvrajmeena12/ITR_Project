import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useAsync, useDocumentTitle } from '../hooks/useAsync';
import { Icon, ProgressBar, VerifiedBadge } from '../components/ui';

const STEPS = [
  {
    num: '01',
    title: 'List Your Skills',
    text: 'Publish what you can teach and pin the subjects or tools you are excited to master next.',
    icon: 'book',
  },
  {
    num: '02',
    title: 'Discover Matches',
    text: 'Browse the open Explore catalogue or let our Smart Match engine find reciprocal partners.',
    icon: 'search',
  },
  {
    num: '03',
    title: 'Direct Chat',
    text: 'Introduce yourself, align on session scope and expectations before submitting any request.',
    icon: 'chat',
  },
  {
    num: '04',
    title: 'Request a Swap',
    text: 'Propose an exchange with an agreed skill or keep it open for flexible mutual mentoring.',
    icon: 'swap',
  },
  {
    num: '05',
    title: 'Schedule & Meet',
    text: 'Pick a date and meeting link right inside the platform with built-in time zone handling.',
    icon: 'calendar',
  },
  {
    num: '06',
    title: 'Rate & Verify',
    text: 'Both partners confirm completion and leave genuine reviews, climbing the road to Verified.',
    icon: 'star',
  },
];

export default function Home() {
  useDocumentTitle('Peer-to-Peer Knowledge Exchange');
  const { user } = useAuth();
  const { data } = useAsync(() => api.get('/public/overview').then((r) => r.data), []);

  return (
    <>
      {/* ---------- HERO SECTION ---------- */}
      <section className="hero">
        <div className="hero-inner">
          <div className="stack" style={{ gap: 20 }}>
            <div>
              <span className="hero-badge">
                <Icon name="spark" size={15} />
                <span>Zero Currency Exchange · Pure Knowledge Barter</span>
              </span>
            </div>

            <h1>
              Teach what you master.{' '}
              <span className="gradient-text">Learn what you crave.</span>
            </h1>

            <p className="lead">
              Everyone is world-class at something. SkillSwap unites designers, engineers, linguists,
              and artists to trade skills directly. Swap your React expertise for conversational Spanish,
              or your guitar mastery for UI design.
            </p>

            <div className="row-wrap" style={{ gap: 14 }}>
              {user ? (
                <>
                  <Link to="/dashboard" className="btn btn-primary btn-lg">
                    Go to Dashboard <Icon name="arrow" size={17} />
                  </Link>
                  <Link to="/explore" className="btn btn-secondary btn-lg">
                    Explore Skills
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary btn-lg">
                    Get Started Free <Icon name="arrow" size={17} />
                  </Link>
                  <Link to="/login" className="btn btn-secondary btn-lg">
                    Sign In
                  </Link>
                  <Link to="/login" state={{ from: '/explore' }} className="btn btn-ghost btn-lg">
                    Browse Skills
                  </Link>
                </>
              )}
            </div>

            {/* Live Community Counters */}
            <div
              className="row-wrap"
              style={{
                marginTop: 18,
                paddingTop: 20,
                borderTop: '1px solid var(--line)',
                gap: 24,
              }}
            >
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--ink)' }}>
                  {data ? `${data.members.toLocaleString()}+` : '1,200+'}
                </div>
                <div className="xs muted" style={{ fontWeight: 600 }}>Active Members</div>
              </div>
              <div style={{ width: 1, height: 32, background: 'var(--line)' }} />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--primary)' }}>
                  {data ? `${data.skills.toLocaleString()}+` : '3,500+'}
                </div>
                <div className="xs muted" style={{ fontWeight: 600 }}>Skills Catalogued</div>
              </div>
              <div style={{ width: 1, height: 32, background: 'var(--line)' }} />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--success)' }}>
                  {data ? `${data.completedSwaps.toLocaleString()}+` : '850+'}
                </div>
                <div className="xs muted" style={{ fontWeight: 600 }}>Completed Swaps</div>
              </div>
            </div>
          </div>

          {/* Interactive Match Visualizer Card */}
          <div className="match-demo" aria-label="Interactive reciprocal swap preview">
            <div className="row spread" style={{ marginBottom: 16 }}>
              <div className="row" style={{ gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: 'var(--success)',
                    display: 'inline-block',
                    boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
                  }}
                />
                <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Live Match Engine</span>
              </div>
              <span className="badge badge-completed">100% Reciprocal</span>
            </div>

            <div className="stack" style={{ gap: 14 }}>
              <div className="match-line">
                <div className="grow">
                  <div style={{ fontWeight: 700 }}>Asha Chen</div>
                  <div className="xs muted">Senior Full-Stack Engineer</div>
                </div>
                <div className="row-wrap" style={{ gap: 6 }}>
                  <span className="badge badge-teach">Teaches Python</span>
                  <span className="badge badge-learn">Wants UI/UX</span>
                </div>
              </div>

              <div
                className="center"
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '-4px 0'
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: 'var(--primary-gradient)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-glow)'
                  }}
                >
                  <Icon name="swap" size={20} />
                </div>
              </div>

              <div className="match-line">
                <div className="grow">
                  <div style={{ fontWeight: 700 }}>Ravi Patel</div>
                  <div className="xs muted">Product Designer</div>
                </div>
                <div className="row-wrap" style={{ gap: 6 }}>
                  <span className="badge badge-teach">Teaches UI/UX</span>
                  <span className="badge badge-learn">Wants Python</span>
                </div>
              </div>

              <div className="alert alert-success" style={{ fontSize: '0.86rem' }}>
                <Icon name="check" size={17} />
                <span>
                  <strong>Perfect Symmetry Found:</strong> Asha teaches what Ravi desires, and Ravi teaches what Asha needs.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="section" id="how" aria-labelledby="how-heading">
        <div className="section-head">
          <span className="badge badge-teach" style={{ marginBottom: 10 }}>Frictionless Workflow</span>
          <h2 id="how-heading">From first skill to trusted reputation</h2>
          <p>SkillSwap removes the noise and financial friction so you can focus on pure peer-to-peer growth.</p>
        </div>

        <ol className="steps">
          {STEPS.map((s) => (
            <li className="step" key={s.title}>
              <div className="row spread" style={{ marginBottom: 12 }}>
                <div className="step-num">{s.num}</div>
                <span style={{ color: 'var(--primary-light)' }}>
                  <Icon name={s.icon} size={20} />
                </span>
              </div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: 6 }}>{s.title}</h3>
              <p className="small muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- LIVE SKILLS SHOWCASE ---------- */}
      <section className="section-alt" aria-labelledby="live-heading">
        <div className="section">
          <div className="row spread" style={{ flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            <div>
              <span className="badge badge-learn" style={{ marginBottom: 8 }}>Explore Catalog</span>
              <h2 id="live-heading">Skills being offered right now</h2>
              <p className="muted" style={{ marginTop: 4 }}>
                Real members ready to exchange their knowledge today.
              </p>
            </div>
            <Link to={user ? '/explore' : '/register'} className="btn btn-secondary">
              View All Skills <Icon name="arrow" size={16} />
            </Link>
          </div>

          {data && data.recent && data.recent.length > 0 ? (
            <div className="grid grid-3">
              {data.recent.map((s, i) => (
                <div className="card card-hover stack-sm" key={`${s.name}-${i}`}>
                  <div className="row spread">
                    <span className="badge badge-teach">{s.category || 'General'}</span>
                    <span className="badge">{s.level || 'All Levels'}</span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', marginTop: 4 }}>{s.name}</h3>
                  <p className="small muted">
                    Open for exchange sessions, mentorship, or code/design reviews.
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-3">
              {['Full-Stack JavaScript', 'UI/UX & Design Systems', 'Machine Learning Foundations', 'Public Speaking', 'Digital Photography', 'Music Production'].map((title, i) => (
                <div className="card card-hover stack-sm" key={i}>
                  <div className="row spread">
                    <span className="badge badge-teach">Popular</span>
                    <span className="badge">Intermediate</span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', marginTop: 4 }}>{title}</h3>
                  <p className="small muted">Available for immediate mutual exchange sessions.</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- SMART MATCH SPOTLIGHT ---------- */}
      <section className="section">
        <div className="grid grid-2" style={{ alignItems: 'center', gap: 40 }}>
          <div className="card stack" style={{ padding: 32, background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-2) 100%)' }}>
            <div className="state-icon" style={{ margin: 0 }}>
              <Icon name="spark" size={30} />
            </div>
            <h2>Smart Match Algorithm</h2>
            <p className="muted" style={{ lineHeight: 1.6 }}>
              Forget endless cold searching. Our matching engine analyzes what you can teach and cross-references it with what you want to learn across the entire member community.
            </p>
            <div className="stack-sm">
              <div className="row small" style={{ gap: 10 }}>
                <Icon name="check" size={18} className="text-success" />
                <span>Instant identification of reciprocal matches</span>
              </div>
              <div className="row small" style={{ gap: 10 }}>
                <Icon name="check" size={18} className="text-success" />
                <span>One-way fallback matching for targeted learning</span>
              </div>
              <div className="row small" style={{ gap: 10 }}>
                <Icon name="check" size={18} className="text-success" />
                <span>Direct pre-swap chat to calibrate syllabus and pace</span>
              </div>
            </div>
          </div>

          <div className="card stack" style={{ padding: 32, background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-2) 100%)' }}>
            <div className="state-icon" style={{ margin: 0 }}>
              <Icon name="shield" size={30} />
            </div>
            <div className="row-wrap" style={{ gap: 10 }}>
              <h2>Earned Verification</h2>
              <VerifiedBadge />
            </div>
            <p className="muted" style={{ lineHeight: 1.6 }}>
              Unlike pay-to-win platforms, our Verified badge cannot be purchased. It is unlocked exclusively by completing 5 verified swaps, both confirmed by your partners with honest ratings.
            </p>
            <div>
              <ProgressBar value={60} max={100} label="Example Road to Verification: 3 of 5 Swaps" showPercent />
            </div>
            <div className="small muted">
              Real social proof, zero fake testimonials.
            </div>
          </div>
        </div>
      </section>

      {/* ---------- CALL TO ACTION ---------- */}
      {!user && (
        <section
          className="section"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 60%, #312e81 100%)',
            borderRadius: 'var(--radius-lg)',
            color: '#ffffff',
            margin: '40px auto 80px',
            textAlign: 'center',
            padding: '64px 32px',
            boxShadow: 'var(--shadow-xl)',
            maxWidth: 1160,
          }}
        >
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.84rem',
              fontWeight: 700,
              display: 'inline-block',
              marginBottom: 16,
            }}
          >
            Start Your Journey Today
          </span>
          <h2 style={{ color: '#ffffff', fontSize: 'clamp(2rem, 4vw, 2.8rem)', marginBottom: 12 }}>
            Ready to trade skills with peers globally?
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.85)', maxWidth: 560, margin: '0 auto 28px', fontSize: '1.1rem' }}>
            Sign up in 60 seconds with instant email code verification. No credit card required.
          </p>
          <Link
            to="/register"
            className="btn btn-lg"
            style={{
              background: '#ffffff',
              color: 'var(--primary)',
              fontWeight: 750,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            }}
          >
            Join SkillSwap Free
          </Link>
        </section>
      )}

      {/* ---------- MODERN FOOTER ---------- */}
      <footer className="footer">
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div className="row" style={{ gap: 10 }}>
            <span className="brand-mark" style={{ width: 28, height: 28 }}>
              <Icon name="swap" size={16} />
            </span>
            <strong style={{ color: 'var(--ink)' }}>SkillSwap</strong>
            <span>· Peer-to-Peer Knowledge Economy</span>
          </div>
          <div className="xs muted">
            © {new Date().getFullYear()} SkillSwap Inc. All rights reserved. Built with pride for passionate learners.
          </div>
        </div>
      </footer>
    </>
  );
}
