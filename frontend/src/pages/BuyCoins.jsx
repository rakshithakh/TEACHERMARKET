import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import { paymentApi } from '../services/api';
import './StudentDashboard.css';

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

export default function BuyCoins() {
  const { user, coins, updateCoins, refreshUser, toast } = useApp();
  const navigate = useNavigate();

  const [packages,    setPackages]    = useState([]);
  const [selected,    setSelected]    = useState('');
  const [customAmt,   setCustomAmt]   = useState('');
  const [processing,  setProcessing]  = useState(false);
  const [devCrediting, setDevCred]    = useState(false);

  const name = user?.teacher?.name || user?.email || 'Teacher';

  useEffect(() => {
    const mapped = [
      { key:'starter',  name:'Starter Pack',  emoji:'🪙', coins:100, priceINR:100, popular:false },
      { key:'standard', name:'Standard Pack', emoji:'💰', coins:200, priceINR:200, popular:false },
      { key:'popular',  name:'Popular Pack',  emoji:'💎', coins:250, priceINR:250, popular:true  },
    ];
    setPackages(mapped);
    setSelected('popular');
  }, []);

  const pkg = packages.find(p => p.key === selected);
  const customNum = parseInt(customAmt) || 0;
  const isCustom = customNum >= 100;
  const finalCoins = isCustom ? customNum : (pkg?.coins || 0);
  const finalPrice = isCustom ? customNum : (pkg?.priceINR || 0);

  // Dev mode: instantly credit coins without Razorpay
  const handleDevCredit = async () => {
    if (!finalCoins) { toast('Select a package first', 'e'); return; }
    setDevCred(true);
    try {
      const order = await paymentApi.createOrder(
        isCustom ? { customAmount: customNum } : { packageId: selected }
      );
      const result = await paymentApi.verifyPayment({
        paymentId: order.paymentId,
        razorpayPaymentId: 'dev_' + Date.now(),
        amount: order.amount / 100,
      });
      updateCoins(result.coinBalance);
      refreshUser();
      toast(`🎉 ${result.message}`, 's');
      setTimeout(() => navigate('/teacher/dashboard'), 1200);
    } catch (err) { toast(err.message, 'e'); }
    finally { setDevCred(false); }
  };

  const handleRazorpay = async () => {
    if (!finalCoins) { toast('Select a package first', 'e'); return; }
    setProcessing(true);
    try {
      const order = await paymentApi.createOrder(
        isCustom ? { customAmount: customNum } : { packageId: selected }
      );

      if (!order.keyId) {
        // No Razorpay key — use dev credit
        toast('Razorpay not configured. Using dev mode.', 'i');
        const result = await paymentApi.verifyPayment({
          paymentId: order.paymentId,
          razorpayPaymentId: 'dev_' + Date.now(),
          amount: order.amount / 100,
        });
        updateCoins(result.coinBalance);
        refreshUser();
        toast(`🎉 ${result.message}`, 's');
        setTimeout(() => navigate('/teacher/dashboard'), 1200);
        return;
      }

      // Load Razorpay script
      if (!window.Razorpay) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://checkout.razorpay.com/v1/checkout.js';
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }

      new window.Razorpay({
        key:         order.keyId,
        amount:      order.amount,
        currency:    'INR',
        name:        'TeacherMarket',
        description: order.packageName,
        handler: async (response) => {
          try {
            const result = await paymentApi.verifyPayment({
              paymentId: order.paymentId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              amount: order.amount / 100,
            });
            updateCoins(result.coinBalance);
            refreshUser();
            toast(`🎉 ${result.message}`, 's');
            navigate('/teacher/dashboard');
          } catch (err) { toast('Verification failed: ' + err.message, 'e'); }
        },
        prefill: { name: order.userName, contact: order.userPhone },
        theme: { color: '#f5a623' },
        modal: { ondismiss: () => { setProcessing(false); } },
      }).open();
    } catch (err) { toast(err.message, 'e'); setProcessing(false); }
  };

  const noRazorpay = !import.meta.env.VITE_RAZORPAY_KEY_ID;

  return (
    <div className="page-enter" style={{ paddingTop:66 }}>
      <Sidebar nav={NAV} user={user} />
      <main className="dash-main">
        <div style={{ maxWidth:760 }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
            <div>
              <h1 className="page-title">Buy Coins 🪙</h1>
              <p className="page-sub">50 coins = 1 student profile unlock · First 2 unlocks always free</p>
            </div>
            <div className="nav-coin-pill" style={{ fontSize:16, padding:'8px 18px' }}>🪙 {coins}</div>
          </div>

          {/* Dev mode banner */}
          {noRazorpay && (
            <div style={{ background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:12, padding:'12px 18px', marginBottom:20, display:'flex', gap:12, alignItems:'center' }}>
              <span style={{ fontSize:20 }}>⚡</span>
              <div>
                <div style={{ fontWeight:700, color:'#92400e', fontSize:14 }}>Dev Mode — Razorpay not configured</div>
                <div style={{ fontSize:13, color:'#b45309' }}>Coins will be credited instantly. Set VITE_RAZORPAY_KEY_ID in .env for real payments.</div>
              </div>
            </div>
          )}

          {/* Package cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:24 }}>
            {packages.map(p => (
              <div
                key={p.key}
                onClick={() => { setSelected(p.key); setCustomAmt(''); }}
                style={{
                  background: selected===p.key ? 'var(--gold-p)' : '#fff',
                  border: selected===p.key ? '2px solid var(--gold)' : '2px solid var(--border)',
                  borderRadius:14, padding:20, cursor:'pointer', textAlign:'center',
                  position:'relative', transition:'all .2s',
                  boxShadow: selected===p.key ? '0 4px 20px rgba(245,166,35,.2)' : 'none',
                }}
              >
                {p.popular && (
                  <div style={{ position:'absolute', top:-11, left:'50%', transform:'translateX(-50%)', background:'var(--gold)', color:'var(--navy)', fontSize:10, fontWeight:800, padding:'2px 12px', borderRadius:20, whiteSpace:'nowrap' }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ fontSize:36, marginBottom:8 }}>{p.emoji}</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:15, color:'var(--navy)', marginBottom:4 }}>{p.name}</div>
                <div style={{ fontSize:30, fontWeight:900, color:'var(--gold)', marginBottom:2 }}>🪙 {p.coins}</div>
                <div style={{ fontSize:12, color:'var(--gray)', marginBottom:12 }}>= {Math.floor(p.coins/50)} student unlock{Math.floor(p.coins/50)!==1?'s':''}</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:22, color:'var(--navy)' }}>₹{p.priceINR}</div>
              </div>
            ))}
          </div>

          {/* Custom amount */}
          <div className="card" style={{ marginBottom:20 }}>
            <div className="card-body">
              <div style={{ fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:14, color:'var(--navy)', marginBottom:12 }}>Custom Amount</div>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <span style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:20, color:'var(--navy)' }}>₹</span>
                <input
                  className="form-input"
                  type="number"
                  min={100}
                  placeholder="Min ₹100 — you get equal coins"
                  style={{ maxWidth:260, margin:0 }}
                  value={customAmt}
                  onChange={e => { setCustomAmt(e.target.value); if(parseInt(e.target.value)>=100) setSelected(''); }}
                />
                {customNum >= 100 && <span style={{ color:'var(--gold)', fontWeight:700 }}>= 🪙 {customNum} coins</span>}
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="card" style={{ marginBottom:20, background:'var(--gold-p)', border:'1px solid rgba(245,166,35,.3)' }}>
            <div className="card-body" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:13, color:'var(--navy)', marginBottom:4 }}>Order Summary</div>
                <div style={{ fontSize:13, color:'var(--gray)' }}>
                  {isCustom ? `Custom · ₹${finalPrice}` : (pkg?.name || '—')} · 🪙 {finalCoins} coins
                </div>
              </div>
              <div style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:30, color:'var(--gold)' }}>₹{finalPrice}</div>
            </div>
          </div>

          {/* Pay button */}
          <button
            className="btn btn-lg btn-primary btn-w-full"
            onClick={noRazorpay ? handleDevCredit : handleRazorpay}
            disabled={processing || devCrediting || (!pkg && !isCustom)}
            style={{ marginBottom:10 }}
          >
            {(processing || devCrediting) ? 'Processing...' :
              noRazorpay ? `⚡ Credit ${finalCoins} Coins Instantly (Dev Mode)` :
              `Pay ₹${finalPrice} & Get ${finalCoins} Coins`}
          </button>
          <p style={{ textAlign:'center', fontSize:12, color:'var(--gray)' }}>
            {noRazorpay ? 'Configure VITE_RAZORPAY_KEY_ID in .env for live payments' : 'Secured by Razorpay · 50 coins = 1 student unlock'}
          </p>
        </div>
      </main>
    </div>
  );
}
