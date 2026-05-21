import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { leadsApi } from '../services/api';
import Sidebar from '../components/Sidebar';

const NAV = [
  { type:'section', label:'Main' },
  { icon:'📊', label:'Dashboard',       path:'/student/dashboard' },
  { icon:'➕', label:'Post Requirement', path:'/student/post'      },
  { icon:'📋', label:'My Requirements', path:'/student/leads'     },
  { icon:'👤', label:'My Profile',      path:'/student/profile'   },
  { type:'divider' },
  { type:'section', label:'Settings' },
  { icon:'⚙️', label:'Settings',        path:'/student/settings'  },
  { icon:'🚪', label:'Log Out', logout:true },
];

const REQ_TYPES = [
  'Online Coaching', 'Spoken English', 'School Tuition', 'College Subjects',
  'Software Learning', 'Assignment / Project Work', 'Other'
];

const COUNTRIES = ['India', 'USA', 'UK', 'Canada', 'Australia', 'UAE', 'Other'];

export default function StudentPostLead() {
  const { user, toast } = useApp();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);

  const [form, setForm] = useState({
    name:            user?.student?.name || '',
    email:           user?.email || '',
    mobile:          user?.student?.contactNumber || user?.phone || '',
    country:         'India',
    city:            user?.student?.city || '',
    subject:         '',
    requirementType: '',
    description:     '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast('File too large. Max 5MB.', 'e'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setFile({ data: ev.target.result, name: f.name, type: f.type, size: f.size });
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    if (!form.name || !form.mobile || !form.requirementType || !form.description) {
      toast('Please fill Name, Mobile, Requirement Type, and Description.', 'e'); return;
    }
    if (form.description.length < 20) { toast('Description must be at least 20 characters.', 'e'); return; }
    setSaving(true);
    try {
      const payload = { ...form, fileAttachment: file?.data || null, fileName: file?.name || null, fileType: file?.type || null };
      await leadsApi.post(payload);
      toast('Requirement posted! Admin will review and publish it. ✅', 's');
      navigate('/student/leads');
    } catch(err) { toast(err.message, 'e'); }
    finally { setSaving(false); }
  };

  return (
    <div className="dash-layout">
      <Sidebar nav={NAV} user={user} />
      <main className="dash-main">
        <div className="dash-inner" style={{ maxWidth: 720 }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', marginBottom: 4 }}>Post a Requirement</h1>
            <p style={{ fontSize: 13, color: 'var(--gray)' }}>It's completely free. Admin will review and publish your requirement for teachers.</p>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 28 }}>
            {/* Personal Info */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: 'var(--gold-p)', border: '1px solid var(--gold)', borderRadius: 6, padding: '2px 10px' }}>1</span>
                Personal Information
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" placeholder="Your full name" value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number *</label>
                  <input className="form-input" placeholder="+91 XXXXX XXXXX" value={form.mobile} onChange={e => set('mobile', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" placeholder="your@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <select className="form-input" value={form.country} onChange={e => set('country', e.target.value)}>
                    {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">City / Location</label>
                  <input className="form-input" placeholder="e.g. Bhopal, Mumbai, New York" value={form.city} onChange={e => set('city', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Requirement */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: 'var(--gold-p)', border: '1px solid var(--gold)', borderRadius: 6, padding: '2px 10px' }}>2</span>
                Requirement Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Requirement Type *</label>
                  <select className="form-input" value={form.requirementType} onChange={e => set('requirementType', e.target.value)}>
                    <option value="">— Select type —</option>
                    {REQ_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject / Class</label>
                  <input className="form-input" placeholder="e.g. Maths Class 10, React.js, IELTS" value={form.subject} onChange={e => set('subject', e.target.value)} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 14 }}>
                <label className="form-label">Description *</label>
                <textarea
                  className="form-input"
                  rows={5}
                  style={{ resize: 'vertical' }}
                  placeholder="Describe your requirement in detail — schedule, level, specific topics, deadline (for assignments), etc. Min 20 characters."
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                />
                <div style={{ fontSize: 11, color: form.description.length < 20 ? 'var(--red)' : 'var(--gray)', marginTop: 4 }}>
                  {form.description.length} / 20 min chars
                </div>
              </div>
            </div>

            {/* File upload */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: 'var(--gold-p)', border: '1px solid var(--gold)', borderRadius: 6, padding: '2px 10px' }}>3</span>
                Attach File <span style={{ fontWeight: 400, color: 'var(--gray)' }}>(Optional)</span>
              </div>
              <div
                style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '20px', textAlign: 'center', cursor: 'pointer', background: file ? 'var(--green-l)' : '#fafbfc' }}
                onClick={() => document.getElementById('file-upload').click()}
              >
                {file ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>📎</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{file.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray)' }}>{(file.size/1024).toFixed(1)} KB</div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setFile(null); }} style={{ marginLeft: 8, background: 'var(--red-l)', border: 'none', borderRadius: 6, padding: '3px 8px', color: 'var(--red)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Remove</button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>📎</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>Click to attach file</div>
                    <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>PDF, Word, Image — Max 5MB. For assignments, share the question paper here.</div>
                  </>
                )}
                <input id="file-upload" type="file" style={{ display: 'none' }} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.xlsx,.ppt,.pptx" onChange={handleFile} />
              </div>
            </div>

            <div style={{ background: 'var(--amber-l)', borderRadius: 10, padding: '12px 16px', marginBottom: 22, fontSize: 12, color: '#78350f' }}>
              ⚠️ <strong>Privacy notice:</strong> Your mobile number and email will be hidden from teachers until they unlock your profile. Admin reviews all leads before publishing.
            </div>

            <button className="btn btn-lg btn-primary" style={{ width: '100%' }} onClick={submit} disabled={saving}>
              {saving ? 'Submitting…' : 'Submit Requirement →'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
