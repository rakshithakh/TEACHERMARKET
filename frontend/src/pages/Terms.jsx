import { useNavigate } from 'react-router-dom';

const SECTIONS = [
  { title:'Acceptance of Terms', content:`By registering or using TeacherMarket, you agree to these Terms and Conditions. If you do not agree, please do not use the platform.` },
  { title:'Student Terms', content:`Students may post requirements for free. Submissions must be genuine educational requirements. Fake, spam, or misleading submissions will result in account suspension. Students agree that their contact details may be shared with teachers who pay to unlock their profile.` },
  { title:'Teacher Terms', content:`Teachers must provide accurate qualification and experience details. Use of contact information obtained through the platform is limited to the purpose of genuine educational services. Misuse of student contact details will result in permanent ban and legal action.` },
  { title:'Coin System', content:`Coins are purchased via Razorpay and are non-refundable unless the platform is at fault. 50 coins unlocks one student lead. First 2 unlocks are free for new teachers. Admin may adjust coin allocations for promotional purposes.` },
  { title:'Content Policy', content:`Users must not post offensive, misleading, or inappropriate content. TeacherMarket reserves the right to remove any content and suspend accounts that violate this policy.` },
  { title:'Admin Rights', content:`The admin team reviews all student requirements before publishing. Admin may approve, hide, close, or mark any lead as private at their discretion, particularly for large/foreign/assignment requirements that warrant personal attention.` },
  { title:'Privacy & Contact', content:`TeacherMarket does not publicly display phone numbers or WhatsApp contacts. All support is provided through official email. Users must not share other users' contact details outside the platform.` },
  { title:'Limitation of Liability', content:`TeacherMarket is a platform connecting students and teachers. We are not responsible for the quality of tutoring services provided. Users transact at their own risk. We are not liable for disputes between users.` },
  { title:'Governing Law', content:`These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Madhya Pradesh, India.` },
];

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div style={{ paddingTop:66 }}>
      <div style={{ background:'var(--navy)', padding:'56px 20px 48px', textAlign:'center' }}>
        <h1 style={{ fontSize:32, fontWeight:900, color:'#fff', marginBottom:12 }}>Terms & Conditions</h1>
        <p style={{ color:'#94a3b8', maxWidth:500, margin:'0 auto', fontSize:14 }}>Last updated: January 2026 · Please read carefully before using TeacherMarket.</p>
      </div>
      <div style={{ maxWidth:760, margin:'0 auto', padding:'48px 20px' }}>
        {SECTIONS.map((s, i) => (
          <div key={i} style={{ marginBottom:28 }}>
            <h2 style={{ fontSize:16, fontWeight:800, color:'var(--navy)', marginBottom:10, fontFamily:'Sora,sans-serif' }}>{i+1}. {s.title}</h2>
            <p style={{ fontSize:14, color:'var(--gray)', lineHeight:1.8 }}>{s.content}</p>
          </div>
        ))}
        <div style={{ marginTop:40, paddingTop:24, borderTop:'1px solid var(--border)', fontSize:13, color:'var(--gray)' }}>
          Questions? Email <strong>support@teachermarket.in</strong>
        </div>
      </div>
      <footer style={{ background:'var(--navy)', color:'#94a3b8', padding:'24px 20px', textAlign:'center', fontSize:12 }}>
        <span style={{ cursor:'pointer' }} onClick={()=>navigate('/')}>Home</span> · <span style={{ cursor:'pointer' }} onClick={()=>navigate('/privacy')}>Privacy</span> · <span style={{ cursor:'pointer' }} onClick={()=>navigate('/contact')}>Contact</span>
      </footer>
    </div>
  );
}
