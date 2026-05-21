import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import { teacherApi } from '../services/api';
import './StudentDashboard.css';

const NAV = [
  { type:'section', label:'Main' },
  { icon:'📊', label:'Overview',          path:'/teacher/dashboard'  },
  { icon:'🔍', label:'Browse Students',   path:'/teacher/students',  badge:'●' },
  { icon:'🔓', label:'Unlocked Profiles', path:'/teacher/unlocked'   },
  { icon:'👤', label:'My Profile',        path:'/teacher/profile'    },
  { icon:'🪙', label:'Buy Coins',         path:'/teacher/coins'      },
  { icon:'📋', label:'Coin History',      path:'/teacher/history'    },
  { type:'divider' },
  { type:'section', label:'Settings' },
  { icon:'⚙️', label:'Settings',          path:'/teacher/settings'   },
  { icon:'🚪', label:'Log Out', logout:true },
];

export default function TeacherDashboard() {
  const { user, coins } = useApp();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ coinBalance:0, freeViews:2, unlockedStudents:0, studentsInCity:0 });
  const [loading, setLoading] = useState(true);

  const name = user?.teacher?.name || user?.email || 'Teacher';

  useEffect(() => {
    teacherApi.getStats()
      .then(d => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-enter" style={{ paddingTop:66 }}>
      <Sidebar items={NAV} userName={name} userRole="Teacher Account" avClass="av-gold" initials={name[0]} />
      <main className="dash-main">
        <div className="coin-hero">
          <div className="ch-left">
            <div className="ch-label">🪙 Coin Balance</div>
            <div className="ch-amount">{coins}</div>
            <div className="ch-sub">Unlock {Math.floor(coins/50)} more profiles · {stats.freeViews} free view{stats.freeViews !== 1 ? 's' : ''} remaining</div>
          </div>
          <div className="ch-right">
            <button className="btn btn-md btn-primary" onClick={() => navigate('/teacher/coins')}>+ Buy Coins</button>
            <button className="btn btn-md btn-ghost-dark" onClick={() => navigate('/teacher/students')}>Browse Students →</button>
          </div>
        </div>

        <div className="grid-4" style={{ marginBottom:24 }}>
          <div className="stat-c c-gold"><div style={{fontSize:22}}>🪙</div><div className="stat-num">{coins}</div><div className="stat-label">Coin Balance</div></div>
          <div className="stat-c c-navy"><div style={{fontSize:22}}>🔓</div><div className="stat-num">{loading ? '…' : stats.unlockedStudents}</div><div className="stat-label">Profiles Unlocked</div></div>
        </div>

        <div className="grid-2" style={{ gap:20 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Quick Actions</div></div>
            <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button className="btn btn-md btn-navy btn-w-full" onClick={() => navigate('/teacher/students')}>🔍 Browse Students in Your City</button>
              <button className="btn btn-md btn-primary btn-w-full" onClick={() => navigate('/teacher/unlocked')}>🔓 View Unlocked Profiles</button>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">City Overview</div></div>
            <div className="card-body">
              <div style={{ textAlign:'center', padding:'16px 0' }}>
                <div style={{ fontSize:48, marginBottom:8 }}>🏙️</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:36, color:'var(--navy)' }}>{loading ? '…' : stats.studentsInCity}</div>
                <div style={{ fontSize:14, color:'var(--gray)', marginTop:4 }}>Students in {user?.teacher?.city || 'your city'}</div>
                <button className="btn btn-md btn-primary" style={{ marginTop:16 }} onClick={() => navigate('/teacher/students')}>Browse All →</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
