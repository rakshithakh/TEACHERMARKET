import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import { teacherApi } from '../services/api';

const NAV = [
  { type:'section', label:'MAIN' },
  { icon:'📊', label:'Dashboard',       path:'/teacher/dashboard' },
  { icon:'🔍', label:'Browse Leads',    path:'/teacher/leads'     },
  { icon:'🔓', label:'Unlocked Leads',  path:'/teacher/unlocked'  },
  { icon:'👤', label:'My Profile',      path:'/teacher/profile'   },
  { icon:'🪙', label:'Buy Coins',       path:'/teacher/coins'     },
  { icon:'📋', label:'Coin History',    path:'/teacher/history'   },
  { type:'divider' },
  { type:'section', label:'SETTINGS' },
  { icon:'⚙️', label:'Settings',        path:'/teacher/settings'  },
  { icon:'🚪', label:'Log Out', logout:true },
];

export default function TeacherDashboard() {
  const { user, coins } = useApp();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ coinBalance:0, freeViews:2, unlockedLeads:0, totalPublished:0 });

  useEffect(() => { teacherApi.getStats().then(setStats).catch(() => {}); }, []);

  const name = user?.teacher?.name || user?.email?.split('@')[0] || 'Teacher';

  return (
    <div className="page-enter dash-layout">
      <Sidebar nav={NAV} user={user} />
      <main className="dash-main">
        <div className="dash-inner">
          <div className="coin-hero">
            <div className="ch-left">
              <div className="ch-label">🪙 Coin Balance</div>
              <div className="ch-amount">{coins}</div>
              <div className="ch-sub">{stats.freeViews} free unlock{stats.freeViews!==1?'s':''} remaining · 50 coins = 1 unlock</div>
            </div>
            <div className="ch-right">
              <button className="btn btn-md btn-primary" onClick={() => navigate('/teacher/coins')}>+ Buy Coins</button>
              <button className="btn btn-md" style={{ background:'rgba(255,255,255,.15)', color:'#fff', border:'1px solid rgba(255,255,255,.25)' }} onClick={() => navigate('/teacher/leads')}>Browse Leads →</button>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:14, margin:'20px 0' }}>
            {[
              { icon:'🪙', label:'Coin Balance',     val: coins,                   c:'#fff8ec', ic:'#92400e' },
              { icon:'🔓', label:'Leads Unlocked',   val: stats.unlockedLeads,     c:'#d1fae5', ic:'#065f46' },
              { icon:'🌐', label:'Published Leads',  val: stats.totalPublished,    c:'#eff6ff', ic:'#1e40af' },
              { icon:'🎁', label:'Free Views Left',  val: stats.freeViews,         c:'#f5f3ff', ic:'#5b21b6' },
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
                <button className="btn btn-md btn-primary" style={{ justifyContent:'center' }} onClick={() => navigate('/teacher/leads')}>🔍 Browse Student Leads</button>
                <button className="btn btn-md btn-navy" style={{ justifyContent:'center', background:'var(--navy)', color:'#fff' }} onClick={() => navigate('/teacher/unlocked')}>🔓 View Unlocked Leads</button>
                <button className="btn btn-md" style={{ justifyContent:'center', background:'var(--gray-ll)', color:'var(--navy)' }} onClick={() => navigate('/teacher/coins')}>🪙 Buy More Coins</button>
              </div>
            </div>
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border)', padding:22 }}>
              <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:15, color:'var(--navy)', marginBottom:14 }}>Coin System</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10, fontSize:13, color:'var(--gray)', lineHeight:1.7 }}>
                <div>🎁 <strong style={{ color:'var(--navy)' }}>First 2 unlocks FREE</strong> for every new teacher</div>
                <div>🪙 <strong style={{ color:'var(--navy)' }}>50 coins = 1 unlock</strong> — reveals student contact</div>
                <div>💰 <strong style={{ color:'var(--navy)' }}>₹1 = 1 coin</strong> — transparent pricing</div>
                <div>🔒 <strong style={{ color:'var(--navy)' }}>Pay only for what you need</strong> — no subscriptions</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
