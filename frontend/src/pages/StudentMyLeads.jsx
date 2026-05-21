import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { leadsApi } from '../services/api';
import Sidebar from '../components/Sidebar';

const NAV = [
  { type:'section', label:'Main' },
  { icon:'📊', label:'Dashboard',        path:'/student/dashboard' },
  { icon:'➕', label:'Post Requirement',  path:'/student/post'      },
  { icon:'📋', label:'My Requirements',  path:'/student/leads'     },
  { icon:'👤', label:'My Profile',       path:'/student/profile'   },
  { type:'divider' },
  { type:'section', label:'Settings' },
  { icon:'⚙️', label:'Settings',         path:'/student/settings'  },
  { icon:'🚪', label:'Log Out', logout:true },
];

const STATUS_COLORS = {
  PENDING:   { bg: '#fef3c7', color: '#92400e', label: '⏳ Pending Review' },
  APPROVED:  { bg: '#d1fae5', color: '#065f46', label: '✅ Approved' },
  PUBLISHED: { bg: '#dbeafe', color: '#1e40af', label: '🌐 Published' },
  HIDDEN:    { bg: '#f3f4f6', color: '#374151', label: '🙈 Hidden' },
  CLOSED:    { bg: '#fee2e2', color: '#991b1b', label: '🔒 Closed' },
  PRIVATE:   { bg: '#ede9fe', color: '#5b21b6', label: '🔐 Private' },
};

export default function StudentMyLeads() {
  const { user, toast } = useApp();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leadsApi.mine().then(d => setLeads(d.leads || [])).catch(e => toast(e.message, 'e')).finally(() => setLoading(false));
  }, []);

  return (
    <div className="dash-layout">
      <Sidebar nav={NAV} user={user} />
      <main className="dash-main">
        <div className="dash-inner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', marginBottom: 4 }}>My Requirements</h1>
              <p style={{ fontSize: 13, color: 'var(--gray)' }}>Track the status of your posted requirements</p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/student/post')}>+ Post New</button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray)' }}>Loading…</div>
          ) : leads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)', marginBottom: 8 }}>No requirements posted yet</div>
              <p style={{ color: 'var(--gray)', marginBottom: 20, fontSize: 14 }}>Post your first requirement and get connected with teachers.</p>
              <button className="btn btn-primary" onClick={() => navigate('/student/post')}>Post a Requirement →</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {leads.map(lead => {
                const st = STATUS_COLORS[lead.status] || STATUS_COLORS.PENDING;
                return (
                  <div key={lead.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--navy)', marginBottom: 4 }}>
                          {lead.requirementType}
                          {lead.subject && <span style={{ fontWeight: 400, color: 'var(--gray)', marginLeft: 8 }}>· {lead.subject}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--gray)' }}>📍 {lead.city || 'Not specified'} &nbsp;·&nbsp; {new Date(lead.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</div>
                      </div>
                      <span style={{ background: st.bg, color: st.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{st.label}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 12 }}>{lead.description}</p>
                    {lead.fileName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--blue)', background: 'var(--blue-ll)', padding: '5px 10px', borderRadius: 6, width: 'fit-content' }}>
                        📎 {lead.fileName}
                      </div>
                    )}
                    {lead.status === 'PUBLISHED' && (
                      <div style={{ marginTop: 12, padding: '8px 14px', background: 'var(--blue-ll)', borderRadius: 8, fontSize: 13, color: 'var(--blue)', fontWeight: 600 }}>
                        👨‍🏫 {lead.appliedCount || 0} teacher{lead.appliedCount !== 1 ? 's' : ''} applied
                      </div>
                    )}
                    {lead.status === 'PENDING' && (
                      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gray)', fontStyle: 'italic' }}>
                        ⏳ Under admin review. Will be published soon.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
