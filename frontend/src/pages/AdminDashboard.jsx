import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { adminApi } from '../services/api';
import { downloadAttachment, getAttachmentDataUrl, openAttachment as openFileAttachment } from '../services/files';
import './AdminDashboard.css';

const TABS = ['Overview','Leads','Users','Transactions','FAQ'];

const LEAD_STATUS_OPTIONS = ['APPROVED','PUBLISHED','HIDDEN','CLOSED','PRIVATE'];
const STATUS_META = {
  PENDING:   { label:'Pending',   bg:'#fef3c7', color:'#92400e' },
  APPROVED:  { label:'Approved',  bg:'#d1fae5', color:'#065f46' },
  PUBLISHED: { label:'Published', bg:'#dbeafe', color:'#1e40af' },
  HIDDEN:    { label:'Hidden',    bg:'#f3f4f6', color:'#374151' },
  CLOSED:    { label:'Closed',    bg:'#fee2e2', color:'#991b1b' },
  PRIVATE:   { label:'Private',   bg:'#ede9fe', color:'#5b21b6' },
};

export default function AdminDashboard() {
  const { user, logout, toast } = useApp();
  const navigate = useNavigate();
  const [tab,   setTab]   = useState('Overview');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminApi.getStats().then(setStats).catch(() => {});
  }, [tab]);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="admin-panel-shell" style={{ display:'flex', minHeight:'100vh', background:'var(--off)' }}>
      <aside style={{ width:230, background:'var(--navy)', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'20px 18px', borderBottom:'1px solid rgba(255,255,255,.1)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, background:'linear-gradient(135deg,#f5a623,#f7c265)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:13, color:'var(--navy)', flexShrink:0 }}>TM</div>
            <div>
              <div style={{ fontWeight:800, fontSize:13, color:'#fff' }}>TeacherMarket</div>
              <div style={{ fontSize:10, color:'#f5a623', fontWeight:700 }}>Admin Panel</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, padding:'12px 10px', display:'flex', flexDirection:'column', gap:2 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, border:'none', background: tab===t?'rgba(245,166,35,.15)':'transparent', color: tab===t?'#f5a623':'#94a3b8', fontWeight:700, fontSize:13, cursor:'pointer', textAlign:'left', width:'100%' }}>
              {{'Overview':'📊','Leads':'📋','Users':'👥','Transactions':'💳','FAQ':'❓'}[t]} {t}
            </button>
          ))}
        </nav>
        <div style={{ padding:'12px', borderTop:'1px solid rgba(255,255,255,.08)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(245,166,35,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#f5a623', flexShrink:0 }}>A</div>
            <div style={{ overflow:'hidden' }}>
              <div style={{ fontWeight:700, fontSize:12, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Administrator</div>
              <div style={{ fontSize:10, color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width:'100%', background:'rgba(239,68,68,.15)', border:'1px solid rgba(239,68,68,.3)', color:'#f87171', borderRadius:7, padding:'7px', fontSize:12, fontWeight:700, cursor:'pointer' }}>Sign Out</button>
        </div>
      </aside>

      <div style={{ flex:1, overflow:'auto' }}>
        <div style={{ padding:'28px 32px', maxWidth:960, margin:'0 auto' }}>
          {tab === 'Overview'     && <OverviewTab     stats={stats} />}
          {tab === 'Leads'        && <LeadsTab        toast={toast} />}
          {tab === 'Users'        && <UsersTab        toast={toast} />}
          {tab === 'Transactions' && <TransactionsTab toast={toast} />}
          {tab === 'FAQ'          && <FAQTab          toast={toast} />}
        </div>
      </div>
    </div>
  );
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
function OverviewTab({ stats }) {
  if (!stats) return <div style={{ textAlign:'center', padding:60, color:'var(--gray)' }}>Loading…</div>;
  const kpis = [
    { icon:'👨‍🎓', label:'Students',     val: stats.totalStudents  ?? 0,         bg:'#eff6ff', c:'#1e40af' },
    { icon:'👩‍🏫', label:'Teachers',     val: stats.totalTeachers  ?? 0,         bg:'#f0fdf4', c:'#15803d' },
    { icon:'📋', label:'Total Leads',   val: stats.totalLeads     ?? 0,         bg:'#fff8ec', c:'#92400e' },
    { icon:'🌐', label:'Published',     val: stats.publishedLeads ?? 0,         bg:'#dbeafe', c:'#1d4ed8' },
    { icon:'⏳', label:'Pending',       val: stats.pendingLeads   ?? 0,         bg:'#fef3c7', c:'#92400e' },
    { icon:'🔓', label:'Unlocks',       val: stats.totalUnlocks   ?? 0,         bg:'#f5f3ff', c:'#5b21b6' },
    { icon:'💰', label:'Revenue',       val: `₹${stats.totalRevenue ?? 0}`,     bg:'#f0fdf4', c:'#15803d' },
  ];
  return (
    <>
      <div style={{ marginBottom:24 }}><h1 style={{ fontSize:22, fontWeight:800, color:'var(--navy)' }}>Dashboard Overview</h1></div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:14, marginBottom:28 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px', display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ width:40, height:40, borderRadius:10, background:k.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{k.icon}</div>
            <div>
              <div style={{ fontSize:20, fontWeight:900, color:k.c }}>{k.val}</div>
              <div style={{ fontSize:11, color:'var(--gray)', fontWeight:600 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>
      {stats.recentPayments?.length > 0 && (
        <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12 }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', fontWeight:800, fontSize:15, color:'var(--navy)' }}>Recent Payments</div>
          <div className="admin-table-scroll">
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead><tr style={{ background:'#f8fafc' }}>
                {['Teacher','Package','Coins','Amount','Date'].map(h => <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--gray)', borderBottom:'1px solid var(--border)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {stats.recentPayments.map(p => (
                  <tr key={p.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'10px 16px', fontWeight:600 }}>{p.teacherName}</td>
                    <td style={{ padding:'10px 16px', color:'var(--gray)' }}>{p.packageName}</td>
                    <td style={{ padding:'10px 16px' }}><span style={{ background:'#fff8ec', color:'#92400e', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700 }}>🪙 {p.coinsAdded}</span></td>
                    <td style={{ padding:'10px 16px', fontWeight:700 }}>₹{p.amount}</td>
                    <td style={{ padding:'10px 16px', color:'var(--gray)', fontSize:11 }}>{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ── LEADS ─────────────────────────────────────────────────────────────────────
function LeadsTab({ toast }) {
  const [leads,     setLeads]     = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [statusF,   setStatusF]   = useState('ALL');
  const [typeF,     setTypeF]     = useState('ALL');
  const [expanded,  setExpanded]  = useState(null);
  const [previewId, setPreviewId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    // adminApi.getLeads() ← correct name from api.js
    adminApi.getLeads({ status: statusF, type: typeF })
      .then(d => { setLeads(d.leads||[]); setTotal(d.total||0); })
      .catch(e => toast(e.message,'e'))
      .finally(() => setLoading(false));
  }, [statusF, typeF]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    try {
      await adminApi.updateLead(id, { status });
      toast(`Lead ${status.toLowerCase()} ✅`, 's');
      load();
    } catch(e) { toast(e.message,'e'); }
  };

  const setMaxUnlocks = async (id, val) => {
    try {
      await adminApi.updateLead(id, { maxUnlocks: val==='' ? null : parseInt(val) });
      toast('Max unlocks updated', 's');
      load();
    } catch(e) { toast(e.message,'e'); }
  };

  const deleteLead = async (id) => {
    if (!window.confirm('Delete this lead permanently?')) return;
    try { await adminApi.deleteLead(id); toast('Lead deleted','s'); load(); }
    catch(e) { toast(e.message,'e'); }
  };

  const canPreviewFile = (lead) => {
    const type = String(lead.fileType||'').toLowerCase();
    const name = String(lead.fileName||'').toLowerCase();
    const data = String(lead.fileAttachment||'');
    return type.includes('pdf') || type.startsWith('image/') || name.endsWith('.pdf') || /\.(png|jpe?g|webp)$/i.test(name) || data.startsWith('data:application/pdf') || data.startsWith('data:image/');
  };

  const openAttachment = (lead) => {
    try { openFileAttachment(lead.fileAttachment, lead.fileName, lead.fileType); }
    catch (err) { toast(err.message,'e'); }
  };

  const downloadFile = (lead) => {
    try { downloadAttachment(lead.fileAttachment, lead.fileName, lead.fileType); }
    catch (err) { toast(err.message,'e'); }
  };

  const REQ_TYPES = ['ALL','Online Coaching','Spoken English','School Tuition','College Subjects','Software Learning','Assignment / Project Work','Other'];

  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--navy)', marginBottom:4 }}>Manage Leads</h1>
          <p style={{ fontSize:13, color:'var(--gray)' }}>{total} total leads</p>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
        {['ALL','PENDING','APPROVED','PUBLISHED','HIDDEN','CLOSED','PRIVATE'].map(s => (
          <button key={s} onClick={() => setStatusF(s)} style={{ padding:'5px 14px', borderRadius:20, border:'1px solid var(--border)', background: statusF===s?'var(--navy)':'#fff', color: statusF===s?'#fff':'var(--gray)', fontSize:12, fontWeight:600, cursor:'pointer' }}>{s}</button>
        ))}
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
        {REQ_TYPES.map(t => (
          <button key={t} onClick={() => setTypeF(t)} style={{ padding:'4px 12px', borderRadius:20, border:'1px solid var(--border)', background: typeF===t?'var(--gold)':'#fff', color: typeF===t?'var(--navy)':'var(--gray)', fontSize:11, fontWeight:600, cursor:'pointer' }}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--gray)' }}>Loading…</div>
      ) : leads.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, background:'#fff', borderRadius:12, border:'1px solid var(--border)', color:'var(--gray)' }}>No leads found</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {leads.map(lead => {
            const sm  = STATUS_META[lead.status] || STATUS_META.PENDING;
            const exp = expanded === lead.id;
            return (
              <div key={lead.id} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'16px 18px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                      <span style={{ fontWeight:800, fontSize:14, color:'var(--navy)' }}>{lead.requirementType}</span>
                      <span style={{ background:sm.bg, color:sm.color, padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>{sm.label}</span>
                      {lead.fileName && (
                        <button type="button" onClick={() => openAttachment(lead)} style={{ background:'#eff6ff', color:'#1e40af', padding:'2px 8px', borderRadius:20, fontSize:11, border:'1px solid #bfdbfe', cursor:'pointer', fontWeight:700 }}>
                          📎 {lead.fileName}
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize:12, color:'var(--gray)', marginBottom:4 }}>
                      <strong>{lead.studentName}</strong> · 📍{lead.city||'N/A'} · {new Date(lead.createdAt).toLocaleDateString('en-IN')}
                    </div>
                    <div style={{ fontSize:12, color:'var(--gray)' }}>
                      {lead.subject && <span>📖 {lead.subject} &nbsp;·&nbsp; </span>}
                      👨‍🏫 {lead.appliedCount||0} applied
                      {lead.maxUnlocks != null && <span> &nbsp;·&nbsp; 🔒 Max: {lead.maxUnlocks}</span>}
                    </div>
                  </div>
                  <button onClick={() => setExpanded(exp ? null : lead.id)} style={{ background:'#f8fafc', border:'1px solid var(--border)', borderRadius:7, padding:'5px 12px', fontSize:12, fontWeight:700, cursor:'pointer', color:'var(--gray)', flexShrink:0 }}>
                    {exp ? '▲ Less' : '▼ More'}
                  </button>
                </div>

                {exp && (
                  <div style={{ borderTop:'1px solid var(--border)', padding:'16px 18px', background:'#fafbfc' }}>
                    <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', marginBottom:14 }}>
                      <div style={{ fontWeight:800, fontSize:12, color:'var(--navy)', marginBottom:8 }}>📞 Student Contact (Admin View)</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8, fontSize:13 }}>
                        <div><span style={{ color:'var(--gray)', fontSize:11 }}>Name</span><br/><strong>{lead.studentName||'—'}</strong></div>
                        <div><span style={{ color:'var(--gray)', fontSize:11 }}>Mobile</span><br/><strong>{lead.studentMobile||'—'}</strong></div>
                        <div><span style={{ color:'var(--gray)', fontSize:11 }}>Email</span><br/><strong>{lead.studentEmail||'—'}</strong></div>
                        <div><span style={{ color:'var(--gray)', fontSize:11 }}>Country</span><br/><strong>{lead.country||'—'}</strong></div>
                      </div>
                    </div>

                    <div style={{ fontSize:13, color:'var(--text)', background:'#fff', borderRadius:8, padding:'10px 14px', border:'1px solid var(--border)', marginBottom:14, lineHeight:1.7 }}>
                      {lead.description}
                    </div>

                    {lead.fileAttachment && (
                      <div style={{ marginBottom:14 }}>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                          {canPreviewFile(lead) && (
                            <button type="button" onClick={() => setPreviewId(previewId===lead.id ? null : lead.id)} style={{ fontSize:12, fontWeight:700, color:'#1e40af', background:'#eff6ff', padding:'6px 12px', borderRadius:7, border:'1px solid #bfdbfe', cursor:'pointer' }}>
                              {previewId===lead.id ? 'Hide Preview' : 'Preview'} {lead.fileName}
                            </button>
                          )}
                          <button type="button" onClick={() => openAttachment(lead)} style={{ fontSize:12, fontWeight:700, color:'#1e40af', background:'#fff', padding:'6px 12px', borderRadius:7, border:'1px solid #bfdbfe', cursor:'pointer' }}>
                            Open in New Tab
                          </button>
                          <button type="button" onClick={() => downloadFile(lead)} style={{ fontSize:12, fontWeight:700, color:'var(--gray)', background:'#fff', padding:'6px 12px', borderRadius:7, border:'1px solid var(--border)', cursor:'pointer' }}>
                            Download
                          </button>
                        </div>
                        {previewId===lead.id && canPreviewFile(lead) && (
                          <div style={{ marginTop:10, border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                            {String(lead.fileType||'').startsWith('image/') || /^data:image\//i.test(String(lead.fileAttachment||'')) ? (
                              <img src={getAttachmentDataUrl(lead.fileAttachment, lead.fileName, lead.fileType)} alt={lead.fileName} style={{ display:'block', width:'100%', maxHeight:520, objectFit:'contain', background:'#f8fafc' }} />
                            ) : (
                              <iframe title={lead.fileName} src={getAttachmentDataUrl(lead.fileAttachment, lead.fileName, lead.fileType)} style={{ display:'block', width:'100%', height:520, border:0 }} />
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:14 }}>
                      {LEAD_STATUS_OPTIONS.map(s => (
                        <button key={s} onClick={() => setStatus(lead.id, s)} disabled={lead.status===s} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid var(--border)', background: lead.status===s?'var(--navy)':'#fff', color: lead.status===s?'#fff':'var(--gray)', fontSize:12, fontWeight:700, cursor: lead.status===s?'default':'pointer' }}>
                          {{'APPROVED':'✅ Approve','PUBLISHED':'🌐 Publish','HIDDEN':'🙈 Hide','CLOSED':'🔒 Close','PRIVATE':'🔐 Private'}[s]}
                        </button>
                      ))}
                      <button onClick={() => deleteLead(lead.id)} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #fecaca', background:'#fee2e2', color:'#991b1b', fontSize:12, fontWeight:700, cursor:'pointer' }}>🗑 Delete</button>
                    </div>

                    <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
                      <label style={{ color:'var(--gray)', fontWeight:600 }}>Max Unlocks:</label>
                      <input type="number" min="1" placeholder="No limit" defaultValue={lead.maxUnlocks||''} style={{ width:100, padding:'4px 8px', border:'1px solid var(--border)', borderRadius:6, fontSize:12 }}
                        onBlur={e => setMaxUnlocks(lead.id, e.target.value)} />
                      <span style={{ color:'var(--gray)', fontSize:11 }}>(empty = no limit)</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── USERS ─────────────────────────────────────────────────────────────────────
function UsersTab({ toast }) {
  const [users,     setUsers]     = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [roleF,     setRoleF]     = useState('ALL');
  const [search,    setSearch]    = useState('');
  const [coinUser,  setCoinUser]  = useState(null);
  const [coinDelta, setCoinDelta] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    // adminApi.getMembers() ← correct name from api.js
    adminApi.getMembers({ role: roleF, search })
      .then(d => { setUsers(d.members||d.users||[]); setTotal(d.total||0); })
      .catch(e => toast(e.message,'e'))
      .finally(() => setLoading(false));
  }, [roleF, search]);

  useEffect(() => { load(); }, [load]);

  const suspend = async (id, val) => {
    try {
      // adminApi.suspendMember() ← correct name from api.js
      await adminApi.suspendMember(id, val);
      toast(val?'Suspended':'Unsuspended','s');
      load();
    } catch(e) { toast(e.message,'e'); }
  };

  const applyCoins = async () => {
    if (!coinUser || !coinDelta) return;
    try {
      await adminApi.adjustCoins(coinUser.id, parseInt(coinDelta));
      toast('Coins adjusted ✅','s');
      setCoinUser(null); setCoinDelta(''); load();
    } catch(e) { toast(e.message,'e'); }
  };

  const profileDetails = (u) => {
    const p = u.profile || {};
    if (u.role==='TEACHER') return [p.qualification, p.experience?`${p.experience}yrs`:'', p.city].filter(Boolean).join(' · ');
    if (u.role==='STUDENT') return [p.class?`Class ${p.class}`:'', p.city].filter(Boolean).join(' · ');
    return '';
  };

  return (
    <>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'var(--navy)', marginBottom:4 }}>Manage Users</h1>
        <p style={{ fontSize:13, color:'var(--gray)' }}>{total} users</p>
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
        {['ALL','STUDENT','TEACHER'].map(r => (
          <button key={r} onClick={() => setRoleF(r)} style={{ padding:'5px 14px', borderRadius:20, border:'1px solid var(--border)', background: roleF===r?'var(--navy)':'#fff', color: roleF===r?'#fff':'var(--gray)', fontSize:12, fontWeight:600, cursor:'pointer' }}>{r}</button>
        ))}
        <input className="form-input" placeholder="Search name or email…" style={{ width:200, padding:'5px 12px', fontSize:12 }} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {coinUser && (
        <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:18, marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:14, color:'var(--navy)', marginBottom:12 }}>Adjust Coins — {coinUser.profile?.name||coinUser.email}</div>
          <div style={{ background:'#fff8ec', borderRadius:8, padding:'8px 14px', fontSize:13, marginBottom:12 }}>Current: <strong>🪙 {coinUser.profile?.coinBalance||0}</strong></div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input type="number" className="form-input" style={{ width:140 }} placeholder="e.g. 50 or -50" value={coinDelta} onChange={e => setCoinDelta(e.target.value)} />
            <button onClick={applyCoins} className="btn btn-primary" style={{ padding:'8px 18px', fontSize:13 }}>Apply</button>
            <button onClick={() => setCoinUser(null)} style={{ padding:'8px 14px', border:'1px solid var(--border)', borderRadius:8, background:'#f8fafc', cursor:'pointer', fontSize:12 }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div style={{ textAlign:'center', padding:60, color:'var(--gray)' }}>Loading…</div> : (
        <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
          <div className="admin-table-scroll">
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead><tr style={{ background:'#f8fafc' }}>
                {['Name/Email','Role','Details','Coins','Status','Actions'].map(h => <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--gray)', borderBottom:'1px solid var(--border)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ fontWeight:700 }}>{u.profile?.name||u.email?.split('@')[0]}</div>
                      <div style={{ fontSize:11, color:'var(--gray)' }}>{u.email}</div>
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ background: u.role==='TEACHER'?'#fff8ec':'#eff6ff', color: u.role==='TEACHER'?'#92400e':'#1e40af', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700 }}>{u.role}</span>
                    </td>
                    <td style={{ padding:'10px 14px', color:'var(--gray)', fontSize:12 }}>{profileDetails(u)||'—'}</td>
                    <td style={{ padding:'10px 14px' }}>
                      {u.role==='TEACHER' ? <span style={{ background:'#fff8ec', color:'#92400e', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700 }}>🪙 {u.profile?.coinBalance||0}</span> : '—'}
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ background: u.isSuspended?'#fee2e2':'#d1fae5', color: u.isSuspended?'#991b1b':'#065f46', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700 }}>{u.isSuspended?'Suspended':'Active'}</span>
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => suspend(u.id, !u.isSuspended)} style={{ padding:'4px 10px', borderRadius:7, border:'none', background: u.isSuspended?'#d1fae5':'#fee2e2', color: u.isSuspended?'#065f46':'#991b1b', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                          {u.isSuspended?'Unsuspend':'Suspend'}
                        </button>
                        {u.role==='TEACHER' && (
                          <button onClick={() => setCoinUser(u)} style={{ padding:'4px 10px', borderRadius:7, border:'none', background:'#fff8ec', color:'#92400e', fontSize:11, fontWeight:700, cursor:'pointer' }}>🪙</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────
function TransactionsTab({ toast }) {
  const [pmts,    setPmts]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [statusF, setStatusF] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // adminApi.getTransactions() ← correct name from api.js
    adminApi.getTransactions({ status: statusF })
      .then(d => { setPmts(d.payments||d.transactions||[]); setTotal(d.total||0); })
      .catch(e => toast(e.message,'e'))
      .finally(() => setLoading(false));
  }, [statusF]);

  return (
    <>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'var(--navy)', marginBottom:4 }}>Transactions</h1>
        <p style={{ fontSize:13, color:'var(--gray)' }}>{total} records</p>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {['ALL','SUCCESS','PENDING','FAILED'].map(s => (
          <button key={s} onClick={() => setStatusF(s)} style={{ padding:'5px 14px', borderRadius:20, border:'1px solid var(--border)', background: statusF===s?'var(--navy)':'#fff', color: statusF===s?'#fff':'var(--gray)', fontSize:12, fontWeight:600, cursor:'pointer' }}>{s}</button>
        ))}
      </div>
      {loading ? <div style={{ textAlign:'center', padding:60, color:'var(--gray)' }}>Loading…</div> : (
        <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
          <div className="admin-table-scroll">
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead><tr style={{ background:'#f8fafc' }}>
                {['Teacher','Package','Coins','Amount','Status','Date'].map(h => <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--gray)', borderBottom:'1px solid var(--border)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {pmts.map(p => (
                  <tr key={p.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'10px 14px', fontWeight:600 }}>
                      {p.teacherName}
                      <div style={{ fontSize:11, color:'var(--gray)' }}>{p.razorpayId||p.razorpayPaymentId}</div>
                    </td>
                    <td style={{ padding:'10px 14px', color:'var(--gray)' }}>{p.packageName||'—'}</td>
                    <td style={{ padding:'10px 14px' }}><span style={{ background:'#fff8ec', color:'#92400e', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700 }}>🪙 {p.coinsAdded}</span></td>
                    <td style={{ padding:'10px 14px', fontWeight:700 }}>₹{p.amount}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ background: p.status==='SUCCESS'?'#d1fae5':'#fee2e2', color: p.status==='SUCCESS'?'#065f46':'#991b1b', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700 }}>{p.status}</span>
                    </td>
                    <td style={{ padding:'10px 14px', color:'var(--gray)', fontSize:11 }}>{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
                {pmts.length === 0 && (
                  <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:'var(--gray)' }}>No transactions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
function FAQTab({ toast }) {
  const [faqs,    setFaqs]    = useState([]);
  const [editing, setEditing] = useState(null);
  const [adding,  setAdding]  = useState(false);
  const [form,    setForm]    = useState({ q:'', a:'' });

  const load = () => {
    // adminApi.getFaqs() ← correct name from api.js
    adminApi.getFaqs().then(d => setFaqs(d.faqs||[])).catch(e => toast(e.message,'e'));
  };
  useEffect(() => load(), []);

  const save = async () => {
    if (!form.q || !form.a) { toast('Enter question and answer','e'); return; }
    try {
      if (editing) {
        // adminApi.updateFaq() ← correct name from api.js
        await adminApi.updateFaq(editing, form);
        toast('FAQ updated','s');
        setEditing(null);
      } else {
        // adminApi.createFaq() ← correct name from api.js
        await adminApi.createFaq(form);
        toast('FAQ added','s');
        setAdding(false);
      }
      setForm({ q:'', a:'' });
      load();
    } catch(e) { toast(e.message,'e'); }
  };

  const del = async (id) => {
    try {
      // adminApi.deleteFaq() ← correct name from api.js
      await adminApi.deleteFaq(id);
      toast('FAQ deleted','s');
      load();
    } catch(e) { toast(e.message,'e'); }
  };

  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'var(--navy)' }}>FAQ Management</h1>
        <button className="btn btn-primary" onClick={() => { setAdding(true); setEditing(null); setForm({ q:'', a:'' }); }}>+ Add FAQ</button>
      </div>

      {(adding || editing) && (
        <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:20, marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:14, color:'var(--navy)', marginBottom:14 }}>{editing ? 'Edit FAQ' : 'New FAQ'}</div>
          <div className="form-group">
            <label className="form-label">Question</label>
            <input className="form-input" value={form.q} onChange={e => setForm(p => ({ ...p, q:e.target.value }))} placeholder="What is…?" />
          </div>
          <div className="form-group">
            <label className="form-label">Answer</label>
            <textarea className="form-input" rows={4} value={form.a} onChange={e => setForm(p => ({ ...p, a:e.target.value }))} style={{ resize:'vertical' }} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-primary" onClick={save}>Save</button>
            <button style={{ padding:'8px 16px', border:'1px solid var(--border)', borderRadius:8, background:'#f8fafc', cursor:'pointer' }} onClick={() => { setEditing(null); setAdding(false); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {faqs.map((f, i) => (
          <div key={f.id} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:10, padding:'14px 18px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)', marginBottom:6 }}>Q{i+1}. {f.q}</div>
                <div style={{ fontSize:13, color:'var(--gray)', lineHeight:1.6 }}>{f.a}</div>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <button onClick={() => { setEditing(f.id); setAdding(false); setForm({ q:f.q, a:f.a }); }} style={{ padding:'4px 10px', border:'1px solid var(--border)', borderRadius:7, background:'#f8fafc', cursor:'pointer', fontSize:11, fontWeight:700 }}>Edit</button>
                <button onClick={() => del(f.id)} style={{ padding:'4px 10px', border:'none', borderRadius:7, background:'#fee2e2', color:'#991b1b', cursor:'pointer', fontSize:11, fontWeight:700 }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
        {faqs.length === 0 && !adding && (
          <div style={{ textAlign:'center', padding:40, color:'var(--gray)' }}>No FAQs yet. Add one above!</div>
        )}
      </div>
    </>
  );
}
