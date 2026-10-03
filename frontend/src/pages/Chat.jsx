import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { apiError } from '../api/axios';
import { useToast } from '../context/ToastContext';
import { useAsync, useDocumentTitle, useInterval } from '../hooks/useAsync';
import { formatTime, timeAgo } from '../utils/format';
import { Avatar, Button, EmptyState, ErrorState, Icon, ListSkeleton, Spinner, VerifiedBadge } from '../components/ui';

function Thread({ userId, onSent }) {
  const toast = useToast();
  const [state, setState] = useState({ user: null, items: [], hasMore: false, loading: true, error: null });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const bodyRef = useRef(null);
  const stick = useRef(true);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      try {
        const { data } = await api.get(`/messages/${userId}`, { params: { limit: 30 } });
        setState((s) => {
          const older = silent
            ? s.items.filter((m) => new Date(m.createdAt) < new Date(data.items[0]?.createdAt || Infinity))
            : [];
          return {
            user: data.user,
            items: [...older, ...data.items],
            hasMore: silent ? s.hasMore : data.hasMore,
            loading: false,
            error: null,
          };
        });
        if (!silent) window.dispatchEvent(new Event('counts:refresh'));
      } catch (err) {
        if (!silent) {
          setState({ user: null, items: [], hasMore: false, loading: false, error: apiError(err) });
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    stick.current = true;
    setState({ user: null, items: [], hasMore: false, loading: true, error: null });
    load();
  }, [load]);

  useInterval(() => load({ silent: true }), 6000, !state.error);

  useEffect(() => {
    if (stick.current && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [state.items]);

  const loadOlder = async () => {
    if (loadingOlder || !state.items.length) return;
    setLoadingOlder(true);
    stick.current = false;
    try {
      const { data } = await api.get(`/messages/${userId}`, {
        params: { limit: 30, before: state.items[0].createdAt },
      });
      setState((s) => ({ ...s, items: [...data.items, ...s.items], hasMore: data.hasMore }));
    } catch (err) {
      toast.error(apiError(err).message);
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/messages/${userId}`, { content });
      stick.current = true;
      setState((s) => ({ ...s, items: [...s.items, data.message] }));
      setText('');
      onSent && onSent();
    } catch (err) {
      toast.error(apiError(err).message);
    } finally {
      setSending(false);
    }
  };

  if (state.loading) {
    return (
      <div className="state" style={{ flex: 1, justifyContent: 'center' }}>
        <Spinner large />
      </div>
    );
  }

  if (state.error) {
    return (
      <ErrorState
        error={state.error}
        onRetry={() => load()}
        title="Cannot load conversation"
      />
    );
  }

  return (
    <>
      {/* Chat Thread Header */}
      <div className="chat-head">
        <Link to="/messages" className="icon-btn chat-back" aria-label="Back to conversations">
          <Icon name="arrow" size={18} />
        </Link>
        <Avatar user={state.user} size="sm" />
        <div className="grow">
          <div className="row-wrap" style={{ gap: 6 }}>
            <Link
              to={`/profile/${state.user.id}`}
              style={{ fontWeight: 750, color: 'var(--ink)', fontSize: '0.98rem' }}
            >
              {state.user.name}
            </Link>
            {state.user.verified && <VerifiedBadge />}
          </div>
          <div className="xs muted">Active member</div>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <Link to={`/profile/${state.user.id}`} className="btn btn-secondary btn-sm">
            View Profile
          </Link>
        </div>
      </div>

      {/* Message Stream */}
      <div className="chat-body" ref={bodyRef} role="log" aria-live="polite" aria-label="Direct message history">
        {state.hasMore && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ alignSelf: 'center', marginBottom: 10 }}
            onClick={loadOlder}
            disabled={loadingOlder}
          >
            {loadingOlder ? 'Loading earlier…' : 'Load earlier messages'}
          </button>
        )}

        {state.items.length === 0 && (
          <div className="state" style={{ margin: 'auto', padding: 20 }}>
            <div className="state-icon">
              <Icon name="chat" size={24} />
            </div>
            <p className="muted small center">
              This is the start of your exchange with {state.user.name}. Introduce yourself and discuss your skill goals!
            </p>
          </div>
        )}

        {state.items.map((m) => (
          <div key={m.id} className={`bubble ${m.mine ? 'mine' : 'theirs'}`}>
            <div>{m.content}</div>
            <time dateTime={m.createdAt}>{formatTime(m.createdAt)}</time>
          </div>
        ))}
      </div>

      {/* Message Composer */}
      <form className="chat-form" onSubmit={send}>
        <label className="sr-only" htmlFor="chat-input">
          Type message
        </label>
        <input
          id="chat-input"
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder={`Message ${state.user.name}… (Enter to send)`}
          autoComplete="off"
          autoFocus
        />
        <Button type="submit" loading={sending} disabled={!text.trim()}>
          Send
        </Button>
      </form>
    </>
  );
}

export default function Chat() {
  useDocumentTitle('Messages');
  const { userId } = useParams();
  const navigate = useNavigate();
  const [filterQuery, setFilterQuery] = useState('');
  const { data, loading, error, reload } = useAsync(
    () => api.get('/messages/conversations', { params: { limit: 40 } }).then((r) => r.data),
    []
  );

  useInterval(() => reload({ silent: true }), 10000);

  const filteredItems = (data?.items || []).filter((c) =>
    c.user.name.toLowerCase().includes(filterQuery.toLowerCase().trim())
  );

  return (
    <div className="page" style={{ paddingBottom: 24 }}>
      <div className={`chat-shell${userId ? ' has-thread' : ''}`}>
        {/* Left Sidebar: Conversations List */}
        <div className="chat-list" aria-label="Conversation list">
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 12 }}>Messages</h2>
            <div className="input-wrap">
              <input
                type="search"
                className="input"
                placeholder="Search conversations…"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                style={{ minHeight: 38, fontSize: '0.88rem' }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 16 }}>
              <ListSkeleton rows={4} />
            </div>
          ) : error ? (
            <div style={{ padding: 16 }}>
              <ErrorState error={error} onRetry={reload} />
            </div>
          ) : data.items.length === 0 ? (
            <div style={{ padding: 24 }}>
              <EmptyState
                icon="chat"
                title="No conversations yet"
                action={
                  <Link to="/explore" className="btn btn-primary btn-sm">
                    Explore Skills
                  </Link>
                }
              >
                Send a message from any skill card or Smart Match to connect with partners.
              </EmptyState>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <p className="small muted">No conversations match “{filterQuery}”</p>
            </div>
          ) : (
            filteredItems.map((c) => (
              <button
                type="button"
                key={c.user.id}
                className={`chat-item${userId === String(c.user.id) ? ' active' : ''}`}
                onClick={() => navigate(`/messages/${c.user.id}`)}
              >
                <Avatar user={c.user} size="sm" />
                <div className="grow">
                  <div className="row spread" style={{ marginBottom: 2 }}>
                    <strong className="truncate" style={{ fontSize: '0.94rem', color: 'var(--ink)' }}>
                      {c.user.name}
                    </strong>
                    <span className="xs muted">{timeAgo(c.lastMessage.createdAt)}</span>
                  </div>
                  <div className="row spread">
                    <span className="small muted truncate">
                      {c.lastMessage.mine ? 'You: ' : ''}
                      {c.lastMessage.content}
                    </span>
                    {c.unread > 0 && <span className="count-pill">{c.unread}</span>}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right Pane: Active Thread or Empty State */}
        <div className="chat-pane">
          {userId ? (
            <Thread key={userId} userId={userId} onSent={() => reload({ silent: true })} />
          ) : (
            <div className="state" style={{ flex: 1, justifyContent: 'center' }}>
              <div className="state-icon">
                <Icon name="chat" size={32} />
              </div>
              <h3 style={{ fontSize: '1.4rem' }}>Select a Conversation</h3>
              <p className="muted" style={{ maxWidth: 360 }}>
                Choose a conversation from the sidebar, or message someone directly from Explore or Smart Match.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
