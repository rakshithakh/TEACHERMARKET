import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { authApi } from '../services/api';
import { renderGoogleButton } from '../services/googleAuth';
import './Auth.css';
import './Register.css';

const SUBJECTS = ['Mathematics','Physics','Chemistry','Biology','English','Hindi','Social Science','Computer Science','Economics','Accountancy'];

export default function Register() {
  const navigate = useNavigate();
  const { loginWithData, toast } = useApp();

  const [authValue, setAuthValue] = useState('');
  const [otp, setOtp]             = useState('');
  const [authStep, setAuthStep]   = useState('input'); // input | otp | verified
  const [loading, setLoading]     = useState(false);
  const [googleProfile, setGoogleProfile] = useState(null);
  const [step, setStep]           = useState(0); // multi-step form
  const [role, setRole]           = useState('STUDENT');
  const [selSubjects, setSelSubjects] = useState([]);
  const googleButtonRef = useRef(null);
  const [form, setForm] = useState({
    firstName:'', lastName:'', email:'', phone:'', city:'', state:'Madhya Pradesh',
    class:'', board:'CBSE', timing:'Evening',
    qualification:'', experience:'1', classes:'Class 9-12', monthlyFee:'',
    area:'', address:'', pincode:'', guardianName:'', guardianPhone:'',
    teachingMode:"At Student's Home", about:'',
  });

  const fset = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleSubject = (s) => setSelSubjects(p => p.includes(s) ? p.filter(x=>x!==s) : [...p,s]);

  // Handle pending Google profile
  useEffect(() => {
    const pending = localStorage.getItem('tm_pending_google');
    if (!pending) return;
    try {
      const profile = JSON.parse(pending);
      localStorage.removeItem('tm_pending_google');
      setGoogleProfile(profile);
      setAuthStep('verified');
      setForm(prev => ({
        ...prev,
        email: profile.email || '',
        firstName: profile.name?.split(' ')[0] || '',
        lastName:  profile.name?.split(' ').slice(1).join(' ') || '',
      }));
    } catch {}
  }, []);

  const handleGoogleCredential = async (response) => {
    setLoading(true);
    try {
      const data = await authApi.googleAuth(response.credential);
      if (!data.isNewUser) {
        if (!data.user?.role) throw new Error('Google login needs OTP for this account. Please use email OTP.');
        loginWithData(data.user, data.token);
        toast('Signed in with Google ✅', 's');
        navigate(String(data.user.role).toUpperCase() === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard');
        return;
      }
      const profile = data.googleProfile;
      setGoogleProfile(profile);
      setForm(prev => ({
        ...prev,
        email: profile.email || '',
        firstName: profile.name?.split(' ')[0] || '',
        lastName:  profile.name?.split(' ').slice(1).join(' ') || '',
      }));
      setAuthStep('verified');
      toast('Google verified. Complete your profile.', 's');
    } catch (err) { toast(err.message, 'e'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (authStep !== 'input') return;
    let cancelled = false;
    renderGoogleButton(googleButtonRef.current, (r) => { if (!cancelled) handleGoogleCredential(r); })
      .catch(e => toast(e.message || 'Google failed', 'e'));
    return () => { cancelled = true; };
  }, [authStep]);

  const sendOtp = async () => {
    if (loading) return;
    if (!authValue.trim()) { toast('Enter your email', 'e'); return; }
    setLoading(true);
    try {
      const data = await authApi.sendEmailOtp(authValue.trim());
      if (data.devMode && data.otp) {
        toast(`📧 Dev Mode — OTP: ${data.otp}`, 'i');
      } else {
        toast('OTP sent to your email ✅', 's');
      }
      setAuthStep('otp');
    } catch (err) { toast(err.message, 'e'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (loading) return;
    if (otp.length < 6) { toast('Enter the 6-digit OTP', 'e'); return; }
    setLoading(true);
    try {
      await authApi.verifyEmailOtp(authValue.trim(), otp);
      setForm(prev => ({ ...prev, email: authValue.trim() }));
      setAuthStep('verified');
      toast('Email verified ✅', 's');
    } catch (err) { toast(err.message, 'e'); }
    finally { setLoading(false); }
  };

  const submit = async () => {
    if (selSubjects.length === 0) { toast('Select at least one subject', 'e'); return; }
    setLoading(true);
    try {
      const name = `${form.firstName} ${form.lastName}`.trim();
      const body = {
        email: form.email || authValue,
        phone: form.phone || null,
        role,
        googleId: googleProfile?.googleId || null,
        studentDetails: role === 'STUDENT' ? {
          name, class: form.class, board: form.board, subjects: selSubjects,
          address: form.address, area: form.area, city: form.city, state: form.state,
          pincode: form.pincode, contactNumber: form.phone,
          guardianName: form.guardianName, guardianPhone: form.guardianPhone,
          timing: form.timing, notes: form.about,
        } : null,
        teacherDetails: role === 'TEACHER' ? {
          name, qualification: form.qualification, experience: form.experience,
          subjects: selSubjects, classes: form.classes, monthlyFee: form.monthlyFee,
          area: form.area, city: form.city, state: form.state, pincode: form.pincode,
          teachingMode: form.teachingMode, about: form.about,
        } : null,
      };
      const data = await authApi.register(body);
      if (!data.user?.role) throw new Error('Account created but login data was missing. Please log in.');
      loginWithData(data.user, data.token);
      toast('Account created! Welcome 🎉', 's');
      navigate(role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard');
    } catch (err) { toast(err.message, 'e'); }
    finally { setLoading(false); }
  };

  // ── Render auth step (Step 0) ──────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="auth-layout page-enter">
        <div className="auth-left">
          <div className="auth-left-orb auth-left-orb-1" />
          <div className="auth-left-orb auth-left-orb-2" />
          <div className="auth-left-content">
            <div style={{ fontSize:52, marginBottom:24 }}>TM</div>
            <h2 className="auth-left-title">Join TeacherMarket</h2>
            <p className="auth-left-sub">Create your account in minutes. No password needed.</p>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-wrap">
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-sub">Already have one? <span className="auth-link" onClick={() => navigate('/login')}>Log in</span></p>

            {authStep === 'input' && (
              <>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="input-icon-wrap">
                    <span className="input-prefix">@</span>
                    <input className="form-input input-with-icon" type="email" placeholder="your@email.com"
                      value={authValue} onChange={e => setAuthValue(e.target.value)} onKeyDown={e => e.key==='Enter'&&sendOtp()} />
                  </div>
                </div>
                <button className="btn btn-lg btn-primary btn-w-full" onClick={sendOtp} disabled={loading}>{loading?'Sending...':'Send OTP'}</button>
                <div className="auth-divider"><div className="auth-divider-line"/><span>or</span><div className="auth-divider-line"/></div>
                <div ref={googleButtonRef} className="google-rendered-btn" />
              </>
            )}

            {authStep === 'otp' && (
              <>
                <div style={{ background:'var(--gold-p)', border:'1px solid rgba(245,166,35,.3)', borderRadius:12, padding:16, marginBottom:24 }}>
                  <div style={{ fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:14, color:'var(--navy)', marginBottom:4 }}>OTP sent to</div>
                  <div style={{ fontSize:13, color:'var(--gray)' }}>{authValue}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Enter 6-digit OTP</label>
                  <input className="form-input" type="text" maxLength={6} placeholder="000000"
                    style={{ textAlign:'center', fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:24, letterSpacing:8 }}
                    value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} autoFocus />
                  <div className="otp-timer">Didn't receive? <span className="auth-link" onClick={()=>{setAuthStep('input');setOtp('');}}>Resend</span></div>
                </div>
                <button className="btn btn-lg btn-primary btn-w-full" onClick={verifyOtp} disabled={loading}>{loading?'Verifying...':'Verify Email'}</button>
              </>
            )}

            {authStep === 'verified' && (
              <>
                <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:13, color:'#166534', display:'flex', alignItems:'center', gap:8 }}>
                  ✅ Email verified: <strong>{form.email || authValue}</strong>
                </div>
                {/* Role select */}
                <div className="form-group">
                  <label className="form-label">I am a</label>
                  <div className="role-select-row">
                    {['STUDENT','TEACHER'].map(r => (
                      <div key={r} className={`role-card ${role===r?'active':''}`} onClick={() => setRole(r)}>
                        <span style={{ fontSize:28 }}>{r==='STUDENT'?'👨‍🎓':'👩‍🏫'}</span>
                        <span style={{ fontWeight:700, marginTop:4 }}>{r==='STUDENT'?'Student':'Teacher'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="btn btn-lg btn-primary btn-w-full" onClick={() => setStep(1)}>Continue →</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Multi-step form (Step 1+) ──────────────────────────────────────────────
  const totalSteps = role === 'STUDENT' ? 3 : 3;
  const progress = Math.round((step / totalSteps) * 100);

  return (
    <div className="auth-layout page-enter">
      <div className="auth-left">
        <div className="auth-left-orb auth-left-orb-1" />
        <div className="auth-left-orb auth-left-orb-2" />
        <div className="auth-left-content">
          <div style={{ fontSize:52, marginBottom:24 }}>TM</div>
          <h2 className="auth-left-title">Almost there!</h2>
          <p className="auth-left-sub">Fill in your details so {role==='STUDENT'?'teachers':'students'} can find you.</p>
          <div className="reg-progress-wrap">
            <div className="reg-progress-bar" style={{ width:`${progress}%` }} />
          </div>
          <div style={{ color:'rgba(255,255,255,.7)', fontSize:13, marginTop:8 }}>Step {step} of {totalSteps}</div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <>
              <h1 className="auth-title">Basic Info</h1>
              <div className="reg-grid-2">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input className="form-input" placeholder="John" value={form.firstName} onChange={e=>fset('firstName',e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input className="form-input" placeholder="Doe" value={form.lastName} onChange={e=>fset('lastName',e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone (optional)</label>
                <input className="form-input" placeholder="9876543210" value={form.phone} onChange={e=>fset('phone',e.target.value)} />
              </div>
              <div className="reg-grid-2">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" placeholder="Bhopal" value={form.city} onChange={e=>fset('city',e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Area / Locality</label>
                  <input className="form-input" placeholder="Arera Colony" value={form.area} onChange={e=>fset('area',e.target.value)} />
                </div>
              </div>
              <div className="reg-grid-2">
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-input" value={form.state} onChange={e=>fset('state',e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input className="form-input" placeholder="462001" value={form.pincode} onChange={e=>fset('pincode',e.target.value)} />
                </div>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button className="btn btn-md btn-soft" onClick={()=>setStep(0)}>← Back</button>
                <button className="btn btn-lg btn-primary" style={{ flex:1 }} onClick={()=>{
                  if (!form.firstName||!form.city) { toast('First name and city required','e'); return; }
                  setStep(2);
                }}>Continue →</button>
              </div>
            </>
          )}

          {/* Step 2: Role-specific */}
          {step === 2 && role === 'STUDENT' && (
            <>
              <h1 className="auth-title">Academic Info</h1>
              <div className="reg-grid-2">
                <div className="form-group">
                  <label className="form-label">Class</label>
                  <select className="form-input" value={form.class} onChange={e=>fset('class',e.target.value)}>
                    <option value="">Select class</option>
                    {['Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10','Class 11','Class 12'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Board</label>
                  <select className="form-input" value={form.board} onChange={e=>fset('board',e.target.value)}>
                    {['CBSE','ICSE','MP Board','UP Board','Other'].map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Guardian Name</label>
                <input className="form-input" placeholder="Parent/Guardian" value={form.guardianName} onChange={e=>fset('guardianName',e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Home Address</label>
                <input className="form-input" placeholder="Full address" value={form.address} onChange={e=>fset('address',e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Timing</label>
                <select className="form-input" value={form.timing} onChange={e=>fset('timing',e.target.value)}>
                  {['Morning','Afternoon','Evening','Flexible'].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button className="btn btn-md btn-soft" onClick={()=>setStep(1)}>← Back</button>
                <button className="btn btn-lg btn-primary" style={{ flex:1 }} onClick={()=>{
                  if (!form.class) { toast('Select your class','e'); return; }
                  setStep(3);
                }}>Continue →</button>
              </div>
            </>
          )}

          {step === 2 && role === 'TEACHER' && (
            <>
              <h1 className="auth-title">Teaching Info</h1>
              <div className="form-group">
                <label className="form-label">Qualification</label>
                <input className="form-input" placeholder="B.Ed, M.Sc, etc." value={form.qualification} onChange={e=>fset('qualification',e.target.value)} />
              </div>
              <div className="reg-grid-2">
                <div className="form-group">
                  <label className="form-label">Experience (years)</label>
                  <input className="form-input" type="number" min="0" value={form.experience} onChange={e=>fset('experience',e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Fee (₹)</label>
                  <input className="form-input" type="number" placeholder="2000" value={form.monthlyFee} onChange={e=>fset('monthlyFee',e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Classes Taught</label>
                <select className="form-input" value={form.classes} onChange={e=>fset('classes',e.target.value)}>
                  {['Class 1-5','Class 6-8','Class 9-10','Class 11-12','Class 9-12','All Classes'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Teaching Mode</label>
                <select className="form-input" value={form.teachingMode} onChange={e=>fset('teachingMode',e.target.value)}>
                  {["At Student's Home","At My Home","Online","Both"].map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button className="btn btn-md btn-soft" onClick={()=>setStep(1)}>← Back</button>
                <button className="btn btn-lg btn-primary" style={{ flex:1 }} onClick={()=>setStep(3)}>Continue →</button>
              </div>
            </>
          )}

          {/* Step 3: Subjects + Finish */}
          {step === 3 && (
            <>
              <h1 className="auth-title">Subjects</h1>
              <p style={{ color:'var(--gray)', fontSize:14, marginBottom:16 }}>Select the subjects you {role==='STUDENT'?'need help with':'teach'}.</p>
              <div className="subject-grid">
                {SUBJECTS.map(s => (
                  <div key={s} className={`subject-chip ${selSubjects.includes(s)?'active':''}`} onClick={()=>toggleSubject(s)}>{s}</div>
                ))}
              </div>
              <div className="form-group" style={{ marginTop:16 }}>
                <label className="form-label">About {role==='STUDENT'?'(optional notes)':'yourself'}</label>
                <textarea className="form-input" rows={3} placeholder="Tell us more..." value={form.about} onChange={e=>fset('about',e.target.value)} style={{ resize:'vertical' }} />
              </div>
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button className="btn btn-md btn-soft" onClick={()=>setStep(2)}>← Back</button>
                <button className="btn btn-lg btn-primary" style={{ flex:1 }} onClick={submit} disabled={loading}>
                  {loading ? 'Creating account...' : '🎉 Create Account'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
