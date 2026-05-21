import { useNavigate } from 'react-router-dom';

const SECTIONS = [
  { title:'Information We Collect', content:`We collect information you provide during registration: name, email address, phone number, educational details, and location. For teachers, we also collect teaching qualifications and experience.` },
  { title:'How We Use Your Information', content:`Your information is used to match students with teachers, facilitate contact after a teacher unlocks a lead, and improve our platform. We never sell your personal data to third parties.` },
  { title:'Contact Information Privacy', content:`Student mobile numbers and email addresses are hidden by default. They are only revealed to teachers who have paid coins to unlock a specific lead. Teachers must agree to our usage terms before accessing contact details.` },
  { title:'No Public Display of Phone Numbers', content:`TeacherMarket does not display any personal phone numbers or WhatsApp numbers publicly on the website. All contact details are protected and only accessible through our secure coin-based unlock system.` },
  { title:'Cookies & Storage', content:`We use browser localStorage and sessionStorage to maintain your login session and store temporary data. No tracking cookies are used. No analytics data is sent to third parties.` },
  { title:'Data Security', content:`All data is stored locally in your browser (localStorage). No data is transmitted to external servers in the frontend-only version. For production deployments with backend, all communications use HTTPS.` },
  { title:'Your Rights', content:`You have the right to access, update, or delete your account data at any time. To delete your account, contact us at support@teachermarket.in.` },
  { title:'Changes to This Policy', content:`We may update this privacy policy from time to time. Continued use of the platform after changes constitutes acceptance of the updated policy.` },
];

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div style={{ paddingTop:66 }}>
      <div style={{ background:'var(--navy)', padding:'56px 20px 48px', textAlign:'center' }}>
        <h1 style={{ fontSize:32, fontWeight:900, color:'#fff', marginBottom:12 }}>Privacy Policy</h1>
        <p style={{ color:'#94a3b8', maxWidth:500, margin:'0 auto', fontSize:14 }}>Last updated: January 2026 · Effective immediately</p>
      </div>
      <div style={{ maxWidth:760, margin:'0 auto', padding:'48px 20px' }}>
        <div style={{ background:'var(--gold-p)', border:'1px solid rgba(245,166,35,.3)', borderRadius:12, padding:'16px 22px', marginBottom:32, fontSize:14, color:'#78350f', lineHeight:1.7 }}>
          🔒 <strong>Our Commitment:</strong> TeacherMarket does not display any phone numbers or WhatsApp contacts publicly. Student contact details are protected behind our coin-based unlock system.
        </div>
        {SECTIONS.map(s => (
          <div key={s.title} style={{ marginBottom:28 }}>
            <h2 style={{ fontSize:16, fontWeight:800, color:'var(--navy)', marginBottom:10, fontFamily:'Sora,sans-serif' }}>{s.title}</h2>
            <p style={{ fontSize:14, color:'var(--gray)', lineHeight:1.8 }}>{s.content}</p>
          </div>
        ))}
        <div style={{ marginTop:40, paddingTop:24, borderTop:'1px solid var(--border)', fontSize:13, color:'var(--gray)' }}>
          Questions? Contact us at <strong>support@teachermarket.in</strong>
        </div>
      </div>
      <footer style={{ background:'var(--navy)', color:'#94a3b8', padding:'24px 20px', textAlign:'center', fontSize:12 }}>
        <span style={{ cursor:'pointer' }} onClick={()=>navigate('/')}>Home</span> · <span style={{ cursor:'pointer' }} onClick={()=>navigate('/terms')}>Terms</span> · <span style={{ cursor:'pointer' }} onClick={()=>navigate('/contact')}>Contact</span>
      </footer>
    </div>
  );
}
