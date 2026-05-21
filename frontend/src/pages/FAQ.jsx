import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { faqDB } from '../services/db';

export default function FAQ() {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => { setFaqs(faqDB.getAll()); }, []);

  return (
    <div style={{ paddingTop: 66 }}>
      {/* Hero */}
      <div style={{ background:'var(--navy)', padding:'56px 20px 48px', textAlign:'center' }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--gold)', letterSpacing:'.8px', marginBottom:10 }}>❓ FAQ</div>
        <h1 style={{ fontSize:32, fontWeight:900, color:'#fff', marginBottom:12 }}>Frequently Asked Questions</h1>
        <p style={{ color:'#94a3b8', maxWidth:500, margin:'0 auto', fontSize:15, lineHeight:1.7 }}>Everything you need to know about TeacherMarket.</p>
      </div>

      <div style={{ maxWidth:720, margin:'0 auto', padding:'48px 20px' }}>
        {faqs.map((faq, i) => (
          <div key={faq.id} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, marginBottom:10, overflow:'hidden' }}>
            <div onClick={() => setOpen(open === i ? null : i)} style={{ padding:'18px 22px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', userSelect:'none' }}>
              <span style={{ fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:15, color:'var(--navy)', paddingRight:16 }}>{faq.q}</span>
              <span style={{ fontSize:18, color:'var(--gold)', flexShrink:0, transition:'transform .2s', transform: open===i?'rotate(180deg)':'none' }}>▾</span>
            </div>
            {open === i && (
              <div style={{ padding:'0 22px 18px', fontSize:14, color:'var(--gray)', lineHeight:1.8, borderTop:'1px solid var(--border)', paddingTop:14 }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}

        <div style={{ background:'var(--gold-p)', border:'1px solid rgba(245,166,35,.3)', borderRadius:14, padding:'28px 32px', textAlign:'center', marginTop:40 }}>
          <div style={{ fontSize:28, marginBottom:10 }}>💬</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:18, color:'var(--navy)', marginBottom:8 }}>Still have questions?</div>
          <p style={{ color:'var(--gray)', fontSize:14, marginBottom:20 }}>Reach us through our official contact form. We respond within 24 hours.</p>
          <button className="btn btn-md btn-primary" onClick={() => navigate('/contact')}>Contact Us →</button>
        </div>
      </div>

      <Footer navigate={navigate} />
    </div>
  );
}

function Footer({ navigate }) {
  return (
    <footer style={{ background:'var(--navy)', color:'#94a3b8', padding:'32px 20px', textAlign:'center', fontSize:13 }}>
      <div style={{ maxWidth:900, margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'center', gap:24, flexWrap:'wrap', marginBottom:16 }}>
          {[['Home','/'],['FAQ','/faq'],['Contact','/contact'],['Privacy','/privacy'],['Terms','/terms']].map(([l,p]) => (
            <span key={l} onClick={() => navigate(p)} style={{ cursor:'pointer', color:'#94a3b8' }} onMouseOver={e=>e.target.style.color='#fff'} onMouseOut={e=>e.target.style.color='#94a3b8'}>{l}</span>
          ))}
        </div>
        <div style={{ fontSize:12, color:'#475569' }}>© 2026 TeacherMarket. All rights reserved. No mobile numbers or WhatsApp displayed publicly.</div>
      </div>
    </footer>
  );
}
