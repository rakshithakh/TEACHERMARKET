import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Sidebar({ nav, items, user, userName, userRole, avClass, initials }) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { logout } = useApp();

  const navItems = nav || items || [];
  const name  = user?.student?.name || user?.teacher?.name || user?.email || userName || 'User';
  const role  = user?.role === 'STUDENT' ? 'Student Account' : user?.role === 'TEACHER' ? 'Teacher Account' : userRole || 'Account';
  const init  = initials || name[0]?.toUpperCase() || 'U';
  const avCls = avClass || (user?.role === 'TEACHER' ? 'av-gold' : 'av-navy');
  const coins = user?.teacher?.coinBalance;

  return (
    <nav className="sidebar">
      <div className="sb-user">
        <div className={`av av-sm ${avCls}`}>{init}</div>
        <div style={{ overflow:'hidden' }}>
          <div className="sb-user-name" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
          <div className="sb-user-role">{role}</div>
        </div>
      </div>
      {coins !== undefined && (
        <div style={{ margin:'0 12px 8px', background:'rgba(245,166,35,.15)', borderRadius:8, padding:'6px 12px', display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, color:'#f5a623' }}>
          🪙 {coins} coins
        </div>
      )}
      {navItems.map((item, idx) => {
        if (item.type === 'divider') return <div key={idx} className="sb-divider" />;
        if (item.type === 'section') return <div key={idx} className="sb-section">{item.label}</div>;
        const isActive = location.pathname === item.path;
        return (
          <div key={idx} className={`sb-item ${isActive ? 'active' : ''} ${item.logout ? 'sb-logout' : ''}`}
            onClick={() => { if (item.logout) { logout(); navigate('/'); } else if (item.path) navigate(item.path); }}>
            <span className="sb-icon">{item.icon}</span>
            {item.label}
            {item.badge && <span className="sb-badge">{item.badge}</span>}
          </div>
        );
      })}
    </nav>
  );
}
