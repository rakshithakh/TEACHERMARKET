import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import { leadsApi } from '../services/api';

const NAV = [
  { type:'section', label:'MAIN' },
  { icon:'📊', label:'Dashboard',        path:'/student/dashboard' },
  { icon:'➕', label:'Post Requirement',  path:'/student/post'      },
  { icon:'📋', label:'My Requirements',  path:'/student/leads'     },
  { icon:'👤', label:'My Profile',       path:'/student/profile'   },
  { type:'divider' },
  { type:'section', label:'SETTINGS' },
  { icon:'⚙️', label:'Settings',         path:'/student/settings'  },
  { icon:'🚪', label:'Log Out', logout:true },
];

export default function StudentDashboard() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    leadsApi.mine().then(d => setLeads(d.leads || [])).catch(() => {});
  }, []);

  const name       = user?.student?.name || user?.email?.split('@')[0] || 'Student';
  const published  = leads.filter(l => l.status === 'PUBLISHED').length;
  const pending    = leads.filter(l => l.status === 'PENDING').length;
  const totalApply = leads.reduce((s, l) => s + (l.appliedCount || 0), 0);

  return (
    <div className="page-enter dash-layout">
      <Sidebar nav={NAV} user={user} />
      <main className="dash-main">
        <div className="dash-inner">
          <div className="welcome-banner">
            <div className="wb-text">
              <div className="wb-greeting">Welcome, {name.split(' ')[0]}! 👋</div>
              <div className="wb-sub">Post your requirement for free and get connected with teachers.</div>
            </div>
            <button className="btn btn-md btn-primary" onClick={() => navigate('/student/post')}>+ Post Requirement</button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:14, margin:'20px 0' }}>
            {[
              { icon:'📋', label:'Total Posted',   val: leads.length,  c:'#eff6ff', ic:'#1e40af' },
              { icon:'🌐', label:'Published',      val: published,     c:'#d1fae5', ic:'#065f46' },
              { icon:'⏳', label:'Pending Review', val: pending,       c:'#fef3c7', ic:'#92400e' },
              { icon:'👨‍🏫', label:'Teachers Applied', val: totalApply, c:'#f5f3ff', ic:'#5b21b6' },
            ].map(k => (
              <div key={k.label} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:'16px 14px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:k.c, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{k.icon}</div>
                <div><div style={{ fontSize:22, fontWeight:900, color:k.ic, fontFamily:'Sora,sans-serif' }}>{k.val}</div><div style={{ fontSize:11, color:'var(--gray)', fontWeight:600 }}>{k.label}</div></div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border)', padding:22 }}>
              <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:15, color:'var(--navy)', marginBottom:14 }}>Quick Actions</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <button className="btn btn-md btn-primary" style={{ justifyContent:'center' }} onClick={() => navigate('/student/post')}>➕ Post New Requirement</button>
                <button className="btn btn-md btn-navy" style={{ justifyContent:'center', background:'var(--navy)', color:'#fff' }} onClick={() => navigate('/student/leads')}>📋 View My Requirements</button>
                <button className="btn btn-md" style={{ justifyContent:'center', background:'var(--gray-ll)', color:'var(--navy)' }} onClick={() => navigate('/student/profile')}>👤 Update Profile</button>
              </div>
            </div>
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border)', padding:22 }}>
              <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:15, color:'var(--navy)', marginBottom:14 }}>How It Works</div>
              <div style={{ display:'flex', flexDirection:'column', gap:12, fontSize:13, color:'var(--gray)', lineHeight:1.7 }}>
                <div>✅ <strong style={{ color:'var(--navy)' }}>Post for Free</strong> — Fill your requirement form in 2 minutes</div>
                <div>🔍 <strong style={{ color:'var(--navy)' }}>Admin Reviews</strong> — We verify and publish your lead</div>
                <div>📞 <strong style={{ color:'var(--navy)' }}>Teachers Contact You</strong> — Qualified teachers reach out directly</div>
                <div>🔒 <strong style={{ color:'var(--navy)' }}>Your Privacy Protected</strong> — Contact shown only after unlock</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
