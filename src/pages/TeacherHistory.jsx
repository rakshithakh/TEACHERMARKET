import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import { paymentApi } from '../services/api';
import './StudentDashboard.css';

const NAV = [
  { type:'section', label:'Main' },
  { icon:'📊', label:'Overview',          path:'/teacher/dashboard' },
  { icon:'🔍', label:'Browse Students',   path:'/teacher/students'  },
  { icon:'🔓', label:'Unlocked Profiles', path:'/teacher/unlocked'  },
  { icon:'👤', label:'My Profile',        path:'/teacher/profile'   },
  { icon:'🪙', label:'Buy Coins',         path:'/teacher/coins'     },
  { icon:'📋', label:'Coin History',      path:'/teacher/history'   },
  { type:'divider' },
  { type:'section', label:'Settings' },
  { icon:'⚙️', label:'Settings',          path:'/teacher/settings'  },
  { icon:'🚪', label:'Log Out', logout:true },
];

export default function TeacherHistory() {
  const { user, coins } = useApp();
  const [payments, setPayments] = useState([]);
  const [unlocks,  setUnlocks]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const name = user?.teacher?.name || user?.email || 'Teacher';

  useEffect(() => {
    paymentApi.getHistory()
      .then(d => { setPayments(d.payments || []); setUnlocks(d.unlocks || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Merge payments + unlocks into one timeline
  const timeline = [
    ...payments.map(p => ({ ...p, kind: 'purchase', date: new Date(p.createdAt) })),
    ...unlocks.map(u  => ({ ...u, kind: 'unlock',   date: new Date(u.createdAt) })),
  ].sort((a, b) => b.date - a.date);

  return (
    <div className="page-enter" style={{ paddingTop:66 }}>
      <Sidebar items={NAV} userName={name} userRole="Teacher Account" avClass="av-gold" initials={name[0]} />
      <main className="dash-main">
        <h1 className="page-title">Coin History</h1>
        <p className="page-sub">All coin purchases and profile unlocks</p>

        <div className="grid-3" style={{ marginBottom:24 }}>
          <div className="stat-c c-gold"><div style={{fontSize:22}}>🪙</div><div className="stat-num">{coins}</div><div className="stat-label">Current Balance</div></div>
          <div className="stat-c c-green"><div style={{fontSize:22}}>💰</div><div className="stat-num">₹{payments.filter(p=>p.status==='SUCCESS').reduce((a,p)=>a+p.amount,0)}</div><div className="stat-label">Total Spent</div></div>
          <div className="stat-c c-navy"><div style={{fontSize:22}}>🔓</div><div className="stat-num">{unlocks.length}</div><div className="stat-label">Total Unlocks</div></div>
        </div>

        {loading && <div style={{textAlign:'center',padding:48,color:'var(--gray-l)'}}>Loading…</div>}
        <div className="card">
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Type</th><th>Description</th><th>Coins</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {timeline.map((item, i) => (
                  <tr key={i}>
                    <td>
                      {item.kind === 'purchase'
                        ? <span className="badge badge-green">💰 Purchase</span>
                        : item.isFree
                          ? <span className="badge badge-blue">🎁 Free</span>
                          : <span className="badge badge-red">🔓 Unlock</span>}
                    </td>
                    <td style={{fontSize:13}}>
                      {item.kind === 'purchase' ? item.packageName : `Unlocked: ${item.student?.name || 'Student'}`}
                    </td>
                    <td style={{fontWeight:800, color: item.kind==='purchase' ? 'var(--green)' : 'var(--red)'}}>
                      {item.kind === 'purchase' ? `+${item.coinsAdded}` : item.isFree ? '0 (Free)' : `-${item.coinsSpent}`}
                    </td>
                    <td style={{fontWeight:700}}>
                      {item.kind === 'purchase' ? `₹${item.amount}` : '—'}
                    </td>
                    <td style={{fontSize:12,color:'var(--gray-l)'}}>
                      {item.date.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                    </td>
                    <td>
                      {item.kind === 'purchase'
                        ? <span className={`badge ${item.status==='SUCCESS'?'badge-green':item.status==='PENDING'?'badge-amber':'badge-red'}`}>{item.status}</span>
                        : <span className="badge badge-green">Done</span>}
                    </td>
                  </tr>
                ))}
                {!loading && timeline.length === 0 && (
                  <tr><td colSpan={6} style={{textAlign:'center',color:'var(--gray-l)',padding:32}}>No transactions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
