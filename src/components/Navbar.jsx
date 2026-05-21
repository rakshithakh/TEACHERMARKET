import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, coins } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  const isLanding = location.pathname === '/';
  const isTeacher = user?.role === 'TEACHER';
  const isPortal = location.pathname.startsWith('/teacher') || location.pathname.startsWith('/student');

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const fn = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleLogout = () => { logout(); setDropOpen(false); navigate('/'); };
  const initials = user?.student?.name?.[0] || user?.teacher?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U';
  const displayName = user?.student?.name || user?.teacher?.name || user?.email || 'User';
  const navClass = ['topnav', scrolled ? 'scrolled' : '', isLanding ? 'dark-nav' : ''].filter(Boolean).join(' ');

  return (
    <nav className={navClass}>
      {user && isPortal && (
        <button className="mobile-back-btn" type="button" onClick={() => navigate(-1)} aria-label="Go back">
          Back
        </button>
      )}
      <Link to="/" className="brand">
        <div className="brand-icon">TM</div>
        <div className="brand-text">Teacher<span>Market</span></div>
      </Link>
      <div className="nav-right">
        {!user ? (
          <>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/login')}>Log In</button>
            <button className="btn btn-sm btn-primary" onClick={() => navigate('/register')}>Get Started</button>
          </>
        ) : (
          <>
            {isTeacher && <div className="nav-coin-pill"><span>{coins}</span> coins</div>}
            <div className="nav-av-wrap" ref={dropRef}>
              <div className={`nav-av ${isTeacher ? 'av-gold' : 'av-navy'}`} onClick={() => setDropOpen(o => !o)}>{initials}</div>
              <div className={`nav-drop ${dropOpen ? 'open' : ''}`}>
                <div className="nd-user-info"><div className="nd-name">{displayName}</div><div className="nd-role">{isTeacher ? 'Teacher' : 'Student'}</div></div>
                {isTeacher && <div className="nd-coin"><span className="nd-coin-num">{coins}</span><span style={{ fontSize:11, color:'var(--gray)' }}>coins</span></div>}
                <div className="nd-item" onClick={() => { setDropOpen(false); navigate(isTeacher ? '/teacher/dashboard' : '/student/dashboard'); }}>Dashboard</div>
                <div className="nd-item" onClick={() => { setDropOpen(false); navigate(isTeacher ? '/teacher/profile' : '/student/profile'); }}>My Profile</div>
                {isTeacher && <div className="nd-item" onClick={() => { setDropOpen(false); navigate('/teacher/coins'); }}>Buy Coins</div>}
                <div className="nd-item danger" onClick={handleLogout}>Log Out</div>
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
