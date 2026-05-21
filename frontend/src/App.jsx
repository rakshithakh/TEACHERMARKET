import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider }     from './context/AppContext';
import Navbar              from './components/Navbar';
import Toast               from './components/Toast';
import ProtectedRoute      from './components/ProtectedRoute';

import Landing             from './pages/Landing';
import Login               from './pages/Login';
import Register            from './pages/Register';
import FAQ                 from './pages/FAQ';
import ContactUs           from './pages/ContactUs';
import Privacy             from './pages/Privacy';
import Terms               from './pages/Terms';

import StudentDashboard    from './pages/StudentDashboard';
import StudentPostLead     from './pages/StudentPostLead';
import StudentMyLeads      from './pages/StudentMyLeads';
import StudentProfile      from './pages/StudentProfile';
import StudentSettings     from './pages/StudentSettings';

import TeacherDashboard    from './pages/TeacherDashboard';
import TeacherBrowseLeads  from './pages/TeacherBrowseLeads';
import TeacherUnlocked     from './pages/TeacherUnlocked';
import TeacherProfile      from './pages/TeacherProfile';
import BuyCoins            from './pages/BuyCoins';
import TeacherHistory      from './pages/TeacherHistory';
import TeacherSettings     from './pages/TeacherSettings';

import AdminDashboard      from './pages/AdminDashboard';

import './styles/global.css';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Navbar />
        <Toast  />
        <Routes>
          {/* Public */}
          <Route path="/"         element={<Landing  />} />
          <Route path="/login"    element={<Login    />} />
          <Route path="/register" element={<Register />} />
          <Route path="/faq"      element={<FAQ      />} />
          <Route path="/contact"  element={<ContactUs/>} />
          <Route path="/privacy"  element={<Privacy  />} />
          <Route path="/terms"    element={<Terms    />} />

          {/* Student */}
          <Route path="/student/dashboard" element={<ProtectedRoute role="STUDENT"><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/post"      element={<ProtectedRoute role="STUDENT"><StudentPostLead  /></ProtectedRoute>} />
          <Route path="/student/leads"     element={<ProtectedRoute role="STUDENT"><StudentMyLeads   /></ProtectedRoute>} />
          <Route path="/student/profile"   element={<ProtectedRoute role="STUDENT"><StudentProfile   /></ProtectedRoute>} />
          <Route path="/student/settings"  element={<ProtectedRoute role="STUDENT"><StudentSettings  /></ProtectedRoute>} />

          {/* Teacher */}
          <Route path="/teacher/dashboard" element={<ProtectedRoute role="TEACHER"><TeacherDashboard   /></ProtectedRoute>} />
          <Route path="/teacher/leads"     element={<ProtectedRoute role="TEACHER"><TeacherBrowseLeads /></ProtectedRoute>} />
          <Route path="/teacher/unlocked"  element={<ProtectedRoute role="TEACHER"><TeacherUnlocked    /></ProtectedRoute>} />
          <Route path="/teacher/profile"   element={<ProtectedRoute role="TEACHER"><TeacherProfile     /></ProtectedRoute>} />
          <Route path="/teacher/coins"     element={<ProtectedRoute role="TEACHER"><BuyCoins           /></ProtectedRoute>} />
          <Route path="/teacher/history"   element={<ProtectedRoute role="TEACHER"><TeacherHistory     /></ProtectedRoute>} />
          <Route path="/teacher/settings"  element={<ProtectedRoute role="TEACHER"><TeacherSettings    /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin/*" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
