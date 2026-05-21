import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { studentApi } from '../services/api';
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

const AV_CLASSES = ['av-gold', 'av-navy', 'av-blue', 'av-green', 'av-purple'];

export default function StudentFindTeachers() {
  const { user } = useApp();
  const name = user?.student?.name || user?.email || 'Student';

  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeachers = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await studentApi.getTeachers({ search, subject });
        setTeachers(response.teachers || []);
      } catch (err) {
        setError(err.message || 'Failed to load teachers');
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, [search, subject]);

  return (
    <div className="page-enter" style={{ paddingTop:66 }}>
      <Sidebar items={NAV} userName={name} userRole="Student Account" avClass="av-navy" initials={name[0]} />
      <main className="dash-main">
        <h1 className="page-title">Find Teachers</h1>
        <p className="page-sub">Qualified tutors in your area — they will contact you after finding your profile</p>
        <div style={{ background:'var(--gold-p)', border:'1px solid rgba(245,166,35,.3)', borderRadius:14, padding:16, marginBottom:24, fontSize:14, color:'var(--navy)' }}>
          💡 <strong>How it works:</strong> Teachers browse your profile and unlock it to see your phone number. Keep your profile complete to get discovered faster.
        </div>
        <div className="students-filter-bar">
          <input
            className="form-input"
            style={{ width:220 }}
            placeholder="🔍 Search by name, subject, or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-select"
            style={{ width:160 }}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">All Subjects</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Science">Science</option>
            <option value="English">English</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
          </select>
        </div>

        {loading && <div style={{ padding: 24, color: 'var(--navy)' }}>Loading teachers…</div>}
        {error && <div style={{ padding: 24, color: 'var(--red-d)' }}>{error}</div>}

        <div className="students-grid">
          {!loading && teachers.length === 0 && !error && (
            <div style={{ padding: 24, color: 'var(--gray)' }}>No teachers found. Try a different search or subject.</div>
          )}

          {teachers.map((teacher, index) => {
            const initials = teacher.name?.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
            const avClass = AV_CLASSES[index % AV_CLASSES.length];
            return (
              <div className="s-card" key={teacher.id}>
                <div className="s-card-top">
                  <div className={`av av-md ${avClass}`}>{initials}</div>
                  <div className="s-card-info">
                    <div className="s-name">{teacher.name}</div>
                    <div className="s-meta">{teacher.qualification} · {teacher.experience} yrs · {teacher.city}</div>
                    <div className="s-subjects">
                      {(teacher.subjects || []).map((sub) => (
                        <span key={sub} className="subject-pill">{sub}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="s-card-foot">
                  <span className="badge badge-green">₹{teacher.monthlyFee || 0} / mo</span>
                  <span style={{ fontSize:12, color:'var(--gray)' }}>{teacher.location || teacher.city}</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
