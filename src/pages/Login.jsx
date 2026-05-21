import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { authApi } from '../services/api';
import { renderGoogleButton } from '../services/googleAuth';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const { loginWithData, toast } = useApp();
  const [step,    setStep]    = useState('input');
  const [email,   setEmail]   = useState('');
  const [password, setPassword] = useState('');
  const [otp,     setOtp]     = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastOtp, setLastOtp] = useState('');
  const googleButtonRef = useRef(null);

  const handleGoogleCredential = async (response) => {
    setLoading(true);
    try {
      const data = await authApi.googleAuth(response.credential);
      if (data.isNewUser) {
        localStorage.setItem('tm_pending_google', JSON.stringify(data.googleProfile));
        toast('Google verified. Complete your profile.', 's');
        navigate('/register');
        return;
      }
      loginWithData(data.user);
      toast('Signed in with Google ✅', 's');
      redirect(data.user.role);
    } catch (err) { toast(err.message, 'e'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (step !== 'input') return;
    let cancelled = false;
    renderGoogleButton(googleButtonRef.current, (r) => { if (!cancelled) handleGoogleCredential(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, [step]);

  const redirect = (role) => {
    if (role === 'ADMIN')        navigate('/admin/dashboard');
    else if (role === 'TEACHER') navigate('/teacher/dashboard');
    else                          navigate('/student/dashboard');
  };

  const sendOtp = async () => {
    if (!email.trim()) { toast('Enter your email address', 'e'); return; }
    setLoading(true);
    try {
      if (isAdmin) {
        if (!password) { toast('Enter admin password', 'e'); return; }
        const data = await authApi.adminLogin({ email: email.trim(), password });
        loginWithData(data.user);
        toast('Admin signed in', 's');
        navigate('/admin/dashboard');
        return;
      }
      const data = await authApi.sendLoginOtp(email.trim());
      if (data.devMode && data.otp) {
        setLastOtp(data.otp);
        toast(`📧 Dev Mode OTP: ${data.otp}`, 'i');
        setOtp(data.otp);
      } else {
        toast('OTP sent to your email ✅', 's');
      }
      setStep('otp');
    } catch (err) { toast(err.message, 'e'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) { toast('Enter the 6-digit OTP', 'e'); return; }
    setLoading(true);
    try {
      const data = await authApi.verifyLoginOtp(email.trim(), otp);
      loginWithData(data.user);
      toast('Welcome back! ✅', 's');
      redirect(data.user.role);
    } catch (err) { toast(err.message, 'e'); }
    finally { setLoading(false); }
  };

  // ── Admin login — calls backend directly, no OTP ──
  const handleAdminClick = async () => {
    setIsAdmin(true);
    setEmail('admin@tutormatch.in');
    setPassword('');
    setStep('input');
    setOtp('');
    return;
    setLoading(true);
    try {
      const data = await authApi.adminLogin();
      loginWithData(data.user);
      toast('Admin signed in ✅', 's');
      navigate('/admin/dashboard');
    } catch (err) {
      toast(err.message, 'e');
      setIsAdmin(true);
      setEmail('admin@tutormatch.in');
      setStep('input');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout page-enter">
      <div className="auth-left">
        <div className="auth-left-orb auth-left-orb-1" />
        <div className="auth-left-orb auth-left-orb-2" />
        <div className="auth-left-content">
          <div style={{ fontSize:52, marginBottom:24 }}>TM</div>
          <h2 className="auth-left-title">Welcome Back!</h2>
          <p className="auth-left-sub">Log in with your registered email. No password needed.</p>
          <div className="auth-stats-box">
            <div><div className="auth-stat-num">12K+</div><div className="auth-stat-lbl">Students</div></div>
            <div><div className="auth-stat-num">4.8K+</div><div className="auth-stat-lbl">Tutors</div></div>
          </div>
          {/* 🔐 Admin Login Button */}
          <div style={{ marginTop:32 }}>
            <button
              className="btn btn-sm"
              style={{ background:'rgba(255,255,255,.15)', color:'#fff', border:'1px solid rgba(255,255,255,.3)', borderRadius:8, fontSize:12, padding:'8px 16px' }}
              onClick={handleAdminClick}
              disabled={loading}
            >
              🔐 Admin Login
            </button>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">
          {isAdmin && (
            <div style={{ background:'#fff3cd', border:'1px solid #ffc107', borderRadius:10, padding:'10px 14px', marginBottom:18, fontSize:13, display:'flex', alignItems:'center', gap:10 }}>
              <span>🔐</span>
              <div><strong>Admin Login Mode</strong> — static admin account ready</div>
              <button style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#666', fontSize:16 }} onClick={() => { setIsAdmin(false); setEmail(''); setStep('input'); setOtp(''); }}>✕</button>
            </div>
          )}

          <h1 className="auth-title">{isAdmin ? 'Admin Login' : 'Log In'}</h1>
          <p className="auth-sub">
            Don't have an account?{' '}
            <span className="auth-link" onClick={() => navigate('/register')}>Register here</span>
          </p>

          {step === 'input' ? (
            <>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-icon-wrap">
                  <span className="input-prefix">@</span>
                  <input
                    className="form-input input-with-icon"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendOtp()}
                    autoFocus
                  />
                </div>
              </div>
              {isAdmin && (
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="input-icon-wrap">
                    <span className="input-prefix">🔒</span>
                    <input
                      className="form-input input-with-icon"
                      type="password"
                      placeholder="Enter admin password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendOtp()}
                    />
                  </div>
                </div>
              )}
              <button className="btn btn-lg btn-primary btn-w-full" onClick={sendOtp} disabled={loading}>
                {loading ? 'Signing in...' : isAdmin ? 'Enter Admin Panel' : 'Send OTP →'}
              </button>
              {!isAdmin && (
                <>
                  <div className="auth-divider"><div className="auth-divider-line"/><span>or</span><div className="auth-divider-line"/></div>
                  <div ref={googleButtonRef} className="google-rendered-btn" />
                </>
              )}
            </>
          ) : (
            <>
              <div style={{ background:'var(--gold-p)', border:'1px solid rgba(245,166,35,.3)', borderRadius:12, padding:16, marginBottom:24 }}>
                <div style={{ fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:14, color:'var(--navy)', marginBottom:4 }}>OTP sent to: {email}</div>
                {lastOtp && (
                  <div style={{ fontSize:13, color:'var(--gray)', marginTop:6, display:'flex', alignItems:'center', gap:8 }}>
                    <span>⚡ Dev mode — OTP auto-filled:</span>
                    <strong style={{ color:'var(--gold)', fontSize:16, letterSpacing:2 }}>{lastOtp}</strong>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Enter 6-digit OTP</label>
                <input
                  className="form-input"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  style={{ textAlign:'center', fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:28, letterSpacing:10 }}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                  onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                  autoFocus
                />
                <div className="otp-timer">
                  Wrong OTP?{' '}
                  <span className="auth-link" onClick={() => { setStep('input'); setOtp(''); setLastOtp(''); }}>Resend OTP</span>
                </div>
              </div>

              <button className="btn btn-lg btn-primary btn-w-full" onClick={verifyOtp} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Log In →'}
              </button>
              <button className="btn btn-md btn-soft btn-w-full" style={{ marginTop:10 }} onClick={() => { setStep('input'); setOtp(''); setLastOtp(''); }}>
                ← Change Email
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
