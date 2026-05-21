import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import { leadsApi } from '../services/api';

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

const TYPE_EMOJI = {
  'Online Coaching':'💻','Spoken English':'🗣️','School Tuition':'📚',
  'College Subjects':'🎓','Software Learning':'💡','Assignment / Project Work':'📝','Other':'🔖',
};

export default function TeacherUnlocked() {
  const { user, toast } = useApp();
  const [leads,   setLeads]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    leadsApi.myUnlocked().then(d => setLeads(d.leads || [])).catch(e => toast(e.message,'e')).finally(() => setLoading(false));
  }, []);

  const copy = async (text, label) => {
    try { await navigator.clipboard.writeText(text); toast(`${label} copied ✅`,'s'); }
    catch { toast(text,'i'); }
  };

  const filtered = leads.filter(l => !search ||
    l.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    l.requirementType?.toLowerCase().includes(search.toLowerCase()) ||
    l.subject?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-enter dash-layout">
      <Sidebar nav={NAV} user={user} />
      <main className="dash-main">
        <div className="dash-inner">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, marginBottom:24 }}>
            <div>
              <h1 style={{ fontSize:22, fontWeight:800, color:'var(--navy)', marginBottom:4 }}>Unlocked Leads</h1>
              <p style={{ fontSize:13, color:'var(--gray)' }}>{leads.length} lead{leads.length!==1?'s':''} unlocked — full contact visible</p>
            </div>
          </div>
          <input className="form-input" placeholder="Search by name, type, subject…" style={{ maxWidth:300, marginBottom:20 }} value={search} onChange={e => setSearch(e.target.value)} />

          {loading ? <div style={{ textAlign:'center', padding:60, color:'var(--gray)' }}>Loading…</div>
          : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:64, background:'#fff', borderRadius:14, border:'1px solid var(--border)' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🔒</div>
              <div style={{ fontWeight:800, fontSize:18, color:'var(--navy)', marginBottom:8 }}>No unlocked leads yet</div>
              <p style={{ color:'var(--gray)', fontSize:13 }}>Browse leads and unlock to see full contact details here.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {filtered.map(lead => (
                <div key={lead.id} style={{ background:'#fff', border:'1.5px solid #86efac', borderRadius:12, padding:20 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:14 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:40, height:40, borderRadius:10, background:'var(--gold-p)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                        {TYPE_EMOJI[lead.requirementType] || '🔖'}
                      </div>
                      <div>
                        <div style={{ fontWeight:800, fontSize:14, color:'var(--navy)' }}>{lead.requirementType}</div>
                        <div style={{ fontSize:12, color:'var(--gray)' }}>
                          {lead.subject && <span>📖 {lead.subject} · </span>}📍 {lead.city || '—'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <span style={{ background:'var(--green-l)', color:'var(--green-d)', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>🔓 Unlocked</span>
                      <span style={{ background: lead.isFree?'#eff6ff':'#fff8ec', color: lead.isFree?'var(--blue)':'#92400e', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>
                        {lead.isFree ? '🎁 Free' : `🪙 ${lead.coinsSpent} coins`}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.7, marginBottom:14 }}>{lead.description}</p>

                  {/* Contact box */}
                  <div style={{ background:'var(--green-l)', border:'1px solid #86efac', borderRadius:10, padding:'14px 16px', marginBottom: lead.fileAttachment ? 12 : 0 }}>
                    <div style={{ fontWeight:800, fontSize:12, color:'var(--green-d)', marginBottom:10 }}>📞 Student Contact Details</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10 }}>
                      <div style={{ fontSize:13 }}>
                        <div style={{ fontSize:11, color:'var(--gray)', marginBottom:2 }}>Name</div>
                        <strong>{lead.studentName || '—'}</strong>
                      </div>
                      <div style={{ fontSize:13 }}>
                        <div style={{ fontSize:11, color:'var(--gray)', marginBottom:2 }}>Mobile</div>
                        <strong style={{ color:'var(--navy)' }}>{lead.studentMobile || '—'}</strong>
                        {lead.studentMobile && (
                          <button onClick={() => copy(lead.studentMobile, 'Mobile')} style={{ marginLeft:8, background:'none', border:'1px solid var(--green-d)', borderRadius:5, padding:'1px 7px', fontSize:10, fontWeight:700, color:'var(--green-d)', cursor:'pointer' }}>Copy</button>
                        )}
                      </div>
                      {lead.studentEmail && (
                        <div style={{ fontSize:13 }}>
                          <div style={{ fontSize:11, color:'var(--gray)', marginBottom:2 }}>Email</div>
                          <strong>{lead.studentEmail}</strong>
                          <button onClick={() => copy(lead.studentEmail, 'Email')} style={{ marginLeft:8, background:'none', border:'1px solid var(--green-d)', borderRadius:5, padding:'1px 7px', fontSize:10, fontWeight:700, color:'var(--green-d)', cursor:'pointer' }}>Copy</button>
                        </div>
                      )}
                      <div style={{ fontSize:13 }}>
                        <div style={{ fontSize:11, color:'var(--gray)', marginBottom:2 }}>Unlocked</div>
                        <span>{lead.unlockedAt ? new Date(lead.unlockedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—'}</span>
                      </div>
                    </div>
                  </div>

                  {lead.fileAttachment && (
                    <a href={lead.fileAttachment} download={lead.fileName} style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:10, fontSize:12, fontWeight:700, color:'var(--blue)', background:'var(--blue-ll)', padding:'6px 14px', borderRadius:8, textDecoration:'none' }}>
                      📎 Download {lead.fileName}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
