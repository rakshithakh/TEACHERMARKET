// ─── TeacherMarket v2 — localStorage Database ─────────────────────────────────
const read  = (k, fb = null) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const uid   = () => `${Date.now()}_${Math.floor(Math.random()*9999)}`;

// ── USERS ─────────────────────────────────────────────────────────────────────
export const usersDB = {
  getAll:       ()  => read('tm_users', {}),
  get:          (id) => (read('tm_users', {}))[String(id)] || null,
  getByEmail:   (e)  => Object.values(read('tm_users', {})).find(u => u.email?.toLowerCase() === e?.toLowerCase()) || null,
  create:       (d)  => {
    const all = read('tm_users', {});
    const id  = d.id || uid();
    const u   = { ...d, id: String(id), createdAt: new Date().toISOString() };
    all[String(id)] = u;
    write('tm_users', all);
    return u;
  },
  update: (id, patch) => {
    const all = read('tm_users', {});
    if (!all[String(id)]) return null;
    all[String(id)] = { ...all[String(id)], ...patch, updatedAt: new Date().toISOString() };
    write('tm_users', all);
    return all[String(id)];
  },
};

// ── TEACHER PROFILES ──────────────────────────────────────────────────────────
export const teachersDB = {
  get:    (uid) => (read('tm_teachers', {}))[String(uid)] || null,
  upsert: (uid, d) => {
    const all = read('tm_teachers', {});
    const ex  = all[String(uid)] || {};
    all[String(uid)] = {
      ...ex, ...d,
      coinBalance: d.coinBalance !== undefined ? d.coinBalance : (ex.coinBalance ?? 0),
      freeViews:   d.freeViews   !== undefined ? d.freeViews   : (ex.freeViews   ?? 2),
      updatedAt:   new Date().toISOString(),
    };
    if (!all[String(uid)].createdAt) all[String(uid)].createdAt = new Date().toISOString();
    write('tm_teachers', all);
    return all[String(uid)];
  },
  addCoins: (uid, delta) => {
    const all = read('tm_teachers', {});
    const t   = all[String(uid)];
    if (!t) return null;
    t.coinBalance = Math.max(0, (t.coinBalance || 0) + delta);
    write('tm_teachers', all);
    return t;
  },
};

// ── STUDENT PROFILES ──────────────────────────────────────────────────────────
export const studentsDB = {
  get:    (uid) => (read('tm_students', {}))[String(uid)] || null,
  upsert: (uid, d) => {
    const all = read('tm_students', {});
    all[String(uid)] = { ...(all[String(uid)] || {}), ...d, updatedAt: new Date().toISOString() };
    if (!all[String(uid)].createdAt) all[String(uid)].createdAt = new Date().toISOString();
    write('tm_students', all);
    return all[String(uid)];
  },
};

// ── LEADS (Student Inquiries) ──────────────────────────────────────────────────
export const leadsDB = {
  getAll:  ()  => read('tm_leads', []),
  get:     (id) => (read('tm_leads', [])).find(l => l.id === id) || null,
  create:  (d) => {
    const all = read('tm_leads', []);
    const lead = {
      id:             uid(),
      status:         'PENDING',   // PENDING | APPROVED | PUBLISHED | HIDDEN | CLOSED | PRIVATE
      appliedCount:   0,
      maxUnlocks:     null,        // admin can cap
      ...d,
      createdAt:      new Date().toISOString(),
    };
    all.unshift(lead);
    write('tm_leads', all);
    return lead;
  },
  update: (id, patch) => {
    const all = read('tm_leads', []);
    const i   = all.findIndex(l => l.id === id);
    if (i < 0) return null;
    all[i] = { ...all[i], ...patch, updatedAt: new Date().toISOString() };
    write('tm_leads', all);
    return all[i];
  },
  delete: (id) => {
    const all = read('tm_leads', []).filter(l => l.id !== id);
    write('tm_leads', all);
  },
  published: () => read('tm_leads', []).filter(l => l.status === 'PUBLISHED'),
  forStudent: (uid) => read('tm_leads', []).filter(l => String(l.studentUserId) === String(uid)),
};

// ── UNLOCKS ───────────────────────────────────────────────────────────────────
export const unlocksDB = {
  getAll:     () => read('tm_unlocks', []),
  isUnlocked: (tUid, leadId) => (read('tm_unlocks', [])).some(u => u.teacherUserId === String(tUid) && u.leadId === leadId),
  add:        (d) => {
    const all = read('tm_unlocks', []);
    const e   = { id: uid(), ...d, createdAt: new Date().toISOString() };
    all.push(e);
    write('tm_unlocks', all);
    return e;
  },
  forTeacher: (tUid) => (read('tm_unlocks', [])).filter(u => u.teacherUserId === String(tUid)),
  forLead:    (lid)  => (read('tm_unlocks', [])).filter(u => u.leadId === lid),
};

