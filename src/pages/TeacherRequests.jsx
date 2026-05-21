import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import { teacherApi } from '../services/api';
import './StudentDashboard.css';

const NAV = [
  { type:'section', label:'Main' },
  { icon:'📊', label:'Overview',          path:'/teacher/dashboard'  },
  { icon:'🔍', label:'Browse Students',   path:'/teacher/students'   },
  { icon:'🔓', label:'Unlocked Profiles', path:'/teacher/unlocked'   },
  { icon:'📨', label:'Sent Requests',     path:'/teacher/requests'   },
  { icon:'👤', label:'My Profile',        path:'/teacher/profile'    },
  { icon:'🪙', label:'Buy Coins',         path:'/teacher/coins'      },
  { icon:'📋', label:'Coin History',      path:'/teacher/history'    },
  { type:'divider' },
  { type:'section', label:'Settings' },
  { icon:'⚙️', label:'Settings',          path:'/teacher/settings'   },
  { icon:'🚪', label:'Log Out', logout:true },
];

export default function TeacherRequests() {
  const { user, toast } = useApp();
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('ALL');
  const name = user?.teacher?.name || user?.email || 'Teacher';

  useEffect(() => {
    teacherApi.getSentRequests()
      .then(d => setRequests(d.requests || []))
      .catch(() => toast('Failed to load requests', 'e'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? requests : requests.filter(r => r.status === filter);

  const statusColor = { PENDING:'badge-amber', ACCEPTED:'badge-green', REJECTED:'badge-red' };

  return (
    <div className="page-enter" style={{ paddingTop:66 }}>
      <Sidebar items={NAV} userName={name} userRole="Teacher Account" avClass="av-gold" initials={name[0]} />
      <main className="dash-main">
        <h1 className="page-title">Sent Requests</h1>
        <p className="page-sub">Track all contact requests you've sent to students</p>

        <div style={{ display:'flex', gap:8, marginBottom:24 }}>
          {['ALL','PENDING','ACCEPTED','REJECTED'].map(f => (
            <button key={f} className={`btn btn-sm ${filter===f?'btn-navy':'btn-soft'}`} onClick={() => setFilter(f)}>
              {f==='ALL' ? `All (${requests.length})` : `${f.charAt(0)+f.slice(1).toLowerCase()} (${requests.filter(r=>r.status===f).length})`}
            </button>
          ))}
        </div>

        {loading && <div style={{ textAlign:'center', padding:48, color:'var(--gray-l)' }}>Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:64, background:'#fff', borderRadius:18, border:'1px solid var(--border)' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📭</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:20, color:'var(--navy)', marginBottom:8 }}>No requests yet</div>
            <div style={{ color:'var(--gray)', fontSize:14 }}>Unlock student profiles and send contact requests to see them here.</div>
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {filtered.map(r => (
            <div key={r.id} className="request-card">
              <div className="request-card-top">
                <div className="av av-md av-navy">{r.student?.name?.[0] || 'S'}</div>
                <div className="request-card-info">
                  <div className="request-teacher-name">{r.student?.name}</div>
                  <div className="request-teacher-meta">{r.student?.class} · {(r.student?.subjects||[]).join(', ')} · {r.student?.city}</div>
                  <div style={{ fontSize:12, color:'var(--gray-l)', marginTop:6 }}>
                    Sent {new Date(r.sentAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    {r.respondedAt && ` · Responded ${new Date(r.respondedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}`}
                  </div>
                </div>
                <span className={`badge ${statusColor[r.status] || 'badge-gray'}`}>{r.status}</span>
              </div>
              {r.message && <div className="request-message">"{r.message}"</div>}
              {r.status === 'ACCEPTED' && (
                <div style={{ marginTop:12, padding:'10px 14px', background:'var(--green-l)', borderRadius:10, fontSize:13, fontWeight:700, color:'var(--green-d)' }}>
                  ✅ Student accepted your request! Their number is in your unlocked profiles.
                </div>
              )}
              {r.status === 'REJECTED' && (
                <div style={{ marginTop:12, padding:'10px 14px', background:'var(--red-l)', borderRadius:10, fontSize:13, color:'var(--red-d)' }}>
                  Request rejected by student.
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
