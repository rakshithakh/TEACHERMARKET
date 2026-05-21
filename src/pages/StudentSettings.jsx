import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';

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

export default function StudentSettings() {
  const { user, toast } = useApp();
  const name = user?.student?.name || user?.email || 'Student';
  return (
    <div className="page-enter" style={{ paddingTop:66 }}>
      <Sidebar items={NAV} userName={name} userRole="Student Account" avClass="av-navy" initials={name[0]} />
      <main className="dash-main">
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Manage your account preferences</p>
        <div className="grid-2" style={{ maxWidth:800 }}>
          <div className="card card-p">
            <div className="card-title" style={{ marginBottom:20 }}>🔔 Notifications</div>
            {[
              { label:'Weekly Summary', hint:'Weekly activity digest', on:false },
            ].map((s,i) => (
              <div key={i} className="settings-row">
                <div><div className="settings-label">{s.label}</div><div className="settings-hint">{s.hint}</div></div>
                <label className="sw"><input type="checkbox" defaultChecked={s.on}/><span className="sw-track"/></label>
              </div>
            ))}
          </div>
          <div className="card card-p">
            <div className="card-title" style={{ marginBottom:20 }}>🔒 Privacy</div>
            {[
              { label:'Profile Visible',     hint:'Show profile to teachers', on:true  },
              { label:'Show Phone Number',   hint:'Revealed after teacher unlock', on:true  },
            ].map((s,i) => (
              <div key={i} className="settings-row">
                <div><div className="settings-label">{s.label}</div><div className="settings-hint">{s.hint}</div></div>
                <label className="sw"><input type="checkbox" defaultChecked={s.on}/><span className="sw-track"/></label>
              </div>
            ))}
            <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:8 }}>
              <button className="btn btn-sm btn-red  btn-w-full" onClick={() => toast('Contact support to deactivate','w')}>Deactivate Account</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
