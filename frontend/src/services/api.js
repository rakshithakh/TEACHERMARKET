// ─── TeacherMarket v2 — Frontend-only API (localStorage) ─────────────────────
import { usersDB, teachersDB, studentsDB, leadsDB, unlocksDB, paymentsDB, faqDB, otpDB, sessionDB, seedAdmin } from './db';

const COINS_PER_UNLOCK = 50;
const genOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const BASE_URL = import.meta.env.VITE_API_URL || '';
const SESSION_KEY = 'tm_token';

const http = async (method, path, body = null, auth = false) => {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = token.get();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Something went wrong');
  return data;
};

const studentToLead = (student, extra = {}) => {
  const subjects = Array.isArray(student.subjects)
    ? student.subjects
    : String(student.subjects || '').split(',').map(s => s.trim()).filter(Boolean);

  return {
    id:              student.id,
    requirementType: 'School Tuition',
    subject:         subjects.join(', '),
    city:            student.city || '',
    country:         'India',
    description:     [
      student.class ? `Class: ${student.class}` : '',
      subjects.length ? `Subjects: ${subjects.join(', ')}` : '',
      student.address && !String(student.address).includes('Locked') ? `Address: ${student.address}` : '',
    ].filter(Boolean).join(' | ') || 'Student tuition requirement',
    status:          'PUBLISHED',
    appliedCount:    0,
    maxUnlocks:      null,
    createdAt:       student.createdAt || extra.unlockedAt || new Date().toISOString(),
    isUnlocked:      !!student.isUnlocked || !!extra.unlockedAt,
    studentName:     student.name || '',
    studentMobile:   student.contactNumber && !String(student.contactNumber).includes('Locked') ? student.contactNumber : '',
    studentEmail:    student.email || '',
    coinsSpent:      extra.coinsSpent ?? 0,
    isFree:          (extra.coinsSpent ?? 0) === 0,
    unlockedAt:      extra.unlockedAt,
  };
};

// ── Session helpers ───────────────────────────────────────────────────────────
const session = () => sessionDB.get();
const me = () => {
  const s = session();
  if (!s?.userId) return null;
  return usersDB.get(s.userId) || (s.email ? usersDB.getByEmail(s.email) : null);
};

export const token = {
  save:   (t) => t && localStorage.setItem(SESSION_KEY, t),
  get:    () => localStorage.getItem(SESSION_KEY),
  remove: () => {
    localStorage.removeItem(SESSION_KEY);
    sessionDB.clear();
  },
};

