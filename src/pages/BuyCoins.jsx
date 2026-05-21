import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import { paymentApi } from '../services/api';
import './StudentDashboard.css';

const NAV = [
  { type:'section', label:'Main' },
  { icon:'📊', label:'Overview',          path:'/teacher/dashboard'  },
  { icon:'🔍', label:'Browse Students',   path:'/teacher/students'   },
  { icon:'🔓', label:'Unlocked Profiles', path:'/teacher/unlocked'   },
  { icon:'👤', label:'My Profile',        path:'/teacher/profile'    },
  { icon:'🪙', label:'Buy Coins',         path:'/teacher/coins'      },
  { icon:'📋', label:'Coin History',      path:'/teacher/history'    },
  { type:'divider' },
  { type:'section', label:'Settings' },
  { icon:'⚙️', label:'Settings',          path:'/teacher/settings'   },
  { icon:'🚪', label:'Log Out', logout:true },
];

const PACKAGES = [
  { id:'starter', emoji:'🪙', name:'Starter Pack', coins:100, unlocks:2, price:100 },
  { id:'standard', emoji:'💰', name:'Standard Pack', coins:200, unlocks:4, price:200 },
  { id:'popular', emoji:'💎', name:'Popular Pack',  coins:250, unlocks:5, price:250, popular:true },
];

