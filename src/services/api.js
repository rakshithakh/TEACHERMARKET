// ─── Base URL ─────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Token helpers ────────────────────────────────────────────────────────────
const SESSION_KEY = 'tm_token';

export const token = {
  save:   (t) => localStorage.setItem(SESSION_KEY, t),
  get:    ()  => localStorage.getItem(SESSION_KEY),
  remove: ()  => localStorage.removeItem(SESSION_KEY),
};

// ─── HTTP helper ──────────────────────────────────────────────────────────────
const http = async (method, path, body = null, auth = false) => {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const t = token.get();
    if (t) headers['Authorization'] = `Bearer ${t}`;
  }

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res  = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
};

// ─── Decode Google JWT ────────────────────────────────────────────────────────
function decodeGoogleCredential(credential) {
  const payload    = credential?.split('.')[1];
  if (!payload) throw new Error('Google credential missing');
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded     = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
  const json       = atob(padded);
  return JSON.parse(decodeURIComponent([...json].map(c => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')));
}

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH API
// ══════════════════════════════════════════════════════════════════════════════
export const authApi = {

  // Send OTP to email (registration)
  async sendEmailOtp(email) {
    return http('POST', '/auth/send-otp', { email });
  },

  // Verify OTP (registration) — always returns isNewUser: true for registration flow
  async verifyEmailOtp(email, otp) {
    const data = await http('POST', '/auth/verify-otp', { email, otp });
    return {
      ...data,
      isNewUser:     true,
      verifiedEmail: email.trim().toLowerCase(),
    };
  },
  // Admin login — no OTP needed
async adminLogin({ email, password }) {
  const data = await http('POST', '/auth/admin-login', {
    email: email.trim().toLowerCase(),
    password,
  });
  if (data.token) token.save(data.token);
  return data;
},

  // Register new user
  async register(body) {
    const payload = {
      email: body.email,
      phone: body.phone || '',
      role:  body.role.toUpperCase(),
      googleId: body.googleId || undefined,
    };

    const data = await http('POST', '/auth/register', payload);
    if (data.token) token.save(data.token);

    // After register, create profile
    if (body.role.toUpperCase() === 'STUDENT' && body.studentDetails) {
      const d = body.studentDetails;
      try {
        await http('POST', '/student/profile', {
          name:          d.name || body.name,
          class:         d.class || d.cls || '',
          subjects:      Array.isArray(d.subjects) ? d.subjects.join(',') : (d.subjects || ''),
          address:       d.address || '',
          city:          d.city || '',
          pincode:       d.pincode || '',
          contactNumber: d.contactNumber || body.phone || '',
        }, true);
      } catch (e) {
        console.warn('Profile create failed:', e.message);
      }
    }

    if (body.role.toUpperCase() === 'TEACHER' && body.teacherDetails) {
      const d = body.teacherDetails;
      try {
        await http('POST', '/teacher/profile', {
          name:          d.name || body.name,
          qualification: d.qualification || '',
          experience:    d.experience || 1,
          subjects:      Array.isArray(d.subjects) ? d.subjects.join(',') : (d.subjects || ''),
          location:      d.location || d.area || d.city || '',
          city:          d.city || '',
          pincode:       d.pincode || '',
        }, true);
      } catch (e) {
        console.warn('Profile create failed:', e.message);
      }
    }

    return data;
  },

  // Google Auth
  async googleAuth(credential, role) {
    const profile = decodeGoogleCredential(credential);
    const email   = profile.email.trim().toLowerCase();

    // Check if user exists by trying to send login OTP
    try {
      await http('POST', '/auth/login', { email });
      // User exists — send OTP for login
      return {
        message:   'OTP sent to your email',
        isNewUser: false,
        email,
        googleProfile: {
          email,
          name:    profile.name || '',
          picture: profile.picture || '',
          googleId: profile.sub,
        },
      };
    } catch (err) {
      // User doesn't exist — new user
      return {
        message:   'Google verified. Complete registration.',
        isNewUser: true,
        googleProfile: {
          email,
          name:    profile.name || '',
          picture: profile.picture || '',
          googleId: profile.sub,
        },
      };
    }
  },

  // Login Step 1 — Send OTP
  async sendLoginOtp(email) {
    return http('POST', '/auth/login', { email });
  },

  // Login Step 2 — Verify OTP and get token
  async verifyLoginOtp(email, otp) {
    const data = await http('POST', '/auth/login/verify', { email, otp });
    if (data.token) token.save(data.token);
    return data;
  },

  // Get current logged in user
  async me() {
    const data = await http('GET', '/auth/me', null, true);
    return { user: data };
  },

  // Logout
  async logout() {
    try {
      await http('POST', '/auth/logout', null, true);
    } finally {
      token.remove();
    }
    return { message: 'Logged out successfully' };
  },
};

// ══════════════════════════════════════════════════════════════════════════════
//  PROFILE API
// ══════════════════════════════════════════════════════════════════════════════
export const profileApi = {

  async update(body) {
    const me = await authApi.me();

    if (me.user?.role === 'STUDENT' || me.role === 'STUDENT') {
      const d = body.studentDetails || body;
      const updated = await http('PUT', '/student/profile', {
        name:          d.name || body.name,
        class:         d.class || d.cls,
        board:         d.board,
        subjects:      Array.isArray(d.subjects) ? d.subjects.join(',') : d.subjects,
        address:       d.address,
        area:          d.area,
        city:          d.city,
        pincode:       d.pincode,
        contactNumber: d.contactNumber || d.phone,
        timing:        d.timing,
        guardianName:  d.guardianName,
        guardianPhone: d.guardianPhone,
        notes:         d.notes,
      }, true);
      return { user: { ...me.user, student: { ...updated } } };
    }

    if (me.user?.role === 'TEACHER' || me.role === 'TEACHER') {
      const d = body.teacherDetails || body;
      const updated = await http('PUT', '/teacher/profile', {
        name:          d.name || body.name,
        qualification: d.qualification,
        experience:    d.experience,
        subjects:      Array.isArray(d.subjects) ? d.subjects.join(',') : d.subjects,
        location:      d.location || d.area || d.city,
        city:          d.city,
        pincode:       d.pincode,
        monthlyFee:    d.monthlyFee,
      }, true);
      return { user: { ...me.user, teacher: { ...updated } } };
    }
  },

  async createTeacher(d) {
    const me = await authApi.me();
    const created = await http('POST', '/teacher/profile', {
      name:          d.name,
      qualification: d.qualification,
      experience:    d.experience,
      subjects:      Array.isArray(d.subjects) ? d.subjects.join(',') : d.subjects,
      location:      d.location || d.area || d.city,
      city:          d.city,
      pincode:       d.pincode,
      monthlyFee:    d.monthlyFee,
    }, true);
    return { user: { ...me.user, teacher: { ...created } } };
  },

  async updateTeacher(d) {
    const me = await authApi.me();
    const updated = await http('PUT', '/teacher/profile', {
      name:          d.name,
      qualification: d.qualification,
      experience:    d.experience,
      subjects:      Array.isArray(d.subjects) ? d.subjects.join(',') : d.subjects,
      location:      d.location || d.area || d.city,
      city:          d.city,
      pincode:       d.pincode,
      monthlyFee:    d.monthlyFee,
    }, true);
    return { user: { ...me.user, teacher: { ...updated } } };
  },

  async getStudent() {
    const data = await http('GET', '/student/profile', null, true);
    return {
      ...data,
      subjects: typeof data.subjects === 'string'
        ? data.subjects.split(',').map(sub => sub.trim()).filter(Boolean)
        : data.subjects || [],
    };
  },
};

// ══════════════════════════════════════════════════════════════════════════════
//  STUDENTS API (for teachers)
// ══════════════════════════════════════════════════════════════════════════════
export const studentsApi = {

  async browse(params = {}) {
    const data = await http('GET', '/teacher/students', null, true);
    let students = data.students || [];

    if (params.subject) {
      students = students.filter(s =>
        s.subjects?.toLowerCase().includes(params.subject.toLowerCase())
      );
    }
    if (params.cls) {
      students = students.filter(s => s.class === params.cls);
    }

    return {
      students,
      total:       students.length,
      page:        1,
      totalPages:  1,
      coinBalance: data.coinBalance,
      freeViews:   data.freeViews,
    };
  },

  async unlock(id) {
    return http('POST', `/teacher/unlock/${id}`, null, true);
  },

  async getUnlocked() {
    return http('GET', '/teacher/unlocked', null, true);
  },

  async sendRequest(id, message = '') {
    return { message: 'Contact request sent' };
  },

  async myRequests() {
    return { requests: [], total: 0 };
  },

  async respond(id, status) {
    return { message: `Request ${status}` };
  },
};

// ══════════════════════════════════════════════════════════════════════════════
//  TEACHER API
// ══════════════════════════════════════════════════════════════════════════════
export const teacherApi = {

  async getStats() {
    const coinsData    = await http('GET', '/teacher/coins', null, true);
    const unlockedData = await http('GET', '/teacher/unlocked', null, true);

    return {
      coinBalance:      coinsData.coinBalance,
      freeViews:        coinsData.freeViews,
      unlockedStudents: unlockedData.total || 0,
      sentRequests:     0,
      acceptedRequests: 0,
      studentsInCity:   0,
    };
  },

  async getSentRequests() {
    return { requests: [], total: 0 };
  },
};

// ══════════════════════════════════════════════════════════════════════════════
//  STUDENT API
// ══════════════════════════════════════════════════════════════════════════════
export const studentApi = {

  async getStats() {
    return {
      totalRequests:    0,
      pendingRequests:  0,
      acceptedRequests: 0,
    };
  },
};

// ══════════════════════════════════════════════════════════════════════════════
//  PAYMENT API
// ══════════════════════════════════════════════════════════════════════════════
export const paymentApi = {

  async createOrder(body) {
    const packages = {
      starter: { name: 'Starter Pack', coins: 100, priceINR: 100 },
      standard: { name: 'Standard Pack', coins: 200, priceINR: 200 },
      popular: { name: 'Popular Pack', coins: 250, priceINR: 250 },
    };

    const customAmount = Number(body.customAmount || 0);
    const pkg = customAmount >= 1
      ? { name: 'Custom', coins: customAmount, priceINR: customAmount }
      : packages[body.packageId];

    if (!pkg) throw new Error('Invalid package.');

    const data = await http('POST', '/payment/create-order', {
      amount: pkg.priceINR
    }, true);

    return {
      orderId:     data.orderId,
      amount:      data.amount * 100,
      currency:    'INR',
      keyId:       data.keyId,
      packageName: pkg.name,
      coins:       pkg.coins,
    };
  },

  async verifyPayment(body) {
    const amount = Number(body.amount ?? (body.amountPaise ? body.amountPaise / 100 : 0));
    return http('POST', '/payment/verify', {
      razorpay_order_id:   body.razorpay_order_id || body.razorpayOrderId || body.orderId,
      razorpay_payment_id: body.razorpay_payment_id || body.razorpayPaymentId || body.paymentId,
      razorpay_signature:  body.razorpay_signature || body.razorpaySignature || body.signature,
      amount,
    }, true);
  },

  async getHistory() {
    const coinsData    = await http('GET', '/teacher/coins', null, true);
    const unlockedData = await http('GET', '/teacher/unlocked', null, true);

    return {
      payments:    [],
      unlocks:     unlockedData.students || [],
      coinBalance: coinsData.coinBalance,
    };
  },
};