// ── PAYMENTS ──────────────────────────────────────────────────────────────────
export const paymentsDB = {
  getAll:    ()  => read('tm_payments', []),
  add:       (d) => {
    const all = read('tm_payments', []);
    const e   = { id: uid(), ...d, createdAt: new Date().toISOString() };
    all.unshift(e);
    write('tm_payments', all);
    return e;
  },
  forTeacher: (tUid) => (read('tm_payments', [])).filter(p => p.teacherUserId === String(tUid) && p.status === 'SUCCESS'),
  totalRevenue: () => (read('tm_payments', [])).filter(p => p.status === 'SUCCESS').reduce((s, p) => s + (p.amount || 0), 0),
};

// ── FAQ ───────────────────────────────────────────────────────────────────────
const DEFAULT_FAQS = [
  { id: '1', q: 'How does TeacherMarket work?', a: 'Students post their requirements for free. Teachers browse published leads and unlock contact details using coins to connect with students directly.', order: 1 },
  { id: '2', q: 'Is it free for students?', a: 'Yes! Students can post any requirement completely free. No charges, no subscriptions.', order: 2 },
  { id: '3', q: 'How do teachers buy coins?', a: 'Teachers can purchase coin packs via Razorpay. 50 coins = 1 student contact unlock. First 2 unlocks are always free for new teachers.', order: 3 },
  { id: '4', q: 'What is the coin system?', a: '1 Rupee = 1 Coin. Teachers buy coins and spend 50 coins to unlock one student\'s contact details. This ensures only serious teachers reach out.', order: 4 },
  { id: '5', q: 'Are my contact details safe?', a: 'Yes. Student contact details (mobile, email) are hidden by default and only revealed to teachers who unlock the profile with coins.', order: 5 },
  { id: '6', q: 'What subjects/services are available?', a: 'Online Coaching, Spoken English, School Tuition, College Subjects, Software Learning, Assignment/Project Work, and more.', order: 6 },
];
export const faqDB = {
  getAll: () => { const d = read('tm_faqs', null); if (!d) { write('tm_faqs', DEFAULT_FAQS); return DEFAULT_FAQS; } return d; },
  save:   (list) => { write('tm_faqs', list); return list; },
  add:    (item) => {
    const all = faqDB.getAll();
    const e   = { id: uid(), ...item, order: all.length + 1 };
    all.push(e);
    write('tm_faqs', all);
    return e;
  },
  update: (id, patch) => {
    const all = faqDB.getAll();
    const i   = all.findIndex(f => f.id === id);
    if (i < 0) return null;
    all[i] = { ...all[i], ...patch };
    write('tm_faqs', all);
    return all[i];
  },
  delete: (id) => { const all = faqDB.getAll().filter(f => f.id !== id); write('tm_faqs', all); },
};

// ── OTP ───────────────────────────────────────────────────────────────────────
export const otpDB = {
  set:    (email, otp) => sessionStorage.setItem(`tm_otp_${email.toLowerCase()}`, JSON.stringify({ otp: String(otp), exp: Date.now() + 5 * 60000, attempts: 0 })),
  verify: (email, input) => {
    const raw = sessionStorage.getItem(`tm_otp_${email.toLowerCase()}`);
    if (!raw) return { ok: false, error: 'OTP expired or not found. Request a new one.' };
    const d = JSON.parse(raw);
    if (Date.now() > d.exp) { sessionStorage.removeItem(`tm_otp_${email.toLowerCase()}`); return { ok: false, error: 'OTP expired. Request a new one.' }; }
    if (d.attempts >= 3)    { sessionStorage.removeItem(`tm_otp_${email.toLowerCase()}`); return { ok: false, error: 'Too many wrong attempts. Request a new OTP.' }; }
    if (String(d.otp) !== String(input).trim()) { d.attempts++; sessionStorage.setItem(`tm_otp_${email.toLowerCase()}`, JSON.stringify(d)); return { ok: false, error: `Wrong OTP. ${3 - d.attempts} attempt(s) left.` }; }
    sessionStorage.removeItem(`tm_otp_${email.toLowerCase()}`);
    return { ok: true };
  },
  markVerified: (email) => sessionStorage.setItem(`tm_ver_${email.toLowerCase()}`, '1'),
  isVerified:   (email) => !!sessionStorage.getItem(`tm_ver_${email.toLowerCase()}`),
};

// ── SESSION ───────────────────────────────────────────────────────────────────
export const sessionDB = {
  get:   () => read('tm_session', null),
  set:   (userId, role, email) => write('tm_session', { userId: String(userId), role, email }),
  clear: () => localStorage.removeItem('tm_session'),
};

// ── SEED ADMIN ────────────────────────────────────────────────────────────────
export const seedAdmin = () => {
  const ADMIN_EMAIL = 'admin@tutormatch.in';
  const ADMIN_ID    = 'admin_001';
  if (!usersDB.get(ADMIN_ID)) {
    usersDB.create({ id: ADMIN_ID, email: ADMIN_EMAIL, role: 'ADMIN', isVerified: true, isSuspended: false, phone: '' });
  }
};
