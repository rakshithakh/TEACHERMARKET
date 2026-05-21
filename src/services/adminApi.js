// ─── adminApi.js ─────────────────────────────────────────────────────────────
// Drop this file into:  tutor-button/src/services/adminApi.js
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SESSION_KEY = 'tm_token';

const getToken = () => localStorage.getItem(SESSION_KEY);

const http = async (method, path, body = null) => {
  const headers = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) headers['Authorization'] = `Bearer ${t}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res  = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
};

export const adminApi = {

  // ── Overview stats ──────────────────────────────────────────────────────────
  async getStats() {
    const data = await http('GET', '/admin/stats');
    // Your backend returns: totalStudents, totalTeachers, totalPayments, totalRevenue
    // AdminDashboard expects: totalStudents, totalTeachers, totalRevenue,
    //                         totalTransactions, newStudents, newTeachers,
    //                         totalUnlocks, pendingRequests, recentPayments
    return {
      totalStudents:     data.totalStudents    ?? 0,
      totalTeachers:     data.totalTeachers    ?? 0,
      totalRevenue:      data.totalRevenue     ?? 0,
      totalTransactions: data.totalPayments    ?? 0,
      newStudents:       0,   // not tracked yet — shows 0
      newTeachers:       0,   // not tracked yet — shows 0
      totalUnlocks:      0,   // not tracked yet — shows 0
      pendingRequests:   0,   // not tracked yet — shows 0
      recentPayments:    [],  // not tracked yet — shows empty table
    };
  },

  // ── Members ─────────────────────────────────────────────────────────────────
  // AdminDashboard expects: { users: [...], total }
  // Your backend returns:   { members: [...], total }
  async getMembers({ role = 'ALL', page = 1, search = '' } = {}) {
    const params = new URLSearchParams({ role, page, search, limit: 20 });
    const data   = await http('GET', `/admin/members?${params}`);

    // Remap members → users, and flatten profile fields
    const users = (data.members || []).map(m => ({
      id:          m.id,
      email:       m.email,
      phone:       m.phone,
      role:        m.role,
      createdAt:   m.createdAt,
      isSuspended: m.isSuspended ?? false,
      // Flatten profile fields so AdminDashboard can read them directly
      name:        m.profile?.name       ?? m.email?.split('@')[0] ?? '—',
      city:        m.profile?.city       ?? '—',
      coinBalance: m.profile?.coinBalance ?? null,
      extra:       m.role === 'TEACHER'
                     ? `${m.profile?.experience ?? 0} yrs exp`
                     : `Class ${m.profile?.class ?? '—'}`,
    }));

    return { users, total: data.total ?? users.length };
  },

  // ── Suspend / Unsuspend ─────────────────────────────────────────────────────
  // AdminDashboard calls: adminApi.suspendUser(userId, true/false)
  // Your backend:         PATCH /admin/members/:id/suspend  { isSuspended: bool }
  async suspendUser(userId, isSuspended) {
    return http('PATCH', `/admin/members/${userId}/suspend`, { isSuspended });
  },

  // ── Adjust coins ────────────────────────────────────────────────────────────
  // AdminDashboard calls: adminApi.adjustCoins(userId, deltaString)
  // Your backend:         PATCH /admin/members/:id/coins  { delta: number }
  async adjustCoins(userId, delta) {
    return http('PATCH', `/admin/members/${userId}/coins`, { delta: parseInt(delta) });
  },

  // ── Transactions ────────────────────────────────────────────────────────────
  // AdminDashboard expects: { payments: [...], total }
  // Your backend returns:   { transactions: [...], total }
  async getTransactions({ status = 'ALL', page = 1 } = {}) {
    const params = new URLSearchParams({ status, page, limit: 20 });
    const data   = await http('GET', `/admin/transactions?${params}`);

    // Remap transactions → payments, and field names
    const payments = (data.transactions || []).map(t => ({
      id:               t.id,
      teacherName:      t.teacherName,
      teacherEmail:     t.teacherEmail,
      packageName:      '—',              // your backend doesn't store package name yet
      coinsAdded:       t.coinsAdded,
      amount:           t.amount,
      status:           t.status,
      razorpayPaymentId: t.razorpayId,
      createdAt:        t.createdAt,
    }));

    return { payments, total: data.total ?? payments.length };
  },

  // ── Packages ────────────────────────────────────────────────────────────────
  // AdminDashboard expects: { packages: [...] }
  // Your backend returns:   { packages: [...] }  ✅ matches
  async getPackages() {
    const data = await http('GET', '/admin/packages');
    // Remap price → priceINR so AdminDashboard display works
    const packages = (data.packages || []).map(p => ({
      ...p,
      priceINR: p.price ?? p.priceINR ?? 0,
    }));
    return { packages };
  },

  // ── Save package (create or update) ────────────────────────────────────────
  // AdminDashboard sends: { id?, key, name, coins, priceINR, isActive }
  // Your backend expects: { id?, name, coins, price, isActive }
  async savePackage(pkg) {
    return http('POST', '/admin/packages', {
      id:       pkg.id,
      key:      pkg.key,
      name:     pkg.name,
      coins:    pkg.coins,
      price:    pkg.priceINR,   // remap priceINR → price
      isActive: pkg.isActive,
    });
  },

  // ── Delete package ──────────────────────────────────────────────────────────
  async deletePackage(id) {
    return http('DELETE', `/admin/packages/${id}`);
  },
};