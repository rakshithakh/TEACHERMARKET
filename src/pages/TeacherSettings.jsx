import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
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

export default function TeacherSettings() {
  const { user, toast } = useApp();
  const name = user?.teacher?.name || user?.email || 'Teacher';
  return (
    <div className="page-enter" style={{ paddingTop:66 }}>
      <Sidebar items={NAV} userName={name} userRole="Teacher Account" avClass="av-gold" initials={name[0]} />
      <main className="dash-main">
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Manage your teacher account preferences</p>
        <div className="grid-2" style={{ maxWidth:800 }}>
          <div className="card card-p">
            <div className="card-title" style={{ marginBottom:20 }}>🔔 Notifications</div>
            {[
              { label:'Low Coin Alerts',     hint:'When balance falls below 100 coins', on:true  },
              { label:'Request Responses',   hint:'When a student accepts/rejects',     on:true  },
              { label:'New Student Alerts',  hint:'New students in your city',          on:true  },
              { label:'Weekly Reports',      hint:'Weekly activity summary',            on:false },
            ].map((s,i) => (
              <div key={i} className="settings-row">
                <div><div className="settings-label">{s.label}</div><div className="settings-hint">{s.hint}</div></div>
                <label className="sw"><input type="checkbox" defaultChecked={s.on}/><span className="sw-track"/></label>
              </div>
            ))}
          </div>
          <div className="card card-p">
            <div className="card-title" style={{ marginBottom:20 }}>👤 Account</div>
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input className="form-input" defaultValue={name}/>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button className="btn btn-md btn-primary btn-w-full" onClick={() => toast('Settings saved ✅','s')}>Save Settings</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
