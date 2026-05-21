import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, coins } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled,  setScrolled]  = useState(false);
  const [dropOpen,  setDropOpen]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const dropRef = useRef(null);

  const isLanding = location.pathname === '/';
  const isTeacher = user?.role === 'TEACHER';
  const isAdmin   = user?.role === 'ADMIN';
  const isPortal  = location.pathname.startsWith('/teacher') ||
                    location.pathname.startsWith('/student')  ||
                    location.pathname.startsWith('/admin');

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleLogout = () => { logout(); setDropOpen(false); setMenuOpen(false); navigate('/'); };
  const initials    = user?.student?.name?.[0] || user?.teacher?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U';
  const displayName = user?.student?.name || user?.teacher?.name || user?.email || 'User';
  const navClass    = ['topnav', scrolled ? 'scrolled' : '', isLanding ? 'dark-nav' : ''].filter(Boolean).join(' ');

  if (isAdmin) return <nav className={navClass} style={{ display: 'none' }} />;

  const navLinks = [['FAQ', '/faq'], ['Contact', '/contact']];

  return (
    <>
      <nav className={navClass}>
        {user && isPortal && (
          <button className="mobile-back-btn" type="button" onClick={() => navigate(-1)} aria-label="Go back">
            ← Back
          </button>
        )}

        <Link to="/" className="brand">
          <div className="brand-icon">TM</div>
          <div className="brand-text">Teacher<span>Market</span></div>
        </Link>

        {/* Desktop nav */}
        <div className="nav-right nav-desktop">
          {!user ? (
            <>
              <div className="nav-links">
                {navLinks.map(([l, p]) => (
                  <span key={l} onClick={() => navigate(p)} className={`nav-link ${isLanding ? 'nav-link-light' : ''}`}>{l}</span>
                ))}
              </div>
              <button className={`btn btn-sm ${isLanding ? 'btn-login-light' : 'btn-outline'}`} onClick={() => navigate('/login')}>Log In</button>
              <button className="btn btn-sm btn-primary" onClick={() => navigate('/register')}>Get Started</button>
            </>
          ) : (
            <>
              {isTeacher && <div className="nav-coin-pill"><span>{coins}</span> coins</div>}
              <div className="nav-av-wrap" ref={dropRef}>
                <div className={`nav-av ${isTeacher ? 'av-gold' : 'av-navy'}`} onClick={() => setDropOpen(o => !o)}>{initials}</div>
                <div className={`nav-drop ${dropOpen ? 'open' : ''}`}>
                  <div className="nd-user-info"><div className="nd-name">{displayName}</div><div className="nd-role">{isTeacher ? 'Teacher' : 'Student'}</div></div>
                  {isTeacher && <div className="nd-coin"><span className="nd-coin-num">{coins}</span><span style={{ fontSize:11,color:'var(--gray)' }}>coins</span></div>}
                  <div className="nd-item" onClick={() => { setDropOpen(false); navigate(isTeacher ? '/teacher/dashboard' : '/student/dashboard'); }}>Dashboard</div>
                  <div className="nd-item" onClick={() => { setDropOpen(false); navigate(isTeacher ? '/teacher/profile' : '/student/profile'); }}>My Profile</div>
                  {isTeacher && <div className="nd-item" onClick={() => { setDropOpen(false); navigate('/teacher/coins'); }}>Buy Coins</div>}
                  <div className="nd-item danger" onClick={handleLogout}>Log Out</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Hamburger — mobile only */}
        <button
          className={`hamburger ${menuOpen ? 'open' : ''} ${isLanding ? 'hamburger-light' : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* Overlay */}
      <div className={`mobile-overlay ${menuOpen ? 'visible' : ''}`} onClick={() => setMenuOpen(false)} />

      {/* Mobile Drawer */}
      <div className={`mobile-drawer ${menuOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-header">
          <div style={{ fontFamily:"'Sora',sans-serif", fontWeight:900, fontSize:18, color:'var(--navy)' }}>
            Teacher<span style={{ color:'var(--gold)' }}>Market</span>
          </div>
          <button className="drawer-close" onClick={() => setMenuOpen(false)}>✕</button>
        </div>

        <div className="mobile-drawer-body">
          {!user ? (
            <>
              <div className="drawer-section-title">Navigation</div>
              {navLinks.map(([l, p]) => (
                <button key={l} className="drawer-link" onClick={() => { navigate(p); setMenuOpen(false); }}>{l}</button>
              ))}
              <div className="drawer-divider" />
              <button className="btn btn-md btn-outline btn-w-full drawer-action-btn" onClick={() => { navigate('/login'); setMenuOpen(false); }}>Log In</button>
              <button className="btn btn-md btn-primary btn-w-full drawer-action-btn" onClick={() => { navigate('/register'); setMenuOpen(false); }}>Get Started</button>
            </>
          ) : (
            <>
              <div className="drawer-user-card">
                <div className={`nav-av ${isTeacher ? 'av-gold' : 'av-navy'}`} style={{ width:48,height:48,fontSize:18,flexShrink:0 }}>{initials}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:15, color:'var(--navy)' }}>{displayName}</div>
                  <div style={{ fontSize:12, color:'var(--gray-l)' }}>{isTeacher ? 'Teacher Account' : 'Student Account'}</div>
                </div>
              </div>
              {isTeacher && (
                <div className="drawer-coin-row">
                  <span>🪙</span>
                  <span><strong>{coins}</strong> coins available</span>
                </div>
              )}
              <div className="drawer-divider" />
              <button className="drawer-link" onClick={() => { navigate(isTeacher ? '/teacher/dashboard' : '/student/dashboard'); setMenuOpen(false); }}>📊 Dashboard</button>
              <button className="drawer-link" onClick={() => { navigate(isTeacher ? '/teacher/profile' : '/student/profile'); setMenuOpen(false); }}>👤 My Profile</button>
              {isTeacher && <button className="drawer-link" onClick={() => { navigate('/teacher/coins'); setMenuOpen(false); }}>🪙 Buy Coins</button>}
              <div className="drawer-divider" />
              <button className="drawer-link drawer-link-danger" onClick={handleLogout}>🚪 Log Out</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
