import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { hashPassword, hashPasswordSync, isUsablePassword, migratePlainTextPasswords, verifyPassword } from "./passwords";
import {
  ensurePasswordResetSchema,
  FixedWindowLimiter,
  INVALID_RESET_LINK_MESSAGE,
  normalizeEmail,
  requestPasswordReset,
  RESET_REQUESTED_MESSAGE,
  resetPasswordWithToken,
} from "./passwordReset";
import { missingEmailSettings, sendPasswordResetEmail } from "./mailer";

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("GEMINI_API_KEY is not configured. Please check your API key in Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Initialize Database
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new Database(path.join(dbDir, 'app.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    facility TEXT,
    location TEXT,
    bio TEXT,
    avatar_url TEXT,
    public_status TEXT,
    interests TEXT,
    looking_to_meet INTEGER DEFAULT 0,
    wellness_reminders INTEGER DEFAULT 0,
    wellness_reminder_time TEXT DEFAULT '09:00',
    age INTEGER,
    gender TEXT,
    pronouns TEXT,
    looking_for TEXT,
    relationship_status TEXT,
    incarceration_details TEXT
  );
  CREATE TABLE IF NOT EXISTS mentorships (
    id TEXT PRIMARY KEY,
    mentor_id TEXT,
    mentee_id TEXT,
    status TEXT DEFAULT 'pending', -- pending, active, completed, declined
    is_anonymous INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(mentor_id) REFERENCES users(id),
    FOREIGN KEY(mentee_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT,
    category TEXT,
    file_name TEXT,
    file_type TEXT,
    file_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    title TEXT,
    company TEXT,
    location TEXT,
    description TEXT,
    is_felony_friendly INTEGER DEFAULT 1,
    posted_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(posted_by) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS housing (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    location TEXT,
    contact_info TEXT,
    description TEXT,
    posted_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(posted_by) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS kites (
    id TEXT PRIMARY KEY,
    sender_id TEXT,
    receiver_id TEXT,
    content TEXT,
    is_read INTEGER DEFAULT 0,
    read_at DATETIME,
    is_anonymous INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS parole_officers (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT,
    agency TEXT,
    phone TEXT,
    district TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    author_id TEXT,
    title TEXT,
    content TEXT,
    category TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(author_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS replies (
    id TEXT PRIMARY KEY,
    thread_id TEXT,
    author_id TEXT,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(thread_id) REFERENCES threads(id),
    FOREIGN KEY(author_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT,
    content TEXT,
    link TEXT,
    is_read INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS job_applications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    company TEXT,
    position TEXT,
    date_applied TEXT,
    status TEXT DEFAULT 'applied',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS legal_cases (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    case_number TEXT,
    court TEXT,
    status TEXT,
    next_hearing_date TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS moderation_logs (
    id TEXT PRIMARY KEY,
    moderator_id TEXT,
    action TEXT,
    target_type TEXT,
    target_id TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(moderator_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    requester_id TEXT,
    receiver_id TEXT,
    status TEXT DEFAULT 'connected',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(requester_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id),
    UNIQUE(requester_id, receiver_id)
  );
  CREATE TABLE IF NOT EXISTS testimonials (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    author_name TEXT,
    content TEXT,
    role TEXT,
    avatar_url TEXT,
    likes_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS testimonial_comments (
    id TEXT PRIMARY KEY,
    testimonial_id TEXT,
    user_id TEXT,
    author_name TEXT,
    content TEXT,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(testimonial_id) REFERENCES testimonials(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS video_calls (
    id TEXT PRIMARY KEY,
    caller_id TEXT,
    receiver_id TEXT,
    status TEXT DEFAULT 'ringing', -- ringing, connected, completed, declined, missed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(caller_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS video_signals (
    id TEXT PRIMARY KEY,
    call_id TEXT,
    sender_id TEXT,
    receiver_id TEXT,
    type TEXT, -- offer, answer, ice-candidate
    payload TEXT, -- JSON-stringified details
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(call_id) REFERENCES video_calls(id) ON DELETE CASCADE,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS mentorship_surveys (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE,
    role_preference TEXT DEFAULT 'both',
    interests TEXT,
    life_goals TEXT,
    cadence TEXT DEFAULT 'weekly',
    communication_style TEXT DEFAULT 'all',
    experience_level TEXT DEFAULT 'early_reentry',
    personal_statement TEXT,
    availability_status TEXT DEFAULT 'actively_seeking',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS resource_ratings (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    verified_reliable INTEGER DEFAULT 1,
    review_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS resource_bookmarks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_title TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, resource_id)
  );

  CREATE TABLE IF NOT EXISTS mentorship_reviews (
    id TEXT PRIMARY KEY,
    mentor_id TEXT NOT NULL,
    reviewer_id TEXT NOT NULL,
    reviewer_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    communication_rating INTEGER DEFAULT 5,
    reentry_helpfulness INTEGER DEFAULT 5,
    would_recommend INTEGER DEFAULT 1,
    highlights TEXT,
    review_text TEXT NOT NULL,
    is_anonymous INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mentor_id, reviewer_id)
  );
`);

// Seed initial peer-verified ratings for core community resources if empty
try {
  const existingRatings = db.prepare("SELECT COUNT(*) as count FROM resource_ratings").get() as any;
  if (!existingRatings || existingRatings.count === 0) {
    const seedRatings = [
      { resource_id: "mh-988", user_id: "seed-1", user_name: "Marcus Vance", rating: 5, verified_reliable: 1, review_note: "Answered in under 45 seconds. Respectful counselor who listened without judgment." },
      { resource_id: "mh-988", user_id: "seed-2", user_name: "Maya Robinson", rating: 5, verified_reliable: 1, review_note: "Available 24/7 by text too—helped me through a stressful first month home." },
      { resource_id: "mh-1", user_id: "seed-3", user_name: "Carlos Mendez", rating: 5, verified_reliable: 1, review_note: "Texting HOME to 741741 connected me immediately when I felt overwhelmed in public." },
      { resource_id: "mh-2", user_id: "seed-1", user_name: "Marcus Vance", rating: 4, verified_reliable: 1, review_note: "Solid referrals for Medicaid-covered outpatient counseling and recovery groups." },
      { resource_id: "mh-3", user_id: "seed-4", user_name: "David Chen", rating: 5, verified_reliable: 1, review_note: "Counselors genuinely understand post-incarceration stress and parole pressures." },
      { resource_id: "mh-4", user_id: "seed-2", user_name: "Maya Robinson", rating: 4, verified_reliable: 1, review_note: "Great Medicaid guide and free peer-led anxiety support meetings." },
      { resource_id: "mh-5", user_id: "seed-3", user_name: "Carlos Mendez", rating: 4, verified_reliable: 1, review_note: "Family reunification circles were welcoming and structured." },
      { resource_id: "rmoms-1", user_id: "seed-3", user_name: "Carlos Mendez", rating: 5, verified_reliable: 1, review_note: "Verified active line. Call right after 5:00 AM and always save your confirmation code." },
      { resource_id: "rmoms-1", user_id: "seed-1", user_name: "Marcus Vance", rating: 4, verified_reliable: 1, review_note: "Accurate Denver Metro hours—arrive 45 minutes before closing to avoid long waits." },
      { resource_id: "rmoms-2", user_id: "seed-4", user_name: "David Chen", rating: 4, verified_reliable: 1, review_note: "Hotline updates reliably every morning for Colorado Springs color groups." },
      { resource_id: "ua-general", user_id: "seed-2", user_name: "Maya Robinson", rating: 5, verified_reliable: 1, review_note: "Automated daily verification works smoothly on mobile." },
      { resource_id: "parole-ca", user_id: "seed-1", user_name: "Marcus Vance", rating: 4, verified_reliable: 1, review_note: "Found my Oakland regional office number and BPH schedule right away." },
      { resource_id: "parole-co", user_id: "seed-3", user_name: "Carlos Mendez", rating: 5, verified_reliable: 1, review_note: "Official CDOC portal lists every district parole office and CPO desk." },
      { resource_id: "parole-ny", user_id: "seed-2", user_name: "Maya Robinson", rating: 4, verified_reliable: 1, review_note: "Helpful travel permit instructions and borough supervision phone numbers." },
      { resource_id: "parole-tx", user_id: "seed-4", user_name: "David Chen", rating: 4, verified_reliable: 1, review_note: "Regional office locator is up to date for Houston and Dallas districts." }
    ];
    const insertRating = db.prepare(
      "INSERT OR IGNORE INTO resource_ratings (id, resource_id, user_id, user_name, rating, verified_reliable, review_note) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    for (const r of seedRatings) {
      insertRating.run(crypto.randomUUID(), r.resource_id, r.user_id, r.user_name, r.rating, r.verified_reliable, r.review_note);
    }
  }
} catch (e) {
  console.warn("Failed to seed initial resource ratings:", e);
}

// Column/table migrations for databases created before these fields existed.
// Must run AFTER the base CREATE TABLE statements above so `ALTER TABLE` targets exist
// on a fresh install (previously these ran first and silently no-op'd via the empty
// catch blocks, leaving auth/role/suspension columns missing on new databases).
try {
  // SQLite's ADD COLUMN can't carry a UNIQUE constraint directly, so add the
  // column plain and enforce uniqueness with a separate index (NULLs from
  // pre-existing rows don't collide under a standard unique index).
  db.exec("ALTER TABLE users ADD COLUMN email TEXT");
} catch (e) {}
try {
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)");
} catch (e) {}

// Reset tokens are stored hashed; this also drops the old plain-text table.
ensurePasswordResetSchema(db);

try {
  db.exec("ALTER TABLE users ADD COLUMN is_mentor INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN hide_location INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN hide_history INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN is_suspended INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE threads ADD COLUMN is_flagged INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE replies ADD COLUMN is_flagged INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE kites ADD COLUMN is_read INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE kites ADD COLUMN read_at DATETIME");
} catch (e) {}

try {
  db.exec("ALTER TABLE testimonials ADD COLUMN likes_count INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN public_status TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN interests TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN looking_to_meet INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN wellness_reminders INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN wellness_reminder_time TEXT DEFAULT '09:00'");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN age INTEGER");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN gender TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN pronouns TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN looking_for TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN relationship_status TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN incarceration_details TEXT");
} catch (e) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wellness_journals (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      content TEXT,
      prompt TEXT,
      stress_level INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);
} catch (e) {}

try {
  db.exec("ALTER TABLE mentorships ADD COLUMN is_anonymous INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE mentorships ADD COLUMN milestones_json TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE kites ADD COLUMN is_anonymous INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE testimonials ADD COLUMN title TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE testimonials ADD COLUMN category TEXT DEFAULT 'general'");
} catch (e) {}

try {
  db.exec("ALTER TABLE testimonials ADD COLUMN advice TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE testimonials ADD COLUMN time_served TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE testimonials ADD COLUMN years_free TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE testimonials ADD COLUMN tags TEXT");
} catch (e) {}

function seedCommunityData() {
  try {
    const userCount = db.prepare("SELECT count(*) as count FROM users").get() as any;
    if (userCount && userCount.count >= 3) return;

    const seedUsers = [
      {
        id: "seed-user-marcus",
        username: "Marcus Vance",
        email: "marcus.vance@yardreentry.org",
        password: "password123",
        facility: "San Quentin State Prison",
        location: "Denver, CO",
        bio: "Lead Software Engineer at logistics tech firm. Served 12 years inside. Homeowner, mentor, and passionate about helping alumni land felony-friendly tech careers.",
        public_status: "Available for code reviews and tech interview prep this weekend!",
        interests: "Tech & Coding, Resume & Interview Prep, Small Business & Entrepreneurship, Second-Chance Banking & Credit",
        is_mentor: 1,
        looking_to_meet: 1,
        survey: {
          role_preference: 'mentor',
          interests: ['Tech & Coding', 'Resume & Interview Prep', 'Small Business & Entrepreneurship', 'Second-Chance Banking & Credit'],
          life_goals: ['Land a Felony-Friendly Career or Trade Apprenticeship', 'Launch Small Business / LLC', 'Achieve Financial Independence & 700+ Credit', 'Uplift Others & Guide Brothers/Sisters Coming Home'],
          cadence: 'weekly',
          communication_style: 'all',
          experience_level: 'veteran_alumni',
          personal_statement: 'Happy to review code, mock interview, and help you land that first tech or corporate role. Consistency wins.',
          availability_status: 'actively_seeking'
        }
      },
      {
        id: "seed-user-elena",
        username: "Elena Morales",
        email: "elena.morales@yardreentry.org",
        password: "password123",
        facility: "CIW Chino",
        location: "Denver, CO",
        bio: "Paralegal and re-entry legal advocate. Served 6 years. Passionate about parole rights, clean lease agreements, and helping women transition smoothly post-release.",
        public_status: "Holding weekly legal rights & parole check-in Q&A on Tuesdays.",
        interests: "Legal & Parole Compliance, Affordable Housing Navigation, Family Reconnection & Parenting, Second-Chance Banking & Credit",
        is_mentor: 1,
        looking_to_meet: 1,
        survey: {
          role_preference: 'mentor',
          interests: ['Legal & Parole Compliance', 'Affordable Housing Navigation', 'Family Reconnection & Parenting', 'Second-Chance Banking & Credit'],
          life_goals: ['Successfully Terminate Parole / Get Off Paper', 'Secure Permanent Independent Housing', 'Rebuild Family Trust & Parental Rights', 'Uplift Others & Guide Brothers/Sisters Coming Home'],
          cadence: 'biweekly',
          communication_style: 'text_kites',
          experience_level: 'veteran_alumni',
          personal_statement: 'No one should navigate parole stipulations or lease applications alone. Here to share what worked for me.',
          availability_status: 'actively_seeking'
        }
      },
      {
        id: "seed-user-david",
        username: "David Chen",
        email: "david.chen@yardreentry.org",
        password: "password123",
        facility: "Sing Sing Correctional Facility",
        location: "Aurora, CO",
        bio: "General Contractor & Founder of Chen & Sons Contracting. 3 years off paper. Built a 7-person crew hiring formerly incarcerated craftsmen.",
        public_status: "Looking for apprentices eager to learn carpentry and electrical trades.",
        interests: "Construction & Carpentry, Automotive & Welding, Small Business & Entrepreneurship, Commercial Driving (CDL)",
        is_mentor: 1,
        looking_to_meet: 1,
        survey: {
          role_preference: 'mentor',
          interests: ['Construction & Carpentry', 'Automotive & Welding', 'Small Business & Entrepreneurship', 'Commercial Driving (CDL)'],
          life_goals: ['Launch Small Business / LLC', 'Achieve Financial Independence & 700+ Credit', 'Maintain Ongoing Sobriety & Emotional Health', 'Uplift Others & Guide Brothers/Sisters Coming Home'],
          cadence: 'weekly',
          communication_style: 'video_calls',
          experience_level: 'established',
          personal_statement: 'Get your contractor tools and learn the trade. Blue-collar trades are completely felony-blind once you have real skills.',
          availability_status: 'actively_seeking'
        }
      },
      {
        id: "seed-user-trevor",
        username: "Trevor 'TJ' Jenkins",
        email: "trevor.jenkins@yardreentry.org",
        password: "password123",
        facility: "San Quentin State Prison",
        location: "Denver, CO",
        bio: "Released 4 months ago. Apprentice carpenter and learning full-stack web development. Working on getting off paper and finding long-term housing.",
        public_status: "Looking for a mentor in tech or construction to stay on track.",
        interests: "Tech & Coding, Construction & Carpentry, Affordable Housing Navigation, Fitness & Strength Training",
        is_mentor: 0,
        looking_to_meet: 1,
        survey: {
          role_preference: 'mentee',
          interests: ['Tech & Coding', 'Construction & Carpentry', 'Affordable Housing Navigation', 'Fitness & Strength Training'],
          life_goals: ['Successfully Terminate Parole / Get Off Paper', 'Secure Permanent Independent Housing', 'Land a Felony-Friendly Career or Trade Apprenticeship', 'Achieve Financial Independence & 700+ Credit'],
          cadence: 'weekly',
          communication_style: 'all',
          experience_level: 'early_reentry',
          personal_statement: 'Eager to learn from alumni who made it through early parole without slipping up.',
          availability_status: 'actively_seeking'
        }
      },
      {
        id: "seed-user-maya",
        username: "Maya Lin",
        email: "maya.lin@yardreentry.org",
        password: "password123",
        facility: "Central California Women's Facility",
        location: "Denver, CO",
        bio: "Recently released, studying for CompTIA A+ and JavaScript. Seeking an experienced mentor in software or tech sales to guide my career pivot.",
        public_status: "Coding 4 hours every morning. Seeking accountability partner!",
        interests: "Tech & Coding, Resume & Interview Prep, Sobriety & Recovery, Second-Chance Banking & Credit",
        is_mentor: 0,
        looking_to_meet: 1,
        survey: {
          role_preference: 'mentee',
          interests: ['Tech & Coding', 'Resume & Interview Prep', 'Sobriety & Recovery', 'Second-Chance Banking & Credit'],
          life_goals: ['Land a Felony-Friendly Career or Trade Apprenticeship', 'Maintain Ongoing Sobriety & Emotional Health', 'Successfully Terminate Parole / Get Off Paper', 'Secure Permanent Independent Housing'],
          cadence: 'weekly',
          communication_style: 'text_kites',
          experience_level: 'early_reentry',
          personal_statement: 'Looking for a sister or brother in tech to help me keep my head down and code every day.',
          availability_status: 'actively_seeking'
        }
      },
      {
        id: "seed-user-carlos",
        username: "Carlos Ramirez",
        email: "carlos.ramirez@yardreentry.org",
        password: "password123",
        facility: "Federal Correctional Bastrop",
        location: "Lakewood, CO",
        bio: "Enrolled in commercial driver school (CDL-A). Looking for mentors in logistics, small fleet ownership, and financial budgeting.",
        public_status: "Taking CDL exam next month! Open to connecting with owner-operators.",
        interests: "Commercial Driving (CDL), Small Business & Entrepreneurship, Second-Chance Banking & Credit, Sobriety & Recovery",
        is_mentor: 0,
        looking_to_meet: 1,
        survey: {
          role_preference: 'mentee',
          interests: ['Commercial Driving (CDL)', 'Small Business & Entrepreneurship', 'Second-Chance Banking & Credit', 'Sobriety & Recovery'],
          life_goals: ['Land a Felony-Friendly Career or Trade Apprenticeship', 'Launch Small Business / LLC', 'Achieve Financial Independence & 700+ Credit', 'Successfully Terminate Parole / Get Off Paper'],
          cadence: 'biweekly',
          communication_style: 'all',
          experience_level: 'early_reentry',
          personal_statement: 'Targeting my CDL by June. Want to learn from folks running their own trucks.',
          availability_status: 'actively_seeking'
        }
      }
    ];

    for (const u of seedUsers) {
      db.prepare(`
        INSERT OR IGNORE INTO users 
        (id, username, email, password, facility, location, bio, public_status, interests, is_mentor, looking_to_meet)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        u.id, u.username, u.email, hashPasswordSync(u.password), u.facility, u.location, u.bio,
        u.public_status, u.interests, u.is_mentor, u.looking_to_meet
      );

      db.prepare(`
        INSERT OR REPLACE INTO mentorship_surveys
        (id, user_id, role_preference, interests, life_goals, cadence, communication_style, experience_level, personal_statement, availability_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(), u.id, u.survey.role_preference,
        JSON.stringify(u.survey.interests), JSON.stringify(u.survey.life_goals),
        u.survey.cadence, u.survey.communication_style, u.survey.experience_level,
        u.survey.personal_statement, u.survey.availability_status
      );
    }
  } catch (err) {
    console.error("Error seeding community members:", err);
  }
}

async function startServer() {
  seedCommunityData();

  // Accounts created before passwords were hashed still hold plain text.
  // Hash them in the background; login also upgrades any it meets first.
  migratePlainTextPasswords(db)
    .then((count) => {
      if (count > 0) console.log(`Hashed ${count} plain-text password(s).`);
    })
    .catch((err) => console.error("Password migration failed:", err));

  const app = express();
  const PORT = 3000;

  // Behind a proxy (Cloud Run, Vercel, Render...) set TRUST_PROXY=1 so req.ip is
  // each visitor's address and the reset limits below count people separately.
  const trustProxy = process.env.TRUST_PROXY?.trim();
  if (trustProxy) app.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
  const clientKey = (req: express.Request) => req.ip || req.socket.remoteAddress || "unknown";

  // Password reset limits (in memory, per server process).
  const resetRequestsByIp = new FixedWindowLimiter(10, 15 * 60 * 1000);
  const resetRequestsByEmail = new FixedWindowLimiter(3, 60 * 60 * 1000);
  const resetAttemptsByIp = new FixedWindowLimiter(20, 15 * 60 * 1000);

  const missingEmail = missingEmailSettings();
  if (missingEmail.length > 0) {
    console.warn(`Password reset emails are off until these are set: ${missingEmail.join(", ")}.`);
  }

  app.use(express.json({ limit: '50mb' }));

  // Auth Middleware
  const requireAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token" });
    const token = authHeader.split(" ")[1];
    const session = db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(token) as any;
    if (!session) return res.status(401).json({ error: "Invalid token" });
    
    const user = db.prepare("SELECT is_suspended FROM users WHERE id = ?").get(session.user_id) as any;
    if (user && user.is_suspended === 1) {
      return res.status(403).json({ error: "Account suspended" });
    }
    
    req.userId = session.user_id;
    next();
  };

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { username, email, password, facility, location, bio } = req.body;
    if (!isUsablePassword(password)) {
      return res.status(400).json({ error: "Password is required" });
    }
    try {
      const id = crypto.randomUUID();
      const passwordHash = await hashPassword(password);
      db.prepare("INSERT INTO users (id, username, email, password, facility, location, bio) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, username, email, passwordHash, facility, location, bio);
      const token = crypto.randomUUID();
      db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, id);
      res.json({ token, user: { id, username, email, facility, location, bio } });
    } catch (e) {
      res.status(400).json({ error: "Username or email taken, or invalid data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
      const check = await verifyPassword(password, user?.password);
      if (!user || !check.ok) return res.status(401).json({ error: "Invalid credentials" });
      if (user.is_suspended === 1) return res.status(403).json({ error: "Account suspended" });

      if (check.needsRehash) {
        // Upgrade a legacy plain-text (or weaker) password now that we know it.
        db.prepare("UPDATE users SET password = ? WHERE id = ? AND password = ?").run(await hashPassword(password), user.id, user.password);
      }

      const token = crypto.randomUUID();
      db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, user.id);
      res.json({ token, user: { id: user.id, username: user.username, email: user.email, facility: user.facility, location: user.location, bio: user.bio, role: user.role === 'user' && user.is_admin === 1 ? 'super_admin' : user.role, avatar_url: user.avatar_url } });
    } catch (e) {
      console.error("Login error:", e);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, (req: any, res) => {
    const user = db.prepare("SELECT id, username, email, facility, location, bio, is_admin, role, avatar_url FROM users WHERE id = ?").get(req.userId) as any;
    if (user) {
      user.role = user.role === 'user' && user.is_admin === 1 ? 'super_admin' : user.role;
    }
    res.json({ user });
  });

  app.post("/api/auth/logout", requireAuth, (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    res.json({ success: true });
  });

  app.post("/api/auth/forgot-password", (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ error: "Enter the email address on your account" });
    }
    if (!resetRequestsByIp.take(clientKey(req))) {
      return res.status(429).json({ error: "Too many reset requests. Try again in a few minutes." });
    }

    // Reply first, and the same way every time, so neither the answer nor how
    // long it takes shows whether the email belongs to an account. The reset
    // link only ever goes to the account's own email address.
    res.json({ success: true, message: RESET_REQUESTED_MESSAGE });

    if (!resetRequestsByEmail.take(email.toLowerCase())) return;
    setImmediate(() => {
      requestPasswordReset(db, email, { appUrl: process.env.APP_URL, send: (message) => sendPasswordResetEmail(message) })
        .then((outcome) => {
          if (outcome.status === "sent") console.log(`Password reset email sent for user ${outcome.userId}.`);
          if (outcome.status === "not_sent") console.error(`Password reset email not sent for user ${outcome.userId}: ${outcome.reason}`);
        })
        .catch((err) => console.error("Password reset request failed:", err));
    });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    if (!resetAttemptsByIp.take(clientKey(req))) {
      return res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
    }
    const { token, newPassword } = req.body ?? {};
    try {
      const outcome = await resetPasswordWithToken(db, token, newPassword);
      if (outcome.ok) return res.json({ success: true });
      if (outcome.reason === "password_required") return res.status(400).json({ error: "New password is required" });
      return res.status(400).json({ error: INVALID_RESET_LINK_MESSAGE });
    } catch (e) {
      console.error("Password reset error:", e);
      return res.status(500).json({ error: "Password reset failed" });
    }
  });

  // Data Routes
  app.get("/api/users", requireAuth, (req: any, res) => {
    const users = db.prepare("SELECT id, username as name, facility as history, location, bio, is_mentor, hide_location, hide_history, is_admin, role, avatar_url, public_status, interests, looking_to_meet, age, gender, pronouns, looking_for, relationship_status, incarceration_details FROM users WHERE id != ?").all(req.userId);
    // Filter out hidden fields
    const sanitizedUsers = users.map((u: any) => ({
      id: u.id,
      name: u.name,
      bio: u.bio,
      is_mentor: u.is_mentor,
      is_admin: u.is_admin,
      role: u.role === 'user' && u.is_admin === 1 ? 'super_admin' : u.role,
      history: u.hide_history ? "Hidden" : u.history,
      location: u.hide_location ? "Hidden" : u.location,
      avatar_url: u.avatar_url,
      public_status: u.public_status || "",
      interests: u.interests || "",
      looking_to_meet: u.looking_to_meet === 1,
      age: u.age,
      gender: u.gender || "",
      pronouns: u.pronouns || "",
      looking_for: u.looking_for || "",
      relationship_status: u.relationship_status || "",
      incarceration_details: u.incarceration_details || ""
    }));
    res.json(sanitizedUsers);
  });

  app.get("/api/users/profile", requireAuth, (req: any, res) => {
    const user = db.prepare("SELECT id, username as name, facility as history, location, bio, is_mentor, hide_location, hide_history, is_admin, role, avatar_url, public_status, interests, looking_to_meet, wellness_reminders, wellness_reminder_time, age, gender, pronouns, looking_for, relationship_status, incarceration_details FROM users WHERE id = ?").get(req.userId);
    if (user) {
      (user as any).role = (user as any).role === 'user' && (user as any).is_admin === 1 ? 'super_admin' : (user as any).role;
      (user as any).looking_to_meet = (user as any).looking_to_meet === 1;
      (user as any).wellness_reminders = (user as any).wellness_reminders === 1;
    }
    res.json(user);
  });

  app.put("/api/users/profile", requireAuth, (req: any, res) => {
    const { history, location, bio, hide_location, hide_history, avatar_url, public_status, interests, looking_to_meet, wellness_reminders, wellness_reminder_time, age, gender, pronouns, looking_for, relationship_status, incarceration_details } = req.body;
    
    // Read previous row to preserve unchanged optional fields
    const existing = db.prepare("SELECT avatar_url, public_status, interests, looking_to_meet, wellness_reminders, wellness_reminder_time, age, gender, pronouns, looking_for, relationship_status, incarceration_details FROM users WHERE id = ?").get(req.userId) as any;
    
    const final_avatar = avatar_url !== undefined ? avatar_url : (existing ? existing.avatar_url : null);
    const final_status = public_status !== undefined ? public_status : (existing ? existing.public_status : null);
    const final_interests = interests !== undefined ? interests : (existing ? existing.interests : null);
    const final_looking = looking_to_meet !== undefined ? (looking_to_meet ? 1 : 0) : (existing ? existing.looking_to_meet : 0);
    const final_wellness_reminders = wellness_reminders !== undefined ? (wellness_reminders ? 1 : 0) : (existing ? existing.wellness_reminders : 0);
    const final_wellness_reminder_time = wellness_reminder_time !== undefined ? wellness_reminder_time : (existing ? existing.wellness_reminder_time : '09:00');
    const final_age = age !== undefined ? age : (existing ? existing.age : null);
    const final_gender = gender !== undefined ? gender : (existing ? existing.gender : null);
    const final_pronouns = pronouns !== undefined ? pronouns : (existing ? existing.pronouns : null);
    const final_looking_for = looking_for !== undefined ? looking_for : (existing ? existing.looking_for : null);
    const final_relationship_status = relationship_status !== undefined ? relationship_status : (existing ? existing.relationship_status : null);
    const final_incarceration_details = incarceration_details !== undefined ? incarceration_details : (existing ? existing.incarceration_details : null);

    db.prepare("UPDATE users SET facility = ?, location = ?, bio = ?, hide_location = ?, hide_history = ?, avatar_url = ?, public_status = ?, interests = ?, looking_to_meet = ?, wellness_reminders = ?, wellness_reminder_time = ?, age = ?, gender = ?, pronouns = ?, looking_for = ?, relationship_status = ?, incarceration_details = ? WHERE id = ?").run(
      history, location, bio, hide_location ? 1 : 0, hide_history ? 1 : 0, final_avatar, final_status, final_interests, final_looking, final_wellness_reminders, final_wellness_reminder_time, final_age, final_gender, final_pronouns, final_looking_for, final_relationship_status, final_incarceration_details, req.userId
    );
    res.json({ success: true });
  });

  // Connections routes
  app.get("/api/connections", requireAuth, (req: any, res) => {
    try {
      const connections = db.prepare("SELECT receiver_id FROM connections WHERE requester_id = ?").all(req.userId) as { receiver_id: string }[];
      res.json(connections.map(c => c.receiver_id));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/connections", requireAuth, (req: any, res) => {
    const { receiverId } = req.body;
    if (!receiverId) {
      return res.status(400).json({ error: "receiverId is required" });
    }
    if (receiverId === req.userId) {
      return res.status(400).json({ error: "Cannot connect to yourself" });
    }
    try {
      const id = crypto.randomUUID();
      db.prepare("INSERT OR IGNORE INTO connections (id, requester_id, receiver_id) VALUES (?, ?, ?)").run(id, req.userId, receiverId);
      
      // Send notification to receiver
      const sender = db.prepare("SELECT username FROM users WHERE id = ?").get(req.userId) as { username: string } | undefined;
      const notificationId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, content, link, is_read)
        VALUES (?, ?, ?, ?, ?, 0)
      `).run(
        notificationId,
        receiverId,
        'connection',
        `${sender?.username || 'Someone'} connected with you in The Yard.`,
        'yard'
      );

      res.json({ success: true, connected: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/connections/:receiverId", requireAuth, (req: any, res) => {
    const { receiverId } = req.params;
    try {
      db.prepare("DELETE FROM connections WHERE requester_id = ? AND receiver_id = ?").run(req.userId, receiverId);
      res.json({ success: true, connected: false });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Jobs Routes
  app.get("/api/jobs", requireAuth, (req: any, res) => {
    const jobs = db.prepare("SELECT * FROM jobs ORDER BY created_at DESC").all();
    res.json(jobs);
  });

  app.get("/api/job-applications", requireAuth, (req: any, res) => {
    const apps = db.prepare("SELECT * FROM job_applications WHERE user_id = ? ORDER BY created_at DESC").all(req.userId);
    res.json(apps);
  });

  app.post("/api/job-applications", requireAuth, (req: any, res) => {
    const { company, position, date_applied, status, notes } = req.body;
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO job_applications (id, user_id, company, position, date_applied, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      id, req.userId, company, position, date_applied, status || 'applied', notes
    );
    res.json({ success: true, id });
  });

  app.put("/api/job-applications/:id", requireAuth, (req: any, res) => {
    const { company, position, date_applied, status, notes } = req.body;
    db.prepare("UPDATE job_applications SET company = ?, position = ?, date_applied = ?, status = ?, notes = ? WHERE id = ? AND user_id = ?").run(
      company, position, date_applied, status, notes, req.params.id, req.userId
    );
    res.json({ success: true });
  });

  app.delete("/api/job-applications/:id", requireAuth, (req: any, res) => {
    db.prepare("DELETE FROM job_applications WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
    res.json({ success: true });
  });

  app.get("/api/legal-cases", requireAuth, (req: any, res) => {
    const cases = db.prepare("SELECT * FROM legal_cases WHERE user_id = ? ORDER BY created_at DESC").all(req.userId);
    res.json(cases);
  });

  app.post("/api/legal-cases", requireAuth, (req: any, res) => {
    const { case_number, court, status, next_hearing_date, notes } = req.body;
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO legal_cases (id, user_id, case_number, court, status, next_hearing_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      id, req.userId, case_number, court, status, next_hearing_date, notes
    );
    res.json({ success: true, id });
  });

  app.put("/api/legal-cases/:id", requireAuth, (req: any, res) => {
    const { case_number, court, status, next_hearing_date, notes } = req.body;
    db.prepare("UPDATE legal_cases SET case_number = ?, court = ?, status = ?, next_hearing_date = ?, notes = ? WHERE id = ? AND user_id = ?").run(
      case_number, court, status, next_hearing_date, notes, req.params.id, req.userId
    );
    res.json({ success: true });
  });

  app.delete("/api/legal-cases/:id", requireAuth, (req: any, res) => {
    db.prepare("DELETE FROM legal_cases WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
    res.json({ success: true });
  });

  app.post("/api/jobs", requireAuth, (req: any, res) => {
    const { title, company, location, description, is_felony_friendly } = req.body;
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO jobs (id, title, company, location, description, is_felony_friendly, posted_by) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      id, title, company, location, description, is_felony_friendly ? 1 : 0, req.userId
    );
    res.json({ success: true, id });
  });

  // Housing Routes
  app.get("/api/housing", requireAuth, (req: any, res) => {
    const housing = db.prepare("SELECT * FROM housing ORDER BY created_at DESC").all();
    res.json(housing);
  });

  app.post("/api/housing", requireAuth, (req: any, res) => {
    const { name, type, location, contact_info, description } = req.body;
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO housing (id, name, type, location, contact_info, description, posted_by) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      id, name, type, location, contact_info, description, req.userId
    );
    res.json({ success: true, id });
  });

  // Testimonials & Success Stories Routes
  app.get("/api/testimonials", (req, res) => {
    try {
      let rows = db.prepare("SELECT * FROM testimonials ORDER BY created_at DESC").all() as any[];
      if (rows.length === 0) {
        // Seed default inspiring testimonials
        const seeds = [
          {
            id: crypto.randomUUID(),
            user_id: null,
            author_name: "Marcus Vance",
            title: "From 12 Years Inside to Lead Software Engineer & Homeowner",
            content: "After serving 12 years in state custody, walking out the gate with $40 in gate money was terrifying. The Yard connected me to an alumni developer who taught me Git and JavaScript late nights while I worked warehouse day shifts. 4 years later, I am a lead engineer at a logistics firm and just closed on my first townhouse. Re-entry is steep, but with real brothers behind you, nobody has to walk it alone.",
            role: "Lead Software Engineer",
            category: "career",
            advice: "Never conceal your past during interviews—own your story with calm confidence, show present mastery, and let your consistency do the talking.",
            time_served: "12 years",
            years_free: "4 years free",
            tags: "Software Engineering, Coding Mentor, Homeowner",
            avatar_url: null,
            likes_count: 28,
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: crypto.randomUUID(),
            user_id: null,
            author_name: "David Chen",
            title: "Rebuilding After Release: From Day-Labor to a 6-Figure Contracting Company",
            content: "Connecting with an accountability partner and using the legal tools here kept me grounded. The Legal Tools tab helped me understand my rights, and my mentor held me accountable every Sunday. Today, Chen & Sons Contracting employs 7 formerly incarcerated craftsmen. Now celebrating 3 years off paper and giving back daily.",
            role: "General Contractor & Founder",
            category: "entrepreneurship",
            advice: "Compliance today buys absolute freedom tomorrow. Keep every PO slip, pass every UA, and invest your pay into your own trade tools.",
            time_served: "7 years",
            years_free: "3 years free",
            tags: "General Contractor, Employer, Off Paper",
            avatar_url: null,
            likes_count: 34,
            created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: crypto.randomUUID(),
            user_id: null,
            author_name: "Carlos Mendez",
            title: "Securing Stable Housing in Week 2 and Becoming a Lead Peer Navigator",
            content: "Finding felony-friendly housing was my biggest fear. Through the housing directory here, I landed clean transitional housing in Denver within 10 days of release. Having a secure door to lock at night changed my mental health completely. Now I work full-time as a lead peer navigator, helping brothers stepping off the bus find their footing.",
            role: "Lead Peer Navigator",
            category: "housing",
            advice: "Show up in person with your binder ready—ID, social security card, certificates, and recommendation letters. Preparation beats stigma every time.",
            time_served: "5 years",
            years_free: "2 years free",
            tags: "Transitional Housing, Peer Navigator, Denver",
            avatar_url: null,
            likes_count: 19,
            created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: crypto.randomUUID(),
            user_id: null,
            author_name: "Maya Robinson",
            title: "Rebuilding Trust with My Children & Completing My Master's in Social Work",
            content: "Being separated from my two daughters was the heaviest sentence. Upon release, I took it one afternoon at a time—no expectations, just consistent presence and showing up for homework. I utilized education grants, stayed focused on campus, and graduated last spring with honors. Today I advocate for family reunification policies.",
            role: "MSW Graduate & Family Advocate",
            category: "family",
            advice: "Patience with your loved ones is vital. You cannot erase lost years overnight, but genuine humility and steady actions rebuild broken bonds.",
            time_served: "6 years",
            years_free: "3 years free",
            tags: "Family Reunification, MSW Graduate, Education Grants",
            avatar_url: null,
            likes_count: 42,
            created_at: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: crypto.randomUUID(),
            user_id: null,
            author_name: "Terrell 'T-Bone' Washington",
            title: "Discharged from 10-Year Parole: The True Meaning of Being 'Off Paper'",
            content: "After serving 15 inside and 10 on parole supervision, signing my final discharge certificate last month felt like exhaling for the first time in 25 years. I remember when getting a library card felt impossible. Now I have my CDL Class A, drive regional routes, and run weekend youth basketball clinics in Aurora.",
            role: "CDL Class A Driver & Youth Coach",
            category: "off_paper",
            advice: "Never miss a curfew or check-in. The best revenge against the system is to give them zero reason to revoke you until you hold that final discharge in your hands.",
            time_served: "15 years",
            years_free: "10 years home · Off Paper",
            tags: "CDL Class A, Full Discharge, Community Coach",
            avatar_url: null,
            likes_count: 56,
            created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
        for (const seed of seeds) {
          db.prepare("INSERT INTO testimonials (id, user_id, author_name, title, content, role, category, advice, time_served, years_free, tags, avatar_url, likes_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
            seed.id, seed.user_id, seed.author_name, seed.title, seed.content, seed.role, seed.category, seed.advice, seed.time_served, seed.years_free, seed.tags, seed.avatar_url, seed.likes_count, seed.created_at
          );
        }

        // Seed default comments
        const defaultComments = [
          {
            id: crypto.randomUUID(),
            testimonial_name: "Marcus Vance",
            author_name: "Tyrone J.",
            content: "This is so inspiring, Marcus! Hard work pays off. Truly proud of you.",
            created_offset: 1 * 60 * 60 * 1000 // 1 hour after
          },
          {
            id: crypto.randomUUID(),
            testimonial_name: "Marcus Vance",
            author_name: "Aisha Blake",
            content: "Incredible transition. Thanks for showing what is possible.",
            created_offset: 2 * 60 * 60 * 1000
          },
          {
            id: crypto.randomUUID(),
            testimonial_name: "David Chen",
            author_name: "Sarah Miller",
            content: "Congratulations on the contracting business! We need more felony-friendly employers.",
            created_offset: 4 * 60 * 60 * 1000
          },
          {
            id: crypto.randomUUID(),
            testimonial_name: "Carlos Mendez",
            author_name: "Derrick Lane",
            content: "Having people like you who understand the struggle as a guide is a game-changer. Keep shining, Carlos!",
            created_offset: 5 * 60 * 60 * 1000
          },
          {
            id: crypto.randomUUID(),
            testimonial_name: "Maya Robinson",
            author_name: "Elena Rostova",
            content: "Brought tears to my eyes. As a mother fighting for custody post-release, this gives me immense strength.",
            created_offset: 8 * 60 * 60 * 1000
          },
          {
            id: crypto.randomUUID(),
            testimonial_name: "Terrell 'T-Bone' Washington",
            author_name: "Marcus Vance",
            content: "Massive salute OG T-Bone! 10 years on paper is a marathon. Enjoy your freedom!",
            created_offset: 12 * 60 * 60 * 1000
          }
        ];
        
        for (const dc of defaultComments) {
          const t = seeds.find(s => s.author_name === dc.testimonial_name);
          if (t) {
            const commentTime = new Date(new Date(t.created_at).getTime() + dc.created_offset).toISOString();
            db.prepare("INSERT INTO testimonial_comments (id, testimonial_id, user_id, author_name, content, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
              dc.id, t.id, null, dc.author_name, dc.content, null, commentTime
            );
          }
        }

        rows = db.prepare("SELECT * FROM testimonials ORDER BY created_at DESC").all() as any[];
      } else {
        // Backfill any missing title/category/advice on existing seed records
        try {
          db.prepare("UPDATE testimonials SET title = 'From 12 Years Inside to Lead Software Engineer & Homeowner', category = 'career', advice = 'Never conceal your past during interviews—own your story with calm confidence, show present mastery, and let your consistency do the talking.', time_served = '12 years', years_free = '4 years free', tags = 'Software Engineering, Coding Mentor, Homeowner' WHERE author_name = 'Marcus Vance' AND (title IS NULL OR title = '')").run();
          db.prepare("UPDATE testimonials SET title = 'Rebuilding After Release: From Day-Labor to a 6-Figure Contracting Company', category = 'entrepreneurship', advice = 'Compliance today buys absolute freedom tomorrow. Keep every PO slip, pass every UA, and invest your pay into your own trade tools.', time_served = '7 years', years_free = '3 years free', tags = 'General Contractor, Employer, Off Paper' WHERE author_name = 'David Chen' AND (title IS NULL OR title = '')").run();
          db.prepare("UPDATE testimonials SET title = 'Securing Stable Housing in Week 2 and Becoming a Lead Peer Navigator', category = 'housing', advice = 'Show up in person with your binder ready—ID, social security card, certificates, and recommendation letters. Preparation beats stigma every time.', time_served = '5 years', years_free = '2 years free', tags = 'Transitional Housing, Peer Navigator, Denver' WHERE author_name = 'Carlos Mendez' AND (title IS NULL OR title = '')").run();
          
          // Check if Maya and Terrell seeds need insertion
          const hasMaya = db.prepare("SELECT id FROM testimonials WHERE author_name = 'Maya Robinson'").get();
          if (!hasMaya) {
            db.prepare("INSERT INTO testimonials (id, user_id, author_name, title, content, role, category, advice, time_served, years_free, tags, avatar_url, likes_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
              crypto.randomUUID(), null, "Maya Robinson", "Rebuilding Trust with My Children & Completing My Master's in Social Work", "Being separated from my two daughters was the heaviest sentence. Upon release, I took it one afternoon at a time—no expectations, just consistent presence and showing up for homework. I utilized education grants, stayed focused on campus, and graduated last spring with honors. Today I advocate for family reunification policies.", "MSW Graduate & Family Advocate", "family", "Patience with your loved ones is vital. You cannot erase lost years overnight, but genuine humility and steady actions rebuild broken bonds.", "6 years", "3 years free", "Family Reunification, MSW Graduate, Education Grants", null, 42, new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString()
            );
          }
          const hasTerrell = db.prepare("SELECT id FROM testimonials WHERE author_name LIKE '%Washington%'").get();
          if (!hasTerrell) {
            db.prepare("INSERT INTO testimonials (id, user_id, author_name, title, content, role, category, advice, time_served, years_free, tags, avatar_url, likes_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
              crypto.randomUUID(), null, "Terrell 'T-Bone' Washington", "Discharged from 10-Year Parole: The True Meaning of Being 'Off Paper'", "After serving 15 inside and 10 on parole supervision, signing my final discharge certificate last month felt like exhaling for the first time in 25 years. I remember when getting a library card felt impossible. Now I have my CDL Class A, drive regional routes, and run weekend youth basketball clinics in Aurora.", "CDL Class A Driver & Youth Coach", "off_paper", "Never miss a curfew or check-in. The best revenge against the system is to give them zero reason to revoke you until you hold that final discharge in your hands.", "15 years", "10 years home · Off Paper", "CDL Class A, Full Discharge, Community Coach", null, 56, new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
            );
          }
          rows = db.prepare("SELECT * FROM testimonials ORDER BY created_at DESC").all() as any[];
        } catch (e) {}
      }

      // Fetch and attach comments for each success story
      const withComments = rows.map(row => {
        const comments = db.prepare("SELECT * FROM testimonial_comments WHERE testimonial_id = ? ORDER BY created_at ASC").all(row.id);
        return {
          ...row,
          comments: comments || []
        };
      });

      res.json(withComments);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/testimonials", requireAuth, (req: any, res) => {
    const { author_name, title, content, role, category, advice, time_served, years_free, tags } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Story narrative content is required" });
    }
    try {
      const userObj = db.prepare("SELECT username, avatar_url FROM users WHERE id = ?").get(req.userId) as any;
      const name = author_name || (userObj ? userObj.username : "Anonymous Member");
      const avatar = userObj ? userObj.avatar_url : null;
      const cleanRole = role || "Re-entry Alumnus";
      const cleanTitle = title || "My Journey Forward";
      const cleanCategory = category || "general";
      const cleanAdvice = advice || null;
      const cleanTimeServed = time_served || null;
      const cleanYearsFree = years_free || null;
      const cleanTags = tags || null;

      const id = crypto.randomUUID();
      db.prepare("INSERT INTO testimonials (id, user_id, author_name, title, content, role, category, advice, time_served, years_free, tags, avatar_url, likes_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)").run(
        id, req.userId, name, cleanTitle, content, cleanRole, cleanCategory, cleanAdvice, cleanTimeServed, cleanYearsFree, cleanTags, avatar
      );
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/testimonials/:id", requireAuth, (req: any, res) => {
    try {
      const { id } = req.params;
      const testimonial = db.prepare("SELECT id, user_id FROM testimonials WHERE id = ?").get(id) as any;
      if (!testimonial) {
        return res.status(404).json({ error: "Story not found" });
      }

      const user = db.prepare("SELECT role, is_admin FROM users WHERE id = ?").get(req.userId) as any;
      const isAdminOrMod = user && (user.is_admin === 1 || ['admin', 'moderator', 'super_admin'].includes(user.role));
      const isAuthor = testimonial.user_id === req.userId;

      if (!isAuthor && !isAdminOrMod) {
        return res.status(403).json({ error: "Not authorized to delete this story" });
      }

      db.prepare("DELETE FROM testimonial_comments WHERE testimonial_id = ?").run(id);
      db.prepare("DELETE FROM testimonials WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/testimonials/:id/like", requireAuth, (req: any, res) => {
    try {
      const { id } = req.params;
      const testimonial = db.prepare("SELECT id FROM testimonials WHERE id = ?").get(id);
      if (!testimonial) {
        return res.status(404).json({ error: "Success story not found" });
      }
      db.prepare("UPDATE testimonials SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = ?").run(id);
      const updated = db.prepare("SELECT COALESCE(likes_count, 0) as likes_count FROM testimonials WHERE id = ?").get(id) as any;
      res.json({ success: true, likes_count: updated.likes_count });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/testimonials/:id/comments", requireAuth, (req: any, res) => {
    try {
      const { id } = req.params;
      const { content, author_name } = req.body;
      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Comment content is required" });
      }
      const testimonial = db.prepare("SELECT id FROM testimonials WHERE id = ?").get(id);
      if (!testimonial) {
        return res.status(404).json({ error: "Success story not found" });
      }
      const userObj = db.prepare("SELECT username, avatar_url FROM users WHERE id = ?").get(req.userId) as any;
      const name = author_name || (userObj ? userObj.username : "Anonymous");
      const avatar = userObj ? userObj.avatar_url : null;

      const commentId = crypto.randomUUID();
      db.prepare("INSERT INTO testimonial_comments (id, testimonial_id, user_id, author_name, content, avatar_url) VALUES (?, ?, ?, ?, ?, ?)").run(
        commentId, id, req.userId, name, content, avatar
      );
      
      const comments = db.prepare("SELECT * FROM testimonial_comments WHERE testimonial_id = ? ORDER BY created_at ASC").all(id);
      res.json({ success: true, comments });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Documents Routes
  app.get("/api/documents", requireAuth, (req: any, res) => {
    const docs = db.prepare("SELECT id, title, category, file_name, file_type, created_at, LENGTH(file_data) as file_size FROM documents WHERE user_id = ? ORDER BY created_at DESC").all(req.userId);
    res.json(docs);
  });

  app.post("/api/documents", requireAuth, (req: any, res) => {
    const { title, category, file_name, file_type, file_data } = req.body;
    if (!title || !file_name || !file_data) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO documents (id, user_id, title, category, file_name, file_type, file_data) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      id, req.userId, title, category, file_name, file_type, file_data
    );
    res.json({ success: true, id });
  });

  app.get("/api/documents/:id/download", requireAuth, (req: any, res) => {
    const doc = db.prepare("SELECT file_name, file_type, file_data FROM documents WHERE id = ? AND user_id = ?").get(req.params.id, req.userId) as any;
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.json({ file_data: doc.file_data, file_name: doc.file_name, file_type: doc.file_type });
  });

  app.delete("/api/documents/:id", requireAuth, (req: any, res) => {
    db.prepare("DELETE FROM documents WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
    res.json({ success: true });
  });

  app.put("/api/documents/:id", requireAuth, (req: any, res) => {
    const { title, category } = req.body;
    db.prepare("UPDATE documents SET title = COALESCE(?, title), category = COALESCE(?, category) WHERE id = ? AND user_id = ?").run(
      title, category, req.params.id, req.userId
    );
    res.json({ success: true });
  });

  app.get("/api/avatar/:docId", (req: any, res) => {
    try {
      const doc = db.prepare("SELECT file_type, file_data FROM documents WHERE id = ?").get(req.params.docId) as any;
      if (!doc || !doc.file_data) {
        return res.status(404).send("Avatar not found");
      }
      let base64Data = doc.file_data;
      if (base64Data.includes(";base64,")) {
        base64Data = base64Data.split(";base64,")[1];
      }
      const buffer = Buffer.from(base64Data, "base64");
      res.setHeader("Content-Type", doc.file_type || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(buffer);
    } catch (err) {
      console.error("Error serving avatar:", err);
      res.status(500).send("Error rendering image");
    }
  });

  app.put("/api/users/mentor-status", requireAuth, (req: any, res) => {
    const { is_mentor } = req.body;
    db.prepare("UPDATE users SET is_mentor = ? WHERE id = ?").run(is_mentor ? 1 : 0, req.userId);
    res.json({ success: true });
  });

  // Mentorship Routes
  app.get("/api/mentors", requireAuth, (req: any, res) => {
    const mentors = db.prepare(`
      SELECT id, username as name, facility as history, location, bio 
      FROM users 
      WHERE is_mentor = 1 AND id != ?
    `).all(req.userId);
    res.json(mentors);
  });

  const getDefaultMentorshipMilestones = (precompletedCount = 2) => [
    {
      id: "ms-1",
      title: "Initial Orientation & 90-Day Re-Entry Roadmap",
      category: "reentry",
      completed: precompletedCount >= 1,
      completed_by: precompletedCount >= 1 ? "Mentor & Mentee" : undefined,
      completed_at: precompletedCount >= 1 ? new Date(Date.now() - 86400000 * 10).toISOString() : null,
      due_week: 1
    },
    {
      id: "ms-2",
      title: "Parole Check-In & RMOMS Compliance Schedule Review",
      category: "legal",
      completed: precompletedCount >= 2,
      completed_by: precompletedCount >= 2 ? "Mentor" : undefined,
      completed_at: precompletedCount >= 2 ? new Date(Date.now() - 86400000 * 6).toISOString() : null,
      due_week: 2
    },
    {
      id: "ms-3",
      title: "Fair-Chance Resume & Conviction Disclosure Prep",
      category: "career",
      completed: precompletedCount >= 3,
      completed_by: precompletedCount >= 3 ? "Mentee" : undefined,
      completed_at: precompletedCount >= 3 ? new Date(Date.now() - 86400000 * 3).toISOString() : null,
      due_week: 4
    },
    {
      id: "ms-4",
      title: "Mock Interview or Vocational Trade Assessment",
      category: "career",
      completed: false,
      due_week: 6
    },
    {
      id: "ms-5",
      title: "Independent Housing, Banking & Credit Checkpoint",
      category: "reentry",
      completed: false,
      due_week: 8
    },
    {
      id: "ms-6",
      title: "90-Day Milestone Graduation & Peer Leadership Check",
      category: "wellness",
      completed: false,
      due_week: 12
    }
  ];

  app.get("/api/mentorships", requireAuth, (req: any, res) => {
    let rows = db.prepare(`
      SELECT m.*, 
             u1.username as mentor_name, 
             CASE WHEN m.is_anonymous = 1 AND m.mentor_id = ? THEN 'Anonymous Mentee' ELSE u2.username END as mentee_name
      FROM mentorships m
      JOIN users u1 ON m.mentor_id = u1.id
      JOIN users u2 ON m.mentee_id = u2.id
      WHERE m.mentor_id = ? OR m.mentee_id = ?
      ORDER BY m.updated_at DESC
    `).all(req.userId, req.userId, req.userId) as any[];

    // Seed an initial active mentorship with shared milestones if the user has none yet
    if (rows.length === 0) {
      const sampleMentor = db.prepare("SELECT id, username FROM users WHERE is_mentor = 1 AND id != ? LIMIT 1").get(req.userId) as any;
      if (sampleMentor) {
        const seedId = crypto.randomUUID();
        const defaultMilestones = JSON.stringify(getDefaultMentorshipMilestones(3));
        db.prepare(
          "INSERT INTO mentorships (id, mentor_id, mentee_id, status, is_anonymous, milestones_json) VALUES (?, ?, ?, 'active', 0, ?)"
        ).run(seedId, sampleMentor.id, req.userId, defaultMilestones);

        rows = db.prepare(`
          SELECT m.*, 
                 u1.username as mentor_name, 
                 CASE WHEN m.is_anonymous = 1 AND m.mentor_id = ? THEN 'Anonymous Mentee' ELSE u2.username END as mentee_name
          FROM mentorships m
          JOIN users u1 ON m.mentor_id = u1.id
          JOIN users u2 ON m.mentee_id = u2.id
          WHERE m.mentor_id = ? OR m.mentee_id = ?
          ORDER BY m.updated_at DESC
        `).all(req.userId, req.userId, req.userId) as any[];
      }
    }

    const mentorships = rows.map(row => {
      let milestones = [];
      if (row.milestones_json) {
        try {
          milestones = JSON.parse(row.milestones_json);
        } catch (e) {
          milestones = getDefaultMentorshipMilestones(row.status === 'completed' ? 6 : 2);
        }
      } else {
        milestones = getDefaultMentorshipMilestones(row.status === 'completed' ? 6 : 2);
        try {
          db.prepare("UPDATE mentorships SET milestones_json = ? WHERE id = ?").run(JSON.stringify(milestones), row.id);
        } catch (e) {}
      }
      return {
        ...row,
        milestones
      };
    });

    res.json(mentorships);
  });

  app.post("/api/mentorships/request", requireAuth, (req: any, res) => {
    const { mentorId, message, isAnonymous, activateImmediately } = req.body;
    const isAnonVal = isAnonymous ? 1 : 0;
    const initialStatus = activateImmediately ? 'active' : 'pending';
    
    // Check if already requested
    const existing = db.prepare("SELECT id FROM mentorships WHERE mentor_id = ? AND mentee_id = ? AND status IN ('pending', 'active')").get(mentorId, req.userId);
    if (existing) {
      return res.status(400).json({ error: "Mentorship already requested or active" });
    }

    const id = crypto.randomUUID();
    const initialMilestones = JSON.stringify(getDefaultMentorshipMilestones(1));
    db.prepare("INSERT INTO mentorships (id, mentor_id, mentee_id, status, is_anonymous, milestones_json) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, mentorId, req.userId, initialStatus, isAnonVal, initialMilestones);
    
    const mentee = db.prepare("SELECT username FROM users WHERE id = ?").get(req.userId) as any;
    const notifId = crypto.randomUUID();
    const notifContent = isAnonymous 
      ? "An anonymous user has requested you as a mentor for advice." 
      : `${mentee.username} has requested you as a mentor.`;
    db.prepare("INSERT INTO notifications (id, user_id, type, content, link) VALUES (?, ?, ?, ?, ?)").run(
      notifId, mentorId, 'mentorship_request', notifContent, 'mentorship'
    );

    if (message && message.trim()) {
      const kiteId = crypto.randomUUID();
      db.prepare("INSERT INTO kites (id, sender_id, receiver_id, content, is_anonymous) VALUES (?, ?, ?, ?, ?)")
        .run(kiteId, req.userId, mentorId, message.trim(), isAnonVal);
      
      const kiteNotifId = crypto.randomUUID();
      const kiteNotifContent = isAnonymous 
        ? "New anonymous guidance/advice kite received." 
        : `New kite from ${mentee.username}`;
      db.prepare("INSERT INTO notifications (id, user_id, type, content, link) VALUES (?, ?, ?, ?, ?)").run(
        kiteNotifId, mentorId, 'kite', kiteNotifContent, 'kites'
      );
    }

    res.json({ success: true, id });
  });

  app.put("/api/mentorships/:id/milestones", requireAuth, (req: any, res) => {
    const { milestones, toggledMilestoneTitle } = req.body;
    const mentorship = db.prepare("SELECT * FROM mentorships WHERE id = ?").get(req.params.id) as any;
    if (!mentorship) return res.status(404).json({ error: "Mentorship not found" });
    if (mentorship.mentor_id !== req.userId && mentorship.mentee_id !== req.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    if (!Array.isArray(milestones)) {
      return res.status(400).json({ error: "milestones must be an array" });
    }

    db.prepare("UPDATE mentorships SET milestones_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(JSON.stringify(milestones), req.params.id);

    if (toggledMilestoneTitle) {
      const otherUserId = req.userId === mentorship.mentor_id ? mentorship.mentee_id : mentorship.mentor_id;
      const actor = db.prepare("SELECT username FROM users WHERE id = ?").get(req.userId) as any;
      const actorName = (mentorship.is_anonymous === 1 && req.userId === mentorship.mentee_id)
        ? "Your anonymous mentee"
        : (actor?.username || "Your mentorship partner");
      const notifId = crypto.randomUUID();
      db.prepare("INSERT INTO notifications (id, user_id, type, content, link) VALUES (?, ?, ?, ?, ?)").run(
        notifId,
        otherUserId,
        "mentorship_milestone",
        `${actorName} updated shared milestone: "${toggledMilestoneTitle}"`,
        "mentorship"
      );
    }

    res.json({ success: true, milestones });
  });

  app.put("/api/mentorships/:id/status", requireAuth, (req: any, res) => {
    const { status } = req.body; // active, completed, declined
    const mentorship = db.prepare("SELECT * FROM mentorships WHERE id = ?").get(req.params.id) as any;
    
    if (!mentorship) return res.status(404).json({ error: "Not found" });
    
    // Only mentor can accept/decline. Both can complete.
    if (status === 'active' || status === 'declined') {
      if (mentorship.mentor_id !== req.userId) return res.status(403).json({ error: "Unauthorized" });
    }

    db.prepare("UPDATE mentorships SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, req.params.id);
    
    // Notify the other party
    const otherUserId = req.userId === mentorship.mentor_id ? mentorship.mentee_id : mentorship.mentor_id;
    const actor = db.prepare("SELECT username FROM users WHERE id = ?").get(req.userId) as any;
    const notifId = crypto.randomUUID();
    
    let actionText = '';
    if (status === 'active') actionText = 'accepted your mentorship request';
    else if (status === 'declined') actionText = 'declined your mentorship request';
    else if (status === 'completed') actionText = 'marked your mentorship as completed';

    const actorName = (mentorship.is_anonymous === 1 && req.userId === mentorship.mentee_id) ? "Your anonymous mentee" : actor.username;

    db.prepare("INSERT INTO notifications (id, user_id, type, content, link) VALUES (?, ?, ?, ?, ?)").run(
      notifId, otherUserId, 'mentorship_update', `${actorName} ${actionText}.`, 'mentorship'
    );

    res.json({ success: true });
  });

  // --- MENTORSHIP PROFILE SURVEY & MATCHMAKING ENDPOINTS ---
  app.get("/api/mentorship/survey", requireAuth, (req: any, res) => {
    try {
      const row = db.prepare("SELECT * FROM mentorship_surveys WHERE user_id = ?").get(req.userId) as any;
      if (!row) {
        return res.json({ survey: null });
      }
      let interests = [];
      let life_goals = [];
      try {
        interests = row.interests ? JSON.parse(row.interests) : [];
      } catch (e) {
        interests = row.interests ? row.interests.split(',').map((s: string) => s.trim()) : [];
      }
      try {
        life_goals = row.life_goals ? JSON.parse(row.life_goals) : [];
      } catch (e) {
        life_goals = row.life_goals ? row.life_goals.split(',').map((s: string) => s.trim()) : [];
      }

      res.json({
        survey: {
          id: row.id,
          user_id: row.user_id,
          role_preference: row.role_preference,
          interests,
          life_goals,
          cadence: row.cadence || 'weekly',
          communication_style: row.communication_style || 'all',
          experience_level: row.experience_level || 'early_reentry',
          personal_statement: row.personal_statement || '',
          availability_status: row.availability_status || 'actively_seeking',
          updated_at: row.updated_at
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/mentorship/survey", requireAuth, (req: any, res) => {
    try {
      const {
        role_preference = 'both',
        interests = [],
        life_goals = [],
        cadence = 'weekly',
        communication_style = 'all',
        experience_level = 'early_reentry',
        personal_statement = '',
        availability_status = 'actively_seeking'
      } = req.body;

      const interestsJson = JSON.stringify(Array.isArray(interests) ? interests : []);
      const lifeGoalsJson = JSON.stringify(Array.isArray(life_goals) ? life_goals : []);

      const existing = db.prepare("SELECT id FROM mentorship_surveys WHERE user_id = ?").get(req.userId) as any;
      const id = existing ? existing.id : crypto.randomUUID();

      if (existing) {
        db.prepare(`
          UPDATE mentorship_surveys
          SET role_preference = ?, interests = ?, life_goals = ?, cadence = ?,
              communication_style = ?, experience_level = ?, personal_statement = ?,
              availability_status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          role_preference, interestsJson, lifeGoalsJson, cadence,
          communication_style, experience_level, personal_statement,
          availability_status, id
        );
      } else {
        db.prepare(`
          INSERT INTO mentorship_surveys
          (id, user_id, role_preference, interests, life_goals, cadence, communication_style, experience_level, personal_statement, availability_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id, req.userId, role_preference, interestsJson, lifeGoalsJson, cadence,
          communication_style, experience_level, personal_statement, availability_status
        );
      }

      // Sync role into users table: if they are offering to mentor, ensure is_mentor = 1
      const isMentorVal = (role_preference === 'mentor' || role_preference === 'both') ? 1 : 0;
      
      // Sync declared interests into users.interests comma list if provided
      const interestsStr = Array.isArray(interests) && interests.length > 0 ? interests.join(', ') : null;

      if (interestsStr) {
        db.prepare("UPDATE users SET is_mentor = ?, interests = ? WHERE id = ?")
          .run(isMentorVal, interestsStr, req.userId);
      } else {
        db.prepare("UPDATE users SET is_mentor = ? WHERE id = ?")
          .run(isMentorVal, req.userId);
      }

      res.json({
        success: true,
        survey: {
          id,
          user_id: req.userId,
          role_preference,
          interests: Array.isArray(interests) ? interests : [],
          life_goals: Array.isArray(life_goals) ? life_goals : [],
          cadence,
          communication_style,
          experience_level,
          personal_statement,
          availability_status
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/mentorship/matches", requireAuth, (req: any, res) => {
    try {
      // Ensure seed data exists
      seedCommunityData();

      // Current user
      const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId) as any;
      const currentSurveyRow = db.prepare("SELECT * FROM mentorship_surveys WHERE user_id = ?").get(req.userId) as any;

      let userInterests: string[] = [];
      let userLifeGoals: string[] = [];
      let userRolePref = 'both';

      if (currentSurveyRow) {
        userRolePref = currentSurveyRow.role_preference || 'both';
        try { userInterests = currentSurveyRow.interests ? JSON.parse(currentSurveyRow.interests) : []; } catch (e) {}
        try { userLifeGoals = currentSurveyRow.life_goals ? JSON.parse(currentSurveyRow.life_goals) : []; } catch (e) {}
      }
      if (userInterests.length === 0 && currentUser?.interests) {
        userInterests = currentUser.interests.split(',').map((s: string) => s.trim()).filter(Boolean);
      }

      // Fetch all candidate members
      const candidates = db.prepare(`
        SELECT u.id, u.username as name, u.facility as history, u.location, u.bio,
               u.is_mentor, u.avatar_url, u.public_status, u.interests as user_interests,
               u.looking_to_meet,
               s.role_preference as survey_role, s.interests as survey_interests,
               s.life_goals as survey_life_goals, s.cadence, s.communication_style,
               s.experience_level, s.personal_statement, s.availability_status
        FROM users u
        LEFT JOIN mentorship_surveys s ON u.id = s.user_id
        WHERE u.id != ? AND (u.is_suspended = 0 OR u.is_suspended IS NULL)
      `).all(req.userId) as any[];

      const normalize = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      const matches = candidates.map(c => {
        let candInterests: string[] = [];
        let candGoals: string[] = [];
        try { candInterests = c.survey_interests ? JSON.parse(c.survey_interests) : []; } catch (e) {}
        try { candGoals = c.survey_life_goals ? JSON.parse(c.survey_life_goals) : []; } catch (e) {}

        if (candInterests.length === 0 && c.user_interests) {
          candInterests = c.user_interests.split(',').map((s: string) => s.trim()).filter(Boolean);
        }

        // Determine candidate role
        let matchRole: 'mentor' | 'mentee' | 'peer' = 'peer';
        if (c.survey_role === 'mentor') matchRole = 'mentor';
        else if (c.survey_role === 'mentee') matchRole = 'mentee';
        else if (c.is_mentor === 1) matchRole = 'mentor';
        else matchRole = 'mentee';

        // Shared Interests calculation
        const sharedInterests: string[] = [];
        userInterests.forEach(uInt => {
          const uNorm = normalize(uInt);
          const found = candInterests.find(cInt => {
            const cNorm = normalize(cInt);
            return cNorm.includes(uNorm) || uNorm.includes(cNorm);
          });
          if (found && !sharedInterests.includes(uInt)) {
            sharedInterests.push(uInt);
          }
        });

        // Check bio keywords if interests overlap is low
        if (sharedInterests.length === 0 && c.bio) {
          const bioLower = (c.bio || '').toLowerCase();
          userInterests.forEach(uInt => {
            if (bioLower.includes(uInt.toLowerCase()) && !sharedInterests.includes(uInt)) {
              sharedInterests.push(uInt);
            }
          });
        }

        // Shared Life Goals calculation
        const sharedLifeGoals: string[] = [];
        userLifeGoals.forEach(uGoal => {
          const uNorm = normalize(uGoal);
          const found = candGoals.find(cGoal => {
            const cNorm = normalize(cGoal);
            return cNorm.includes(uNorm) || uNorm.includes(cNorm);
          });
          if (found && !sharedLifeGoals.includes(uGoal)) {
            sharedLifeGoals.push(uGoal);
          }
        });

        // Facility / history match
        const myHist = (currentUser?.facility || '').toLowerCase();
        const candHist = (c.history || '').toLowerCase();
        let facilityMatch = false;
        let matchedFacilityName = '';
        if (myHist && candHist && myHist !== 'hidden' && candHist !== 'hidden') {
          const knownFacilities = ['quentin', 'rikers', 'sing sing', 'attica', 'chino', 'folsom', 'bastrop', 'alcatraz', 'penitentiary', 'correctional'];
          for (const f of knownFacilities) {
            if (myHist.includes(f) && candHist.includes(f)) {
              facilityMatch = true;
              matchedFacilityName = f.charAt(0).toUpperCase() + f.slice(1);
              break;
            }
          }
        }

        // Location match
        const myLoc = (currentUser?.location || '').toLowerCase();
        const candLoc = (c.location || '').toLowerCase();
        let locationMatch = false;
        if (myLoc && candLoc && myLoc !== 'hidden' && candLoc !== 'hidden') {
          const myParts = myLoc.split(',').map((p: string) => p.trim());
          const candParts = candLoc.split(',').map((p: string) => p.trim());
          locationMatch = myParts.some((p: string) => p.length > 2 && candParts.includes(p));
        }

        // Scoring algorithm
        let score = 42; // baseline community connection
        score += Math.min(sharedInterests.length * 14, 30);
        score += Math.min(sharedLifeGoals.length * 16, 32);

        if (facilityMatch) score += 12;
        if (locationMatch) score += 8;

        // Role preference alignment
        if (userRolePref === 'mentee' && matchRole === 'mentor') score += 10;
        else if (userRolePref === 'mentor' && matchRole === 'mentee') score += 10;
        else if (userRolePref === 'both') score += 6;

        if (c.looking_to_meet) score += 4;

        score = Math.min(Math.max(score, 45), 98);

        // Build explanatory match reasons
        const matchReasons: string[] = [];
        if (sharedLifeGoals.length > 0) {
          matchReasons.push(`Shared life goal: "${sharedLifeGoals[0]}"`);
        }
        if (sharedInterests.length > 0) {
          matchReasons.push(`Common interests: ${sharedInterests.slice(0, 3).join(', ')}`);
        }
        if (facilityMatch) {
          matchReasons.push(`Shared facility experience at ${matchedFacilityName || c.history}`);
        }
        if (locationMatch) {
          matchReasons.push(`Local peer alignment in ${c.location}`);
        }
        if (c.cadence && currentSurveyRow?.cadence && c.cadence === currentSurveyRow.cadence) {
          matchReasons.push(`Compatible check-in pace (${c.cadence})`);
        }
        if (matchReasons.length === 0) {
          matchReasons.push('Alumni network support & transitional peer guidance');
        }

        return {
          user: {
            id: c.id,
            name: c.name,
            history: c.history,
            location: c.location,
            bio: c.bio,
            is_mentor: c.is_mentor,
            avatar_url: c.avatar_url,
            public_status: c.public_status,
            interests: c.user_interests,
            looking_to_meet: !!c.looking_to_meet
          },
          survey: c.survey_role ? {
            role_preference: c.survey_role,
            interests: candInterests,
            life_goals: candGoals,
            cadence: c.cadence,
            communication_style: c.communication_style,
            experience_level: c.experience_level,
            personal_statement: c.personal_statement,
            availability_status: c.availability_status
          } : null,
          matchScore: score,
          matchRole,
          sharedInterests,
          sharedLifeGoals,
          matchReasons,
          facilityMatch,
          locationMatch
        };
      });

      // Sort desc by score
      matches.sort((a: any, b: any) => b.matchScore - a.matchScore);

      res.json(matches);
    } catch (err: any) {
      console.error('Error calculating mentorship matches:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- VIDEO CHAT ENDPOINTS ---
  // Start a video call
  app.post("/api/video-calls", requireAuth, (req: any, res) => {
    const { receiverId } = req.body;
    if (!receiverId) return res.status(400).json({ error: "Missing receiverId" });

    // Mark any existing calls where this user is caller or receiver as completed or missed
    db.prepare("UPDATE video_calls SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE (caller_id = ? OR receiver_id = ?) AND status IN ('ringing', 'connected')").run(req.userId, req.userId);

    const id = crypto.randomUUID();
    db.prepare("INSERT INTO video_calls (id, caller_id, receiver_id, status) VALUES (?, ?, ?, 'ringing')").run(id, req.userId, receiverId);

    // Create a notification for the recipient as a backup
    const caller = db.prepare("SELECT username FROM users WHERE id = ?").get(req.userId) as any;
    if (caller) {
      const notifId = crypto.randomUUID();
      db.prepare("INSERT INTO notifications (id, user_id, type, content, link) VALUES (?, ?, 'video_call', ?, 'mentorship')").run(
        notifId, receiverId, `${caller.username} is inviting you to a live peer-to-peer video call.`
      );
    }

    res.json({ success: true, callId: id });
  });

  // Get active incoming call for current user
  app.get("/api/video-calls/active", requireAuth, (req: any, res) => {
    const call = db.prepare(`
      SELECT vc.*, u.username as caller_name 
      FROM video_calls vc 
      JOIN users u ON vc.caller_id = u.id 
      WHERE vc.receiver_id = ? AND vc.status = 'ringing' 
      ORDER BY vc.created_at DESC 
      LIMIT 1
    `).get(req.userId) as any;
    
    if (!call) {
      // Also check if we are in an active connected call that we started or received
      const activeCall = db.prepare(`
        SELECT vc.*, u1.username as caller_name, u2.username as receiver_name
        FROM video_calls vc
        JOIN users u1 ON vc.caller_id = u1.id
        JOIN users u2 ON vc.receiver_id = u2.id
        WHERE (vc.caller_id = ? OR vc.receiver_id = ?) AND vc.status = 'connected'
        ORDER BY vc.created_at DESC
        LIMIT 1
      `).get(req.userId, req.userId) as any;
      
      return res.json({ call: activeCall || null });
    }
    
    res.json({ call });
  });

  // Update status of a call (answer, decline, completed, missed)
  app.put("/api/video-calls/:id/status", requireAuth, (req: any, res) => {
    const { status } = req.body; // connected, completed, declined, missed
    const call = db.prepare("SELECT * FROM video_calls WHERE id = ?").get(req.params.id) as any;
    
    if (!call) return res.status(404).json({ error: "Call not found" });
    if (call.caller_id !== req.userId && call.receiver_id !== req.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    db.prepare("UPDATE video_calls SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, req.params.id);
    
    // Clear signals if call is ending
    if (status === 'completed' || status === 'declined' || status === 'missed') {
      db.prepare("DELETE FROM video_signals WHERE call_id = ?").run(req.params.id);
    }

    res.json({ success: true });
  });

  // Get specific call status
  app.get("/api/video-calls/:id", requireAuth, (req: any, res) => {
    const call = db.prepare(`
      SELECT vc.*, u1.username as caller_name, u2.username as receiver_name
      FROM video_calls vc
      JOIN users u1 ON vc.caller_id = u1.id
      JOIN users u2 ON vc.receiver_id = u2.id
      WHERE vc.id = ?
    `).get(req.params.id) as any;
    
    if (!call) return res.status(404).json({ error: "Call not found" });
    res.json(call);
  });

  // Post WebRTC signaling message
  app.post("/api/video-signals", requireAuth, (req: any, res) => {
    const { callId, receiverId, type, payload } = req.body;
    if (!callId || !receiverId || !type || !payload) {
      return res.status(400).json({ error: "Missing required signal fields" });
    }

    const id = crypto.randomUUID();
    db.prepare("INSERT INTO video_signals (id, call_id, sender_id, receiver_id, type, payload) VALUES (?, ?, ?, ?, ?, ?)").run(
      id, callId, req.userId, receiverId, type, payload
    );

    res.json({ success: true });
  });

  // Fetch pending signals for a specific call and recipient (consumes them)
  app.get("/api/video-signals/:callId", requireAuth, (req: any, res) => {
    // Select all unread signals sent from other user to me
    const signals = db.prepare(`
      SELECT * FROM video_signals 
      WHERE call_id = ? AND receiver_id = ? AND is_read = 0 
      ORDER BY created_at ASC
    `).all(req.params.callId, req.userId) as any[];

    if (signals.length > 0) {
      // Mark them as read
      db.prepare(`
        UPDATE video_signals 
        SET is_read = 1 
        WHERE call_id = ? AND receiver_id = ? AND is_read = 0
      `).run(req.params.callId, req.userId);
    }

    res.json(signals);
  });

  app.get("/api/kites/conversations", requireAuth, (req: any, res) => {
    const conversations = db.prepare(`
      SELECT 
        u.id as other_user_id,
        u.username as other_user_name,
        k.content as last_message,
        k.timestamp as last_message_time,
        k.sender_id,
        (SELECT COUNT(*) FROM kites WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0) as unread_count
      FROM users u
      JOIN (
        SELECT *, MAX(timestamp) as max_ts
        FROM kites
        WHERE sender_id = ? OR receiver_id = ?
        GROUP BY CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
      ) k ON u.id = CASE WHEN k.sender_id = ? THEN k.receiver_id ELSE k.sender_id END
      ORDER BY k.timestamp DESC
    `).all(req.userId, req.userId, req.userId, req.userId, req.userId, req.userId);
    
    const updatedConversations = conversations.map((conv: any) => {
      const isAnonMentee = db.prepare("SELECT 1 FROM mentorships WHERE mentor_id = ? AND mentee_id = ? AND is_anonymous = 1").get(req.userId, conv.other_user_id);
      if (isAnonMentee) {
        return {
          ...conv,
          other_user_name: "Anonymous Mentee"
        };
      }
      return conv;
    });
    res.json(updatedConversations);
  });

  app.get("/api/kites/thread/:otherUserId", requireAuth, (req: any, res) => {
    const messages = db.prepare(`
      SELECT k.*, u.username as sender_name
      FROM kites k
      JOIN users u ON k.sender_id = u.id
      WHERE (k.sender_id = ? AND k.receiver_id = ?)
         OR (k.sender_id = ? AND k.receiver_id = ?)
      ORDER BY k.timestamp ASC
    `).all(req.userId, req.params.otherUserId, req.params.otherUserId, req.userId);
    
    const isAnonMentee = db.prepare("SELECT 1 FROM mentorships WHERE mentor_id = ? AND mentee_id = ? AND is_anonymous = 1").get(req.userId, req.params.otherUserId);
    const updatedMessages = messages.map((msg: any) => {
      if (isAnonMentee && msg.sender_id === req.params.otherUserId) {
        return {
          ...msg,
          sender_name: "Anonymous Mentee"
        };
      }
      return msg;
    });
    res.json(updatedMessages);
  });

  app.post("/api/kites/read/:otherUserId", requireAuth, (req: any, res) => {
    db.prepare(`
      UPDATE kites 
      SET is_read = 1, read_at = CURRENT_TIMESTAMP 
      WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
    `).run(req.params.otherUserId, req.userId);
    res.json({ success: true });
  });

  app.get("/api/kites", requireAuth, (req: any, res) => {
    const kites = db.prepare(`
      SELECT k.id, k.content, k.timestamp as time, u.username as 'from', k.sender_id
      FROM kites k
      JOIN users u ON k.sender_id = u.id
      WHERE k.receiver_id = ?
      ORDER BY k.timestamp DESC
    `).all(req.userId);
    
    const updatedKites = kites.map((kite: any) => {
      const isAnonMentee = db.prepare("SELECT 1 FROM mentorships WHERE mentor_id = ? AND mentee_id = ? AND is_anonymous = 1").get(req.userId, kite.sender_id);
      if (isAnonMentee) {
        return {
          ...kite,
          from: "Anonymous Mentee"
        };
      }
      return kite;
    });
    res.json(updatedKites);
  });

  app.post("/api/kites", requireAuth, (req: any, res) => {
    const { receiverId, content } = req.body;
    const isAnonMentorship = db.prepare("SELECT 1 FROM mentorships WHERE mentor_id = ? AND mentee_id = ? AND is_anonymous = 1").get(receiverId, req.userId);
    const isAnonymous = !!isAnonMentorship;

    const id = crypto.randomUUID();
    db.prepare("INSERT INTO kites (id, sender_id, receiver_id, content, is_anonymous) VALUES (?, ?, ?, ?, ?)")
      .run(id, req.userId, receiverId, content, isAnonymous ? 1 : 0);
    
    const sender = db.prepare("SELECT username FROM users WHERE id = ?").get(req.userId) as any;
    const notifId = crypto.randomUUID();
    const notifContent = isAnonymous ? "New anonymous guidance/advice kite received." : `New kite from ${sender.username}`;
    db.prepare("INSERT INTO notifications (id, user_id, type, content, link) VALUES (?, ?, ?, ?, ?)").run(
      notifId, receiverId, 'kite', notifContent, 'kites'
    );

    res.json({ success: true });
  });

  app.get("/api/parole-officers", requireAuth, (req: any, res) => {
    const officers = db.prepare("SELECT * FROM parole_officers WHERE user_id = ? ORDER BY name ASC").all(req.userId);
    res.json(officers);
  });

  app.post("/api/parole-officers", requireAuth, (req: any, res) => {
    const { name, agency, phone, district } = req.body;
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO parole_officers (id, user_id, name, agency, phone, district) VALUES (?, ?, ?, ?, ?, ?)").run(id, req.userId, name, agency, phone, district);
    
    const notifId = crypto.randomUUID();
    db.prepare("INSERT INTO notifications (id, user_id, type, content, link) VALUES (?, ?, ?, ?, ?)").run(
      notifId, req.userId, 'po_update', `Added new parole officer: ${name}`, 'tools'
    );

    res.json({ success: true, officer: { id, user_id: req.userId, name, agency, phone, district } });
  });

  app.delete("/api/parole-officers/:id", requireAuth, (req: any, res) => {
    db.prepare("DELETE FROM parole_officers WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
    res.json({ success: true });
  });

  // Forum Routes
  app.get("/api/threads", requireAuth, (req: any, res) => {
    const threads = db.prepare(`
      SELECT t.*, u.username as author_name,
      (SELECT COUNT(*) FROM replies WHERE thread_id = t.id) as reply_count
      FROM threads t
      JOIN users u ON t.author_id = u.id
      ORDER BY t.timestamp DESC
    `).all();
    res.json(threads);
  });

  app.post("/api/threads", requireAuth, (req: any, res) => {
    const { title, content, category } = req.body;
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO threads (id, author_id, title, content, category) VALUES (?, ?, ?, ?, ?)").run(id, req.userId, title, content, category || 'general');
    res.json({ success: true, id });
  });

  app.get("/api/threads/:id", requireAuth, (req: any, res) => {
    const thread = db.prepare(`
      SELECT t.*, u.username as author_name, u.facility as author_history, u.location as author_location
      FROM threads t
      JOIN users u ON t.author_id = u.id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!thread) return res.status(404).json({ error: "Not found" });

    const replies = db.prepare(`
      SELECT r.*, u.username as author_name
      FROM replies r
      JOIN users u ON r.author_id = u.id
      WHERE r.thread_id = ?
      ORDER BY r.timestamp ASC
    `).all(req.params.id);

    res.json({ thread, replies });
  });

  app.post("/api/threads/:id/flag", requireAuth, (req: any, res) => {
    db.prepare("UPDATE threads SET is_flagged = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/threads/:id/replies", requireAuth, (req: any, res) => {
    const { content } = req.body;
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO replies (id, thread_id, author_id, content) VALUES (?, ?, ?, ?)").run(id, req.params.id, req.userId, content);
    
    const thread = db.prepare("SELECT author_id, title FROM threads WHERE id = ?").get(req.params.id) as any;
    if (thread && thread.author_id !== req.userId) {
      const replier = db.prepare("SELECT username FROM users WHERE id = ?").get(req.userId) as any;
      const notifId = crypto.randomUUID();
      db.prepare("INSERT INTO notifications (id, user_id, type, content, link) VALUES (?, ?, ?, ?, ?)").run(
        notifId, thread.author_id, 'reply', `${replier.username} replied to your thread "${thread.title}"`, 'forum'
      );
    }

    res.json({ success: true });
  });

  // Notification Routes
  app.post("/api/replies/:id/flag", requireAuth, (req: any, res) => {
    db.prepare("UPDATE replies SET is_flagged = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Wellness Journal Routes
  app.get("/api/wellness/journals", requireAuth, (req: any, res) => {
    try {
      const journals = db.prepare("SELECT * FROM wellness_journals WHERE user_id = ? ORDER BY created_at DESC").all(req.userId);
      res.json(journals);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/wellness/journals", requireAuth, (req: any, res) => {
    try {
      const { title, content, prompt, stress_level } = req.body;
      const id = "journal-" + Math.random().toString(36).substr(2, 9);
      db.prepare("INSERT INTO wellness_journals (id, user_id, title, content, prompt, stress_level) VALUES (?, ?, ?, ?, ?, ?)").run(
        id, req.userId, title || "Daily Reflection", content, prompt || "", stress_level || 3
      );
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/notifications", requireAuth, (req: any, res) => {
    try {
      const u = db.prepare("SELECT wellness_reminders FROM users WHERE id = ?").get(req.userId) as any;
      if (u && u.wellness_reminders === 1) {
        // Check if there is already a recent reminder (last 12 hours) to avoid cluttering
        const recentReminder = db.prepare("SELECT id FROM notifications WHERE user_id = ? AND type = 'wellness_reminder' AND timestamp > datetime('now', '-12 hours')").get(req.userId);
        
        if (!recentReminder) {
          // Check if user has done any journal logs in the last 24 hours
          const journalToday = db.prepare("SELECT id FROM wellness_journals WHERE user_id = ? AND created_at > datetime('now', '-1 day')").get(req.userId);
          
          if (!journalToday) {
            const notifId = "notif-wellness-" + Math.random().toString(36).substr(2, 9);
            db.prepare("INSERT INTO notifications (id, user_id, type, content, link, is_read) VALUES (?, ?, 'wellness_reminder', 'Daily Reflection: Take a moment for yourself. Write a journal page or run a brief breathing exercise in your Wellness Room.', 'mental-health', 0)").run(
              notifId, req.userId
            );
          }
        }
      }
    } catch (e) {
      console.error("Error generating wellness reminder:", e);
    }

    const notifications = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50").all(req.userId);
    res.json(notifications);
  });

  app.put("/api/notifications/:id/read", requireAuth, (req: any, res) => {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
    res.json({ success: true });
  });

  app.put("/api/notifications/read-all", requireAuth, (req: any, res) => {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(req.userId);
    res.json({ success: true });
  });

  // Global Search Route
  app.get("/api/search", requireAuth, (req: any, res) => {
    const q = req.query.q;
    if (!q || typeof q !== 'string') return res.json({ users: [], jobs: [], housing: [], posts: [], stories: [] });
    
    const likeQ = `%${q}%`;
    const users = db.prepare("SELECT id, username as name, bio, location FROM users WHERE username LIKE ? OR bio LIKE ? OR location LIKE ? LIMIT 10").all(likeQ, likeQ, likeQ);
    const jobs = db.prepare("SELECT id, title, company, location FROM jobs WHERE title LIKE ? OR company LIKE ? OR description LIKE ? LIMIT 10").all(likeQ, likeQ, likeQ);
    const housing = db.prepare("SELECT id, name, type, location FROM housing WHERE name LIKE ? OR description LIKE ? OR location LIKE ? LIMIT 10").all(likeQ, likeQ, likeQ);
    const posts = db.prepare("SELECT id, title, content, category FROM threads WHERE title LIKE ? OR content LIKE ? LIMIT 10").all(likeQ, likeQ);
    const stories = db.prepare("SELECT id, title, author_name, role, content, category, tags, time_served, years_free FROM testimonials WHERE title LIKE ? OR content LIKE ? OR author_name LIKE ? OR tags LIKE ? LIMIT 10").all(likeQ, likeQ, likeQ, likeQ);
    
    res.json({ users, jobs, housing, posts, stories });
  });

  // Admin Routes
  const requireRole = (allowedRoles: string[]) => {
    return (req: any, res: any, next: any) => {
      const user = db.prepare("SELECT role, is_admin FROM users WHERE id = ?").get(req.userId) as any;
      if (!user) return res.status(403).json({ error: "Forbidden" });
      
      const userRole = (user.role === 'user' && user.is_admin === 1) ? 'super_admin' : user.role;
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
      }
      
      req.userRole = userRole;
      next();
    };
  };

  app.get("/api/admin/stats", requireAuth, requireRole(['moderator', 'admin', 'super_admin']), (req: any, res) => {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    const jobCount = db.prepare("SELECT COUNT(*) as count FROM jobs").get() as any;
    const housingCount = db.prepare("SELECT COUNT(*) as count FROM housing").get() as any;
    const postCount = db.prepare("SELECT COUNT(*) as count FROM threads").get() as any;
    
    res.json({
      users: userCount.count,
      jobs: jobCount.count,
      housing: housingCount.count,
      posts: postCount.count
    });
  });

  app.get("/api/admin/users", requireAuth, requireRole(['moderator', 'admin', 'super_admin']), (req: any, res) => {
    const users = db.prepare("SELECT id, username as name, email, created_at, is_admin, is_mentor, role, is_suspended FROM users ORDER BY created_at DESC").all();
    const mappedUsers = users.map((u: any) => ({
      ...u,
      role: u.role === 'user' && u.is_admin === 1 ? 'super_admin' : u.role
    }));
    res.json(mappedUsers);
  });

  app.put("/api/admin/users/:id/suspend", requireAuth, requireRole(['moderator', 'admin', 'super_admin']), (req: any, res) => {
    const { suspend } = req.body;
    if (req.params.id === req.userId) return res.status(400).json({ error: "Cannot suspend yourself" });
    
    const targetUser = db.prepare("SELECT role, is_admin FROM users WHERE id = ?").get(req.params.id) as any;
    if (!targetUser) return res.status(404).json({ error: "User not found" });
    
    const targetRole = targetUser.role === 'user' && targetUser.is_admin === 1 ? 'super_admin' : targetUser.role;
    
    if (req.userRole === 'moderator' && ['admin', 'super_admin'].includes(targetRole)) {
      return res.status(403).json({ error: "Moderators cannot suspend admins" });
    }
    if (req.userRole === 'admin' && targetRole === 'super_admin') {
      return res.status(403).json({ error: "Admins cannot suspend super admins" });
    }
    
    db.prepare("UPDATE users SET is_suspended = ? WHERE id = ?").run(suspend ? 1 : 0, req.params.id);
    
    // Log the action
    db.prepare("INSERT INTO moderation_logs (id, moderator_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)").run(
      crypto.randomUUID(), req.userId, suspend ? 'suspend_user' : 'unsuspend_user', 'user', req.params.id
    );
    
    res.json({ success: true });
  });

  app.get("/api/admin/flagged", requireAuth, requireRole(['moderator', 'admin', 'super_admin']), (req: any, res) => {
    const threads = db.prepare("SELECT t.id, t.title, t.content, t.category, t.timestamp, u.username as author_name, 'thread' as type FROM threads t JOIN users u ON t.author_id = u.id WHERE t.is_flagged = 1 ORDER BY t.timestamp DESC").all();
    const replies = db.prepare("SELECT r.id, r.content, r.timestamp, u.username as author_name, 'reply' as type, r.thread_id FROM replies r JOIN users u ON r.author_id = u.id WHERE r.is_flagged = 1 ORDER BY r.timestamp DESC").all();
    res.json({ threads, replies });
  });

  app.post("/api/admin/flagged/:type/:id/dismiss", requireAuth, requireRole(['moderator', 'admin', 'super_admin']), (req: any, res) => {
    const table = req.params.type === 'thread' ? 'threads' : 'replies';
    db.prepare(`UPDATE ${table} SET is_flagged = 0 WHERE id = ?`).run(req.params.id);
    
    // Log the action
    db.prepare("INSERT INTO moderation_logs (id, moderator_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)").run(
      crypto.randomUUID(), req.userId, 'dismiss_flag', req.params.type, req.params.id
    );
    
    res.json({ success: true });
  });

  app.delete("/api/admin/flagged/:type/:id", requireAuth, requireRole(['moderator', 'admin', 'super_admin']), (req: any, res) => {
    const table = req.params.type === 'thread' ? 'threads' : 'replies';
    if (table === 'threads') {
      db.prepare(`DELETE FROM replies WHERE thread_id = ?`).run(req.params.id);
    }
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
    
    // Log the action
    db.prepare("INSERT INTO moderation_logs (id, moderator_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)").run(
      crypto.randomUUID(), req.userId, 'delete_content', req.params.type, req.params.id
    );
    
    res.json({ success: true });
  });

  app.get("/api/admin/logs", requireAuth, requireRole(['moderator', 'admin', 'super_admin']), (req: any, res) => {
    const logs = db.prepare(`
      SELECT l.*, u.username as moderator_name 
      FROM moderation_logs l
      LEFT JOIN users u ON l.moderator_id = u.id
      ORDER BY l.timestamp DESC
      LIMIT 100
    `).all();
    res.json(logs);
  });

  app.put("/api/admin/users/:id/role", requireAuth, requireRole(['super_admin']), (req: any, res) => {
    const { role } = req.body;
    if (!['user', 'moderator', 'admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: "Cannot change your own role" });
    }
    db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, req.params.id);
    
    // Log the action
    db.prepare("INSERT INTO moderation_logs (id, moderator_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)").run(
      crypto.randomUUID(), req.userId, 'change_role', 'user', req.params.id, JSON.stringify({ new_role: role })
    );
    
    res.json({ success: true });
  });

  app.delete("/api/admin/users/:id", requireAuth, requireRole(['admin', 'super_admin']), (req: any, res) => {
    if (req.params.id === req.userId) return res.status(400).json({ error: "Cannot delete yourself" });
    const userId = req.params.id;
    
    // Delete user's replies
    db.prepare("DELETE FROM replies WHERE author_id = ?").run(userId);
    
    // Delete replies to user's threads
    db.prepare("DELETE FROM replies WHERE thread_id IN (SELECT id FROM threads WHERE author_id = ?)").run(userId);
    
    // Delete user's threads
    db.prepare("DELETE FROM threads WHERE author_id = ?").run(userId);
    
    // Delete user's documents
    db.prepare("DELETE FROM documents WHERE user_id = ?").run(userId);
    
    // Delete user's sessions
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
    
    // Delete user's password reset tokens
    db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(userId);
    
    // Delete user's parole officers
    db.prepare("DELETE FROM parole_officers WHERE user_id = ?").run(userId);
    
    // Delete user's notifications
    db.prepare("DELETE FROM notifications WHERE user_id = ?").run(userId);
    
    // Delete user's kites (messages)
    db.prepare("DELETE FROM kites WHERE sender_id = ? OR receiver_id = ?").run(userId, userId);
    
    // Delete user's mentorships
    db.prepare("DELETE FROM mentorships WHERE mentor_id = ? OR mentee_id = ?").run(userId, userId);
    
    // Delete user's jobs
    db.prepare("DELETE FROM jobs WHERE posted_by = ?").run(userId);
    
    // Delete user's housing
    db.prepare("DELETE FROM housing WHERE posted_by = ?").run(userId);
    
    // Finally, delete the user
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    
    // Log the action
    db.prepare("INSERT INTO moderation_logs (id, moderator_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)").run(
      crypto.randomUUID(), req.userId, 'delete_user', 'user', userId
    );
    
    res.json({ success: true });
  });

  app.delete("/api/admin/jobs/:id", requireAuth, requireRole(['moderator', 'admin', 'super_admin']), (req: any, res) => {
    db.prepare("DELETE FROM jobs WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/admin/housing/:id", requireAuth, requireRole(['moderator', 'admin', 'super_admin']), (req: any, res) => {
    db.prepare("DELETE FROM housing WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  const deleteThreadCascade = db.transaction((threadId: string) => {
    db.prepare("DELETE FROM replies WHERE thread_id = ?").run(threadId);
    db.prepare("DELETE FROM threads WHERE id = ?").run(threadId);
  });

  app.delete("/api/admin/posts/:id", requireAuth, requireRole(['moderator', 'admin', 'super_admin']), (req: any, res) => {
    deleteThreadCascade(req.params.id);
    res.json({ success: true });
  });

  // =========================================================================
  // COMMUNITY RESOURCE 5-STAR RATING & VERIFICATION API
  // =========================================================================
  const buildResourceRatingSummary = (resourceId: string, currentUserId?: string | null) => {
    const rows = db.prepare(
      "SELECT id, resource_id, user_id, user_name, rating, verified_reliable, review_note, updated_at FROM resource_ratings WHERE resource_id = ? ORDER BY updated_at DESC"
    ).all(resourceId) as any[];

    const total_ratings = rows.length;
    const sum = rows.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    const average_rating = total_ratings > 0 ? Math.round((sum / total_ratings) * 10) / 10 : 0;
    const verified_count = rows.filter(r => r.verified_reliable === 1).length;
    const myRow = currentUserId ? rows.find(r => r.user_id === currentUserId) : null;

    return {
      resource_id: resourceId,
      average_rating,
      total_ratings,
      verified_count,
      user_rating: myRow ? Number(myRow.rating) : null,
      user_verified: myRow ? myRow.verified_reliable === 1 : true,
      user_note: myRow?.review_note || "",
      reviews: rows.slice(0, 8).map(r => ({
        id: r.id,
        resource_id: r.resource_id,
        user_id: r.user_id,
        user_name: r.user_name,
        rating: Number(r.rating),
        verified_reliable: r.verified_reliable === 1,
        review_note: r.review_note || "",
        updated_at: r.updated_at
      }))
    };
  };

  app.get("/api/resources/ratings", (req: any, res) => {
    try {
      let currentUserId: string | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        const session = db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(token) as any;
        if (session) currentUserId = session.user_id;
      }

      const distinctIds = db.prepare("SELECT DISTINCT resource_id FROM resource_ratings").all() as any[];
      const map: Record<string, any> = {};
      for (const row of distinctIds) {
        map[row.resource_id] = buildResourceRatingSummary(row.resource_id, currentUserId);
      }
      res.json(map);
    } catch (err: any) {
      console.error("Error fetching resource ratings:", err);
      res.status(500).json({ error: "Failed to load resource ratings" });
    }
  });

  app.post("/api/resources/:resourceId/rate", requireAuth, (req: any, res) => {
    try {
      const resourceId = String(req.params.resourceId || "").trim();
      const ratingNum = Number(req.body.rating);
      const verifiedReliable = req.body.verified_reliable === false ? 0 : 1;
      const reviewNote = typeof req.body.review_note === "string" ? req.body.review_note.trim().slice(0, 400) : "";

      if (!resourceId) {
        return res.status(400).json({ error: "Missing resource ID" });
      }
      if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
      }

      const userRow = db.prepare("SELECT username FROM users WHERE id = ?").get(req.userId) as any;
      const userName = userRow?.username || "Community Member";

      const existing = db.prepare(
        "SELECT id FROM resource_ratings WHERE resource_id = ? AND user_id = ?"
      ).get(resourceId, req.userId) as any;

      if (existing) {
        db.prepare(
          "UPDATE resource_ratings SET rating = ?, verified_reliable = ?, review_note = ?, user_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(ratingNum, verifiedReliable, reviewNote, userName, existing.id);
      } else {
        db.prepare(
          "INSERT INTO resource_ratings (id, resource_id, user_id, user_name, rating, verified_reliable, review_note) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(crypto.randomUUID(), resourceId, req.userId, userName, ratingNum, verifiedReliable, reviewNote);
      }

      const summary = buildResourceRatingSummary(resourceId, req.userId);
      res.json({ success: true, summary });
    } catch (err: any) {
      console.error("Error submitting resource rating:", err);
      res.status(500).json({ error: "Failed to save resource rating" });
    }
  });

  // =========================================================================
  // RESOURCE BOOKMARKS API
  // =========================================================================
  app.get("/api/resources/bookmarks", requireAuth, (req: any, res) => {
    try {
      const rows = db.prepare(
        "SELECT id, resource_id, resource_type, resource_title, created_at FROM resource_bookmarks WHERE user_id = ? ORDER BY created_at DESC"
      ).all(req.userId);
      res.json(rows);
    } catch (err: any) {
      console.error("Error fetching resource bookmarks:", err);
      res.status(500).json({ error: "Failed to load resource bookmarks" });
    }
  });

  app.post("/api/resources/bookmarks/toggle", requireAuth, (req: any, res) => {
    try {
      const resourceId = String(req.body.resource_id || "").trim();
      const resourceType = String(req.body.resource_type || "Resource").trim();
      const resourceTitle = String(req.body.resource_title || "Saved Resource").trim();

      if (!resourceId) {
        return res.status(400).json({ error: "Missing resource_id" });
      }

      const existing = db.prepare(
        "SELECT id FROM resource_bookmarks WHERE user_id = ? AND resource_id = ?"
      ).get(req.userId, resourceId) as any;

      let bookmarked = false;
      if (existing) {
        db.prepare("DELETE FROM resource_bookmarks WHERE id = ?").run(existing.id);
        bookmarked = false;
      } else {
        db.prepare(
          "INSERT INTO resource_bookmarks (id, user_id, resource_id, resource_type, resource_title) VALUES (?, ?, ?, ?, ?)"
        ).run(crypto.randomUUID(), req.userId, resourceId, resourceType, resourceTitle);
        bookmarked = true;
      }

      const bookmarks = db.prepare(
        "SELECT id, resource_id, resource_type, resource_title, created_at FROM resource_bookmarks WHERE user_id = ? ORDER BY created_at DESC"
      ).all(req.userId);

      res.json({ success: true, bookmarked, bookmarks });
    } catch (err: any) {
      console.error("Error toggling resource bookmark:", err);
      res.status(500).json({ error: "Failed to update bookmark" });
    }
  });

  // =========================================================================
  // MENTORSHIP REVIEWS API
  // =========================================================================
  const ensureSeededMentorshipReviews = () => {
    try {
      const countRow = db.prepare("SELECT COUNT(*) as count FROM mentorship_reviews").get() as any;
      if (countRow && countRow.count > 0) return;

      const mentors = db.prepare("SELECT id, username FROM users WHERE is_mentor = 1 LIMIT 6").all() as any[];
      if (!mentors || mentors.length === 0) return;

      const sampleTemplates = [
        {
          reviewer_id: "seed-rev-1",
          reviewer_name: "Darius K.",
          rating: 5,
          communication_rating: 5,
          reentry_helpfulness: 5,
          would_recommend: 1,
          highlights: ["Parole & RMOMS Guidance", "Career & Resume Prep", "Always Responsive"],
          review_text: "Walked me through my first 90 days home step-by-step. Helped me prep for my fair-chance trade interview and never missed a Sunday check-in."
        },
        {
          reviewer_id: "seed-rev-2",
          reviewer_name: "Elena R.",
          rating: 5,
          communication_rating: 5,
          reentry_helpfulness: 5,
          would_recommend: 1,
          highlights: ["Lived Experience", "Accountability & Mindset", "Housing & Stability Tips"],
          review_text: "Zero judgment and real practical advice. Shared exact scripts for talking to landlords and helped me organize my release binder."
        },
        {
          reviewer_id: "seed-rev-3",
          reviewer_name: "Terrell M.",
          rating: 4,
          communication_rating: 4,
          reentry_helpfulness: 5,
          would_recommend: 1,
          highlights: ["Career & Resume Prep", "Lived Experience"],
          review_text: "Solid straight talk when I needed it most. Connecting through our shared milestone checklist kept me focused every week."
        }
      ];

      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO mentorship_reviews
        (id, mentor_id, reviewer_id, reviewer_name, rating, communication_rating, reentry_helpfulness, would_recommend, highlights, review_text, is_anonymous)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `);

      mentors.forEach((mentor, idx) => {
        const primary = sampleTemplates[idx % sampleTemplates.length];
        const secondary = sampleTemplates[(idx + 1) % sampleTemplates.length];
        insertStmt.run(
          crypto.randomUUID(),
          mentor.id,
          `${primary.reviewer_id}-${idx}`,
          primary.reviewer_name,
          primary.rating,
          primary.communication_rating,
          primary.reentry_helpfulness,
          primary.would_recommend,
          JSON.stringify(primary.highlights),
          primary.review_text
        );
        if (idx < 3) {
          insertStmt.run(
            crypto.randomUUID(),
            mentor.id,
            `${secondary.reviewer_id}-b-${idx}`,
            secondary.reviewer_name,
            secondary.rating,
            secondary.communication_rating,
            secondary.reentry_helpfulness,
            secondary.would_recommend,
            JSON.stringify(secondary.highlights),
            secondary.review_text
          );
        }
      });
    } catch (e) {
      console.warn("Could not seed initial mentorship reviews:", e);
    }
  };

  const buildMentorReviewSummary = (mentorId: string, currentUserId?: string | null) => {
    const rows = db.prepare(
      "SELECT * FROM mentorship_reviews WHERE mentor_id = ? ORDER BY updated_at DESC"
    ).all(mentorId) as any[];

    const mapRow = (r: any) => {
      let highlights: string[] = [];
      try {
        highlights = r.highlights ? JSON.parse(r.highlights) : [];
      } catch {
        highlights = [];
      }
      const isAnon = r.is_anonymous === 1;
      return {
        id: r.id,
        mentor_id: r.mentor_id,
        reviewer_id: r.reviewer_id,
        reviewer_name: isAnon && r.reviewer_id !== currentUserId ? "Anonymous Mentee" : r.reviewer_name,
        rating: Number(r.rating),
        communication_rating: Number(r.communication_rating || 5),
        reentry_helpfulness: Number(r.reentry_helpfulness || 5),
        would_recommend: r.would_recommend === 1,
        highlights,
        review_text: r.review_text,
        is_anonymous: isAnon,
        updated_at: r.updated_at
      };
    };

    const mapped = rows.map(mapRow);
    const total_reviews = mapped.length;
    const avg = (vals: number[]) =>
      vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;

    const recommendCount = mapped.filter(r => r.would_recommend).length;
    const userReviewRow = currentUserId ? mapped.find(r => r.reviewer_id === currentUserId) || null : null;

    return {
      mentor_id: mentorId,
      average_rating: avg(mapped.map(r => r.rating)),
      total_reviews,
      recommend_percent: total_reviews > 0 ? Math.round((recommendCount / total_reviews) * 100) : 0,
      avg_communication: avg(mapped.map(r => r.communication_rating)),
      avg_reentry_helpfulness: avg(mapped.map(r => r.reentry_helpfulness)),
      user_review: userReviewRow,
      reviews: mapped
    };
  };

  app.get("/api/mentorship/reviews", (req: any, res) => {
    try {
      ensureSeededMentorshipReviews();

      let currentUserId: string | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        const session = db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(token) as any;
        if (session) currentUserId = session.user_id;
      }

      const distinctMentors = db.prepare("SELECT DISTINCT mentor_id FROM mentorship_reviews").all() as any[];
      const map: Record<string, any> = {};
      for (const row of distinctMentors) {
        map[row.mentor_id] = buildMentorReviewSummary(row.mentor_id, currentUserId);
      }
      res.json(map);
    } catch (err: any) {
      console.error("Error fetching mentorship reviews:", err);
      res.status(500).json({ error: "Failed to load mentorship reviews" });
    }
  });

  app.post("/api/mentorship/reviews", requireAuth, (req: any, res) => {
    try {
      const mentorId = String(req.body.mentor_id || "").trim();
      const rating = Number(req.body.rating);
      const communicationRating = Math.min(5, Math.max(1, Number(req.body.communication_rating || rating)));
      const reentryHelpfulness = Math.min(5, Math.max(1, Number(req.body.reentry_helpfulness || rating)));
      const wouldRecommend = req.body.would_recommend === false ? 0 : 1;
      const isAnonymous = req.body.is_anonymous ? 1 : 0;
      const highlightsArr = Array.isArray(req.body.highlights) ? req.body.highlights.slice(0, 6) : [];
      const reviewText = String(req.body.review_text || "").trim().slice(0, 1000);

      if (!mentorId) return res.status(400).json({ error: "Mentor ID is required." });
      if (mentorId === req.userId) return res.status(400).json({ error: "You cannot review yourself." });
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5 stars." });
      }
      if (!reviewText) return res.status(400).json({ error: "Please share a short review note." });

      const userRow = db.prepare("SELECT username FROM users WHERE id = ?").get(req.userId) as any;
      const reviewerName = userRow?.username || "Community Member";

      const existing = db.prepare(
        "SELECT id FROM mentorship_reviews WHERE mentor_id = ? AND reviewer_id = ?"
      ).get(mentorId, req.userId) as any;

      if (existing) {
        db.prepare(`
          UPDATE mentorship_reviews
          SET rating = ?, communication_rating = ?, reentry_helpfulness = ?, would_recommend = ?,
              highlights = ?, review_text = ?, is_anonymous = ?, reviewer_name = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          rating,
          communicationRating,
          reentryHelpfulness,
          wouldRecommend,
          JSON.stringify(highlightsArr),
          reviewText,
          isAnonymous,
          reviewerName,
          existing.id
        );
      } else {
        db.prepare(`
          INSERT INTO mentorship_reviews
          (id, mentor_id, reviewer_id, reviewer_name, rating, communication_rating, reentry_helpfulness, would_recommend, highlights, review_text, is_anonymous)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          mentorId,
          req.userId,
          reviewerName,
          rating,
          communicationRating,
          reentryHelpfulness,
          wouldRecommend,
          JSON.stringify(highlightsArr),
          reviewText,
          isAnonymous
        );

        // Notify the mentor of their new review
        const displayReviewer = isAnonymous ? "An anonymous mentee" : reviewerName;
        db.prepare(
          "INSERT INTO notifications (id, user_id, type, content, link) VALUES (?, ?, 'mentorship_review', ?, 'mentorship')"
        ).run(
          crypto.randomUUID(),
          mentorId,
          `${displayReviewer} left you a ${rating}-star mentorship review.`
        );
      }

      const summary = buildMentorReviewSummary(mentorId, req.userId);
      res.json({ success: true, summary });
    } catch (err: any) {
      console.error("Error submitting mentorship review:", err);
      res.status(500).json({ error: "Failed to save mentorship review" });
    }
  });

  app.delete("/api/mentorship/reviews/:reviewId", requireAuth, (req: any, res) => {
    try {
      const review = db.prepare(
        "SELECT id, mentor_id, reviewer_id FROM mentorship_reviews WHERE id = ?"
      ).get(req.params.reviewId) as any;
      if (!review) return res.status(404).json({ error: "Review not found" });
      if (review.reviewer_id !== req.userId) {
        return res.status(403).json({ error: "You can only delete your own review" });
      }
      db.prepare("DELETE FROM mentorship_reviews WHERE id = ?").run(review.id);
      const summary = buildMentorReviewSummary(review.mentor_id, req.userId);
      res.json({ success: true, mentor_id: review.mentor_id, summary });
    } catch (err: any) {
      console.error("Error deleting mentorship review:", err);
      res.status(500).json({ error: "Failed to delete mentorship review" });
    }
  });

  // =========================================================================
  // SERVER-SIDE GEMINI AI ROUTES (AI Guide Bot + Resources AI Helpers)
  // =========================================================================
  const WEBSITE_GUIDE_SYSTEM_INSTRUCTION = `You are "Yard Guide AI", a friendly, intelligent, Gemini-style AI assistant built right into this web platform ("Wayfare Kitchen · The Yard Network").

Your three core roles:
1. **Website Guide & Navigation Helper**: Answer questions about how the website works, explain any section, and guide users step-by-step on where to click.
2. **Tips, Tricks & Platform Shortcuts**: Share practical pro-tips, shortcuts, privacy controls, and best practices for getting the most out of every feature.
3. **General Knowledge Assistant**: Answer ANY general knowledge question clearly, accurately, and concisely (history, science, cooking, coding, finance, resume writing, study help, everyday life, re-entry advice, etc.) just like Gemini.

Complete Website Map (Tabs available in the left sidebar):
- \`expedition\` (**Expedition profile**): Taste & member preference controls, heat/adventure level, favorite cuisines, holiday delivery schedule, and account plan.
- \`yard\` (**The Yard**): Community directory & social hub where formerly incarcerated peers connect, signal availability to meet ("yard" status), send private messages ("kites"), and complete a Mentorship Profile Survey.
- \`mentorship\` (**Mentorship**): Take the 3-step Mentorship Matching Questionnaire (Shared Lived Experiences, Professional Goals, Check-in Cadence), browse match scores, connect anonymously or directly, read & write **Mentorship Reviews** (5-star ratings, communication & re-entry helpfulness scores, and peer testimonials), and track **Shared Mentorship Milestones** with visual progress bars across 4 pillars (Re-Entry, Career, Legal, Wellness).
- \`kites\` (**Kites**): Private, secure peer-to-peer messaging ("kite" = private message, "yard" = meeting place; includes optional slang tooltips for clarity).
- \`resources\` (**Resources**): 4-pillar command hub featuring: (1) Mental Health Support & Self-Help Workbooks, (2) 50-State Court Dockets & DOC Locator, (3) Interactive Statutory Sentence Estimator, (4) Parole Officer Contacts & RMOMS Urine Analysis Check-In Guide, plus **Resource Bookmarks** (save any service, workbook, hotline, or court docket for one-tap access), a **5-Star Community Reliability Rating System** where users rate and verify local services, and a Nearby Re-Entry Services Map.
- \`forum\` (**Forum**): Community Discussions, Community Guidelines modal, and the **Success Stories** section where formerly incarcerated individuals post and celebrate inspirational re-entry journeys.
- \`opportunities\` (**Opportunities**): Felony-friendly Jobs board, release-approved Housing directory, and personal Job Application Tracker.
- \`tools\` (**Legal Tools**): Quick court docket lookup and statutory sentence reference tools.
- \`mental-health\` (**Wellness**): Dedicated mental health check-ins, grounding tools, and wellness reminders.
- \`studio\` (**Studio Settings**): Halflight Pictures studio profile and production console settings.
- \`workspace\` (**Workspace**): Google Slides and Google Keep integrations.
- \`cases\` (**Case Tracker**): Track personal legal cases, court dates, and hearing reminders.
- \`progress\` (**Progress Tracker**): Track personal milestones and habits.
- \`calendar\` (**Calendar**): Schedule appointments, parole check-ins, and community events.
- \`vault\` (**The Vault**): Securely store important documents (IDs, certificates, resumes, release papers).
- \`help\` (**Help Center**): Frequently asked questions and support guides.
- \`profile\` (**Member Profile**): Edit your bio, facility history, location, and privacy toggles.

Navigation Directive Rule:
Whenever your answer recommends visiting one or more specific pages/tabs in the website, append clean action markers at the very end of your response (one per recommended page, max 3) using this exact format:
[NAV:tab_id|Button Label]
or for Success Stories in the Forum:
[NAV:forum:stories|Open Success Stories]
Valid tab_ids: expedition, yard, mentorship, kites, resources, forum, opportunities, tools, mental-health, studio, workspace, cases, progress, calendar, vault, help, profile.

Formatting style:
- Be warm, clear, encouraging, and well-structured with short paragraphs, bullet lists, and bold highlights.
- Do not fabricate personal data about the user.
- For legal or medical topics, give helpful general information with a brief note to consult a licensed attorney or healthcare professional for formal advice.`;

  const formatGeminiError = (err: any) => {
    const rawMsg = err?.message || String(err);
    const status = err?.status || err?.code || 500;
    if (rawMsg.includes("GEMINI_API_KEY is not configured")) {
      return { status: 503, message: rawMsg };
    }
    if (status === 403 || status === 400 || rawMsg.includes("API_KEY_INVALID") || rawMsg.includes("PERMISSION_DENIED")) {
      return {
        status: 400,
        message: "The Gemini API key appears invalid or lacks permission. Please verify your API key in Settings > Secrets."
      };
    }
    if (status === 429 || rawMsg.includes("RESOURCE_EXHAUSTED")) {
      return {
        status: 429,
        message: "AI request limit reached right now. Please wait a moment and try again, or check your API quota in Settings > Secrets."
      };
    }
    return { status: 500, message: `AI service error: ${rawMsg}` };
  };

  app.post("/api/ai/chat", async (req: any, res) => {
    try {
      const { messages, activeTab } = req.body || {};
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Please provide at least one message." });
      }

      const ai = getGeminiClient();
      const contents = messages.slice(-16).map((m: any) => ({
        role: m.role === "model" ? "model" : "user",
        parts: [{ text: String(m.text || "") }]
      }));

      const contextNote = activeTab
        ? `\n\nCurrent user context: The user is currently viewing the "${activeTab}" tab.`
        : "";

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents,
        config: {
          systemInstruction: WEBSITE_GUIDE_SYSTEM_INSTRUCTION + contextNote
        }
      });

      const rawText = (response.text || "").trim();
      const suggestedTabs: { tab: string; subTab?: string; label: string }[] = [];
      const navRegex = /\[NAV:([a-z0-9-]+)(?::([a-z0-9-]+))?\|([^\]]+)\]/gi;

      let match: RegExpExecArray | null;
      while ((match = navRegex.exec(rawText)) !== null) {
        const tab = match[1].toLowerCase();
        const subTab = match[2] ? match[2].toLowerCase() : undefined;
        const label = match[3].trim();
        if (!suggestedTabs.some(t => t.tab === tab && t.subTab === subTab)) {
          suggestedTabs.push({ tab, subTab, label });
        }
      }

      const cleanText = rawText.replace(navRegex, "").trim();
      res.json({ text: cleanText, suggestedTabs });
    } catch (err: any) {
      console.error("AI chat error:", err);
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post("/api/ai/docket-search", async (req: any, res) => {
    try {
      const { state, query } = req.body || {};
      if (!state) return res.status(400).json({ error: "State is required." });

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Find the official court docket or case search website for ${state}. Also provide step-by-step instructions and search guidance related to: ${query || "criminal court dockets"}`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      res.json({
        text: response.text || "",
        candidates: response.candidates || []
      });
    } catch (err: any) {
      console.error("AI docket search error:", err);
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post("/api/ai/estimate-sentence", async (req: any, res) => {
    try {
      const { crimeDetails } = req.body || {};
      if (!crimeDetails) return res.status(400).json({ error: "Offense details are required." });

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Act as a legal information assistant. Based on the following details, provide a structured, educational overview of potential statutory sentencing ranges, earned-time/good-time credit rules, and parole eligibility guidelines. Include a clear disclaimer that this is educational information and NOT formal legal advice. Details: ${crimeDetails}`
      });

      res.json({ text: response.text || "" });
    } catch (err: any) {
      console.error("AI sentence estimate error:", err);
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post("/api/ai/self-help", async (req: any, res) => {
    try {
      const { topic } = req.body || {};
      if (!topic) return res.status(400).json({ error: "Topic is required." });

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Provide a supportive, motivational, and practical self-help guide for someone navigating life after incarceration focusing on: ${topic}. Include actionable daily steps, grounding techniques, and mental health resources.`
      });

      res.json({ text: response.text || "" });
    } catch (err: any) {
      console.error("AI self-help error:", err);
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
