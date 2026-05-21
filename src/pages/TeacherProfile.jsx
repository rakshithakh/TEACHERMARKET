import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import { profileApi } from '../services/api';
import './StudentDashboard.css';

const NAV = [
  { type:'section', label:'Main' },
  { icon:'📊', label:'Overview',          path:'/teacher/dashboard'  },
  { icon:'🔍', label:'Browse Students',   path:'/teacher/students'   },
  { icon:'🔓', label:'Unlocked Profiles', path:'/teacher/unlocked'   },
  { icon:'👤', label:'My Profile',        path:'/teacher/profile'    },
  { icon:'🪙', label:'Buy Coins',         path:'/teacher/coins'      },
  { icon:'📋', label:'Coin History',      path:'/teacher/history'    },
  { type:'divider' },
  { type:'section', label:'Settings' },
  { icon:'⚙️', label:'Settings',          path:'/teacher/settings'   },
  { icon:'🚪', label:'Log Out', logout:true },
];

export default function TeacherProfile() {
  const { user, coins, updateUser, toast } = useApp();
  const [saving, setSaving] = useState(false);
  const t = user?.teacher || {};
  const name = t.name || user?.email || 'Teacher';

  const [form, setForm] = useState({
    name: t.name || '', qualification: t.qualification || '',
    experience: t.experience || 1, monthlyFee: t.monthlyFee || '',
    subjects: t.subjects || '', classes: t.classes || 'Class 9-12',
    city: t.city || '', area: t.area || '', state: t.state || 'Madhya Pradesh',
    pincode: t.pincode || '', teachingMode: t.teachingMode || "At Student's Home",
    about: t.about || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!t.name && !loading) {
      setLoading(true);
      profileApi.getTeacher()
        .then(data => {
          setForm({
            name: data.name || '',
            qualification: data.qualification || '',
            experience: data.experience || 1,
            monthlyFee: data.monthlyFee || '',
            subjects: Array.isArray(data.subjects) ? data.subjects.join(', ') : (data.subjects || ''),
            classes: data.classes || 'Class 9-12',
            city: data.city || '',
            area: data.area || '',
            state: data.state || 'Madhya Pradesh',
            pincode: data.pincode || '',
            teachingMode: data.teachingMode || "At Student's Home",
            about: data.about || '',
          });
          updateUser({ teacher: data });
        })
        .catch(err => console.error('Failed to load profile:', err.message))
        .finally(() => setLoading(false));
    }
  }, [t.name, loading, updateUser]);

  const fset = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const data = await profileApi.update({ name: form.name, teacherDetails: form });
      updateUser(data.user);
      toast('Profile updated ✅', 's');
    } catch (err) { toast(err.message, 'e'); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-enter" style={{ paddingTop:66 }}>
      <Sidebar items={NAV} userName={name} userRole="Teacher Account" avClass="av-gold" initials={name[0]} />
      <main className="dash-main">
        <h1 className="page-title">My Profile</h1>
        <p className="page-sub">Update your teaching profile — students and the platform see this</p>
        <div className="profile-layout">
          <div>
            <div className="profile-sidebar-card">
              <div className="psb-top" style={{ background:'linear-gradient(135deg,var(--gold-d),var(--gold))' }}>
                <div className="av av-xl av-navy" style={{ margin:'0 auto' }}>{name[0]}</div>
                <div className="psb-name" style={{ color:'var(--navy)' }}>{name}</div>
                <div className="psb-role" style={{ color:'rgba(15,29,61,.6)' }}>Teacher · {t.city || 'City not set'}</div>
                <div style={{ display:'flex', justifyContent:'center', marginTop:12 }}>
                  <span className="badge badge-green">🟢 Profile Active</span>
                </div>
              </div>
              <div className="psb-body">
                <div className="psb-row"><span className="psb-key">Qualification</span><span className="psb-val">{t.qualification || '—'}</span></div>
                <div className="psb-row"><span className="psb-key">Experience</span><span className="psb-val">{t.experience ? `${t.experience} yrs` : '—'}</span></div>
                <div className="psb-row"><span className="psb-key">City</span><span className="psb-val">{t.city || '—'}</span></div>
                <div className="psb-row"><span className="psb-key">Coins</span><span className="psb-val" style={{ color:'var(--gold)' }}>🪙 {coins}</span></div>
                {t.subjects && <div style={{ marginTop:14 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-l)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:8 }}>Subjects</div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    {t.subjects.split(',').map(s => <span key={s} className="subject-pill">{s.trim()}</span>)}
                  </div>
                </div>}
              </div>
            </div>
          </div>
          <div className="card card-p">
            <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:16, color:'var(--navy)', paddingBottom:14, borderBottom:'1px solid var(--border)', marginBottom:20 }}>Professional Information</div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={form.name} onChange={e=>fset('name',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Qualification</label><input className="form-input" value={form.qualification} onChange={e=>fset('qualification',e.target.value)} placeholder="e.g. M.Sc Mathematics"/></div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Experience (years)</label><input className="form-input" type="number" value={form.experience} onChange={e=>fset('experience',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Monthly Fee (₹)</label><input className="form-input" type="number" value={form.monthlyFee} onChange={e=>fset('monthlyFee',e.target.value)}/></div>
            </div>
            <div className="form-group"><label className="form-label">Subjects You Teach</label><input className="form-input" value={form.subjects} onChange={e=>fset('subjects',e.target.value)} placeholder="Maths, Physics, Chemistry"/><div className="form-hint">Comma-separated</div></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Classes</label>
                <select className="form-select" value={form.classes} onChange={e=>fset('classes',e.target.value)}>
                  {['All Classes','Class 1–5','Class 6–8','Class 9–10','Class 11–12','Competitive Exams'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Teaching Mode</label>
                <select className="form-select" value={form.teachingMode} onChange={e=>fset('teachingMode',e.target.value)}>
                  {["At Student's Home","Home Visit","Online","Flexible"].map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">City</label><input className="form-input" value={form.city} onChange={e=>fset('city',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Area / Locality</label><input className="form-input" value={form.area} onChange={e=>fset('area',e.target.value)}/></div>
            </div>
            <div className="form-group"><label className="form-label">About You</label><textarea className="form-textarea" value={form.about} onChange={e=>fset('about',e.target.value)} placeholder="Describe your teaching style, achievements, approach…"/></div>
            <button className="btn btn-md btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </div>
      </main>
    </div>
  );
}
