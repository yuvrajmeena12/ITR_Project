import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../api/axios';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useAsync';
import usePaginated from '../hooks/usePaginated';
import { timeAgo } from '../utils/format';
import { Button, EmptyState, ErrorState, Icon, ListSkeleton, PageHeader } from '../components/ui';

export default function Notifications() {
  useDocumentTitle('Notifications');
  const navigate = useNavigate();
  const toast = useToast();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [marking, setMarking] = useState(false);
  const query = useMemo(() => ({ unread: unreadOnly ? 'true' : undefined }), [unreadOnly]);
  const list = usePaginated('/notifications', query, String(unreadOnly), { limit: 20 });
  const hasUnread = list.items.some((n) => !n.read);

  const open = async (n) => {
    if (!n.read) {
      list.setItems((items) => items.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      api.patch(`/notifications/${n.id}/read`).then(() => window.dispatchEvent(new Event('counts:refresh'))).catch(() => {});
    }
    navigate(n.link || '/dashboard');
  };

  const markAll = async () => {
    setMarking(true);
    try {
      await api.patch('/notifications/read-all');
      list.reload();
      window.dispatchEvent(new Event('counts:refresh'));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error(apiError(err).message);
    } finally {
      setMarking(false);
    }
  };

  // Helper to determine contextual notification icon
  const getIcon = (msg) => {
    const lower = (msg || '').toLowerCase();
    if (lower.includes('swap') || lower.includes('exchange')) return 'swap';
    if (lower.includes('session') || lower.includes('schedule')) return 'calendar';
    if (lower.includes('review') || lower.includes('rating')) return 'star';
    if (lower.includes('message') || lower.includes('chat')) return 'chat';
    return 'bell';
  };

  return (
    <div className="page page-narrow">
      <PageHeader
        title="Notifications"
        subtitle="Stay updated on new swap offers, scheduled sessions, messages, and peer reviews."
      >
        <div className="seg" role="group" aria-label="Notification filter">
          <button
            type="button"
            aria-pressed={!unreadOnly}
            onClick={() => setUnreadOnly(false)}
          >
            All Updates
          </button>
          <button
            type="button"
            aria-pressed={unreadOnly}
            onClick={() => setUnreadOnly(true)}
          >
            Unread Only
          </button>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={markAll}
          loading={marking}
          disabled={!hasUnread}
        >
          <Icon name="check" size={14} /> Mark all read
        </Button>
      </PageHeader>

      {list.loading ? (
        <ListSkeleton rows={4} />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : list.items.length === 0 ? (
        <EmptyState
          icon="bell"
          title={unreadOnly ? "You're completely caught up" : 'No notifications yet'}
        >
          {unreadOnly
            ? 'You have answered all pending updates and requests.'
            : 'When members interact with your skills or send swap requests, updates will arrive here.'}
        </EmptyState>
      ) : (
        <div className="stack-sm">
          {list.items.map((n) => {
            const iconName = getIcon(n.message);
            return (
              <button
                type="button"
                key={n.id}
                className={`notif${n.read ? '' : ' unread'}`}
                onClick={() => open(n)}
              >
                {!n.read ? (
                  <span className="dot" aria-label="Unread" />
                ) : (
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'var(--surface-2)',
                      color: 'var(--ink-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={iconName} size={16} />
                  </span>
                )}
                <div className="grow">
                  <div style={{ fontWeight: n.read ? 500 : 700, fontSize: '0.94rem' }}>
                    {n.message}
                  </div>
                  <div className="xs muted" style={{ marginTop: 3 }}>
                    {timeAgo(n.createdAt)}
                  </div>
                </div>
              </button>
            );
          })}

          {list.hasMore && (
            <div className="center" style={{ marginTop: 20 }}>
              <Button
                variant="secondary"
                onClick={list.loadMore}
                loading={list.loadingMore}
                size="md"
              >
                Load Older Notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