export default function BuyCoins() {
  const { user, coins, updateCoins, toast } = useApp();
  const navigate = useNavigate();
  const [selected,   setSelected]   = useState('popular');
  const [payMethod,  setPayMethod]  = useState('upi');
  const [customAmt,  setCustomAmt]  = useState('');
  const [processing, setProcessing] = useState(false);

  const name = user?.teacher?.name || user?.email || 'Teacher';
  const pkg  = PACKAGES.find(p => p.id === selected) || PACKAGES[1];
  const finalCoins = customAmt >= 100 ? parseInt(customAmt) : pkg.coins;
  const finalPrice = customAmt >= 100 ? parseInt(customAmt) : pkg.price;


  const handlePay = async () => {
    setProcessing(true);
    try {
      const orderData = await paymentApi.createOrder(
        customAmt >= 100 ? { customAmount: parseInt(customAmt) } : { packageId: selected }
      );
      const razorpayKey = orderData.keyId;

      if (!razorpayKey) {
        toast('Razorpay not configured — coins credited in test mode ✅', 'i');
        const verify = await paymentApi.verifyPayment({
          orderId: orderData.orderId,
          paymentId: `dev_${Date.now()}`,
          amount: orderData.amount / 100,
        });
        updateCoins(verify.coinBalance);
        navigate('/teacher/dashboard');
        return;
      }

      const options = {
        key:         razorpayKey,
        amount:      orderData.amount,
        currency:    orderData.currency,
        name:        'TeacherMarket',
        description: orderData.packageName,
        prefill:     { name: orderData.userName, contact: orderData.userPhone },
        theme:       { color: '#f5a623' },
        handler: async (response) => {
          try {
            const verify = await paymentApi.verifyPayment({
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              amount: orderData.amount / 100,
            });
            updateCoins(verify.coinBalance);
            toast(`✅ ${verify.coinsAdded} coins added to your account!`, 's');
            navigate('/teacher/dashboard');
          } catch (err) { toast('Payment verification failed: ' + err.message, 'e'); }
        },
        modal: { ondismiss: () => { toast('Payment cancelled', 'w'); setProcessing(false); } },
      };
      if (orderData.orderId && !String(orderData.orderId).startsWith('local_order_')) {
        options.order_id = orderData.orderId;
      }
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast(err.message, 'e');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="page-enter" style={{ paddingTop:66 }}>
      {/* Load Razorpay script */}
      {!window.Razorpay && (() => {
        const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; document.head.appendChild(s); return null;
      })()}

      <Sidebar items={NAV} userName={name} userRole="Teacher Account" avClass="av-gold" initials={name[0]} />
      <main className="dash-main">
        <h1 className="page-title">Buy Coins</h1>
        <p className="page-sub">Select a package · Each student profile unlock = 50 coins</p>

        <div className="coins-layout">
          <div>
            <div className="big-coin-display">
              <div className="bcd-label">Current Balance</div>
              <div className="bcd-amount">{coins}</div>
              <div className="bcd-sub">You can unlock {Math.floor(coins/50)} more student profiles</div>
            </div>

            <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:16, color:'var(--navy)', marginBottom:14 }}>Choose Package</div>
            <div className="pkg-grid">
              {PACKAGES.map(p => (
                <div key={p.id} className={`pkg-card ${p.popular?'popular':''} ${selected===p.id?'selected':''}`} onClick={() => { setSelected(p.id); setCustomAmt(''); }}>
                  <div className="pkg-emoji">{p.emoji}</div>
                  <div className="pkg-coins">{p.coins} <span>coins</span></div>
                  <div style={{ fontSize:11, color:'var(--gray-l)', margin:'5px 0 10px' }}>Unlock {p.unlocks} profiles</div>
                  <div className="pkg-price">₹{p.price}</div>
                </div>
              ))}
            </div>

            <div className="card card-p" style={{ marginTop:20 }}>
              <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:15, color:'var(--navy)', marginBottom:10 }}>Custom Amount</div>
              <p style={{ fontSize:13, color:'var(--gray)', marginBottom:14 }}>Minimum ₹100 · 1 coin = ₹1</p>
              <div style={{ display:'flex', gap:12 }}>
                <input className="form-input" type="number" placeholder="Enter amount in ₹" style={{ flex:1 }} value={customAmt} onChange={e => { setCustomAmt(e.target.value); setSelected(''); }}/>
                <div style={{ padding:'12px 18px', background:'var(--gold-p)', border:'2px solid rgba(245,166,35,.3)', borderRadius:12, fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:14, whiteSpace:'nowrap', color:'var(--navy)' }}>
                  = {customAmt || 0} coins
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="order-card">
              <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:16, color:'var(--navy)', marginBottom:18 }}>Order Summary</div>
              <div style={{ background:'var(--off)', borderRadius:12, padding:16, marginBottom:18 }}>
                <div className="order-row"><span style={{ color:'var(--gray)' }}>Package</span><span style={{ fontWeight:700 }}>{customAmt >= 100 ? 'Custom' : pkg.name}</span></div>
                <div className="order-row"><span style={{ color:'var(--gray)' }}>Coins</span><span style={{ fontWeight:800, color:'var(--gold)' }}>+ {finalCoins} coins</span></div>
                <div className="order-row" style={{ border:'none' }}><span style={{ fontWeight:800 }}>Total</span><span className="order-total">₹{finalPrice}</span></div>
              </div>
              <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:14, color:'var(--navy)', marginBottom:12 }}>Payment Method</div>
              <div className="pay-method">
                {[{ id:'upi', icon:'📱', label:'UPI / PhonePe / GPay' }, { id:'card', icon:'💳', label:'Credit / Debit Card' }, { id:'nb', icon:'🏦', label:'Net Banking' }].map(m => (
                  <label key={m.id} className={`pay-opt ${payMethod===m.id?'selected':''}`} onClick={() => setPayMethod(m.id)}>
                    <input type="radio" name="pay" checked={payMethod===m.id} readOnly style={{ accentColor:'var(--gold)' }}/>
                    <span style={{ fontSize:18 }}>{m.icon}</span>
                    <span style={{ fontWeight:600, fontSize:13 }}>{m.label}</span>
                  </label>
                ))}
              </div>
              <button className="btn btn-lg btn-primary btn-w-full" onClick={handlePay} disabled={processing || finalPrice < 100}>
                {processing ? 'Processing…' : `Pay ₹${finalPrice} & Get Coins →`}
              </button>
              <p style={{ textAlign:'center', fontSize:11, color:'var(--gray-l)', marginTop:10 }}>🔒 Secured by Razorpay · Coins credited instantly</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
