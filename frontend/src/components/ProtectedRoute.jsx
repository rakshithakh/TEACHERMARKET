import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ProtectedRoute({ children, role }) {
  const { user, authLoading } = useApp();

  if (authLoading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--off)' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>🎓</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontWeight:700, color:'var(--navy)', fontSize:16 }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const userRole = String(user.role || '').toUpperCase();

  if (role && userRole !== role.toUpperCase()) {
    if (userRole === 'ADMIN')   return <Navigate to="/admin/dashboard" replace />;
    if (userRole === 'TEACHER') return <Navigate to="/teacher/dashboard" replace />;
    if (userRole === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}
