import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { leadsApi } from '../services/api';
import { downloadAttachment } from '../services/files';
import Sidebar from '../components/Sidebar';

const NAV = [
  { type:'section', label:'Main' },
  { icon:'📊', label:'Dashboard',       path:'/teacher/dashboard' },
  { icon:'🔍', label:'Browse Leads',    path:'/teacher/leads'     },
  { icon:'🔓', label:'Unlocked Leads',  path:'/teacher/unlocked'  },
  { icon:'👤', label:'My Profile',      path:'/teacher/profile'   },
  { icon:'🪙', label:'Buy Coins',       path:'/teacher/coins'     },
  { icon:'📋', label:'Coin History',    path:'/teacher/history'   },
  { type:'divider' },
  { type:'section', label:'Settings' },
  { icon:'⚙️', label:'Settings',        path:'/teacher/settings'  },
  { icon:'🚪', label:'Log Out', logout:true },
];

const REQ_TYPES = ['All', 'Online Coaching', 'Spoken English', 'School Tuition', 'College Subjects', 'Software Learning', 'Assignment / Project Work', 'Other'];

const TYPE_EMOJI = {
  'Online Coaching': '💻', 'Spoken English': '🗣️', 'School Tuition': '📚',
  'College Subjects': '🎓', 'Software Learning': '💡', 'Assignment / Project Work': '📝', 'Other': '🔖',
};

