import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ContactUs() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name:'', email:'', subject:'', message:'' });
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setSent(true);
  };

  return (
    <div style={{ paddingTop:66 }}>
      <div style={{ background:'var(--navy)', padding:'56px 20px 48px', textAlign:'center' }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--gold)', letterSpacing:'.8px', marginBottom:10 }}>📬 CONTACT</div>
        <h1 style={{ fontSize:32, fontWeight:900, color:'#fff', marginBottom:12 }}>Contact Us</h1>
        <p style={{ color:'#94a3b8', maxWidth:480, margin:'0 auto', fontSize:15, lineHeight:1.7 }}>We are here to help. Use the form below — we respond within 24 hours.</p>
      </div>

      <div style={{ maxWidth:700, margin:'0 auto', padding:'48px 20px' }}>
        {/* Info cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:36 }}>
          {[
            { icon:'📧', title:'Email Support', val:'support@teachermarket.in', sub:'Official support email' },
            { icon:'⏰', title:'Response Time',  val:'Within 24 hours', sub:'Mon–Sat, 9 AM – 7 PM' },
            { icon:'🔒', title:'Privacy First',  val:'No phone public', sub:'No WhatsApp shared publicly' },
          ].map(c => (
            <div key={c.title} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:'18px 16px', textAlign:'center' }}>
              <div style={{ fontSize:26, marginBottom:8 }}>{c.icon}</div>
              <div style={{ fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:13, color:'var(--navy)', marginBottom:4 }}>{c.title}</div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--gold)' }}>{c.val}</div>
              <div style={{ fontSize:11, color:'var(--gray)', marginTop:3 }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {sent ? (
          <div style={{ background:'var(--green-l)', border:'1px solid #86efac', borderRadius:14, padding:40, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:20, color:'var(--navy)', marginBottom:8 }}>Message Sent!</div>
            <p style={{ color:'var(--gray)', marginBottom:20 }}>We'll get back to you within 24 hours at <strong>{form.email}</strong>.</p>
            <button className="btn btn-md btn-primary" onClick={() => navigate('/')}>Back to Home</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:14, padding:32 }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:18, color:'var(--navy)', marginBottom:24 }}>Send us a Message</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Your name"/></div>
              <div className="form-group"><label className="form-label">Email Address *</label><input className="form-input" type="email" required value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="your@email.com"/></div>
            </div>
            <div className="form-group"><label className="form-label">Subject</label>
              <select className="form-input" value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))}>
                <option value="">Select a topic</option>
                <option>General Inquiry</option><option>Technical Issue</option><option>Billing / Coins</option>
                <option>Account Problem</option><option>Report Abuse</option><option>Partnership</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Message *</label>
              <textarea className="form-input" rows={5} required style={{ resize:'vertical' }} value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} placeholder="Describe your issue or question in detail…"/>
            </div>
            <div style={{ background:'var(--amber-l)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#78350f', marginBottom:18 }}>
              ⚠️ We do not share any phone numbers or WhatsApp contacts publicly. All support is through this form and official email only.
            </div>
            <button type="submit" className="btn btn-lg btn-primary" style={{ width:'100%', justifyContent:'center' }}>Send Message →</button>
          </form>
        )}

        {/* Cross-promotion banner */}
        <div style={{ background:'linear-gradient(135deg,var(--navy),#1e3a6e)', borderRadius:14, padding:'24px 28px', marginTop:32, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--gold)', letterSpacing:'.8px', marginBottom:6 }}>PARTNER PLATFORM</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:18, color:'#fff', marginBottom:6 }}>
              🌍 Edumax World ↔️ TeacherMarket.in
            </div>
            <p style={{ color:'#94a3b8', fontSize:13, lineHeight:1.6, maxWidth:420 }}>
              Looking for international education opportunities? Visit <strong style={{ color:'var(--gold)' }}>EdumaxWorld.com</strong> — our partner platform for global learning.
            </p>
          </div>
          <a href="https://edumax.world/" target="_blank" rel="noopener noreferrer" className="btn btn-md btn-primary" style={{ flexShrink:0 }}>Visit Edumax World →</a>
        </div>
      </div>

      <footer style={{ background:'var(--navy)', color:'#94a3b8', padding:'32px 20px', textAlign:'center', fontSize:13 }}>
        <div style={{ fontSize:12, color:'#475569' }}>© 2026 TeacherMarket. No public phone/WhatsApp numbers. Support only via official email.</div>
      </footer>
    </div>
  );
}
