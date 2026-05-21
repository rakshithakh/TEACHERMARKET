require("dotenv").config({ override: true });

const express    = require("express");
const cors       = require("cors");
const Redis      = require("ioredis");
const bcrypt     = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt        = require("jsonwebtoken");
const Razorpay   = require("razorpay");
const crypto     = require("crypto");
const fs         = require("fs");
const path       = require("path");
const { PrismaClient } = require("@prisma/client");

const app    = express();
const prisma = new PrismaClient();

// ─── Razorpay ─────────────────────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const COINS_PER_RUPEE = parseInt(process.env.COINS_PER_RUPEE) || 1;
const COINS_TO_UNLOCK = parseInt(process.env.COINS_TO_UNLOCK) || 50;
const FREE_VIEWS      = 2;
const STARTING_COINS  = 100;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ─── Serve frontend ───────────────────────────────────────────────────────────
const clientDistPath = path.join(__dirname, "frontend", "dist");
const legacyPublicPath = path.join(__dirname, "public");
const frontendPath = fs.existsSync(path.join(clientDistPath, "index.html"))
  ? clientDistPath
  : legacyPublicPath;

app.use(express.static(frontendPath, { index: false }));

// ─── Redis ────────────────────────────────────────────────────────────────────
const createMemoryRedis = () => {
  const store = new Map();
  const isExpired = (entry) => entry?.expiresAt && entry.expiresAt <= Date.now();
  const read = (key) => {
    const entry = store.get(key);
    if (!entry || isExpired(entry)) {
      store.delete(key);
      return null;
    }
    return entry;
  };

  return {
    async get(key) {
      return read(key)?.value ?? null;
    },
    async set(key, value, ...args) {
      const existing = read(key);
      const normalizedArgs = args.map((arg) => String(arg).toUpperCase());
      let expiresAt = normalizedArgs.includes("KEEPTTL") ? existing?.expiresAt : null;
      const exIndex = normalizedArgs.indexOf("EX");

      if (exIndex >= 0 && args[exIndex + 1] !== undefined) {
        expiresAt = Date.now() + Number(args[exIndex + 1]) * 1000;
      }

      store.set(key, { value: String(value), expiresAt });
      return "OK";
    },
    async del(key) {
      return store.delete(key) ? 1 : 0;
    },
    async incr(key) {
      const entry = read(key);
      const next = Number(entry?.value || 0) + 1;
      store.set(key, { value: String(next), expiresAt: entry?.expiresAt || null });
      return next;
    },
    async expire(key, seconds) {
      const entry = read(key);
      if (!entry) return 0;
      entry.expiresAt = Date.now() + Number(seconds) * 1000;
      store.set(key, entry);
      return 1;
    },
  };
};

const createRedis = () => {
  const fallback = createMemoryRedis();
  const redisUrl = String(process.env.REDIS_URL || "").trim();

  if (!redisUrl) {
    console.warn("Redis URL missing. Using in-memory cache fallback.");
    return { ...fallback, get status() { return "memory"; } };
  }

  let redisErrorLogged = false;
  const describeRedisError = (error) =>
    error?.message || error?.code || error?.name || "connection failed";

  const client = new Redis(redisUrl, {
    connectTimeout: 5000,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 3) {
        console.warn("Redis unavailable. Continuing with in-memory cache fallback.");
        return null;
      }
      return Math.min(times * 300, 1000);
    },
  });

  client.on("connect", () => console.log("Redis connected"));
  client.on("ready", () => console.log("Redis ready"));
  client.on("error", (e) => {
    if (redisErrorLogged) return;
    redisErrorLogged = true;
    console.error("Redis error:", describeRedisError(e));
  });

  const run = async (command, args) => {
    if (client.status !== "ready") return fallback[command](...args);

    try {
      return await client[command](...args);
    } catch (error) {
      console.error(`Redis ${command} failed, using memory fallback:`, describeRedisError(error));
      return fallback[command](...args);
    }
  };

  return {
    get status() {
      return client.status === "ready" ? "ready" : `memory-fallback (${client.status})`;
    },
    get: (...args) => run("get", args),
    set: (...args) => run("set", args),
    del: (...args) => run("del", args),
    incr: (...args) => run("incr", args),
    expire: (...args) => run("expire", args),
  };
};

const redis = createRedis();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const OTP_TTL      = parseInt(process.env.OTP_TTL)         || 300;
const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS) || 3;
const EMAIL_VERIFICATION_TTL = parseInt(process.env.EMAIL_VERIFICATION_TTL) || 24 * 60 * 60;

// ─── Parse subjects helper ────────────────────────────────────────────────────
const parseSubjects = (subjects) => {
  if (Array.isArray(subjects)) return subjects;
  if (typeof subjects === 'string') {
    return subjects.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

const serializeSubjects = (subjects) => parseSubjects(subjects).join(",");
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const ALLOWED_LEAD_FILE_EXTENSIONS = new Set(["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp"]);
const ALLOWED_LEAD_FILE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const isAllowedLeadFile = (fileName, fileType) => {
  if (!fileName && !fileType) return true;
  const ext = String(fileName || "").split(".").pop()?.toLowerCase();
  return ALLOWED_LEAD_FILE_EXTENSIONS.has(ext) || ALLOWED_LEAD_FILE_TYPES.has(String(fileType || "").toLowerCase());
};

const cleanLead = (lead) => ({
  id:              lead.id,
  studentUserId:   lead.studentId,
  studentName:     lead.name,
  studentEmail:    lead.email,
  studentMobile:   lead.phone,
  country:         lead.country,
  city:            lead.city,
  subject:         lead.subject,
  requirementType: lead.requirementType,
  description:     lead.description,
  fileName:        lead.fileName,
  fileAttachment:  lead.fileData,
  fileType:        lead.fileType,
  status:          lead.isPrivate ? "PRIVATE" : lead.status,
  appliedCount:    lead.applyCount,
  maxUnlocks:      lead.maxUnlocks ?? null,
  isPrivate:       lead.isPrivate,
  createdAt:       lead.createdAt,
  updatedAt:       lead.updatedAt,
});

const cleanLeadForTeacher = (lead, isUnlocked = false, extra = {}) => ({
  id:              lead.id,
  studentUserId:   lead.studentId,
  studentName:     isUnlocked ? lead.name : `${String(lead.name || "Student").split(" ")[0]} ${String(lead.name || "").split(" ")[1]?.[0] || ""}.`.trim(),
  studentEmail:    isUnlocked ? lead.email : "",
  studentMobile:   isUnlocked ? lead.phone : "",
  country:         lead.country,
  city:            lead.city,
  subject:         lead.subject,
  requirementType: lead.requirementType,
  description:     lead.description,
  fileName:        lead.fileName,
  fileAttachment:  isUnlocked ? lead.fileData : null,
  fileType:        lead.fileType,
  status:          lead.isPrivate ? "PRIVATE" : lead.status,
  appliedCount:    lead.applyCount,
  maxUnlocks:      lead.maxUnlocks ?? null,
  isPrivate:       lead.isPrivate,
  isUnlocked,
  coinsSpent:      extra.coinsSpent ?? 0,
  isFree:          (extra.coinsSpent ?? 0) === 0,
  unlockedAt:      extra.unlockedAt,
  createdAt:       lead.createdAt,
  updatedAt:       lead.updatedAt,
});

// ─── Clean student response ───────────────────────────────────────────────────
const cleanStudent = (student, isUnlocked) => {
  const subjects = parseSubjects(student.subjects);
  if (isUnlocked) {
    return {
      id:            student.id,
      email:         student.email || "",
      name:          student.name,
      class:         student.class,
      subjects,
      city:          student.city,
      pincode:       student.pincode,
      address:       student.address,
      contactNumber: student.contactNumber,
      isUnlocked:    true,
    };
  }
  return {
    id:            student.id,
    email:         "",
    name:          student.name,
    class:         student.class,
    subjects,
    city:          student.city,
    pincode:       student.pincode,
    address:       "🔒 Locked",
    contactNumber: "🔒 Locked",
    isUnlocked:    false,
  };
};

// ─── Email transporter ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error("❌ Email transporter error:", error.message);
  } else {
    console.log("✅ Email transporter ready");
  }
});

