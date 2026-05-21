import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { adminApi } from '../services/adminApi';
import './AdminDashboard.css';

const TABS = [
  { key: 'overview',     label: '📊 Overview' },
  { key: 'members',      label: '👥 Members' },
  { key: 'transactions', label: '💳 Transactions' },
  { key: 'packages',     label: '🪙 Coin Packages' },
  { key: 'profile',      label: '👤 My Profile' },
  { key: 'settings',     label: '⚙️ Settings' },
];

export default function AdminDashboard() {
  const { user, toast, logout } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');

  // ── Stats ──
  const [stats, setStats]     = useState(null);
  const [statsLoading, setSL] = useState(true);

  // ── Members ──
  const [members, setMembers]   = useState([]);
  const [mTotal, setMTotal]     = useState(0);
  const [mPage, setMPage]       = useState(1);
  const [mRole, setMRole]       = useState('ALL');
  const [mSearch, setMSearch]   = useState('');
  const [mLoading, setML]       = useState(false);
  const [coinModal, setCoinModal] = useState(null); // { userId, name, coinBalance }
  const [coinDelta, setCoinDelta] = useState('');

  // ── Transactions ──
  const [txns, setTxns]     = useState([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage]  = useState(1);
  const [txStatus, setTxStatus] = useState('ALL');
  const [txLoading, setTxL]  = useState(false);

  // ── Packages ──
  const [packages, setPackages] = useState([]);
  const [pkgForm, setPkgForm]   = useState(null); // null | {} for new | {id,...} for edit
  const [pkgLoading, setPL]     = useState(false);

  // ── Load stats ──
  useEffect(() => {
    if (tab !== 'overview') return;
    setSL(true);
    adminApi.getStats()
      .then(d => setStats(d))
      .catch(e => toast(e.message, 'e'))
      .finally(() => setSL(false));
  }, [tab]);

  // ── Load members ──
  const loadMembers = useCallback(async () => {
    setML(true);
    try {
      const d = await adminApi.getMembers({ role: mRole, page: mPage, search: mSearch });
      setMembers(d.users); setMTotal(d.total);
    } catch (e) { toast(e.message, 'e'); }
    finally { setML(false); }
  }, [mRole, mPage, mSearch]);

  useEffect(() => { if (tab === 'members') loadMembers(); }, [tab, mPage, mRole]);

  // ── Load transactions ──
  const loadTxns = useCallback(async () => {
    setTxL(true);
    try {
      const d = await adminApi.getTransactions({ status: txStatus, page: txPage });
      setTxns(d.payments); setTxTotal(d.total);
    } catch (e) { toast(e.message, 'e'); }
    finally { setTxL(false); }
  }, [txStatus, txPage]);

  useEffect(() => { if (tab === 'transactions') loadTxns(); }, [tab, txPage, txStatus]);

  // ── Load packages ──
  const loadPackages = useCallback(async () => {
    setPL(true);
    try {
      const d = await adminApi.getPackages();
      setPackages(d.packages);
    } catch (e) { toast(e.message, 'e'); }
    finally { setPL(false); }
  }, []);

  useEffect(() => { if (tab === 'packages') loadPackages(); }, [tab]);

  // ── Actions ──
  const toggleSuspend = async (userId, current) => {
    try {
      const d = await adminApi.suspendUser(userId, !current);
      toast(d.message, 's');
      loadMembers();
    } catch (e) { toast(e.message, 'e'); }
  };

  const adjustCoins = async () => {
    if (!coinDelta || isNaN(parseInt(coinDelta))) { toast('Enter a valid number', 'e'); return; }
    try {
      const d = await adminApi.adjustCoins(coinModal.userId, coinDelta);
      toast(d.message, 's');
      setCoinModal(null); setCoinDelta('');
      loadMembers();
    } catch (e) { toast(e.message, 'e'); }
  };

  const savePackage = async () => {
    if (!pkgForm.key || !pkgForm.name || !pkgForm.coins || !pkgForm.priceINR) {
      toast('All fields required', 'e'); return;
    }
    try {
      await adminApi.savePackage(pkgForm);
      toast('Package saved ✅', 's');
      setPkgForm(null); loadPackages();
    } catch (e) { toast(e.message, 'e'); }
  };

  const deletePackage = async (id) => {
    if (!confirm('Delete this package?')) return;
    try {
      await adminApi.deletePackage(id);
      toast('Package deleted', 's'); loadPackages();
    } catch (e) { toast(e.message, 'e'); }
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const mPages = Math.ceil(mTotal / 20);
  const txPages = Math.ceil(txTotal / 20);

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <div className="admin-logo-icon">TM</div>
          <div>
            <div className="admin-logo-title">TeacherMarket</div>
            <div className="admin-logo-sub">Admin Panel</div>
          </div>
        </div>

        <nav className="admin-nav">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`admin-nav-item ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-user-avatar">A</div>
            <div>
              <div className="admin-user-name">Administrator</div>
              <div className="admin-user-email">{user?.email}</div>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={() => { logout(); navigate('/'); }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main">
        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <div className="admin-section">
            <div className="admin-page-header">
              <h1>Dashboard Overview</h1>
              <p>Platform analytics and recent activity</p>
            </div>

            {statsLoading ? (
              <div className="admin-loading">Loading stats…</div>
            ) : stats && (
              <>
                {/* KPI Cards */}
                <div className="admin-kpi-grid">
                  <div className="admin-kpi-card blue">
                    <div className="kpi-icon">👨‍🎓</div>
                    <div className="kpi-body">
                      <div className="kpi-value">{stats.totalStudents.toLocaleString()}</div>
                      <div className="kpi-label">Total Students</div>
                      <div className="kpi-sub">+{stats.newStudents} this month</div>
                    </div>
                  </div>
                  <div className="admin-kpi-card purple">
                    <div className="kpi-icon">👩‍🏫</div>
                    <div className="kpi-body">
                      <div className="kpi-value">{stats.totalTeachers.toLocaleString()}</div>
                      <div className="kpi-label">Total Teachers</div>
                      <div className="kpi-sub">+{stats.newTeachers} this month</div>
                    </div>
                  </div>
                  <div className="admin-kpi-card green">
                    <div className="kpi-icon">💰</div>
                    <div className="kpi-body">
                      <div className="kpi-value">{fmt(stats.totalRevenue)}</div>
                      <div className="kpi-label">Total Revenue</div>
                      <div className="kpi-sub">{stats.totalTransactions} transactions</div>
                    </div>
                  </div>
                  <div className="admin-kpi-card gold">
                    <div className="kpi-icon">🔓</div>
                    <div className="kpi-body">
                      <div className="kpi-value">{stats.totalUnlocks.toLocaleString()}</div>
                      <div className="kpi-label">Total Unlocks</div>
                      <div className="kpi-sub">{stats.pendingRequests} pending requests</div>
                    </div>
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h2>Recent Transactions</h2>
                    <button className="admin-link-btn" onClick={() => setTab('transactions')}>View all →</button>
                  </div>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Teacher</th>
                          <th>Package</th>
                          <th>Coins</th>
                          <th>Amount</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentPayments.map(p => (
                          <tr key={p.id}>
                            <td>
                              <div className="admin-member-name">{p.teacherName}</div>
                              <div className="admin-member-email">{p.teacherEmail}</div>
                            </td>
                            <td><span className="admin-badge badge-blue">{p.packageName}</span></td>
                            <td><span className="admin-coin-num">🪙 {p.coinsAdded}</span></td>
                            <td className="admin-amount">{fmt(p.amount)}</td>
                            <td className="admin-date">{fmtDate(p.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── MEMBERS TAB ── */}
        {tab === 'members' && (
          <div className="admin-section">
            <div className="admin-page-header">
              <h1>Members</h1>
              <p>Manage students and teachers on the platform</p>
            </div>

            <div className="admin-filters">
              <div className="admin-filter-group">
                {['ALL', 'STUDENT', 'TEACHER'].map(r => (
                  <button
                    key={r}
                    className={`admin-filter-btn ${mRole === r ? 'active' : ''}`}
                    onClick={() => { setMRole(r); setMPage(1); }}
                  >
                    {r === 'ALL' ? 'All Members' : r === 'STUDENT' ? '👨‍🎓 Students' : '👩‍🏫 Teachers'}
                  </button>
                ))}
              </div>
              <div className="admin-search-wrap">
                <input
                  className="admin-search"
                  placeholder="Search by name or email…"
                  value={mSearch}
                  onChange={e => setMSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadMembers()}
                />
                <button className="admin-search-btn" onClick={loadMembers}>Search</button>
              </div>
            </div>

            <div className="admin-card">
              <div className="admin-card-header">
                <h2>
                  {mRole === 'ALL' ? 'All Members' : mRole === 'STUDENT' ? 'Students' : 'Teachers'}
                  <span className="admin-count-badge">{mTotal}</span>
                </h2>
              </div>
              {mLoading ? (
                <div className="admin-loading">Loading members…</div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name / Email</th>
                        <th>Role</th>
                        <th>City</th>
                        <th>Details</th>
                        {mRole !== 'STUDENT' && <th>Coins</th>}
                        <th>Joined</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map(m => (
                        <tr key={m.id} className={m.isSuspended ? 'suspended-row' : ''}>
                          <td>
                            <div className="admin-member-name">{m.name}</div>
                            <div className="admin-member-email">{m.email || m.phone || '—'}</div>
                          </td>
                          <td>
                            <span className={`admin-badge ${m.role === 'STUDENT' ? 'badge-navy' : 'badge-gold'}`}>
                              {m.role}
                            </span>
                          </td>
                          <td>{m.city}</td>
                          <td className="admin-extra">{m.extra}</td>
                          {mRole !== 'STUDENT' && (
                            <td>
                              {m.role === 'TEACHER' ? (
                                <span className="admin-coin-num">🪙 {m.coinBalance ?? '—'}</span>
                              ) : '—'}
                            </td>
                          )}
                          <td className="admin-date">{fmtDate(m.createdAt)}</td>
                          <td>
                            <span className={`admin-status ${m.isSuspended ? 'status-suspended' : 'status-active'}`}>
                              {m.isSuspended ? 'Suspended' : 'Active'}
                            </span>
                          </td>
                          <td>
                            <div className="admin-action-btns">
                              <button
                                className={`admin-action-btn ${m.isSuspended ? 'btn-green-sm' : 'btn-red-sm'}`}
                                onClick={() => toggleSuspend(m.id, m.isSuspended)}
                              >
                                {m.isSuspended ? 'Unsuspend' : 'Suspend'}
                              </button>
                              {m.role === 'TEACHER' && (
                                <button
                                  className="admin-action-btn btn-gold-sm"
                                  onClick={() => { setCoinModal({ userId: m.id, name: m.name, coinBalance: m.coinBalance }); setCoinDelta(''); }}
                                >
                                  🪙 Coins
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {mPages > 1 && (
                <div className="admin-pagination">
                  <button disabled={mPage === 1} onClick={() => setMPage(p => p - 1)}>← Prev</button>
                  <span>Page {mPage} of {mPages}</span>
                  <button disabled={mPage >= mPages} onClick={() => setMPage(p => p + 1)}>Next →</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS TAB ── */}
        {tab === 'transactions' && (
          <div className="admin-section">
            <div className="admin-page-header">
              <h1>Coin Transactions</h1>
              <p>All coin purchase history across the platform</p>
            </div>

            <div className="admin-filters">
              <div className="admin-filter-group">
                {['ALL', 'SUCCESS', 'PENDING', 'FAILED'].map(s => (
                  <button
                    key={s}
                    className={`admin-filter-btn ${txStatus === s ? 'active' : ''}`}
                    onClick={() => { setTxStatus(s); setTxPage(1); }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-card">
              <div className="admin-card-header">
                <h2>Transactions <span className="admin-count-badge">{txTotal}</span></h2>
              </div>
              {txLoading ? (
                <div className="admin-loading">Loading transactions…</div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>#ID</th>
                        <th>Teacher</th>
                        <th>Package</th>
                        <th>Coins</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Payment ID</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txns.map(t => (
                        <tr key={t.id}>
                          <td className="admin-id">#{t.id}</td>
                          <td>
                            <div className="admin-member-name">{t.teacherName}</div>
                            <div className="admin-member-email">{t.teacherEmail}</div>
                          </td>
                          <td><span className="admin-badge badge-blue">{t.packageName}</span></td>
                          <td><span className="admin-coin-num">🪙 {t.coinsAdded}</span></td>
                          <td className="admin-amount">{fmt(t.amount)}</td>
                          <td>
                            <span className={`admin-status ${
                              t.status === 'SUCCESS' ? 'status-active' :
                              t.status === 'FAILED'  ? 'status-suspended' : 'status-pending'
                            }`}>{t.status}</span>
                          </td>
                          <td className="admin-extra">{t.razorpayPaymentId}</td>
                          <td className="admin-date">{fmtDate(t.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {txPages > 1 && (
                <div className="admin-pagination">
                  <button disabled={txPage === 1} onClick={() => setTxPage(p => p - 1)}>← Prev</button>
                  <span>Page {txPage} of {txPages}</span>
                  <button disabled={txPage >= txPages} onClick={() => setTxPage(p => p + 1)}>Next →</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PACKAGES TAB ── */}
        {tab === 'packages' && (
          <div className="admin-section">
            <div className="admin-page-header">
              <h1>Coin Packages</h1>
              <p>Manage the packages teachers can buy</p>
            </div>

            <div className="admin-card">
              <div className="admin-card-header">
                <h2>Active Packages</h2>
                <button
                  className="admin-primary-btn"
                  onClick={() => setPkgForm({ key: '', name: '', coins: '', priceINR: '', isActive: true })}
                >
                  + Add Package
                </button>
              </div>

              {pkgLoading ? (
                <div className="admin-loading">Loading packages…</div>
              ) : (
                <div className="admin-packages-grid">
                  {packages.map(pkg => (
                    <div key={pkg.id} className={`admin-pkg-card ${!pkg.isActive ? 'pkg-inactive' : ''}`}>
                      <div className="pkg-header">
                        <div className="pkg-key">{pkg.key}</div>
                        <div className={`admin-status ${pkg.isActive ? 'status-active' : 'status-suspended'}`}>
                          {pkg.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      <div className="pkg-name">{pkg.name}</div>
                      <div className="pkg-coins">🪙 {pkg.coins} coins</div>
                      <div className="pkg-price">{fmt(pkg.priceINR)}</div>
                      <div className="pkg-ratio">₹{(pkg.priceINR / pkg.coins).toFixed(2)} per coin</div>
                      <div className="pkg-actions">
                        <button
                          className="admin-action-btn btn-blue-sm"
                          onClick={() => setPkgForm({ ...pkg })}
                        >
                          Edit
                        </button>
                        <button
                          className="admin-action-btn btn-red-sm"
                          onClick={() => deletePackage(pkg.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {packages.length === 0 && (
                    <div className="admin-empty">No packages yet. Add one above.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <div className="admin-section">
            <div className="admin-page-header">
              <h1>My Profile</h1>
              <p>Admin account details and quick links</p>
            </div>
            <div className="admin-card">
              <div className="admin-card-body">
                <div className="admin-info-grid">
                  <div className="admin-info-item">
                    <div className="admin-info-label">Admin Email</div>
                    <div className="admin-info-value">{user?.email || '—'}</div>
                  </div>
                  <div className="admin-info-item">
                    <div className="admin-info-label">Role</div>
                    <div className="admin-info-value">Administrator</div>
                  </div>
                  <div className="admin-info-item">
                    <div className="admin-info-label">User ID</div>
                    <div className="admin-info-value">{user?.id || '—'}</div>
                  </div>
                  <div className="admin-info-item">
                    <div className="admin-info-label">Member Since</div>
                    <div className="admin-info-value">{user?.createdAt ? fmtDate(user.createdAt) : '—'}</div>
                  </div>
                </div>
                <div className="admin-quick-links">
                  <button className="admin-action-btn btn-blue-sm" onClick={() => setTab('members')}>Manage Members</button>
                  <button className="admin-action-btn btn-gold-sm" onClick={() => setTab('packages')}>Edit Coin Packages</button>
                  <button className="admin-action-btn btn-green-sm" onClick={() => setTab('transactions')}>View Transactions</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab === 'settings' && (
          <div className="admin-section">
            <div className="admin-page-header">
              <h1>Settings</h1>
              <p>Admin preferences and platform controls</p>
            </div>
            <div className="admin-card">
              <div className="admin-card-body">
                <div className="admin-settings-note">
                  <p className="admin-settings-text">
                    Use the dashboard tabs to manage members, review transactions, and configure coin packages.
                  </p>
                  <p className="admin-settings-text">
                    The admin panel is designed for platform operations. Teacher coin purchases are handled from the Teacher dashboard.
                  </p>
                </div>
                <div className="admin-quick-links">
                  <button className="admin-action-btn btn-blue-sm" onClick={() => setTab('overview')}>View Overview</button>
                  <button className="admin-action-btn btn-gold-sm" onClick={() => setTab('members')}>Member Controls</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Coin Adjust Modal ── */}
      {coinModal && (
        <div className="admin-modal-overlay" onClick={() => setCoinModal(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Adjust Coins — {coinModal.name}</h3>
              <button className="admin-modal-close" onClick={() => setCoinModal(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-coin-current">
                Current balance: <strong>🪙 {coinModal.coinBalance ?? 0}</strong>
              </div>
              <label className="admin-label">Delta (positive to add, negative to deduct)</label>
              <input
                className="admin-input"
                type="number"
                placeholder="e.g. 50 or -50"
                value={coinDelta}
                onChange={e => setCoinDelta(e.target.value)}
              />
            </div>
            <div className="admin-modal-footer">
              <button className="admin-cancel-btn" onClick={() => setCoinModal(null)}>Cancel</button>
              <button className="admin-primary-btn" onClick={adjustCoins}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Package Form Modal ── */}
      {pkgForm && (
        <div className="admin-modal-overlay" onClick={() => setPkgForm(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{pkgForm.id ? 'Edit Package' : 'New Package'}</h3>
              <button className="admin-modal-close" onClick={() => setPkgForm(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              {[
                { field: 'key',      label: 'Package Key (unique id)',    placeholder: 'e.g. starter' },
                { field: 'name',     label: 'Display Name',               placeholder: 'e.g. Starter Pack' },
                { field: 'coins',    label: 'Coins',                      placeholder: '100' },
                { field: 'priceINR', label: 'Price (₹ INR)',              placeholder: '100' },
              ].map(({ field, label, placeholder }) => (
                <div key={field} className="admin-form-group">
                  <label className="admin-label">{label}</label>
                  <input
                    className="admin-input"
                    placeholder={placeholder}
                    value={pkgForm[field] ?? ''}
                    disabled={field === 'key' && !!pkgForm.id}
                    onChange={e => setPkgForm(p => ({ ...p, [field]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="admin-form-group">
                <label className="admin-label">Status</label>
                <select
                  className="admin-input"
                  value={pkgForm.isActive ? 'true' : 'false'}
                  onChange={e => setPkgForm(p => ({ ...p, isActive: e.target.value === 'true' }))}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-cancel-btn" onClick={() => setPkgForm(null)}>Cancel</button>
              <button className="admin-primary-btn" onClick={savePackage}>Save Package</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
