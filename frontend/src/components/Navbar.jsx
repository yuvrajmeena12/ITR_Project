import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useInterval } from '../hooks/useAsync';
import { Avatar, Icon } from './ui';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { to: '/skills', label: 'My Skills', icon: 'book' },
  { to: '/smart-match', label: 'Smart Match', icon: 'spark' },
  { to: '/explore', label: 'Explore', icon: 'search' },
  { to: '/swaps', label: 'My Swaps', icon: 'swap' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [unread, setUnread] = useState({ messages: 0, notifications: 0 });
  const menuRef = useRef(null);

  const lastLoadedAt = useRef(0);

  const loadCounts = useCallback(async ({ force = false } = {}) => {
    if (!user) return;
    const now = Date.now();
    if (!force && now - lastLoadedAt.current < 15000) return;
    lastLoadedAt.current = now;
    try {
      const [m, n] = await Promise.all([
        api.get('/messages/unread-count'),
        api.get('/notifications/unread-count')
      ]);
      setUnread({ messages: m.data.count, notifications: n.data.count });
    } catch (_) {
      /* badges are best-effort */
    }
  }, [user]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts, location.pathname]);

  useInterval(() => loadCounts({ force: true }), 30000, Boolean(user));

  useEffect(() => {
    const onRefresh = () => loadCounts({ force: true });
    window.addEventListener('counts:refresh', onRefresh);
    return () => window.removeEventListener('counts:refresh', onRefresh);
  }, [loadCounts]);

  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menu) return undefined;
    const onDown = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false);
    const onKey = (e) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const onLogout = async () => {
    setMenu(false);
    await logout();
    navigate('/', { replace: true });
  };

  const pill = (n) =>
    n > 0 ? (
      <span className="count-pill" aria-hidden="true">
        {n > 9 ? '9+' : n}
      </span>
    ) : null;

  return (
    <header className="navbar">
      <nav className="navbar-inner" aria-label="Main">
        <Link to={user ? '/dashboard' : '/'} className="brand">
          <span className="brand-mark">
            <Icon name="swap" size={18} />
          </span>
          <span>SkillSwap</span>
        </Link>

        {user ? (
          <>
            <div className="nav-links">
              {LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                >
                  <Icon name={l.icon} size={16} />
                  <span>{l.label}</span>
                </NavLink>
              ))}
            </div>

            <div className="grow-spacer" />

            <div className="nav-actions">
              <NavLink
                to="/messages"
                className={({ isActive }) => `icon-btn${isActive ? ' active' : ''}`}
                aria-label={`Messages${unread.messages ? `, ${unread.messages} unread` : ''}`}
              >
                <Icon name="chat" size={19} />
                {pill(unread.messages)}
              </NavLink>

              <NavLink
                to="/notifications"
                className={({ isActive }) => `icon-btn${isActive ? ' active' : ''}`}
                aria-label={`Notifications${unread.notifications ? `, ${unread.notifications} unread` : ''}`}
              >
                <Icon name="bell" size={19} />
                {pill(unread.notifications)}
              </NavLink>

              <div className="menu" ref={menuRef}>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setMenu((m) => !m)}
                  aria-haspopup="menu"
                  aria-expanded={menu}
                  aria-label="Account menu"
                  style={{ border: menu ? '1.5px solid var(--primary)' : '1.5px solid transparent' }}
                >
                  <Avatar user={{ id: user.id, name: user.name, hasAvatar: user.hasAvatar }} size="sm" />
                </button>

                {menu && (
                  <div className="menu-panel" role="menu">
                    <div style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }} className="truncate">
                        {user.name}
                      </div>
                      <div className="xs muted truncate">{user.email}</div>
                    </div>
                    <div className="menu-sep" />
                    <Link role="menuitem" className="menu-item" to="/profile">
                      <Icon name="user" size={17} /> Manage Profile
                    </Link>
                    <Link role="menuitem" className="menu-item" to={`/profile/${user.id}`}>
                      <Icon name="grid" size={17} /> Public Profile
                    </Link>
                    <Link role="menuitem" className="menu-item" to="/skills">
                      <Icon name="book" size={17} /> Manage Skills
                    </Link>
                    <div className="menu-sep" />
                    <button type="button" role="menuitem" className="menu-item" onClick={onLogout} style={{ color: 'var(--danger)' }}>
                      <Icon name="logout" size={17} /> Sign out
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="icon-btn nav-burger"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-label="Toggle navigation menu"
              >
                <Icon name={open ? 'close' : 'menu'} size={20} />
              </button>
            </div>

            {open && (
              <div className="mobile-nav">
                {LINKS.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  >
                    <Icon name={l.icon} size={18} />
                    <span>{l.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grow-spacer" />
            <div className="nav-actions">
              <Link to="/login" className="btn btn-ghost btn-sm">
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Get Started
              </Link>
            </div>
          </>
        )}
      </nav>
    </header>
  );
}
