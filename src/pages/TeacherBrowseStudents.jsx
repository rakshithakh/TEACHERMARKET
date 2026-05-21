import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function TeacherBrowseStudents() {
  const { user, coins, updateCoins, toast } = useApp();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [freeViews, setFreeViews] = useState(2);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [cls, setCls] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [unlocking, setUnlocking] = useState(false);

  const name = user?.teacher?.name || user?.email || 'Teacher';

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (subject) params.subject = subject;
    if (cls) params.cls = cls;
    studentsApi.browse(params)
      .then(d => {
        setStudents(d.students || []);
        setTotal(d.total || 0);
        setFreeViews(d.freeViews ?? 2);
        updateCoins(d.coinBalance ?? coins);
      })
      .catch(() => toast('Failed to load students', 'e'))
      .finally(() => setLoading(false));
  }, [subject, cls]);

  useEffect(() => { load(); }, [load]);

  const filtered = students.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.subjects.some(sub => sub.toLowerCase().includes(search.toLowerCase()))
  );

  const handleUnlock = async () => {
    if (!confirmId) return;
    setUnlocking(true);
    try {
      const data = await studentsApi.unlock(confirmId);
      updateCoins(data.coinBalance);
      setFreeViews(data.freeViews ?? freeViews);
      toast(data.message, 's');
      setStudents(prev => prev.map(s => s.id === confirmId ? { ...s, isUnlocked: true, ...data.student } : s));
      setConfirmId(null);
    } catch (err) {
      toast(err.message, 'e');
      if (err.message.includes('coin') || err.message.includes('Insufficient')) navigate('/teacher/coins');
    } finally {
      setUnlocking(false);
    }
  };

  const copyPhone = async (phone) => {
    if (!phone) {
      toast('No phone number available yet', 'e');
      return;
    }
    try {
      await navigator.clipboard.writeText(phone);
      toast('Phone number copied', 's');
    } catch {
      toast(phone, 'i');
    }
  };

  return (
    <div className="page-enter" style={{ paddingTop:66 }}>
      <Sidebar items={NAV} userName={name} userRole="Teacher Account" avClass="av-gold" initials={name[0]} />
      <main className="dash-main">
        <div className="dash-page-head">
          <div>
            <h1 className="page-title">Browse Students</h1>
            <p className="page-sub">{total} students available · {freeViews} free view{freeViews !== 1 ? 's' : ''} · {coins} coins</p>
          </div>
          <div className="nav-coin-pill dash-coin-pill">🪙 {coins}</div>
        </div>

        <div className="students-filter-bar">
          <input className="form-input" placeholder="Search name or subject..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-select" value={subject} onChange={e => setSubject(e.target.value)}>
            <option value="">All Subjects</option>
            {['Maths','Physics','Chemistry','Biology','English','Hindi','Science','Computer Science'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="form-select" value={cls} onChange={e => setCls(e.target.value)}>
            <option value="">All Classes</option>
            {['Class 6','Class 7','Class 8','Class 9','Class 10','Class 11 - Science','Class 12 - Science'].map(c => <option key={c}>{c}</option>)}
          </select>
          <button className="btn btn-md btn-soft" onClick={load}>Refresh</button>
        </div>

        {loading && <div style={{ textAlign:'center', padding:48, color:'var(--gray-l)' }}>Loading students...</div>}

        <div className="students-grid">
          {filtered.map(s => (
            <div className="s-card" key={s.id}>
              <div className="s-card-top">
                <div className="av av-md av-navy">{s.name?.[0] || 'S'}</div>
                <div className="s-card-info">
                  <div className="s-name">{s.name}</div>
                  <div className="s-meta">{s.class} · {s.city}</div>
                  <div className="s-subjects">{(s.subjects || []).map(sub => <span key={sub} className="subject-pill">{sub}</span>)}</div>
                  {s.timing && <div style={{ fontSize:11, color:'var(--gray-l)', marginTop:6 }}>{s.timing}</div>}
                </div>
              </div>
              <div className="s-card-foot">
                {s.isUnlocked ? (
                  <>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13, color:'var(--navy)' }}>Phone: {s.phone || s.contactNumber}</div>
                      {s.area && <div style={{ fontSize:11, color:'var(--gray-l)', marginTop:2 }}>{s.area}, {s.city}</div>}
                    </div>
                    <button className="btn btn-xs btn-primary" onClick={() => copyPhone(s.phone || s.contactNumber)}>Copy Number</button>
                  </>
                ) : (
                  <>
                    <span className="badge badge-gray">{freeViews > 0 ? 'Free Unlock' : '50 coins'}</span>
                    <button className="btn btn-xs btn-primary" onClick={() => setConfirmId(s.id)}>
                      {freeViews > 0 ? 'View Free' : 'Unlock'}
                    </button>
                  </>
                )}
              </div>
              {!s.isUnlocked && (
                <div className="lock-overlay">
                  <div className="lock-icon-big">🔒</div>
                  <div className="lock-title">Unlock to See Contact</div>
                  <div className="lock-sub">{freeViews > 0 ? 'Free unlock available!' : `50 coins · ${Math.floor(coins / 50)} unlocks left`}</div>
                  <button className="btn btn-sm btn-primary" onClick={() => setConfirmId(s.id)}>
                    {freeViews > 0 ? 'Unlock Free' : 'Unlock - 50 coins'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {confirmId && (
          <div className="unlock-confirm-modal" onClick={e => e.target === e.currentTarget && setConfirmId(null)}>
            <div className="unlock-confirm-box">
              <div style={{ fontSize:48, marginBottom:16 }}>🔓</div>
              <h3 style={{ fontFamily:'Sora,sans-serif', fontSize:20, color:'var(--navy)', marginBottom:8 }}>Unlock Student Profile?</h3>
              <p style={{ fontSize:14, color:'var(--gray)', marginBottom:24 }}>
                {freeViews > 0 ? 'This is a free unlock. No coins will be deducted.' : `This will deduct 50 coins. Your balance: ${coins}`}
              </p>
              <div style={{ display:'flex', gap:12 }}>
                <button className="btn btn-md btn-soft" style={{ flex:1, justifyContent:'center' }} onClick={() => setConfirmId(null)}>Cancel</button>
                <button className="btn btn-md btn-primary" style={{ flex:1, justifyContent:'center' }} onClick={handleUnlock} disabled={unlocking}>
                  {unlocking ? 'Unlocking...' : freeViews > 0 ? 'Unlock Free' : 'Unlock - 50 coins'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
