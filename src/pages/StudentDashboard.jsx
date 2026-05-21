import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';

const NAV = [
  { type:'section', label:'Main' },
  { icon:'📊', label:'Overview',        path:'/student/dashboard' },
  { icon:'👤', label:'My Profile',      path:'/student/profile'   },
  { icon:'🔍', label:'Find Teachers',   path:'/student/teachers'  },
  { type:'divider' },
  { type:'section', label:'Settings' },
  { icon:'⚙️', label:'Settings',        path:'/student/settings'  },
  { icon:'🚪', label:'Log Out', logout:true },
];

export default function StudentDashboard() {
  const { user } = useApp();
  const navigate = useNavigate();

  const name = user?.student?.name || user?.email || 'Student';
  const initials = name[0]?.toUpperCase() || 'S';

  return (
    <div className="page-enter" style={{ paddingTop:66 }}>
      <Sidebar items={NAV} userName={name} userRole="Student Account" avClass="av-navy" initials={initials} />
      <main className="dash-main">
        <div className="welcome-banner">
          <div className="wb-text">
            <div className="wb-greeting">Welcome, {name.split(' ')[0]}! 👋</div>
            <div className="wb-sub">Keep your profile up to date so teachers can find you.</div>
          </div>
          <div className="wb-action">
            <button className="btn btn-md btn-primary" onClick={() => navigate('/student/profile')}>Update Profile →</button>
          </div>
        </div>

        <div className="grid-2" style={{ gap:20, marginTop:24 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Quick Actions</div></div>
            <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button className="btn btn-md btn-navy btn-w-full" onClick={() => navigate('/student/profile')}>👤 Update My Profile</button>
              <button className="btn btn-md btn-primary btn-w-full" onClick={() => navigate('/student/teachers')}>🔍 Find Teachers</button>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">How It Works</div></div>
            <div className="card-body" style={{ fontSize:14, color:'var(--gray)', lineHeight:1.7 }}>
              <p>📝 Fill in your profile with subjects, class, and location.</p>
              <p>🔍 Teachers in your city will discover and contact you directly.</p>
              <p>📞 Once a teacher unlocks your profile, they get your phone number and can call you.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
