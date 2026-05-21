import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Sidebar({ items, userName, userRole, avClass, initials }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { logout } = useApp();

  return (
    <nav className="sidebar">
      {/* User info */}
      <div className="sb-user">
        <div className={`av av-sm ${avClass}`}>{initials}</div>
        <div>
          <div className="sb-user-name">{userName}</div>
          <div className="sb-user-role">{userRole}</div>
        </div>
      </div>

      {/* Nav items */}
      {items.map((item, idx) => {
        if (item.type === 'divider') return <div key={idx} className="sb-divider" />;
        if (item.type === 'section') return <div key={idx} className="sb-section">{item.label}</div>;

        const isActive = location.pathname === item.path;
        return (
          <div
            key={idx}
            className={`sb-item ${isActive ? 'active' : ''} ${item.logout ? 'sb-logout' : ''}`}
            onClick={() => {
              if (item.logout) { logout(); navigate('/'); }
              else if (item.path) navigate(item.path);
              else if (item.onClick) item.onClick();
            }}
          >
            <span className="sb-icon">{item.icon}</span>
            {item.label}
            {item.badge && <span className="sb-badge">{item.badge}</span>}
          </div>
        );
      })}
    </nav>
  );
}
