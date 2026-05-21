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
  const [otp, setOtp] = useState('');
  const [authStep, setAuthStep] = useState('input');
  const [loading, setLoading] = useState(false);
  const [googleProfile, setGoogleProfile] = useState(null);
  const [step, setStep] = useState(0);
  const [role, setRole] = useState('STUDENT');
  const [selSubjects, setSelSubjects] = useState([]);
  const googleButtonRef = useRef(null);
  const [form, setForm] = useState({
    firstName:'', lastName:'', email:'', phone:'', city:'', state:'Madhya Pradesh',
    class:'', board:'CBSE', timing:'Evening',
    qualification:'', experience:'1', classes:'Class 9-12', monthlyFee:'',
    area:'', address:'', pincode:'', guardianName:'', guardianPhone:'',
    teachingMode:'At Student\'s Home', about:'',
  });

  const fset = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleSubject = (s) => setSelSubjects(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

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
        lastName: profile.name?.split(' ').slice(1).join(' ') || '',
      }));
    } catch {}
  }, []);

  const handleGoogleCredential = async (response) => {
    setLoading(true);
    try {
      const data = await authApi.googleAuth(response.credential);
      if (!data.isNewUser) {
        loginWithData(data.token, data.user);
        toast('Signed in with Google', 's');
        navigate(data.user.role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard');
        return;
      }
      const profile = data.googleProfile;
      setGoogleProfile(profile);
      setForm(prev => ({
        ...prev,
        email: profile.email || '',
        firstName: profile.name?.split(' ')[0] || '',
        lastName: profile.name?.split(' ').slice(1).join(' ') || '',
      }));
      setAuthStep('verified');
      toast('Google verified. Complete your profile.', 's');
    } catch (err) {
      toast(err.message, 'e');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authStep !== 'input') return;
    let cancelled = false;
    renderGoogleButton(googleButtonRef.current, (response) => {
      if (!cancelled) handleGoogleCredential(response);
    }).catch(err => toast(err.message || 'Could not load Google Sign-In', 'e'));
    return () => { cancelled = true; };
  }, [authStep]);

  const sendOtp = async () => {
    if (!authValue.trim()) { toast('Enter your email address', 'e'); return; }
    setLoading(true);
    try {
      await authApi.sendEmailOtp(authValue.trim());
      toast('OTP sent to your email', 's');
      setAuthStep('otp');
    } catch (err) {
      toast(err.message, 'e');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) { toast('Enter the 6-digit OTP', 'e'); return; }
    setLoading(true);
    try {
      const data = await authApi.verifyEmailOtp(authValue.trim(), otp);
      if (!data.isNewUser) {
        loginWithData(data.token, data.user);
        toast('Account found. Logged in.', 's');
        navigate(data.user.role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard');
        return;
      }
      fset('email', data.verifiedEmail || authValue.trim());
      setAuthStep('verified');
      toast('Email verified. Complete your profile.', 's');
    } catch (err) {
      toast(err.message, 'e');
    } finally {
      setLoading(false);
    }
  };

  const missingMessage = (fields) => `${fields.join(', ')} ${fields.length === 1 ? 'is' : 'are'} required`;

  const validateBasicInfo = () => {
    const missing = [];
    if (!form.firstName.trim()) missing.push('First name');
    if (!form.email.trim()) missing.push('Email');
    if (!form.city.trim()) missing.push('City');
    if (missing.length) {
      toast(missingMessage(missing), 'e');
      return false;
    }
    return true;
  };

  const validateAcademicDetails = () => {
    const missing = [];
    if (role === 'STUDENT' && !form.class.trim()) missing.push('Class');
    if (role === 'TEACHER' && !form.qualification.trim()) missing.push('Qualification');
    if (selSubjects.length === 0) missing.push(role === 'STUDENT' ? 'Subjects needed' : 'Subjects you teach');
    if (missing.length) {
      toast(missingMessage(missing), 'e');
      return false;
    }
    return true;
  };

  const validateAddressDetails = () => {
    const missing = [];
    if (!form.address.trim()) missing.push('Full address');
    if (!/^\d{6}$/.test(form.pincode.trim())) missing.push('Valid 6-digit PIN code');
    if (missing.length) {
      toast(missingMessage(missing), 'e');
      return false;
    }
    return true;
  };

  const goToAcademic = () => {
    if (validateBasicInfo()) setStep(2);
  };

  const goToAddress = () => {
    if (validateAcademicDetails()) setStep(3);
  };

  const submitRegistration = async () => {
    const fullName = `${form.firstName} ${form.lastName}`.trim();
    const subjStr = selSubjects.join(',');
    if (!validateBasicInfo()) {
      setStep(1);
      return;
    }
    if (!validateAcademicDetails()) {
      setStep(2);
      return;
    }
    if (!validateAddressDetails()) {
      setStep(3);
      return;
    }

    setLoading(true);
    try {
      const body = {
        role,
        name: fullName,
        email: form.email,
        phone: form.phone || undefined,
        googleId: googleProfile?.googleId || undefined,
      };

      if (role === 'STUDENT') {
        body.studentDetails = {
          name: fullName,
          class: form.class,
          board: form.board,
          subjects: subjStr,
          address: form.address,
          area: form.area,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          contactNumber: form.phone || '',
          timing: form.timing,
          guardianName: form.guardianName,
          guardianPhone: form.guardianPhone,
        };
      } else {
        body.teacherDetails = {
          name: fullName,
          qualification: form.qualification,
          experience: parseInt(form.experience, 10) || 1,
          subjects: subjStr,
          classes: form.classes,
          location: form.area || form.city,
          area: form.area,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          monthlyFee: parseInt(form.monthlyFee, 10) || 0,
          teachingMode: form.teachingMode,
          about: form.about,
        };
      }

      const data = await authApi.register(body);
      loginWithData(data.token, data.user);
      toast('Welcome to TeacherMarket!', 's');
      setStep(5);
    } catch (err) {
      toast(err.message, 'e');
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Choose Role','Basic Info','Academic Details','Address','Done'];

  return (
    <div className="reg-layout page-enter">
      <div className="reg-left">
        <div className="reg-brand">
          <div className="brand-icon" style={{ width:36,height:36,fontSize:17 }}>TM</div>
          <div className="reg-brand-text">Teacher<span>Market</span></div>
        </div>

        {authStep !== 'verified' ? (
          <div style={{ position:'relative', zIndex:1 }}>
            <h2 style={{ color:'#fff', fontSize:22, marginBottom:12 }}>Create Account</h2>
            <p style={{ color:'rgba(255,255,255,.55)', fontSize:14, lineHeight:1.75 }}>
              Verify with Google or email, then fill your profile to get started.
            </p>
          </div>
        ) : (
          <div className="reg-steps">
            {steps.map((label, i) => {
              const cls = i < step ? 'done' : i === step ? 'current' : 'upcoming';
              return (
                <div className="reg-step-item" key={label}>
                  <div className={`reg-step-num ${cls}`}>{i < step ? '✓' : i + 1}</div>
                  <div><div className="reg-step-title">{label}</div></div>
                </div>
              );
            })}
          </div>
        )}

        <div className="reg-back-link">
          <p style={{ fontSize:13,color:'rgba(255,255,255,.4)',marginBottom:4 }}>Already have an account?</p>
          <span className="auth-link" onClick={() => navigate('/login')}>Back to Login</span>
        </div>
      </div>

      <div className="reg-right">
        <div className="reg-form-wrap">
          {authStep !== 'verified' && step < 5 && (
            <div className="reg-panel">
              {authStep === 'input' ? (
                <>
                  <h2 className="reg-form-title">Verify Your Email</h2>
                  <p className="reg-form-sub">We'll send a one-time password to confirm it's you.</p>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <div className="input-icon-wrap">
                      <span className="input-prefix">@</span>
                      <input className="form-input input-with-icon" type="email" placeholder="your@email.com" value={authValue} onChange={e => setAuthValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendOtp()} />
                    </div>
                  </div>
                  <button className="btn btn-lg btn-primary btn-w-full" onClick={sendOtp} disabled={loading}>{loading ? 'Sending...' : 'Send OTP'}</button>
                  <div className="auth-divider"><div className="auth-divider-line"/><span>or</span><div className="auth-divider-line"/></div>
                  <div ref={googleButtonRef} className="google-rendered-btn" aria-label="Continue with Google" />
                </>
              ) : (
                <>
                  <h2 className="reg-form-title">Enter OTP</h2>
                  <p className="reg-form-sub">Sent to <strong>{authValue}</strong></p>
                  <div className="form-group">
                    <label className="form-label">6-digit OTP</label>
                    <input className="form-input" type="text" maxLength={6} autoFocus placeholder="000000" style={{ textAlign:'center',fontFamily:'Sora,sans-serif',fontWeight:800,fontSize:24,letterSpacing:8 }} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} onKeyDown={e => e.key === 'Enter' && verifyOtp()} />
                    <div className="otp-timer">Didn't receive? <span className="auth-link" onClick={() => { setAuthStep('input'); setOtp(''); }}>Resend OTP</span></div>
                  </div>
                  <button className="btn btn-lg btn-primary btn-w-full" onClick={verifyOtp} disabled={loading}>{loading ? 'Verifying...' : 'Verify OTP'}</button>
                  <button className="btn btn-md btn-soft btn-w-full" style={{ marginTop:10 }} onClick={() => { setAuthStep('input'); setOtp(''); }}>Go Back</button>
                </>
              )}
            </div>
          )}

          {authStep === 'verified' && step < 5 && (
            <>
              <div className="step-dots">
                {steps.slice(0,-1).map((_,i) => <div key={i} className={`step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />)}
              </div>

              {step === 0 && (
                <div className="reg-panel">
                  <h2 className="reg-form-title">Who are you?</h2>
                  <p className="reg-form-sub">This personalises your TeacherMarket experience.</p>
                  <div className="role-cards" style={{ marginBottom:24 }}>
                    {[{id:'STUDENT',icon:'S',title:'Student',desc:'Looking for a home tutor'},{id:'TEACHER',icon:'T',title:'Teacher',desc:'Want to find tutoring gigs'}].map(r => (
                      <div key={r.id} className={`role-card ${role === r.id ? 'selected' : ''}`} onClick={() => setRole(r.id)}>
                        <div className="role-card-icon">{r.icon}</div>
                        <div className="role-card-title">{r.title}</div>
                        <div className="role-card-desc">{r.desc}</div>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-lg btn-primary btn-w-full" onClick={() => setStep(1)}>Continue</button>
                </div>
              )}

              {step === 1 && (
                <div className="reg-panel">
                  <h2 className="reg-form-title">Basic Information</h2>
                  <div className="grid-2">
                    <div className="form-group"><label className="form-label">First Name</label><input className="form-input" value={form.firstName} onChange={e => fset('firstName', e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Last Name</label><input className="form-input" value={form.lastName} onChange={e => fset('lastName', e.target.value)} /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Email Address</label><input className="form-input" type="email" value={form.email} readOnly /></div>
                  <div className="form-group"><label className="form-label">Phone Number</label><input className="form-input" type="tel" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={e => fset('phone', e.target.value)} /></div>
                  <div className="grid-2">
                    <div className="form-group"><label className="form-label">State</label><select className="form-select" value={form.state} onChange={e => fset('state', e.target.value)}>{['Madhya Pradesh','Delhi','Maharashtra','Rajasthan','Uttar Pradesh','Karnataka','Gujarat','Tamil Nadu'].map(s => <option key={s}>{s}</option>)}</select></div>
                    <div className="form-group"><label className="form-label">City</label><input className="form-input" value={form.city} onChange={e => fset('city', e.target.value)} /></div>
                  </div>
                  <div className="reg-nav-btns"><button className="btn btn-md btn-soft" onClick={() => setStep(0)}>Back</button><button className="btn btn-lg btn-primary" style={{flex:1,justifyContent:'center'}} onClick={goToAcademic}>Continue</button></div>
                </div>
              )}

              {step === 2 && (
                <div className="reg-panel">
                  <h2 className="reg-form-title">{role === 'STUDENT' ? 'Academic Details' : 'Teaching Details'}</h2>
                  {role === 'STUDENT' ? (
                    <>
                      <div className="form-group"><label className="form-label">Class / Grade</label><select className="form-select" value={form.class} onChange={e => fset('class', e.target.value)}><option value="">Select class</option>{['Class 6','Class 7','Class 8','Class 9','Class 10','Class 11 - Science','Class 11 - Commerce','Class 12 - Science','Class 12 - Commerce'].map(c => <option key={c}>{c}</option>)}</select></div>
                      <div className="form-group"><label className="form-label">Board</label><select className="form-select" value={form.board} onChange={e => fset('board', e.target.value)}>{['CBSE','ICSE','MP Board','State Board'].map(b => <option key={b}>{b}</option>)}</select></div>
                    </>
                  ) : (
                    <>
                      <div className="form-group"><label className="form-label">Highest Qualification</label><input className="form-input" value={form.qualification} onChange={e => fset('qualification', e.target.value)} /></div>
                      <div className="grid-2">
                        <div className="form-group"><label className="form-label">Experience (years)</label><input className="form-input" type="number" value={form.experience} onChange={e => fset('experience', e.target.value)} /></div>
                        <div className="form-group"><label className="form-label">Monthly Fee</label><input className="form-input" type="number" value={form.monthlyFee} onChange={e => fset('monthlyFee', e.target.value)} /></div>
                      </div>
                    </>
                  )}
                  <div className="form-group"><label className="form-label">{role === 'STUDENT' ? 'Subjects Needed' : 'Subjects You Teach'}</label><div className="subject-picker">{SUBJECTS.map(s => <div key={s} className={`subj-option ${selSubjects.includes(s) ? 'selected' : ''}`} onClick={() => toggleSubject(s)}>{s}</div>)}</div></div>
                  <div className="reg-nav-btns"><button className="btn btn-md btn-soft" onClick={() => setStep(1)}>Back</button><button className="btn btn-lg btn-primary" style={{flex:1,justifyContent:'center'}} onClick={goToAddress}>Continue</button></div>
                </div>
              )}

              {step === 3 && (
                <div className="reg-panel">
                  <h2 className="reg-form-title">Address & Details</h2>
                  <div className="form-group"><label className="form-label">Area / Locality</label><input className="form-input" value={form.area} onChange={e => fset('area', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Full Address</label><textarea className="form-textarea" value={form.address} onChange={e => fset('address', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">PIN Code</label><input className="form-input" maxLength={6} value={form.pincode} onChange={e => fset('pincode', e.target.value.replace(/\D/g,'').slice(0,6))} /></div>
                  {role === 'STUDENT' ? (
                    <div className="grid-2">
                      <div className="form-group"><label className="form-label">Guardian's Name</label><input className="form-input" value={form.guardianName} onChange={e => fset('guardianName', e.target.value)} /></div>
                      <div className="form-group"><label className="form-label">Guardian's Phone</label><input className="form-input" value={form.guardianPhone} onChange={e => fset('guardianPhone', e.target.value)} /></div>
                    </div>
                  ) : (
                    <>
                      <div className="form-group"><label className="form-label">Teaching Mode</label><select className="form-select" value={form.teachingMode} onChange={e => fset('teachingMode', e.target.value)}>{["At Student's Home","Home Visit","Online","Flexible"].map(m => <option key={m}>{m}</option>)}</select></div>
                      <div className="form-group"><label className="form-label">About You</label><textarea className="form-textarea" value={form.about} onChange={e => fset('about', e.target.value)} /></div>
                    </>
                  )}
                  <div className="reg-nav-btns"><button className="btn btn-md btn-soft" onClick={() => setStep(2)}>Back</button><button className="btn btn-lg btn-primary" style={{flex:1,justifyContent:'center'}} onClick={submitRegistration} disabled={loading}>{loading ? 'Creating Account...' : 'Create Account'}</button></div>
                </div>
              )}
            </>
          )}

          {step === 5 && (
            <div className="reg-panel" style={{ textAlign:'center' }}>
              <h2 className="reg-form-title" style={{ textAlign:'center' }}>Welcome to TeacherMarket!</h2>
              <p className="reg-form-sub" style={{ textAlign:'center' }}>Your {role === 'STUDENT' ? 'student' : 'teacher'} account is ready.</p>
              <button className="btn btn-xl btn-primary btn-w-full" onClick={() => navigate(role === 'STUDENT' ? '/student/dashboard' : '/teacher/dashboard')}>Go to Dashboard</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
