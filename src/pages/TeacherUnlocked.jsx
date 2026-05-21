import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import { studentsApi } from '../services/api';
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

export default function TeacherUnlocked() {
  const { user, toast } = useApp();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const name = user?.teacher?.name || user?.email || 'Teacher';

  useEffect(() => {
    studentsApi.getUnlocked()
      .then(d => setStudents(d.students || []))
      .catch(() => toast('Failed to load', 'e'))
      .finally(() => setLoading(false));
  }, []);

  const copyPhone = async (phone) => {
    if (!phone) {
      toast('No phone number available', 'e');
      return;
    }
    try {
      await navigator.clipboard.writeText(phone);
      toast('Phone number copied', 's');
    } catch {
      toast(phone, 'i');
    }
  };

  const filtered = students.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-enter" style={{ paddingTop:66 }}>
      <Sidebar items={NAV} userName={name} userRole="Teacher Account" avClass="av-gold" initials={name[0]} />
      <main className="dash-main">
        <h1 className="page-title">Unlocked Profiles</h1>
        <p className="page-sub">{students.length} students unlocked - full contact details visible</p>
        <div style={{ marginBottom:20 }}>
          <input className="form-input" style={{ maxWidth:280 }} placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {loading && <div style={{ textAlign:'center', padding:48, color:'var(--gray-l)' }}>Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:64, background:'#fff', borderRadius:18, border:'1px solid var(--border)' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:20, color:'var(--navy)', marginBottom:8 }}>No unlocked profiles yet</div>
            <div style={{ color:'var(--gray)', fontSize:14 }}>Browse students and unlock profiles to see their contact details here.</div>
          </div>
        )}
        <div className="card">
          {filtered.length > 0 && (
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Student</th><th>Class</th><th>Subjects</th><th>Phone</th><th>Address</th><th>Coins</th><th>Action</th></tr></thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div className="av av-xs av-navy">{s.name?.[0] || 'S'}</div>
                          <div>
                            <div style={{ fontWeight:700 }}>{s.name}</div>
                            <div style={{ fontSize:11, color:'var(--gray-l)' }}>{s.city}</div>
                          </div>
                        </div>
                      </td>
                      <td>{s.class}</td>
                      <td>{(s.subjects || []).map(sub => <span key={sub} className="subject-pill" style={{ marginRight:4 }}>{sub}</span>)}</td>
                      <td style={{ fontWeight:700, color:'var(--navy)' }}>{s.phone}</td>
                      <td style={{ fontSize:12 }}>{s.area && `${s.area}, `}{s.city}</td>
                      <td><span className="badge badge-gold">{s.coinsSpent === 0 ? 'Free' : `${s.coinsSpent} coins`}</span></td>
                      <td>
                        <button className="btn btn-xs btn-primary" onClick={() => copyPhone(s.phone)}>Copy Number</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
