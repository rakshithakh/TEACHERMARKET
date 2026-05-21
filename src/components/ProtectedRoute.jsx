import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ProtectedRoute({ children, role }) {
  const { user, authLoading } = useApp();

  if (authLoading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--off)' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>🎓</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontWeight:700, color:'var(--navy)', fontSize:16 }}>Loading TeacherMarket…</div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (role && user.role !== role.toUpperCase()) {
    // Redirect to correct dashboard
    if (user.role === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
    if (user.role === 'TEACHER') return <Navigate to="/teacher/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}