export default function TeacherBrowseLeads() {
  const { user, coins, updateCoins, toast } = useApp();
  const [leads,     setLeads]     = useState([]);
  const [total,     setTotal]     = useState(0);
  const [freeViews, setFreeViews] = useState(2);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('All');
  const [search,    setSearch]    = useState('');
  const [unlocking, setUnlocking] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filter !== 'All') params.type = filter;
    if (search) params.subject = search;
    leadsApi.published(params)
      .then(d => { setLeads(d.leads||[]); setTotal(d.total||0); })
      .catch(e => toast(e.message,'e'))
      .finally(() => setLoading(false));
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  // sync freeViews from user
  useEffect(() => { setFreeViews(user?.teacher?.freeViews ?? 2); }, [user]);

  const unlock = async (leadId) => {
    setUnlocking(leadId);
    try {
      const d = await leadsApi.unlock(leadId);
      toast(d.message, 's');
      updateCoins(d.coinBalance);
      setFreeViews(d.freeViews ?? freeViews);
      // update lead in list
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...d.lead } : l));
    } catch(err) { toast(err.message, 'e'); }
    finally { setUnlocking(null); }
  };

  const filtered = leads.filter(l =>
    !search || l.subject?.toLowerCase().includes(search.toLowerCase()) || l.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dash-layout">
      <Sidebar nav={NAV} user={user} />
      <main className="dash-main">
        <div className="dash-inner">
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:24 }}>
            <div>
              <h1 style={{ fontSize:22, fontWeight:800, color:'var(--navy)', marginBottom:4 }}>Browse Leads</h1>
              <p style={{ fontSize:13, color:'var(--gray)' }}>{total} published requirement{total!==1?'s':''} available</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ background:'var(--gold-p)', border:'1px solid var(--gold)', borderRadius:20, padding:'5px 14px', fontSize:13, fontWeight:700, color:'#78350f' }}>
                🪙 {coins} coins
              </div>
              {freeViews > 0 && (
                <div style={{ background:'var(--green-l)', border:'1px solid #86efac', borderRadius:20, padding:'5px 14px', fontSize:12, fontWeight:700, color:'var(--green-d)' }}>
                  🎁 {freeViews} free view{freeViews!==1?'s':''} left
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
            <input className="form-input" placeholder="Search subject, topic…" style={{ width:200, padding:'7px 12px', fontSize:13 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
            {REQ_TYPES.map(t => (
              <button key={t} onClick={() => setFilter(t)} style={{ padding:'5px 14px', borderRadius:20, border:'1px solid var(--border)', background: filter===t?'var(--navy)':'#fff', color: filter===t?'#fff':'var(--gray)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:60, color:'var(--gray)' }}>Loading leads…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:60, background:'#fff', borderRadius:14, border:'1px solid var(--border)' }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🔍</div>
              <div style={{ fontWeight:700, color:'var(--navy)' }}>No leads found</div>
              <p style={{ color:'var(--gray)', marginTop:6, fontSize:13 }}>Try adjusting your filters</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {filtered.map(lead => (
                <LeadCard key={lead.id} lead={lead} onUnlock={unlock} unlocking={unlocking===lead.id} coins={coins} freeViews={freeViews} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function LeadCard({ lead, onUnlock, unlocking, coins, freeViews }) {
  const isUnlocked   = lead.isUnlocked || !!lead.studentMobile;
  const canUnlock    = freeViews > 0 || coins >= 50;
  const emoji        = TYPE_EMOJI[lead.requirementType] || '🔖';
  const downloadFile = () => downloadAttachment(lead.fileAttachment, lead.fileName, lead.fileType);

  return (
    <div style={{ background:'#fff', border: isUnlocked?'1.5px solid #86efac':'1px solid var(--border)', borderRadius:12, padding:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'var(--gold-p)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{emoji}</div>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:'var(--navy)' }}>{lead.requirementType}</div>
            <div style={{ fontSize:12, color:'var(--gray)' }}>
              {lead.subject && <span>📖 {lead.subject} &nbsp;·&nbsp; </span>}
              📍 {lead.city || 'Location not specified'}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          {lead.appliedCount > 0 && (
            <span style={{ background:'var(--blue-ll)', color:'var(--blue)', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>
              👨‍🏫 {lead.appliedCount} applied
            </span>
          )}
          {isUnlocked && <span style={{ background:'var(--green-l)', color:'var(--green-d)', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>🔓 Unlocked</span>}
        </div>
      </div>

      <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.7, marginBottom:12 }}>{lead.description}</p>

      {lead.fileName && !isUnlocked && (
        <div style={{ fontSize:12, color:'var(--gray)', marginBottom:10 }}>📎 File attached (visible after unlock)</div>
      )}

      <div style={{ fontSize:12, color:'var(--gray)', marginBottom:14 }}>
        Posted: {new Date(lead.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
        {lead.maxUnlocks && <span> &nbsp;·&nbsp; 🔒 Max {lead.maxUnlocks} unlocks</span>}
      </div>

      {isUnlocked ? (
        <div style={{ background:'var(--green-l)', border:'1px solid #86efac', borderRadius:10, padding:'12px 16px' }}>
          <div style={{ fontWeight:800, fontSize:13, color:'var(--green-d)', marginBottom:8 }}>📞 Contact Details</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            <div style={{ fontSize:13 }}><span style={{ color:'var(--gray)', fontSize:11 }}>Name</span><br/><strong>{lead.studentName}</strong></div>
            <div style={{ fontSize:13 }}><span style={{ color:'var(--gray)', fontSize:11 }}>Mobile</span><br/><strong>{lead.studentMobile || '—'}</strong></div>
            {lead.studentEmail && <div style={{ fontSize:13 }}><span style={{ color:'var(--gray)', fontSize:11 }}>Email</span><br/><strong>{lead.studentEmail}</strong></div>}
          </div>
          {lead.fileAttachment && (
            <button type="button" onClick={downloadFile} style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:10, fontSize:12, fontWeight:700, color:'var(--blue)', background:'var(--blue-ll)', padding:'5px 12px', borderRadius:7, border:'1px solid #bfdbfe', cursor:'pointer' }}>
              📎 Download {lead.fileName}
            </button>
          )}
        </div>
      ) : (
        <button
          style={{ background: canUnlock?'var(--navy)':'var(--gray-ll)', color: canUnlock?'#fff':'var(--gray)', border:'none', borderRadius:9, padding:'10px 22px', fontWeight:700, fontSize:13, cursor: canUnlock?'pointer':'not-allowed', width:'100%' }}
          onClick={() => canUnlock && onUnlock(lead.id)}
          disabled={unlocking || !canUnlock}
        >
          {unlocking ? 'Unlocking…' : freeViews > 0 ? '🎁 Unlock for Free' : '🔓 Unlock for 50 Coins'}
        </button>
      )}
    </div>
  );
}