// ─── Send OTP Email helper ────────────────────────────────────────────────────
const sendOtpEmail = async (email, otp, subject) => {
  await transporter.sendMail({
    from:    `"Home Tutor Platform" <${process.env.EMAIL_USER}>`,
    to:      email,
    subject: subject,
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="margin:0 0 8px;color:#111">${subject}</h2>
        <p style="color:#555;margin:0 0 24px;font-size:14px;">Use the code below. It expires in 5 minutes.</p>
        <div style="background:#f4f5f7;border-radius:8px;padding:20px;text-align:center;letter-spacing:12px;font-size:36px;font-weight:700;color:#111;">${otp}</div>
        <p style="color:#999;font-size:12px;margin-top:24px;">Do not share this code with anyone.</p>
      </div>
    `,
  });
};

const DEFAULT_FAQS = [
  { question: "How does TeacherMarket work?", answer: "Students post their requirements for free. Admin reviews each inquiry, then published leads become available for teachers to unlock with coins.", order: 1 },
  { question: "Is it free for students?", answer: "Yes. Students can post education-related requirements for free.", order: 2 },
  { question: "How do teachers contact students?", answer: "Teachers can browse published leads and unlock contact details using coins. Student contact details are hidden before unlock.", order: 3 },
  { question: "Can students attach assignment or project files?", answer: "Yes. Students can attach documents, images, or PDFs while posting assignment, project, or software-learning requirements.", order: 4 },
  { question: "Are phone numbers shown publicly?", answer: "No. TeacherMarket does not show personal mobile numbers or WhatsApp numbers publicly.", order: 5 },
];

const ensureDefaultFaqs = async () => {
  const count = await prisma.fAQ.count();
  if (count > 0) return;
  await prisma.fAQ.createMany({ data: DEFAULT_FAQS });
};

const isBrowserNavigation = (req) =>
  req.method === "GET" && (req.headers.accept || "").includes("text/html");

// ─── JWT Middleware ───────────────────────────────────────────────────────────
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token      = authHeader && authHeader.split(" ")[1];

  if (!token) {
    if (isBrowserNavigation(req)) return next("route");
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: "Session expired. Please login again." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user  = decoded;
    req.token = token;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token." });
  }
};

const optionalAuthenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token      = authHeader && authHeader.split(" ")[1];

  if (!token) return next();

  try {
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) return next();

    req.user  = jwt.verify(token, process.env.JWT_SECRET);
    req.token = token;
  } catch {
    req.user = null;
  }
  next();
};

// ─── Role Middleware ──────────────────────────────────────────────────────────
const requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.status(403).json({ error: `Access denied. Only ${role}S can do this.` });
  }
  next();
};

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH — SEND OTP
// ══════════════════════════════════════════════════════════════════════════════
app.post("/auth/send-otp", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) return res.status(400).json({ error: "Email is required" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    const isNewUser    = !existingUser;

    const limitKey = `otp_limit:${email}`;
    const count    = await redis.incr(limitKey);
    if (count === 1) await redis.expire(limitKey, 3600);
    if (count > MAX_ATTEMPTS) {
      return res.status(429).json({ error: "Too many OTP requests. Try after 1 hour." });
    }

    const otp       = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 8); // Reduced from 10 to 8 for faster hashing
    console.log(`📧 OTP for ${email}: ${otp}`);

    await redis.set(
      `otp:${email}`,
      JSON.stringify({ otp: hashedOtp, attempts: 0, isNewUser }),
      "EX", OTP_TTL
    );

    // Send email in background (non-blocking)
    sendOtpEmail(email, otp, "Your OTP Code — Home Tutor").catch(err => {
      console.error("Email sending failed:", err.message);
    });

    res.json({ message: "OTP sent to your email ✅", isNewUser });
  } catch (err) {
    console.error("Send OTP error:", err.message);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH — VERIFY OTP
// ══════════════════════════════════════════════════════════════════════════════
app.post("/auth/verify-otp", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const { otp } = req.body;

    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    const data = await redis.get(`otp:${email}`);
    if (!data) return res.status(400).json({ error: "OTP expired or not found" });

    const parsed = JSON.parse(data);

    if (parsed.attempts >= MAX_ATTEMPTS) {
      await redis.del(`otp:${email}`);
      return res.status(400).json({ error: "Too many wrong attempts. Request a new OTP." });
    }

    const match = await bcrypt.compare(otp, parsed.otp);

    if (!match) {
      parsed.attempts += 1;
      await redis.set(`otp:${email}`, JSON.stringify(parsed), "KEEPTTL");
      return res.status(400).json({ error: `Invalid OTP. ${MAX_ATTEMPTS - parsed.attempts} attempt(s) left.` });
    }

    await redis.del(`otp:${email}`);

    if (!parsed.isNewUser) {
      // Existing user — log them in directly
      const user  = await prisma.user.findUnique({
        where:   { email },
        include: { student: true, teacher: true }
      });
      const token = jwt.sign(
        { userId: user.id, role: user.role, email: user.email },
        process.env.JWT_SECRET
      );

      console.log(`✅ Existing user logged in via OTP: ${email}`);

      return res.json({
        message:   "Logged in successfully ✅",
        isNewUser: false,
        token,
        user: {
          id:      user.id,
          email:   user.email,
          phone:   user.phone,
          role:    user.role,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          teacher: user.teacher || null,
          student: user.student || null,
          profile: user.student || user.teacher || null,
        }
      });
    }

    // New user — mark email as verified
    await redis.set(`verified:${email}`, "true", "EX", EMAIL_VERIFICATION_TTL);
    const verificationToken = jwt.sign(
      { email, purpose: "email_verification" },
      process.env.JWT_SECRET,
      { expiresIn: EMAIL_VERIFICATION_TTL }
    );

    res.json({
      message:       "Email verified successfully ✅",
      isNewUser:     true,
      verifiedEmail: email,
      verificationToken
    });
  } catch (err) {
    console.error("Verify OTP error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH — REGISTER
// ══════════════════════════════════════════════════════════════════════════════
app.post("/auth/register", async (req, res) => {
  try {
    const { phone, googleId, verificationToken } = req.body;
    const email = String(req.body.email || "").trim().toLowerCase();
    const role = String(req.body.role || "").toUpperCase();

    if (!email || !role) {
      return res.status(400).json({ error: "Email and role are required" });
    }

    if (!["STUDENT", "TEACHER"].includes(role)) {
      return res.status(400).json({ error: "Role must be STUDENT or TEACHER" });
    }

    const emailVerified = await redis.get(`verified:${email}`);
    let tokenVerified = false;
    if (!emailVerified && verificationToken) {
      try {
        const payload = jwt.verify(verificationToken, process.env.JWT_SECRET);
        tokenVerified = payload?.purpose === "email_verification" && payload?.email === email;
      } catch {
        tokenVerified = false;
      }
    }

    if (!emailVerified && !tokenVerified && !googleId && process.env.REQUIRE_EMAIL_VERIFICATION === "true") {
      return res.status(400).json({ error: "Email not verified. Please verify your email first." });
    }
    if (!emailVerified && !tokenVerified && !googleId) {
      console.warn(`Email verification proof missing for ${email}; allowing registration because REQUIRE_EMAIL_VERIFICATION is not true.`);
    }

    const cleaned   = phone ? phone.replace(/^\+?91/, "").trim() : "";
    const fullPhone = cleaned ? `+91${cleaned}` : `+91${Date.now()}`;

    const existingEmailUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (existingEmailUser) {
      return res.status(409).json({
        error: `One email can be used for only one member account. This email is already registered as ${existingEmailUser.role}. Please login with this email instead.`,
      });
    }

    const existingPhoneUser = await prisma.user.findUnique({
      where: { phone: fullPhone },
    });

    if (existingPhoneUser) {
      return res.status(409).json({ error: "User with this phone already exists." });
    }

    // Create user
    const user = await prisma.user.create({
      data: { email, phone: fullPhone, role, isVerified: true }
    });

    // Auto create empty profile so teacher/student can fill it later
    if (role === "TEACHER") {
      await prisma.teacher.create({
        data: {
          userId:        user.id,
          email:         user.email,
          name:          email.split("@")[0],
          qualification: "",
          experience:    0,
          subjects:      "",
          location:      "",
          city:          "",
          pincode:       "",
          coinBalance:   STARTING_COINS,
          freeViews:     FREE_VIEWS,
        }
      });
    }

    if (role === "STUDENT") {
      await prisma.student.create({
        data: {
          userId:        user.id,
          email:         user.email,
          name:          email.split("@")[0],
          class:         "",
          subjects:      "",
          address:       "",
          city:          "",
          pincode:       "",
          contactNumber: fullPhone,
        }
      });
    }

    await redis.del(`verified:${email}`);

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET
    );

    console.log(`✅ New ${role} registered: ${email}`);

    // Fetch full user with profile
    const fullUser = await prisma.user.findUnique({
      where:   { id: user.id },
      include: { student: true, teacher: true }
    });

    res.status(201).json({
      message: "Registration successful ✅",
      token,
      user: {
        id:      fullUser.id,
        email:   fullUser.email,
        phone:   fullUser.phone,
        role:    fullUser.role,
        isVerified: fullUser.isVerified,
        createdAt: fullUser.createdAt,
        teacher: fullUser.teacher || null,
        student: fullUser.student || null,
        profile: fullUser.student || fullUser.teacher || null,
      }
    });
  } catch (err) {
    console.error("Register error:", err.message);
    if (err.code === "P2002" && err.meta?.target?.includes("email")) {
      return res.status(409).json({ error: "One email can be used for only one member account. Please login with this email instead." });
    }
    res.status(500).json({ error: "Registration failed: " + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH — LOGIN Step 1: Send OTP
// ══════════════════════════════════════════════════════════════════════════════
app.post("/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "No account found with this email. Please register first." });
    }

    const limitKey = `otp_limit:${email}`;
    const count    = await redis.incr(limitKey);
    if (count === 1) await redis.expire(limitKey, 3600);
    if (count > MAX_ATTEMPTS) {
      return res.status(429).json({ error: "Too many OTP requests. Try after 1 hour." });
    }

    const otp       = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);
    console.log(`📧 Login OTP for ${email}: ${otp}`);

    await redis.set(
      `login_otp:${email}`,
      JSON.stringify({ otp: hashedOtp, attempts: 0 }),
      "EX", OTP_TTL
    );

    await sendOtpEmail(email, otp, "Login OTP — Home Tutor");
    res.json({ message: "OTP sent to your email ✅" });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Login failed: " + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH — LOGIN Step 2: Verify OTP
// ══════════════════════════════════════════════════════════════════════════════
app.post("/auth/login/verify", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const { otp } = req.body;

    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    const data = await redis.get(`login_otp:${email}`);
    if (!data) return res.status(400).json({ error: "OTP expired or not found" });

    const parsed = JSON.parse(data);

    if (parsed.attempts >= MAX_ATTEMPTS) {
      await redis.del(`login_otp:${email}`);
      return res.status(400).json({ error: "Too many wrong attempts. Request a new OTP." });
    }

    const match = await bcrypt.compare(otp, parsed.otp);

    if (!match) {
      parsed.attempts += 1;
      await redis.set(`login_otp:${email}`, JSON.stringify(parsed), "KEEPTTL");
      return res.status(400).json({ error: `Invalid OTP. ${MAX_ATTEMPTS - parsed.attempts} attempt(s) left.` });
    }

    await redis.del(`login_otp:${email}`);

    const user = await prisma.user.findUnique({
      where:   { email },
      include: { student: true, teacher: true }
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET
    );

    console.log(`✅ ${user.role} logged in: ${email}`);

    res.json({
      message: "Login successful ✅",
      token,
      user: {
        id:      user.id,
        email:   user.email,
        phone:   user.phone,
        role:    user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        teacher: user.teacher || null,
        student: user.student || null,
        profile: user.student || user.teacher || null,
      }
    });
  } catch (err) {
    console.error("Login verify error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH — LOGOUT
// ══════════════════════════════════════════════════════════════════════════════
app.post("/auth/admin-login", async (req, res) => {
  try {
    const email = (process.env.ADMIN_EMAIL || "admin@tutormatch.in").trim().toLowerCase();
    const submittedEmail = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";
    const configuredPhone = process.env.ADMIN_PHONE || "+910000000000";

    if (!submittedEmail || !password) {
      return res.status(400).json({ error: "Admin email and password are required" });
    }

    if (submittedEmail !== email || password !== expectedPassword) {
      return res.status(401).json({ error: "Invalid admin email or password" });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      user = await prisma.user.update({
        where: { email },
        data:  { role: "ADMIN", isVerified: true, isSuspended: false },
      });
    } else {
      const phoneOwner = await prisma.user.findUnique({ where: { phone: configuredPhone } });
      const adminPhone = phoneOwner
        ? `+91${Date.now()}`
        : configuredPhone;

      user = await prisma.user.create({
        data: { email, phone: adminPhone, role: "ADMIN", isVerified: true, isSuspended: false },
      });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET
    );

    res.json({
      message: "Admin login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        teacher: null,
        student: null,
        profile: null,
      },
    });
  } catch (err) {
    console.error("Admin login error:", err.message);
    res.status(500).json({ error: "Admin login failed: " + err.message });
  }
});

app.post("/auth/logout", authenticateToken, async (req, res) => {
  try {
    await redis.set(`blacklist:${req.token}`, "true");
    console.log(`✅ User logged out: ${req.user.email}`);
    res.json({ message: "Logged out successfully ✅" });
  } catch (err) {
    console.error("Logout error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH — GET CURRENT USER
// ══════════════════════════════════════════════════════════════════════════════
app.get("/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:   { id: req.user.userId },
      include: { student: true, teacher: true }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      id:      user.id,
      email:   user.email,
      phone:   user.phone,
      role:    user.role,
      isVerified: user.isVerified,
      isSuspended: user.isSuspended,
      createdAt: user.createdAt,
      teacher: user.teacher || null,
      student: user.student || null,
      profile: user.student || user.teacher || null,
    });
  } catch (err) {
    console.error("Get me error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  STUDENT PROFILE — CREATE
// ══════════════════════════════════════════════════════════════════════════════
app.post("/student/profile", authenticateToken, requireRole("STUDENT"), async (req, res) => {
  try {
    const userEmail = normalizeEmail(req.user.email);
    const {
      name,
      class: studentClass,
      board,
      subjects,
      address,
      area,
      city,
      pincode,
      contactNumber,
      timing,
      guardianName,
      guardianPhone,
      notes,
    } = req.body;
    const subjectText = serializeSubjects(subjects);

    const existing = await prisma.student.findUnique({
      where: { userId: req.user.userId }
    });

    if (existing) {
      // Update instead of error
      const student = await prisma.student.update({
        where: { userId: req.user.userId },
        data: {
          email:         userEmail,
          ...(name          && { name }),
          ...(studentClass  && { class: studentClass }),
          ...(board         && { board }),
          ...(subjectText   && { subjects: subjectText }),
          ...(address       && { address }),
          ...(area          && { area }),
          ...(city          && { city }),
          ...(pincode       && { pincode }),
          ...(contactNumber && { contactNumber }),
          ...(timing        && { timing }),
          ...(guardianName  && { guardianName }),
          ...(guardianPhone && { guardianPhone }),
          ...(notes         && { notes }),
        }
      });
      return res.json({
        message:       "Student profile updated ✅",
        email:         student.email,
        name:          student.name,
        class:         student.class,
        board:         student.board,
        subjects:      student.subjects,
        address:       student.address,
        area:          student.area,
        city:          student.city,
        pincode:       student.pincode,
        contactNumber: student.contactNumber,
        timing:        student.timing,
        guardianName:  student.guardianName,
        guardianPhone: student.guardianPhone,
        notes:         student.notes,
      });
    }

    const student = await prisma.student.create({
      data: {
        userId:        req.user.userId,
        email:         userEmail,
        name:          name || "",
        class:         studentClass || "",
        board:         board || "",
        subjects:      subjectText,
        address:       address || "",
        area:          area || "",
        city:          city || "",
        pincode:       pincode || "",
        contactNumber: contactNumber || "",
        timing:        timing || "",
        guardianName:  guardianName || "",
        guardianPhone: guardianPhone || "",
        notes:         notes || "",
      }
    });

    res.status(201).json({
      message:       "Student profile created ✅",
      email:         student.email,
      name:          student.name,
      class:         student.class,
      board:         student.board,
      subjects:      student.subjects,
      address:       student.address,
      area:          student.area,
      city:          student.city,
      pincode:       student.pincode,
      contactNumber: student.contactNumber,
      timing:        student.timing,
      guardianName:  student.guardianName,
      guardianPhone: student.guardianPhone,
      notes:         student.notes,
    });
  } catch (err) {
    console.error("Create student profile error:", err.message);
    res.status(500).json({ error: "Failed to create profile: " + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  STUDENT PROFILE — GET OWN
// ══════════════════════════════════════════════════════════════════════════════
app.get("/student/profile", authenticateToken, requireRole("STUDENT"), async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.userId }
    });

    if (!student) {
      return res.status(404).json({ error: "Profile not found." });
    }

    res.json({
      email:         student.email,
      name:          student.name,
      class:         student.class,
      board:         student.board,
      subjects:      student.subjects,
      address:       student.address,
      area:          student.area,
      city:          student.city,
      pincode:       student.pincode,
      contactNumber: student.contactNumber,
      timing:        student.timing,
      guardianName:  student.guardianName,
      guardianPhone: student.guardianPhone,
      notes:         student.notes,
    });
  } catch (err) {
    console.error("Get student profile error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  STUDENT PROFILE — UPDATE
// ══════════════════════════════════════════════════════════════════════════════
app.put("/student/profile", authenticateToken, requireRole("STUDENT"), async (req, res) => {
  try {
    const userEmail = normalizeEmail(req.user.email);
    const {
      name,
      class: studentClass,
      board,
      subjects,
      address,
      area,
      city,
      pincode,
      contactNumber,
      timing,
      guardianName,
      guardianPhone,
      notes,
    } = req.body;
    const subjectText = serializeSubjects(subjects);

    // Upsert — create if not exists, update if exists
    const existing = await prisma.student.findUnique({
      where: { userId: req.user.userId }
    });

    let student;
    if (existing) {
      student = await prisma.student.update({
        where: { userId: req.user.userId },
        data: {
          email:         userEmail,
          ...(name          !== undefined && { name }),
          ...(studentClass  !== undefined && { class: studentClass }),
          ...(board         !== undefined && { board }),
          ...(subjects      !== undefined && { subjects: subjectText }),
          ...(address       !== undefined && { address }),
          ...(area          !== undefined && { area }),
          ...(city          !== undefined && { city }),
          ...(pincode       !== undefined && { pincode }),
          ...(contactNumber !== undefined && { contactNumber }),
          ...(timing        !== undefined && { timing }),
          ...(guardianName  !== undefined && { guardianName }),
          ...(guardianPhone !== undefined && { guardianPhone }),
          ...(notes         !== undefined && { notes }),
        }
      });
    } else {
      student = await prisma.student.create({
        data: {
          userId:        req.user.userId,
          email:         userEmail,
          name:          name || "",
          class:         studentClass || "",
          board:         board || "",
          subjects:      subjectText,
          address:       address || "",
          area:          area || "",
          city:          city || "",
          pincode:       pincode || "",
          contactNumber: contactNumber || "",
          timing:        timing || "",
          guardianName:  guardianName || "",
          guardianPhone: guardianPhone || "",
          notes:         notes || "",
        }
      });
    }

    res.json({
      message:       "Profile updated ✅",
      name:          student.name,
      class:         student.class,
      board:         student.board,
      subjects:      student.subjects,
      address:       student.address,
      area:          student.area,
      city:          student.city,
      pincode:       student.pincode,
      contactNumber: student.contactNumber,
      timing:        student.timing,
      guardianName:  student.guardianName,
      guardianPhone: student.guardianPhone,
      notes:         student.notes,
    });
  } catch (err) {
    console.error("Update student profile error:", err.message);
    res.status(500).json({ error: "Failed to update profile: " + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  TEACHER PROFILE — CREATE
// ══════════════════════════════════════════════════════════════════════════════
app.post("/student/leads", optionalAuthenticateToken, async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      country,
      city,
      subject,
      requirementType,
      description,
      fileAttachment,
      fileName,
      fileType,
    } = req.body;

    if (req.user && req.user.role !== "STUDENT") {
      return res.status(403).json({ error: "Access denied. Only STUDENTS can do this." });
    }

    const fallbackEmail = normalizeEmail(email || req.user?.email);
    const cleanedMobile = String(mobile || "").replace(/^\+?91/, "").trim();
    let fallbackPhone = cleanedMobile ? `+91${cleanedMobile}` : `+91${Date.now()}`;

    let studentUserId = req.user?.userId;
    if (!studentUserId) {
      const emailOwner = fallbackEmail
        ? await prisma.user.findFirst({ where: { email: { equals: fallbackEmail, mode: "insensitive" } } })
        : null;

      if (emailOwner && emailOwner.role !== "STUDENT") {
        return res.status(400).json({
          error: `This email is already registered as ${emailOwner.role}. Please use a different student email.`,
        });
      }

      let studentUser = await prisma.user.findFirst({
        where: {
          role: "STUDENT",
          OR: [
            ...(fallbackEmail ? [{ email: { equals: fallbackEmail, mode: "insensitive" } }] : []),
            { phone: fallbackPhone },
          ],
        },
      });

      if (!studentUser) {
        const phoneOwner = await prisma.user.findUnique({ where: { phone: fallbackPhone } });
        const generatedEmail = fallbackEmail || `student-${Date.now()}@teachermarket.local`;

        if (phoneOwner && phoneOwner.role !== "STUDENT") {
          fallbackPhone = `+91${Date.now()}`;
        }

        studentUser = await prisma.user.create({
          data: {
            email: generatedEmail,
            phone: fallbackPhone,
            role: "STUDENT",
            isVerified: true,
            student: {
              create: {
                email: generatedEmail,
                name: String(name || generatedEmail.split("@")[0]).trim(),
                city: String(city || "").trim(),
                contactNumber: fallbackPhone,
              },
            },
          },
        });
      }

      studentUserId = studentUser.id;
    }

    if (!name || !fallbackEmail || !mobile || !requirementType || !description) {
      return res.status(400).json({ error: "Name, email, mobile, requirement type and description are required." });
    }

    if (!isAllowedLeadFile(fileName, fileType)) {
      return res.status(400).json({ error: "Only PDF, Word document, or image files are allowed." });
    }

    const lead = await prisma.lead.create({
      data: {
        studentId:       studentUserId,
        name:            String(name).trim(),
        email:           fallbackEmail,
        phone:           fallbackPhone,
        country:         String(country || "India").trim(),
        city:            String(city || "").trim(),
        subject:         String(subject || "").trim(),
        requirementType: String(requirementType).trim(),
        description:     String(description).trim(),
        fileName:        fileName || null,
        fileData:        fileAttachment || null,
        fileType:        fileType || null,
        status:          "PENDING",
      },
    });

    res.status(201).json({
      message: "Your requirement has been submitted. Admin will review and publish it.",
      lead: cleanLead(lead),
    });
  } catch (err) {
    console.error("Create student lead error:", err.message);
    res.status(500).json({ error: "Failed to save requirement: " + err.message });
  }
});

app.get("/student/leads", optionalAuthenticateToken, async (req, res) => {
  try {
    if (req.user && req.user.role !== "STUDENT") {
      return res.status(403).json({ error: "Access denied. Only STUDENTS can do this." });
    }

    let studentId = req.user?.userId;
    if (!studentId) {
      const email = String(req.query.email || "").trim().toLowerCase();
      const studentUser = email
        ? await prisma.user.findFirst({ where: { email, role: "STUDENT" } })
        : null;
      if (!studentUser) return res.json({ leads: [], total: 0 });
      studentId = studentUser.id;
    }

    const leads = await prisma.lead.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ leads: leads.map(cleanLead), total: leads.length });
  } catch (err) {
    console.error("Get student leads error:", err.message);
    res.status(500).json({ error: "Failed to load requirements: " + err.message });
  }
});

app.get("/teacher/leads", authenticateToken, requireRole("TEACHER"), async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.userId }
    });

    if (!teacher) {
      return res.status(404).json({ error: "Please create your teacher profile first." });
    }

    const { type = "ALL", subject = "", city = "" } = req.query;
    const where = {
      status: "PUBLISHED",
      isPrivate: false,
    };

    if (type !== "ALL") where.requirementType = String(type);
    if (subject) {
      where.OR = [
        { subject: { contains: String(subject), mode: "insensitive" } },
        { description: { contains: String(subject), mode: "insensitive" } },
      ];
    }
    if (city) where.city = { contains: String(city), mode: "insensitive" };

    const applications = await prisma.leadApplication.findMany({
      where: { teacherId: teacher.id },
      select: { leadId: true, coinsSpent: true, createdAt: true },
    });
    const byLead = new Map(applications.map(a => [a.leadId, a]));

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json({
      leads: leads.map(lead => cleanLeadForTeacher(lead, byLead.has(lead.id), byLead.get(lead.id) || {})),
      total: leads.length,
      coinBalance: teacher.coinBalance,
      freeViews: teacher.freeViews,
      coinsToUnlock: COINS_TO_UNLOCK,
    });
  } catch (err) {
    console.error("Get teacher leads error:", err.message);
    res.status(500).json({ error: "Failed to load leads: " + err.message });
  }
});

app.get("/teacher/leads/unlocked", authenticateToken, requireRole("TEACHER"), async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.userId }
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher profile not found." });
    }

    const [applications, profileUnlocks] = await Promise.all([
      prisma.leadApplication.findMany({
        where: { teacherId: teacher.id },
        include: { lead: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.unlock.findMany({
        where: { teacherId: teacher.id },
        include: { student: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const leadUnlocks = applications.map(a => cleanLeadForTeacher(a.lead, true, {
      coinsSpent: a.coinsSpent,
      unlockedAt: a.createdAt,
    }));

    const legacyProfileUnlocks = profileUnlocks.map(u => {
      const student = u.student;
      const subjects = parseSubjects(student.subjects);
      return {
        id:              `profile-${student.id}`,
        studentUserId:   student.userId,
        studentName:     student.name || student.user?.email?.split("@")[0] || "Student",
        studentEmail:    student.user?.email || "",
        studentMobile:   student.contactNumber || "",
        country:         "India",
        city:            student.city || "",
        subject:         subjects.join(", "),
        requirementType: "Student Profile",
        description:     [
          student.class ? `Class: ${student.class}` : "",
          subjects.length ? `Subjects: ${subjects.join(", ")}` : "",
          student.timing ? `Timing: ${student.timing}` : "",
          student.notes ? `Notes: ${student.notes}` : "",
        ].filter(Boolean).join(" | ") || "Unlocked student profile",
        fileName:        null,
        fileAttachment:  null,
        fileType:        null,
        status:          "PUBLISHED",
        appliedCount:    0,
        maxUnlocks:      null,
        isPrivate:       false,
        isUnlocked:      true,
        coinsSpent:      u.coinsSpent,
        isFree:          u.coinsSpent === 0,
        unlockedAt:      u.createdAt,
        createdAt:       student.createdAt,
        updatedAt:       student.updatedAt,
      };
    });

    const leads = [...leadUnlocks, ...legacyProfileUnlocks]
      .sort((a, b) => new Date(b.unlockedAt || b.createdAt) - new Date(a.unlockedAt || a.createdAt));

    res.json({ leads, total: leads.length });
  } catch (err) {
    console.error("Get unlocked leads error:", err.message);
    res.status(500).json({ error: "Failed to load unlocked leads: " + err.message });
  }
});

app.post("/teacher/leads/:leadId/unlock", authenticateToken, requireRole("TEACHER"), async (req, res) => {
  try {
    const leadId = parseInt(req.params.leadId);

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.userId }
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher profile not found." });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.status !== "PUBLISHED" || lead.isPrivate) {
      return res.status(404).json({ error: "This lead is not available." });
    }

    const alreadyUnlocked = await prisma.leadApplication.findUnique({
      where: { leadId_teacherId: { leadId, teacherId: teacher.id } }
    });

    if (alreadyUnlocked) {
      return res.json({
        message: "Already unlocked",
        lead: cleanLeadForTeacher(lead, true, alreadyUnlocked),
        coinsSpent: alreadyUnlocked.coinsSpent,
        coinBalance: teacher.coinBalance,
        freeViews: teacher.freeViews,
      });
    }

    if (lead.maxUnlocks !== null && lead.applyCount >= lead.maxUnlocks) {
      return res.status(400).json({ error: "This lead has reached the maximum unlock limit." });
    }

    let coinsSpent = 0;
    const teacherPatch = {};

    if (teacher.freeViews > 0) {
      teacherPatch.freeViews = { decrement: 1 };
    } else {
      if (teacher.coinBalance < COINS_TO_UNLOCK) {
        return res.status(400).json({
          error: `Not enough coins. You need ${COINS_TO_UNLOCK} coins but have ${teacher.coinBalance}.`,
          coinBalance: teacher.coinBalance,
          coinsNeeded: COINS_TO_UNLOCK,
        });
      }
      teacherPatch.coinBalance = { decrement: COINS_TO_UNLOCK };
      coinsSpent = COINS_TO_UNLOCK;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedTeacher = await tx.teacher.update({
        where: { id: teacher.id },
        data: teacherPatch,
      });
      const application = await tx.leadApplication.create({
        data: { leadId, teacherId: teacher.id, coinsSpent },
      });
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: { applyCount: { increment: 1 } },
      });
      return { updatedTeacher, application, updatedLead };
    });

    res.json({
      message: coinsSpent ? `Unlocked! ${coinsSpent} coins deducted.` : "Free unlock used.",
      lead: cleanLeadForTeacher(result.updatedLead, true, result.application),
      coinsSpent,
      coinBalance: result.updatedTeacher.coinBalance,
      freeViews: result.updatedTeacher.freeViews,
    });
  } catch (err) {
    console.error("Unlock lead error:", err.message);
    res.status(500).json({ error: "Failed to unlock lead: " + err.message });
  }
});

app.post("/teacher/profile", authenticateToken, requireRole("TEACHER"), async (req, res) => {
  try {
    const userEmail = normalizeEmail(req.user.email);
    const { name, qualification, experience, subjects, location, city, pincode, monthlyFee } = req.body;
    const subjectText = serializeSubjects(subjects);

    const existing = await prisma.teacher.findUnique({
      where: { userId: req.user.userId }
    });

    if (existing) {
      // Update instead of error
      const teacher = await prisma.teacher.update({
        where: { userId: req.user.userId },
        data: {
          email:         userEmail,
          ...(name          && { name }),
          ...(qualification && { qualification }),
          ...(experience    && { experience: parseInt(experience) }),
          ...(subjectText   && { subjects: subjectText }),
          ...(location      && { location }),
          ...(city          && { city }),
          ...(pincode       && { pincode }),
          ...(monthlyFee    !== undefined && { monthlyFee: parseInt(monthlyFee) || 0 }),
        }
      });
      return res.json({
        message:       "Teacher profile updated ✅",
        name:          teacher.name,
        qualification: teacher.qualification,
        experience:    teacher.experience,
        subjects:      teacher.subjects,
        location:      teacher.location,
        city:          teacher.city,
        pincode:       teacher.pincode,
        monthlyFee:    teacher.monthlyFee,
        coinBalance:   teacher.coinBalance,
        freeViews:     teacher.freeViews,
      });
    }

    const teacher = await prisma.teacher.create({
      data: {
        userId:        req.user.userId,
        email:         userEmail,
        name:          name || "",
        qualification: qualification || "",
        experience:    parseInt(experience) || 0,
        subjects:      subjectText,
        location:      location || "",
        city:          city || "",
        pincode:       pincode || "",
        monthlyFee:    parseInt(monthlyFee) || 0,
        coinBalance:   STARTING_COINS,
        freeViews:     FREE_VIEWS,
      }
    });

    res.status(201).json({
      message:       "Teacher profile created ✅",
      name:          teacher.name,
      qualification: teacher.qualification,
      experience:    teacher.experience,
      subjects:      teacher.subjects,
      location:      teacher.location,
      city:          teacher.city,
      pincode:       teacher.pincode,
      monthlyFee:    teacher.monthlyFee,
      coinBalance:   teacher.coinBalance,
      freeViews:     teacher.freeViews,
    });
  } catch (err) {
    console.error("Create teacher profile error:", err.message);
    res.status(500).json({ error: "Failed to create profile: " + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  TEACHER PROFILE — GET OWN
// ══════════════════════════════════════════════════════════════════════════════
app.get("/teacher/profile", authenticateToken, requireRole("TEACHER"), async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.userId }
    });

    if (!teacher) {
      return res.status(404).json({ error: "Profile not found." });
    }

    res.json({
      name:          teacher.name,
      qualification: teacher.qualification,
      experience:    teacher.experience,
      subjects:      teacher.subjects,
      location:      teacher.location,
      city:          teacher.city,
      pincode:       teacher.pincode,
      monthlyFee:    teacher.monthlyFee,
      coinBalance:   teacher.coinBalance,
      freeViews:     teacher.freeViews,
    });
  } catch (err) {
    console.error("Get teacher profile error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  TEACHER PROFILE — UPDATE
// ══════════════════════════════════════════════════════════════════════════════
app.put("/teacher/profile", authenticateToken, requireRole("TEACHER"), async (req, res) => {
  try {
    const userEmail = normalizeEmail(req.user.email);
    const { name, qualification, experience, subjects, location, city, pincode, monthlyFee } = req.body;
    const subjectText = serializeSubjects(subjects);

    const existing = await prisma.teacher.findUnique({
      where: { userId: req.user.userId }
    });

    let teacher;
    if (existing) {
      teacher = await prisma.teacher.update({
        where: { userId: req.user.userId },
        data: {
          email:         userEmail,
          ...(name          !== undefined && { name }),
          ...(qualification !== undefined && { qualification }),
          ...(experience    !== undefined && { experience: parseInt(experience) || 0 }),
          ...(subjects      !== undefined && { subjects: subjectText }),
          ...(location      !== undefined && { location }),
          ...(city          !== undefined && { city }),
          ...(pincode       !== undefined && { pincode }),
          ...(monthlyFee    !== undefined && { monthlyFee: parseInt(monthlyFee) || 0 }),
        }
      });
    } else {
      teacher = await prisma.teacher.create({
        data: {
          userId:        req.user.userId,
          email:         userEmail,
          name:          name || "",
          qualification: qualification || "",
          experience:    parseInt(experience) || 0,
          subjects:      subjectText,
          location:      location || "",
          city:          city || "",
          pincode:       pincode || "",
          monthlyFee:    parseInt(monthlyFee) || 0,
          coinBalance:   STARTING_COINS,
          freeViews:     FREE_VIEWS,
        }
      });
    }

    res.json({
      message:       "Profile updated ✅",
      name:          teacher.name,
      qualification: teacher.qualification,
      experience:    teacher.experience,
      subjects:      teacher.subjects,
      location:      teacher.location,
      city:          teacher.city,
      pincode:       teacher.pincode,
      monthlyFee:    teacher.monthlyFee,
      coinBalance:   teacher.coinBalance,
      freeViews:     teacher.freeViews,
    });
  } catch (err) {
    console.error("Update teacher profile error:", err.message);
    res.status(500).json({ error: "Failed to update profile: " + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  TEACHER — GET ALL STUDENTS
// ══════════════════════════════════════════════════════════════════════════════
app.get("/teacher/students", authenticateToken, requireRole("TEACHER"), async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.userId }
    });

    if (!teacher) {
      return res.status(404).json({ error: "Please create your teacher profile first." });
    }

    const unlocked = await prisma.unlock.findMany({
      where:  { teacherId: teacher.id },
      select: { studentId: true }
    });
    const unlockedIds = unlocked.map(u => u.studentId);

    // Only show students with name filled
    const students = await prisma.student.findMany({
      where: { name: { not: "" } }
    });

    const studentsWithStatus = students.map((student) => {
      return cleanStudent(student, unlockedIds.includes(student.id));
    });

    res.json({
      students:    studentsWithStatus,
      coinBalance: teacher.coinBalance,
      freeViews:   teacher.freeViews,
    });
  } catch (err) {
    console.error("Get students error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  TEACHER — GET COIN BALANCE
// ══════════════════════════════════════════════════════════════════════════════
app.get("/teacher/coins", authenticateToken, requireRole("TEACHER"), async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.userId }
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher profile not found." });
    }

    res.json({
      coinBalance:   teacher.coinBalance,
      freeViews:     teacher.freeViews,
      coinsToUnlock: COINS_TO_UNLOCK,
    });
  } catch (err) {
    console.error("Get coins error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  TEACHER — UNLOCK STUDENT
// ══════════════════════════════════════════════════════════════════════════════
app.post("/teacher/unlock/:studentId", authenticateToken, requireRole("TEACHER"), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.userId }
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher profile not found." });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }

    const alreadyUnlocked = await prisma.unlock.findUnique({
      where: {
        teacherId_studentId: {
          teacherId: teacher.id,
          studentId: studentId,
        }
      }
    });

    if (alreadyUnlocked) {
      return res.json({
        message:    "Already unlocked ✅",
        student:    cleanStudent(student, true),
        coinsSpent: 0,
        coinBalance: teacher.coinBalance,
        freeViews:   teacher.freeViews,
      });
    }

    let coinsSpent = 0;

    if (teacher.freeViews > 0) {
      await prisma.teacher.update({
        where: { id: teacher.id },
        data:  { freeViews: { decrement: 1 } }
      });
      console.log(`✅ Free view used. Remaining: ${teacher.freeViews - 1}`);
    } else {
      if (teacher.coinBalance < COINS_TO_UNLOCK) {
        return res.status(400).json({
          error:       `Not enough coins. You need ${COINS_TO_UNLOCK} coins but have ${teacher.coinBalance}.`,
          coinBalance: teacher.coinBalance,
          coinsNeeded: COINS_TO_UNLOCK,
        });
      }

      await prisma.teacher.update({
        where: { id: teacher.id },
        data:  { coinBalance: { decrement: COINS_TO_UNLOCK } }
      });

      coinsSpent = COINS_TO_UNLOCK;
    }

    await prisma.unlock.create({
      data: {
        teacherId:  teacher.id,
        studentId:  studentId,
        coinsSpent: coinsSpent,
      }
    });

    const updatedTeacher = await prisma.teacher.findUnique({
      where: { id: teacher.id }
    });

    res.json({
      message:     "Student unlocked successfully ✅",
      student:     cleanStudent(student, true),
      coinsSpent,
      coinBalance: updatedTeacher.coinBalance,
      freeViews:   updatedTeacher.freeViews,
    });
  } catch (err) {
    console.error("Unlock student error:", err.message);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  TEACHER — GET ALL UNLOCKED STUDENTS
// ══════════════════════════════════════════════════════════════════════════════
app.get("/teacher/unlocked", authenticateToken, requireRole("TEACHER"), async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.userId }
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher profile not found." });
    }

    const unlocks = await prisma.unlock.findMany({
      where:   { teacherId: teacher.id },
      include: { student: true },
    });

    const students = unlocks.map(u => ({
      ...cleanStudent(u.student, true),
      coinsSpent: u.coinsSpent,
      unlockedAt: u.createdAt,
    }));

    res.json({ students, total: students.length });
  } catch (err) {
    console.error("Get unlocked students error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  PAYMENT — CREATE ORDER
// ══════════════════════════════════════════════════════════════════════════════
app.post("/payment/create-order", authenticateToken, requireRole("TEACHER"), async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!amount || amount < 1) {
      return res.status(400).json({ error: "Minimum payment is ₹1" });
    }

    const coinsToAdd = Math.round(amount * COINS_PER_RUPEE);

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.json({
        orderId:    `dev_order_${Date.now()}`,
        amount,
        coinsToAdd,
        currency:   "INR",
        keyId:      "",
        devMode:    true,
      });
    }

    const order = await razorpay.orders.create({
      amount:   amount * 100,
      currency: "INR",
      receipt:  `receipt_${Date.now()}`,
      notes: {
        teacherId: req.user.userId.toString(),
        coins:     coinsToAdd.toString(),
      }
    });

    console.log(`✅ Razorpay order created: ${order.id}`);

    res.json({
      orderId:    order.id,
      amount,
      coinsToAdd,
      currency:   "INR",
      keyId:      process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Create order error:", err.message);
    res.status(500).json({ error: "Failed to create payment order: " + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  PAYMENT — VERIFY & ADD COINS
// ══════════════════════════════════════════════════════════════════════════════
app.post("/payment/verify", authenticateToken, requireRole("TEACHER"), async (req, res) => {
  try {
    const razorpay_order_id =
      req.body.razorpay_order_id || req.body.razorpayOrderId || req.body.orderId;
    const razorpay_payment_id =
      req.body.razorpay_payment_id || req.body.razorpayPaymentId || req.body.paymentId;
    const razorpay_signature =
      req.body.razorpay_signature || req.body.razorpaySignature || req.body.signature;
    const amount = Number(req.body.amount);

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ error: "Payment details are required" });
    }

    const isDevPayment =
      !process.env.RAZORPAY_KEY_SECRET ||
      String(razorpay_order_id).startsWith("dev_order_");

    if (!isDevPayment) {
      if (!razorpay_signature) {
        return res.status(400).json({ error: "Payment signature is required" });
      }

      const body     = razorpay_order_id + "|" + razorpay_payment_id;
      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest("hex");

      if (expected !== razorpay_signature) {
        return res.status(400).json({ error: "Invalid payment signature. Payment verification failed." });
      }
    }

    if (!Number.isFinite(amount) || amount < 1) {
      return res.status(400).json({ error: "Valid payment amount is required" });
    }

    const coinsToAdd = Math.round(amount * COINS_PER_RUPEE);

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.userId }
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher profile not found." });
    }

    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacher.id },
      data:  { coinBalance: { increment: coinsToAdd } }
    });

    await prisma.payment.create({
      data: {
        teacherId:  teacher.id,
        amount:     parseFloat(amount),
        coinsAdded: coinsToAdd,
        status:     "SUCCESS",
        razorpayId: razorpay_payment_id,
      }
    });

    console.log(`✅ Payment verified! ${coinsToAdd} coins added to teacher ${teacher.id}`);

    res.json({
      message:     "Payment successful! Coins added ✅",
      coinsAdded:  coinsToAdd,
      coinBalance: updatedTeacher.coinBalance,
    });
  } catch (err) {
    console.error("Verify payment error:", err.message);
    res.status(500).json({ error: "Payment verification failed: " + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════════════════════════════════════════════
app.get("/admin/stats", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const [totalUsers, totalStudents, totalTeachers, totalPayments, totalRevenue, totalLeads, pendingLeads, publishedLeads, hiddenLeads, leadUnlocks, profileUnlocks, recentPayments] = await Promise.all([
      prisma.user.count(),
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.payment.count({ where: { status: "SUCCESS" } }),
      prisma.payment.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
      prisma.lead.count(),
      prisma.lead.count({ where: { status: "PENDING" } }),
      prisma.lead.count({ where: { status: "PUBLISHED" } }),
      prisma.lead.count({ where: { status: "HIDDEN" } }),
      prisma.leadApplication.count(),
      prisma.unlock.count(),
      prisma.payment.findMany({
        where: { status: "SUCCESS" },
        include: { teacher: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    ]);

    res.json({
      totalUsers, totalStudents, totalTeachers, totalPayments,
      totalLeads, pendingLeads, publishedLeads, hiddenLeads,
      totalUnlocks: leadUnlocks + profileUnlocks,
      totalRevenue: totalRevenue._sum.amount || 0,
      recentPayments: recentPayments.map(p => ({
        id: p.id,
        teacherName: p.teacher?.name || p.teacher?.user?.email || "Teacher",
        packageName: p.packageName || "Coins",
        coinsAdded: p.coinsAdded,
        amount: p.amount,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/admin/leads", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "ALL", type = "ALL" } = req.query;
    const where = {};

    if (status !== "ALL") {
      if (status === "PRIVATE") where.isPrivate = true;
      else where.status = status;
    }
    if (type !== "ALL") where.requirementType = type;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ leads: leads.map(cleanLead), total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error("Admin leads error:", err.message);
    res.status(500).json({ error: "Failed to load leads: " + err.message });
  }
});

app.patch("/admin/leads/:id", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const data = {};
    const requestedStatus = req.body.status;

    if (requestedStatus) {
      if (requestedStatus === "PRIVATE") {
        data.isPrivate = true;
        data.status = "HIDDEN";
      } else {
        data.status = requestedStatus;
        data.isPrivate = false;
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "maxUnlocks")) {
      const maxUnlocks = req.body.maxUnlocks === null || req.body.maxUnlocks === ""
        ? null
        : parseInt(req.body.maxUnlocks);
      data.maxUnlocks = Number.isFinite(maxUnlocks) && maxUnlocks > 0 ? maxUnlocks : null;
    }

    const where = { id: parseInt(req.params.id) };
    const lead = Object.keys(data).length
      ? await prisma.lead.update({ where, data })
      : await prisma.lead.findUnique({ where });

    if (!lead) return res.status(404).json({ error: "Lead not found." });

    res.json({ lead: cleanLead(lead) });
  } catch (err) {
    console.error("Admin update lead error:", err.message);
    res.status(500).json({ error: "Failed to update lead: " + err.message });
  }
});

app.delete("/admin/leads/:id", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.$transaction([
      prisma.leadApplication.deleteMany({ where: { leadId: id } }),
      prisma.lead.delete({ where: { id } }),
    ]);
    res.json({ message: "Lead deleted" });
  } catch (err) {
    console.error("Admin delete lead error:", err.message);
    res.status(500).json({ error: "Failed to delete lead: " + err.message });
  }
});

app.get("/admin/members", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const { page = 1, limit = 10, role = 'ALL', search = '', status = 'ALL' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where  = {};

    if (role !== 'ALL') where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { teacher: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }
    if (status === 'SUSPENDED') where.isSuspended = true;
    else if (status === 'ACTIVE') where.isSuspended = false;

    const [members, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { student: true, teacher: true },
        skip: offset,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      members: members.map(u => ({
        id: u.id, email: u.email, phone: u.phone, role: u.role,
        isVerified: u.isVerified, createdAt: u.createdAt,
        profile: u.student || u.teacher || null,
        isSuspended: u.isSuspended || false,
      })),
      total, page: parseInt(page), limit: parseInt(limit),
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.patch("/admin/members/:id/suspend", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data:  { isSuspended: !!req.body.isSuspended }
    });
    res.json({ message: `User ${req.body.isSuspended ? 'suspended' : 'unsuspended'}`, user });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.patch("/admin/members/:id/coins", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) }, include: { teacher: true }
    });
    if (!user?.teacher) return res.status(400).json({ error: "User must be a teacher" });

    const teacher = await prisma.teacher.update({
      where: { id: user.teacher.id },
      data:  { coinBalance: { increment: req.body.delta } }
    });
    res.json({ message: `Coins adjusted`, newBalance: teacher.coinBalance });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/admin/transactions", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'ALL' } = req.query;
    const where = {};
    if (status !== 'ALL') where.status = status;

    const [transactions, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { teacher: { include: { user: true } } },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.payment.count({ where })
    ]);

    res.json({
      transactions: transactions.map(t => ({
        id: t.id, teacherId: t.teacherId,
        teacherName: t.teacher.name, teacherEmail: t.teacher.user.email,
        amount: t.amount, coinsAdded: t.coinsAdded,
        status: t.status, razorpayId: t.razorpayId, createdAt: t.createdAt,
      })),
      total, page: parseInt(page), limit: parseInt(limit),
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/admin/packages", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const packages = await prisma.coinPackage.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ packages });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/admin/packages", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id, key, name, coins, price, isActive } = req.body;
    const data = { key, name, coins: parseInt(coins), price: parseFloat(price), isActive: !!isActive };
    const pkg  = id
      ? await prisma.coinPackage.update({ where: { id: parseInt(id) }, data })
      : await prisma.coinPackage.create({ data });
    res.json({ message: id ? "Package updated" : "Package created", package: pkg });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/admin/packages/:id", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.coinPackage.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: "Package deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/faqs", async (req, res) => {
  try {
    await ensureDefaultFaqs();
    const faqs = await prisma.fAQ.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    res.json({ faqs: faqs.map(f => ({ id: f.id, q: f.question, a: f.answer, isActive: f.isActive, order: f.order })) });
  } catch (err) {
    console.error("Get FAQs error:", err.message);
    res.status(500).json({ error: "Failed to load FAQs" });
  }
});

app.get("/admin/faqs", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    await ensureDefaultFaqs();
    const faqs = await prisma.fAQ.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    res.json({ faqs: faqs.map(f => ({ id: f.id, q: f.question, a: f.answer, isActive: f.isActive, order: f.order })) });
  } catch (err) {
    res.status(500).json({ error: "Failed to load FAQs" });
  }
});

app.post("/admin/faqs", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const question = String(req.body.q || req.body.question || "").trim();
    const answer = String(req.body.a || req.body.answer || "").trim();
    if (!question || !answer) {
      return res.status(400).json({ error: "Question and answer are required." });
    }
    const faq = await prisma.fAQ.create({
      data: {
        question,
        answer,
        isActive: req.body.isActive ?? true,
        order: parseInt(req.body.order) || 0,
      },
    });
    res.json({ faq: { id: faq.id, q: faq.question, a: faq.answer, isActive: faq.isActive, order: faq.order } });
  } catch (err) {
    res.status(500).json({ error: "Failed to save FAQ" });
  }
});

app.patch("/admin/faqs/:id", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const data = {};
    if (Object.prototype.hasOwnProperty.call(req.body, "q") || Object.prototype.hasOwnProperty.call(req.body, "question")) {
      data.question = String(req.body.q || req.body.question || "").trim();
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "a") || Object.prototype.hasOwnProperty.call(req.body, "answer")) {
      data.answer = String(req.body.a || req.body.answer || "").trim();
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "isActive")) data.isActive = !!req.body.isActive;
    if (Object.prototype.hasOwnProperty.call(req.body, "order")) data.order = parseInt(req.body.order) || 0;
    if (data.question === "" || data.answer === "") {
      return res.status(400).json({ error: "Question and answer cannot be empty." });
    }
    const faq = await prisma.fAQ.update({ where: { id: parseInt(req.params.id) }, data });
    res.json({ faq: { id: faq.id, q: faq.question, a: faq.answer, isActive: faq.isActive, order: faq.order } });
  } catch (err) {
    res.status(500).json({ error: "Failed to update FAQ" });
  }
});

app.delete("/admin/faqs/:id", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.fAQ.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: "FAQ deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete FAQ" });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "Server is running ✅", port: process.env.PORT || 5000, redis: redis.status });
});

// ─── Catch-all ────────────────────────────────────────────────────────────────
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`🖥️  Frontend served from: ${frontendPath}`);
  console.log(`📋 Routes ready:`);
  console.log(`   POST /auth/send-otp`);
  console.log(`   POST /auth/verify-otp`);
  console.log(`   POST /auth/register`);
  console.log(`   POST /auth/login`);
  console.log(`   POST /auth/login/verify`);
  console.log(`   POST /auth/logout`);
  console.log(`   GET  /auth/me`);
  console.log(`   POST /student/profile`);
  console.log(`   GET  /student/profile`);
  console.log(`   PUT  /student/profile`);
  console.log(`   POST /teacher/profile`);
  console.log(`   GET  /teacher/profile`);
  console.log(`   PUT  /teacher/profile`);
  console.log(`   GET  /teacher/students`);
  console.log(`   GET  /teacher/coins`);
  console.log(`   POST /teacher/unlock/:studentId`);
  console.log(`   GET  /teacher/unlocked`);
  console.log(`   POST /payment/create-order`);
  console.log(`   POST /payment/verify`);
  console.log(`   GET  /health\n`);
});
