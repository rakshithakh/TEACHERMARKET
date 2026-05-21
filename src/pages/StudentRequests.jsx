import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import { studentsApi } from '../services/api';

const NAV = [
  { type:'section', label:'Main' },
  { icon:'📊', label:'Overview',      path:'/student/dashboard' },
  { icon:'👤', label:'My Profile',    path:'/student/profile'   },
  { icon:'🔍', label:'Find Teachers', path:'/student/teachers'  },
  { icon:'📋', label:'My Requests',   path:'/student/requests'  },
  { type:'divider' },
  { type:'section', label:'Settings' },
  { icon:'⚙️', label:'Settings',      path:'/student/settings'  },
  { icon:'🚪', label:'Log Out', logout:true },
];

export default function StudentRequests() {
  const { user, toast } = useApp();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter,  setFilter]    = useState('ALL');

  const name = user?.student?.name || user?.email || 'Student';

  useEffect(() => {
    studentsApi.myRequests()
      .then(d => setRequests(d.requests || []))
      .catch(() => toast('Failed to load requests', 'e'))
      .finally(() => setLoading(false));
  }, []);

  const handleRespond = async (id, status) => {
    try {
      await studentsApi.respond(id, status);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status, respondedAt: new Date().toISOString() } : r));
      toast(`Request ${status.toLowerCase()} ✅`, 's');
    } catch (err) { toast(err.message, 'e'); }
  };

  const filtered = filter === 'ALL' ? requests : requests.filter(r => r.status === filter);

  return (
    <div className="page-enter" style={{ paddingTop:66 }}>
      <Sidebar items={NAV} userName={name} userRole="Student Account" avClass="av-navy" initials={name[0]} />
      <main className="dash-main">
        <h1 className="page-title">Teacher Requests</h1>
        <p className="page-sub">Teachers who have unlocked your profile and sent a contact request</p>

        <div style={{ display:'flex', gap:8, marginBottom:24 }}>
          {['ALL','PENDING','ACCEPTED','REJECTED'].map(f => (
            <button key={f} className={`btn btn-sm ${filter===f?'btn-navy':'btn-soft'}`} onClick={() => setFilter(f)}>
              {f === 'ALL' ? `All (${requests.length})` : `${f.charAt(0)+f.slice(1).toLowerCase()} (${requests.filter(r=>r.status===f).length})`}
            </button>
          ))}
        </div>

        {loading && <div style={{textAlign:'center',padding:48,color:'var(--gray-l)'}}>Loading requests…</div>}

        {!loading && filtered.length === 0 && (
          <div style={{textAlign:'center',padding:64,background:'#fff',borderRadius:18,border:'1px solid var(--border)'}}>
            <div style={{fontSize:48,marginBottom:16}}>📭</div>
            <div style={{fontFamily:'Sora,sans-serif',fontWeight:800,fontSize:20,color:'var(--navy)',marginBottom:8}}>No {filter !== 'ALL' ? filter.toLowerCase() : ''} requests</div>
            <div style={{color:'var(--gray)',fontSize:14}}>When teachers unlock and contact you, requests will appear here.</div>
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {filtered.map(r => (
            <div key={r.id} className="request-card">
              <div className="request-card-top">
                <div className="av av-md av-gold">{r.teacher?.name?.[0] || 'T'}</div>
                <div className="request-card-info">
                  <div className="request-teacher-name">{r.teacher?.name}</div>
                  <div className="request-teacher-meta">
                    {r.teacher?.qualification} · {r.teacher?.experience} yrs exp · {r.teacher?.city}
                  </div>
                  <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                    {(r.teacher?.subjects || []).map(s => <span key={s} className="subject-pill">{s}</span>)}
                  </div>
                  <div style={{ fontSize:12, color:'var(--gray-l)', marginTop:8 }}>
                    Requested {new Date(r.sentAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    {r.respondedAt && ` · Responded ${new Date(r.respondedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}`}
                  </div>
                </div>
                <span className={`badge ${r.status==='PENDING'?'badge-amber':r.status==='ACCEPTED'?'badge-green':'badge-red'}`}>{r.status}</span>
              </div>
              {r.message && <div className="request-message">"{r.message}"</div>}
              {r.status === 'ACCEPTED' && r.teacher?.phone && (
                <div className="request-phone">
                  📞 <strong>{r.teacher.phone}</strong>
                  <span style={{ marginLeft:'auto', fontSize:12, fontWeight:500, color:'var(--green-d)' }}>Call this number to connect</span>
                </div>
              )}
              {r.status === 'PENDING' && (
                <div className="request-actions">
                  <button className="btn btn-md btn-green" onClick={() => handleRespond(r.id, 'ACCEPTED')}>✓ Accept Request</button>
                  <button className="btn btn-md btn-red"   onClick={() => handleRespond(r.id, 'REJECTED')}>✕ Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
