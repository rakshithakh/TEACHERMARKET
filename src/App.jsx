import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navbar         from './components/Navbar';
import Toast          from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Landing              from './pages/Landing';
import Login                from './pages/Login';
import Register             from './pages/Register';

import StudentDashboard     from './pages/StudentDashboard';
import StudentProfile       from './pages/StudentProfile';
import StudentFindTeachers  from './pages/StudentFindTeachers';
import StudentSettings      from './pages/StudentSettings';

import TeacherDashboard      from './pages/TeacherDashboard';
import TeacherBrowseStudents from './pages/TeacherBrowseStudents';
import TeacherUnlocked       from './pages/TeacherUnlocked';
import TeacherProfile        from './pages/TeacherProfile';
import BuyCoins              from './pages/BuyCoins';
import TeacherHistory        from './pages/TeacherHistory';
import TeacherSettings       from './pages/TeacherSettings';

import AdminDashboard        from './pages/AdminDashboard';

import './styles/global.css';

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Toast  />
      <Routes>
        {/* Public */}
        <Route path="/"             element={<Landing />} />
        <Route path="/login"        element={<Login   />} />
        <Route path="/register"     element={<Register/>} />

        {/* Student */}
        <Route path="/student/dashboard" element={<ProtectedRoute role="STUDENT"><StudentDashboard    /></ProtectedRoute>} />
        <Route path="/student/profile"   element={<ProtectedRoute role="STUDENT"><StudentProfile      /></ProtectedRoute>} />
        <Route path="/student/teachers"  element={<ProtectedRoute role="STUDENT"><StudentFindTeachers /></ProtectedRoute>} />
        <Route path="/student/settings"  element={<ProtectedRoute role="STUDENT"><StudentSettings     /></ProtectedRoute>} />

        {/* Teacher */}
        <Route path="/teacher/dashboard" element={<ProtectedRoute role="TEACHER"><TeacherDashboard     /></ProtectedRoute>} />
        <Route path="/teacher/students"  element={<ProtectedRoute role="TEACHER"><TeacherBrowseStudents/></ProtectedRoute>} />
        <Route path="/teacher/unlocked"  element={<ProtectedRoute role="TEACHER"><TeacherUnlocked      /></ProtectedRoute>} />
        <Route path="/teacher/profile"   element={<ProtectedRoute role="TEACHER"><TeacherProfile       /></ProtectedRoute>} />
        <Route path="/teacher/coins"     element={<ProtectedRoute role="TEACHER"><BuyCoins             /></ProtectedRoute>} />
        <Route path="/teacher/history"   element={<ProtectedRoute role="TEACHER"><TeacherHistory       /></ProtectedRoute>} />
        <Route path="/teacher/settings"  element={<ProtectedRoute role="TEACHER"><TeacherSettings      /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin/dashboard" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