// ── enrichUser: attaches teacher/student profile ──────────────────────────────
export function enrichUser(u) {
  if (!u) return null;
  if (u.role && (u.student || u.teacher || u.profile || typeof u.id === 'number')) {
    return {
      id:          u.id,
      email:       u.email || '',
      phone:       u.phone || '',
      role:        u.role,
      isVerified:  u.isVerified ?? true,
      isSuspended: !!u.isSuspended,
      teacher:     u.teacher || (u.role === 'TEACHER' ? u.profile : null) || null,
      student:     u.student || (u.role === 'STUDENT' ? u.profile : null) || null,
    };
  }
  return {
    id:          u.id,
    email:       u.email || '',
    phone:       u.phone || '',
    role:        u.role,
    isVerified:  true,
    isSuspended: !!u.isSuspended,
    teacher:     u.role === 'TEACHER' ? (teachersDB.get(u.id) || null) : null,
    student:     u.role === 'STUDENT' ? (studentsDB.get(u.id) || null) : null,
  };
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const authApi = {
  sendLoginOtp: async (email) => {
    return http('POST', '/auth/login', { email: email.trim().toLowerCase() });
  },

  verifyLoginOtp: async (email, otp) => {
    const data = await http('POST', '/auth/login/verify', { email: email.trim().toLowerCase(), otp });
    token.save(data.token);
    return { ...data, user: enrichUser(data.user) };
  },

  sendEmailOtp: async (email) => {
    return http('POST', '/auth/send-otp', { email: email.trim().toLowerCase() });
  },

  verifyEmailOtp: async (email, otp) => {
    return http('POST', '/auth/verify-otp', { email: email.trim().toLowerCase(), otp });
  },

  googleAuth: async (credential) => {
    try {
      const b64   = credential.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
      const pad   = b64 + '='.repeat((4 - b64.length % 4) % 4);
      const p     = JSON.parse(decodeURIComponent([...atob(pad)].map(c=>`%${c.charCodeAt(0).toString(16).padStart(2,'0')}`).join('')));
      const email = p.email.toLowerCase();
      let u = usersDB.getByEmail(email);
      if (u) {
        sessionDB.set(u.id, u.role, u.email);
        return { isNewUser: false, user: enrichUser(u) };
      }
      otpDB.markVerified(email);
      return { isNewUser: true, googleProfile: { googleId: p.sub, email, name: p.name||'', picture: p.picture||'' } };
    } catch { throw new Error('Invalid Google credential'); }
  },

  register: async ({ email, phone, role, googleId, studentDetails, teacherDetails }) => {
    const e = email.trim().toLowerCase();
    const data = await http('POST', '/auth/register', {
      email: e,
      phone: phone || '',
      role: role.toUpperCase(),
      googleId,
    });
    token.save(data.token);

    const details = role === 'STUDENT' ? studentDetails : teacherDetails;
    if (details) {
      try {
        await profileApi.update({
          studentDetails: role === 'STUDENT' ? details : null,
          teacherDetails: role === 'TEACHER' ? details : null,
        });
      } catch (err) {
        console.warn('Profile update after register failed:', err.message);
      }
    }

    const fresh = await authApi.me().catch(() => ({ user: data.user }));
    return { ...data, user: enrichUser(fresh.user || data.user) };
  },

  me: async () => {
    const user = await http('GET', '/auth/me', null, true);
    return { user: enrichUser(user) };
  },

  adminLogin: async ({ email, password }) => {
    const data = await http('POST', '/auth/admin-login', {
      email: email.trim().toLowerCase(),
      password,
    });
    token.save(data.token);
    return { ...data, user: enrichUser(data.user) };
  },

  logout: async () => {
    try {
      if (token.get()) await http('POST', '/auth/logout', null, true);
    } finally {
      token.remove();
    }
  },
};

// ── PROFILE ───────────────────────────────────────────────────────────────────
export const profileApi = {
  update: async (body) => {
    const { user: u } = await authApi.me();
    if (!u) throw new Error('Not logged in. Please log in again.');
    if (u.role === 'STUDENT' && body.studentDetails) {
      const d = body.studentDetails;
      const student = await http('PUT', '/student/profile', { name: d.name||body.name, class: d.class, board: d.board,
        subjects: d.subjects, address: d.address, area: d.area, city: d.city, state: d.state,
        pincode: d.pincode, contactNumber: d.contactNumber, guardianName: d.guardianName,
        guardianPhone: d.guardianPhone, timing: d.timing, notes: d.notes }, true);
      return { message: 'Profile updated', user: enrichUser({ ...u, student, profile: student }) };
    }
    if (u.role === 'TEACHER' && body.teacherDetails) {
      const d   = body.teacherDetails;
      const teacher = await http('PUT', '/teacher/profile', { name: d.name||body.name, qualification: d.qualification,
        experience: parseInt(d.experience)||1, subjects: d.subjects, classes: d.classes,
        location: d.location||d.city, area: d.area, city: d.city, state: d.state, pincode: d.pincode,
        monthlyFee: parseInt(d.monthlyFee)||0, teachingMode: d.teachingMode, about: d.about }, true);
      return { message: 'Profile updated', user: enrichUser({ ...u, teacher, profile: teacher }) };
    }
    return { message: 'Profile updated ✅', user: enrichUser(u) };
  },
};

// ── LEADS (public POST by student) ────────────────────────────────────────────
export const leadsApi = {
  // Student posts a lead
  post: async (formData) => {
    return http('POST', '/student/leads', formData, true);

    const { user: u } = await authApi.me();
    if (!u || u.role !== 'STUDENT') throw new Error('Student login required.');
    const lead = leadsDB.create({
      studentUserId: String(u.id),
      studentName:   formData.name,
      studentEmail:  formData.email,
      studentMobile: formData.mobile,
      country:       formData.country || 'India',
      city:          formData.city || '',
      subject:       formData.subject || '',
      requirementType: formData.requirementType,
      description:   formData.description,
      fileAttachment: formData.fileAttachment || null,   // base64 or filename
      fileName:       formData.fileName || null,
    });
    return { message: 'Your requirement has been submitted! ✅ Admin will review and publish it.', lead };
  },

  // Public: list published leads (for teachers to browse)
  published: async (filters = {}) => {
    const data = await http('GET', '/teacher/students', null, true);
    let list = (data.students || []).map(student => studentToLead(student));
    if (filters.subject) list = list.filter(l => l.subject?.toLowerCase().includes(filters.subject.toLowerCase()) || l.description?.toLowerCase().includes(filters.subject.toLowerCase()));
    if (filters.city)    list = list.filter(l => l.city?.toLowerCase().includes(filters.city.toLowerCase()));
    return { leads: list, total: list.length, coinBalance: data.coinBalance, freeViews: data.freeViews };
  },

  // Teacher unlocks a lead (sees contact details)
  unlock: async (leadId) => {
    const data = await http('POST', `/teacher/unlock/${leadId}`, null, true);
    return {
      ...data,
      lead: studentToLead(data.student, { coinsSpent: data.coinsSpent, unlockedAt: new Date().toISOString() }),
    };

    const { user: u } = await authApi.me();
    if (!u || u.role !== 'TEACHER') throw new Error('Teacher login required.');
    const lead = leadsDB.get(leadId);
    if (!lead) throw new Error('Lead not found.');
    if (lead.status !== 'PUBLISHED') throw new Error('This lead is not available.');

    // Check cap
    if (lead.maxUnlocks !== null && unlocksDB.forLead(leadId).length >= lead.maxUnlocks) {
      throw new Error('This lead has reached the maximum number of unlocks.');
    }

    if (unlocksDB.isUnlocked(u.id, leadId)) {
      return { message: 'Already unlocked', lead: sanitizeLead(lead, true) };
    }

    let teacher = teachersDB.get(u.id);
    if (!teacher) teacher = teachersDB.upsert(u.id, { name: u.email?.split('@')[0]||'Teacher', coinBalance: 0, freeViews: 2 });

    const isFree = (teacher.freeViews ?? 2) > 0;
    if (!isFree && (teacher.coinBalance || 0) < COINS_PER_UNLOCK) {
      throw new Error(`Need ${COINS_PER_UNLOCK} coins. You have ${teacher.coinBalance||0}. Please buy more coins.`);
    }

    if (isFree) teachersDB.upsert(u.id, { ...teacher, freeViews: teacher.freeViews - 1 });
    else        teachersDB.upsert(u.id, { ...teacher, coinBalance: teacher.coinBalance - COINS_PER_UNLOCK });

    unlocksDB.add({ teacherUserId: u.id, leadId, coinsSpent: isFree ? 0 : COINS_PER_UNLOCK, isFree });

    // Increment applied count
    leadsDB.update(leadId, { appliedCount: (lead.appliedCount || 0) + 1 });
    const updated = leadsDB.get(leadId);

    return {
      message:    isFree ? `Free unlock! 🎉 (${teacher.freeViews - 1} free views left)` : `Unlocked! ${COINS_PER_UNLOCK} coins deducted.`,
      coinBalance: isFree ? teacher.coinBalance : teacher.coinBalance - COINS_PER_UNLOCK,
      freeViews:   isFree ? teacher.freeViews - 1 : teacher.freeViews,
      lead:        sanitizeLead(updated, true),
    };
  },

  // Teacher: get their unlocked leads
  myUnlocked: async () => {
    const data = await http('GET', '/teacher/unlocked', null, true);
    const leads = (data.students || []).map(student => studentToLead(student, {
      coinsSpent: student.coinsSpent,
      unlockedAt: student.unlockedAt,
    }));
    return { leads, total: leads.length };

    const { user: u } = await authApi.me();
    if (!u || u.role !== 'TEACHER') throw new Error('Teacher login required.');
    const unlocks = unlocksDB.forTeacher(u.id);
    const oldLeads   = unlocks.map(u => {
      const lead = leadsDB.get(u.leadId);
      return lead ? { ...sanitizeLead(lead, true), unlockedAt: u.createdAt, coinsSpent: u.coinsSpent, isFree: u.isFree } : null;
    }).filter(Boolean);
    return { leads: oldLeads, total: oldLeads.length };
  },

  // Student: my submitted leads
  mine: async () => {
    return http('GET', '/student/leads', null, true);

    const { user: u } = await authApi.me();
    if (!u || u.role !== 'STUDENT') throw new Error('Student login required.');
    return { leads: leadsDB.forStudent(u.id) };
  },
};

function sanitizeLead(lead, showContact) {
  return {
    id:              lead.id,
    requirementType: lead.requirementType,
    subject:         lead.subject,
    city:            lead.city,
    country:         lead.country,
    description:     lead.description,
    status:          lead.status,
    appliedCount:    lead.appliedCount || 0,
    maxUnlocks:      lead.maxUnlocks,
    createdAt:       lead.createdAt,
    fileAttachment:  showContact ? lead.fileAttachment : null,
    fileName:        showContact ? lead.fileName : null,
    // Show contact only if unlocked
    ...(showContact ? {
      studentName:   lead.studentName,
      studentEmail:  lead.studentEmail,
      studentMobile: lead.studentMobile,
    } : {
      studentName:   lead.studentName?.split(' ')[0] + ' ' + (lead.studentName?.split(' ')[1]?.[0]||'') + '.',
    }),
  };
}

// ── TEACHER stats ─────────────────────────────────────────────────────────────
export const teacherApi = {
  getStats: async () => {
    const [coinsData, unlockedData, studentsData] = await Promise.all([
      http('GET', '/teacher/coins', null, true),
      http('GET', '/teacher/unlocked', null, true),
      http('GET', '/teacher/students', null, true),
    ]);
    return {
      coinBalance: coinsData.coinBalance || 0,
      freeViews: coinsData.freeViews ?? 0,
      unlockedLeads: unlockedData.total || 0,
      totalPublished: (studentsData.students || []).length,
    };
  },
};

// ── PAYMENT ───────────────────────────────────────────────────────────────────
const PACKS = {
  starter:  { name: 'Starter Pack',  coins: 100, priceINR: 100 },
  standard: { name: 'Standard Pack', coins: 200, priceINR: 200 },
  popular:  { name: 'Popular Pack',  coins: 250, priceINR: 250 },
};

export const paymentApi = {
  createOrder: async (body) => {
    const custom = parseInt(body.customAmount || 0);
    const pkg = custom >= 100 ? { name: 'Custom', coins: custom, priceINR: custom } : PACKS[body.packageId];
    if (!pkg) throw new Error('Invalid package.');
    const data = await http('POST', '/payment/create-order', { amount: pkg.priceINR }, true);
    const meData = await authApi.me().catch(() => ({ user: null }));
    return { orderId: data.orderId, paymentId: data.paymentId, amount: data.amount * 100, currency: 'INR', keyId: data.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || '', packageName: pkg.name, coins: pkg.coins, userName: meData.user?.teacher?.name || meData.user?.email || '', userPhone: meData.user?.phone || '' };

    const u = me();
    if (!u || u.role !== 'TEACHER') throw new Error('Teacher account required.');
    const oldCustom = parseInt(body.customAmount || 0);
    const oldPkg    = oldCustom >= 100 ? { name: 'Custom', coins: oldCustom, priceINR: oldCustom } : PACKS[body.packageId];
    if (!oldPkg) throw new Error('Invalid package.');
    return { orderId: `local_${Date.now()}`, amount: oldPkg.priceINR * 100, currency: 'INR', keyId: import.meta.env.VITE_RAZORPAY_KEY_ID || '', packageName: oldPkg.name, coins: oldPkg.coins, userName: teachersDB.get(u.id)?.name || u.email, userPhone: u.phone || '' };
  },
  verifyPayment: async (body) => {
    return http('POST', '/payment/verify', {
      paymentId: body.paymentId,
      razorpay_order_id: body.razorpay_order_id,
      razorpay_payment_id: body.razorpay_payment_id || body.razorpayPaymentId,
      razorpay_signature: body.razorpay_signature || body.razorpaySignature,
      amount: body.amount,
    }, true);

    const u = me();
    if (!u || u.role !== 'TEACHER') throw new Error('Teacher account required.');
    const coins = parseInt(body.coinsAdded || body.coins || 0);
    if (!coins) throw new Error('Coin amount missing.');
    const t = teachersDB.addCoins(u.id, coins);
    paymentsDB.add({ teacherUserId: u.id, amount: body.amount || coins, coinsAdded: coins, packageName: body.packageName || 'Coin Purchase', razorpayPaymentId: body.razorpayPaymentId || `dev_${Date.now()}`, status: 'SUCCESS' });
    return { message: `+${coins} coins added! 🎉`, coinBalance: t?.coinBalance || 0, coinsAdded: coins };
  },
  getHistory: async () => {
    const [coinsData, unlockedData] = await Promise.all([
      http('GET', '/teacher/coins', null, true),
      http('GET', '/teacher/unlocked', null, true),
    ]);
    return {
      payments: [],
      unlocks: (unlockedData.students || []).map(student => ({ ...student, lead: studentToLead(student) })),
      coinBalance: coinsData.coinBalance || 0,
    };

    const u = me();
    if (!u || u.role !== 'TEACHER') throw new Error('Teacher account required.');
    const t = teachersDB.get(u.id) || { coinBalance: 0 };
    return { payments: paymentsDB.forTeacher(u.id), unlocks: unlocksDB.forTeacher(u.id).map(un => ({ ...un, lead: leadsDB.get(un.leadId) })), coinBalance: t.coinBalance };
  },
};

// ── ADMIN API ─────────────────────────────────────────────────────────────────
export const adminApi = {
  // Leads management
  allLeads: async ({ status, type, page = 1 } = {}) => {
    const params = new URLSearchParams({ status: status || 'ALL', type: type || 'ALL', page, limit: 20 });
    return http('GET', `/admin/leads?${params}`, null, true);
  },
  updateLead: async (id, patch) => {
    return http('PATCH', `/admin/leads/${id}`, patch, true);
  },
  deleteLead: (id) => http('DELETE', `/admin/leads/${id}`, null, true),

  // Users
  allUsers: async ({ role, search, page = 1 } = {}) => {
    const params = new URLSearchParams({ role: role || 'ALL', search: search || '', page, limit: 20 });
    const data = await http('GET', `/admin/members?${params}`, null, true);
    const users = (data.members || []).map(u => ({
      ...u,
      name: u.profile?.name || u.email?.split('@')[0] || '',
      city: u.profile?.city || '',
      coinBalance: u.profile?.coinBalance ?? null,
    }));
    return { users, total: data.total ?? users.length };
  },
  suspendUser: async (id, val) => {
    return http('PATCH', `/admin/members/${id}/suspend`, { isSuspended: val }, true);
  },
  adjustCoins: async (userId, delta) => {
    return http('PATCH', `/admin/members/${userId}/coins`, { delta: parseInt(delta) }, true);
  },

  // Stats
  stats: async () => {
    return http('GET', '/admin/stats', null, true);
  },

  // FAQ
  getFaqs:    async () => http('GET', '/admin/faqs', null, true),
  saveFaq:    async (item) => http('POST', '/admin/faqs', item, true),
  updateFaq:  async (id, patch) => http('PATCH', `/admin/faqs/${id}`, patch, true),
  deleteFaq:  async (id) => http('DELETE', `/admin/faqs/${id}`, null, true),

  // Transactions
  transactions: async ({ status, page = 1 } = {}) => {
    const params = new URLSearchParams({ status: status || 'ALL', page, limit: 20 });
    const data = await http('GET', `/admin/transactions?${params}`, null, true);
    return {
      payments: (data.transactions || []).map(t => ({
        ...t,
        packageName: t.packageName || 'Coins',
        razorpayPaymentId: t.razorpayPaymentId || t.razorpayId,
      })),
      total: data.total || 0,
    };
  },
};
