import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import { profileApi } from '../services/api';

const NAV = [
  { type:'section', label:'Main' },
  { icon:'📊', label:'Overview',      path:'/student/dashboard' },
  { icon:'👤', label:'My Profile',    path:'/student/profile'   },
  { icon:'🔍', label:'Find Teachers', path:'/student/teachers'  },
  { type:'divider' },
  { type:'section', label:'Settings' },
  { icon:'⚙️', label:'Settings',      path:'/student/settings'  },
  { icon:'🚪', label:'Log Out', logout:true },
];

export default function StudentProfile() {
  const { user, updateUser, toast } = useApp();
  const [saving, setSaving] = useState(false);
  const s = user?.student || {};
  const name = s.name || user?.email || 'Student';

  const [form, setForm] = useState({
    name: s.name || '', class: s.class || '', board: s.board || 'CBSE',
    city: s.city || '', area: s.area || '', address: s.address || '',
    pincode: s.pincode || '', subjects: s.subjects || '',
    timing: s.timing || 'Evening', guardianName: s.guardianName || '',
    guardianPhone: s.guardianPhone || '', notes: s.notes || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!s.name && !loading) {
      setLoading(true);
      profileApi.getStudent()
        .then(data => {
          setForm({
            name: data.name || '',
            class: data.class || '',
            board: data.board || 'CBSE',
            city: data.city || '',
            area: data.area || '',
            address: data.address || '',
            pincode: data.pincode || '',
            subjects: Array.isArray(data.subjects) ? data.subjects.join(', ') : (data.subjects || ''),
            timing: data.timing || 'Evening',
            guardianName: data.guardianName || '',
            guardianPhone: data.guardianPhone || '',
            notes: data.notes || '',
          });
          updateUser({ student: data });
        })
        .catch(err => console.error('Failed to load profile:', err.message))
        .finally(() => setLoading(false));
    }
  }, [s.name, loading, updateUser]);

  const fset = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const data = await profileApi.update({ name: form.name, studentDetails: form });
      updateUser(data.user);
      toast('Profile saved ✅', 's');
    } catch (err) { toast(err.message, 'e'); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-enter" style={{ paddingTop:66 }}>
      <Sidebar items={NAV} userName={name} userRole="Student Account" avClass="av-navy" initials={name[0]} />
      <main className="dash-main">
        <h1 className="page-title">My Profile</h1>
        <p className="page-sub">Manage your student profile — teachers see this information</p>
        <div className="profile-layout">
          <div>
            <div className="profile-sidebar-card">
              <div className="psb-top">
                <div className="av av-xl av-navy" style={{ margin:'0 auto' }}>{name[0]}</div>
                <div className="psb-name">{name}</div>
                <div className="psb-role">Student · {s.class || 'Class not set'}</div>
                <div style={{ display:'flex', justifyContent:'center', marginTop:12 }}>
                  <span className="badge badge-green">🟢 Profile Active</span>
                </div>
              </div>
              <div className="psb-body">
                <div className="psb-row"><span className="psb-key">Class</span><span className="psb-val">{s.class || '—'}</span></div>
                <div className="psb-row"><span className="psb-key">Board</span><span className="psb-val">{s.board || '—'}</span></div>
                <div className="psb-row"><span className="psb-key">City</span><span className="psb-val">{s.city || '—'}</span></div>
                <div className="psb-row"><span className="psb-key">Phone</span><span className="psb-val">{user?.phone || '—'}</span></div>
                {s.subjects && <div style={{ marginTop:14 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-l)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:8 }}>Subjects</div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    {s.subjects.split(',').map(sub => <span key={sub} className="subject-pill">{sub.trim()}</span>)}
                  </div>
                </div>}
              </div>
            </div>
          </div>
          <div className="card card-p">
            <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:16, color:'var(--navy)', paddingBottom:14, borderBottom:'1px solid var(--border)', marginBottom:20 }}>Personal Information</div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={form.name} onChange={e=>fset('name',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Class</label>
                <select className="form-select" value={form.class} onChange={e=>fset('class',e.target.value)}>
                  {['Class 6','Class 7','Class 8','Class 9','Class 10','Class 11 — Science','Class 12 — Science','Class 12 — Commerce'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Board</label>
                <select className="form-select" value={form.board} onChange={e=>fset('board',e.target.value)}>
                  {['CBSE','ICSE','MP Board','State Board'].map(b=><option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Preferred Timing</label>
                <select className="form-select" value={form.timing} onChange={e=>fset('timing',e.target.value)}>
                  {['Morning (6–10 AM)','Afternoon (12–4 PM)','Evening (4–8 PM)','Flexible'].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:16, color:'var(--navy)', paddingBottom:14, borderBottom:'1px solid var(--border)', margin:'20px 0' }}>Address</div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">City</label><input className="form-input" value={form.city} onChange={e=>fset('city',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Area / Locality</label><input className="form-input" value={form.area} onChange={e=>fset('area',e.target.value)} placeholder="e.g. Arera Colony"/></div>
            </div>
            <div className="form-group"><label className="form-label">Full Address</label><textarea className="form-textarea" value={form.address} onChange={e=>fset('address',e.target.value)}/></div>
            <div className="form-group"><label className="form-label">PIN Code</label><input className="form-input" value={form.pincode} onChange={e=>fset('pincode',e.target.value)} maxLength={6}/></div>
            <div className="form-group"><label className="form-label">Subjects Required</label><input className="form-input" value={form.subjects} onChange={e=>fset('subjects',e.target.value)} placeholder="Maths, Science, English"/><div className="form-hint">Comma-separated</div></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Guardian's Name</label><input className="form-input" value={form.guardianName} onChange={e=>fset('guardianName',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Guardian's Phone</label><input className="form-input" type="tel" value={form.guardianPhone} onChange={e=>fset('guardianPhone',e.target.value)}/></div>
            </div>
            <div className="form-group"><label className="form-label">Notes for Teachers</label><textarea className="form-textarea" value={form.notes} onChange={e=>fset('notes',e.target.value)} placeholder="Availability, budget, preferences…"/></div>
            <button className="btn btn-md btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </div>
      </main>
    </div>
  );
}
