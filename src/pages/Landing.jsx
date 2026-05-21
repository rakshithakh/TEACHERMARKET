import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const revealRefs = useRef([]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); }),
      { threshold: 0.12 }
    );
    revealRefs.current.forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const addRef = el => { if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el); };

  return (
    <div className="page-enter">
      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-orbs">
          <div className="orb" style={{ width:350,height:350,background:'rgba(245,166,35,.07)',borderRadius:'50%',right:-60,top:-60,'--d':'7s','--dl':'0s','--tx':'18px','--ty':'-18px' }} />
          <div className="orb" style={{ width:220,height:220,background:'rgba(37,99,235,.07)',borderRadius:'50%',left:'8%',bottom:'8%','--d':'9s','--dl':'2s','--tx':'-12px','--ty':'-22px' }} />
          <div className="orb" style={{ width:130,height:130,background:'rgba(245,166,35,.09)',borderRadius:'50%',left:'38%',top:'22%','--d':'6s','--dl':'4s','--tx':'10px','--ty':'12px' }} />
        </div>
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-eyebrow">✦ India's #1 Home Tuition Platform</div>
            <h1 className="hero-h1">Find the Best<br /><em>Teachers</em> Near You</h1>
            <p className="hero-p">Connect students with qualified home tutors. Fast, simple, transparent — powered by a smart coin system.</p>
            <div className="hero-btns">
              <button className="btn btn-xl btn-primary" onClick={() => navigate('/register')}>I'm a Student →</button>
              <button className="btn btn-xl btn-ghost-dark" onClick={() => navigate('/register')}>I'm a Teacher</button>
            </div>
            <div className="hero-stats">
              <div><div className="hs-num">12K+</div><div className="hs-lbl">Students</div></div>
              <div><div className="hs-num">4.8K+</div><div className="hs-lbl">Tutors</div></div>
              <div><div className="hs-num">50+</div><div className="hs-lbl">Cities</div></div>
              <div><div className="hs-num">98%</div><div className="hs-lbl">Satisfaction</div></div>
            </div>
          </div>
          <div className="hero-cards">
            <div className="hcard hcard-1">
              <div className="hcard-head"><div className="hcard-tag">📚 Student</div><div className="hcard-name">Aryan Sharma</div><div className="hcard-sub">Class 10 · Bhopal</div></div>
              <div className="hcard-body"><div style={{ display:'flex',gap:5,flexWrap:'wrap' }}><span className="subject-pill">Maths</span><span className="subject-pill">Science</span><span className="subject-pill blue">English</span></div></div>
            </div>
            <div className="hcard hcard-2">
              <div className="hcard-head"><div className="hcard-tag">👩‍🏫 Teacher</div><div className="hcard-name">Priya Verma</div><div className="hcard-sub">M.Sc Maths · 6 yrs</div></div>
              <div className="hcard-body"><div style={{ display:'flex',gap:5 }}><span className="subject-pill">Maths</span><span className="subject-pill blue">Physics</span></div></div>
            </div>
            <div className="hcard hcard-3">
              <div className="hcard-head"><div className="hcard-tag">🪙 Balance</div></div>
              <div className="hcard-body">
                <div style={{ display:'flex',alignItems:'center',gap:9 }}>
                  <div className="hero-coin-icon">🪙</div>
                  <div><div className="hero-coin-num">350</div><div style={{ fontSize:11,color:'var(--gray)' }}>coins available</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section alt">
        <div className="sec-head"><div className="sec-lbl">Simple Process</div><h2 className="sec-h2">How TeacherMarket Works</h2><p className="sec-p">Three easy steps to your perfect teaching connection.</p></div>
        <div className="how-grid">
          {[
            { num:'01', icon:'📝', iconCls:'hi-navy', title:'Register & Profile',    desc:'Sign up and build your profile. Students add class, subjects & location. Teachers share qualifications and experience.' },
            { num:'02', icon:'🔍', iconCls:'hi-gold', title:'Browse & Discover',     desc:'Teachers search student listings by city and subject. First two profiles are completely free for new teachers.' },
            { num:'03', icon:'🤝', iconCls:'hi-blue', title:'Unlock & Connect',      desc:'Use coins to unlock full contact details. Pay only for leads you want — no subscriptions, no waste.' },
          ].map((s,i) => (
            <div className="how-card" key={i} style={{ transitionDelay: `${i*0.13}s` }} ref={addRef}>
              <div className="how-card-bg-num">{s.num}</div>
              <div className={`how-icon ${s.iconCls}`}>{s.icon}</div>
              <div className="how-title">{s.title}</div>
              <div className="how-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="section">
        <div className="sec-head"><div className="sec-lbl">Transparent Pricing</div><h2 className="sec-h2">Simple Coin Packages</h2><p className="sec-p">Buy coins once, unlock student profiles as you go.</p></div>
        <div className="price-cards">
          {[
            { emoji:'🪙', coins:100,  unlocks:2,  price:100, label:'Get Started',  featured:false },
            { emoji:'💰', coins:200,  unlocks:4,  price:200, label:'Standard',     featured:false },
            { emoji:'💎', coins:250,  unlocks:5,  price:250, label:'Best Value',   featured:true  },
          ].map((pkg,i) => (
            <div className={`price-card ${pkg.featured ? 'featured' : ''}`} key={i}>
              {pkg.featured && <div className="price-card-pop">MOST POPULAR</div>}
              <div className="pc-emoji">{pkg.emoji}</div>
              <div className="pc-coins">{pkg.coins} <span>coins</span></div>
              <div className="pc-unlocks">Unlock {pkg.unlocks} profiles</div>
              <div className="pc-price">₹{pkg.price}</div>
              <button className={`btn btn-md ${pkg.featured ? 'btn-primary' : 'btn-navy'} btn-w-full`} style={{ marginTop:16 }} onClick={() => navigate('/register')}>{pkg.label}</button>
            </div>
          ))}
        </div>
        <p style={{ textAlign:'center', fontSize:12, color:'var(--gray-l)', marginTop:18 }}>Each unlock = 50 coins · First 2 profiles always free for new teachers</p>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="section alt">
        <div className="sec-head"><div className="sec-lbl">Real Stories</div><h2 className="sec-h2">Loved by Thousands</h2></div>
        <div className="testi-grid">
          {[
            { q:'"', stars:'★★★★★', text:'Found an amazing Maths tutor within 24 hours. My son\'s grades improved drastically in just 2 months.', avCls:'av-navy', init:'R', name:'Rekha Gupta',    role:'Parent · Bhopal',   delay:0    },
            { q:'"', stars:'★★★★★', text:'The coin system is brilliant. I only pay when I find students I actually want to teach. Zero waste.',       avCls:'av-gold', init:'P', name:'Pradeep Mishra', role:'Tutor · Indore',    delay:.13  },
            { q:'"', stars:'★★★★★', text:'Created my profile and within days I had student calls. This platform genuinely works!',                    avCls:'av-blue', init:'S', name:'Sunita Joshi',   role:'Tutor · Jabalpur', delay:.26  },
          ].map((t,i) => (
            <div className="tcard" key={i} style={{ transitionDelay:`${t.delay}s` }} ref={addRef}>
              <div className="tcard-q">{t.q}</div>
              <div style={{ color:'var(--gold)', fontSize:12, marginBottom:8 }}>{t.stars}</div>
              <div className="tcard-text">{t.text}</div>
              <div className="tcard-person">
                <div className={`av av-sm ${t.avCls}`}>{t.init}</div>
                <div><div className="tcard-name">{t.name}</div><div className="tcard-role">{t.role}</div></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-h2">Ready to Find<br /><em>Your Perfect Match?</em></h2>
          <p className="cta-p">Join thousands already connected on TeacherMarket.</p>
          <div className="cta-btns">
            <button className="btn btn-xl btn-primary"    onClick={() => navigate('/register')}>Register as Student</button>
            <button className="btn btn-xl btn-ghost-dark" onClick={() => navigate('/register')}>Join as Teacher</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-top">
          <div><div className="footer-brand">Teacher<span>Market</span></div><p className="footer-brand-p">India's trusted home tuition platform connecting students and teachers across 50+ cities.</p></div>
          <div><div className="footer-col-title">Platform</div><ul className="footer-links"><li><a href="#">How It Works</a></li><li><a href="#">For Students</a></li><li><a href="#">For Teachers</a></li><li><a href="#">Pricing</a></li></ul></div>
          <div><div className="footer-col-title">Support</div><ul className="footer-links"><li><a href="#">Help Center</a></li><li><a href="#">Contact</a></li><li><a href="#">Privacy Policy</a></li><li><a href="#">Terms</a></li></ul></div>
          <div><div className="footer-col-title">Cities</div><ul className="footer-links"><li><a href="#">Bhopal</a></li><li><a href="#">Indore</a></li><li><a href="#">Jabalpur</a></li><li><a href="#">Delhi</a></li></ul></div>
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">© 2026 TeacherMarket. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
