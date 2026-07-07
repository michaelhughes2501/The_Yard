import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";

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
    age INTEGER,
    gender TEXT,
    pronouns TEXT,
    looking_for TEXT,
    relationship_status TEXT,
    incarceration_details TEXT
  );
  CREATE TABLE IF NOT EXISTS password_resets (
    token TEXT PRIMARY KEY,
    user_id TEXT,
    expires_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
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
`);

// Column/table migrations for databases created before these fields existed.
// Must run AFTER the base CREATE TABLE statements above so `ALTER TABLE` targets exist
// on a fresh install (previously these ran first and silently no-op'd via the empty
// catch blocks, leaving auth/role/suspension columns missing on new databases).
try {
  db.exec("ALTER TABLE users ADD COLUMN email TEXT UNIQUE");
} catch (e) {}

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
  db.exec("ALTER TABLE kites ADD COLUMN is_anonymous INTEGER DEFAULT 0");
} catch (e) {}

async function startServer() {
  const app = express();
  const PORT = 3000;

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
  app.post("/api/auth/register", (req, res) => {
    const { username, email, password, facility, location, bio } = req.body;
    try {
      const id = crypto.randomUUID();
      db.prepare("INSERT INTO users (id, username, email, password, facility, location, bio) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, username, email, password, facility, location, bio);
      const token = crypto.randomUUID();
      db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, id);
      res.json({ token, user: { id, username, email, facility, location, bio } });
    } catch (e) {
      res.status(400).json({ error: "Username or email taken, or invalid data" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.is_suspended === 1) return res.status(403).json({ error: "Account suspended" });
    
    const token = crypto.randomUUID();
    db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, user.id);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, facility: user.facility, location: user.location, bio: user.bio, role: user.role === 'user' && user.is_admin === 1 ? 'super_admin' : user.role, avatar_url: user.avatar_url } });
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
    const { email } = req.body;
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as any;
    
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration
      
      db.prepare("INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, ?)").run(
        resetToken, user.id, expiresAt.toISOString()
      );
      
      // In a real app, send an email here. For this environment, we'll return it in the response for testing/demo purposes.
      console.log(`Password reset token for ${email}: ${resetToken}`);
      res.json({ success: true, message: "If an account exists, a reset link has been sent.", _devToken: resetToken });
    } else {
      // Always return success to prevent email enumeration
      res.json({ success: true, message: "If an account exists, a reset link has been sent." });
    }
  });

  app.post("/api/auth/reset-password", (req, res) => {
    const { token, newPassword } = req.body;
    
    const reset = db.prepare("SELECT user_id, expires_at FROM password_resets WHERE token = ?").get(token) as any;
    
    if (!reset) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }
    
    if (new Date(reset.expires_at) < new Date()) {
      db.prepare("DELETE FROM password_resets WHERE token = ?").run(token);
      return res.status(400).json({ error: "Reset token has expired" });
    }
    
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(newPassword, reset.user_id);
    db.prepare("DELETE FROM password_resets WHERE token = ?").run(token);
    
    // Also invalidate all existing sessions for security
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(reset.user_id);
    
    res.json({ success: true });
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
    const user = db.prepare("SELECT id, username as name, facility as history, location, bio, is_mentor, hide_location, hide_history, is_admin, role, avatar_url, public_status, interests, looking_to_meet, wellness_reminders, age, gender, pronouns, looking_for, relationship_status, incarceration_details FROM users WHERE id = ?").get(req.userId);
    if (user) {
      (user as any).role = (user as any).role === 'user' && (user as any).is_admin === 1 ? 'super_admin' : (user as any).role;
      (user as any).looking_to_meet = (user as any).looking_to_meet === 1;
      (user as any).wellness_reminders = (user as any).wellness_reminders === 1;
    }
    res.json(user);
  });

  app.put("/api/users/profile", requireAuth, (req: any, res) => {
    const { history, location, bio, hide_location, hide_history, avatar_url, public_status, interests, looking_to_meet, wellness_reminders, age, gender, pronouns, looking_for, relationship_status, incarceration_details } = req.body;
    
    // Read previous row to preserve unchanged optional fields
    const existing = db.prepare("SELECT avatar_url, public_status, interests, looking_to_meet, wellness_reminders, age, gender, pronouns, looking_for, relationship_status, incarceration_details FROM users WHERE id = ?").get(req.userId) as any;
    
    const final_avatar = avatar_url !== undefined ? avatar_url : (existing ? existing.avatar_url : null);
    const final_status = public_status !== undefined ? public_status : (existing ? existing.public_status : null);
    const final_interests = interests !== undefined ? interests : (existing ? existing.interests : null);
    const final_looking = looking_to_meet !== undefined ? (looking_to_meet ? 1 : 0) : (existing ? existing.looking_to_meet : 0);
    const final_wellness_reminders = wellness_reminders !== undefined ? (wellness_reminders ? 1 : 0) : (existing ? existing.wellness_reminders : 0);
    const final_age = age !== undefined ? age : (existing ? existing.age : null);
    const final_gender = gender !== undefined ? gender : (existing ? existing.gender : null);
    const final_pronouns = pronouns !== undefined ? pronouns : (existing ? existing.pronouns : null);
    const final_looking_for = looking_for !== undefined ? looking_for : (existing ? existing.looking_for : null);
    const final_relationship_status = relationship_status !== undefined ? relationship_status : (existing ? existing.relationship_status : null);
    const final_incarceration_details = incarceration_details !== undefined ? incarceration_details : (existing ? existing.incarceration_details : null);

    db.prepare("UPDATE users SET facility = ?, location = ?, bio = ?, hide_location = ?, hide_history = ?, avatar_url = ?, public_status = ?, interests = ?, looking_to_meet = ?, wellness_reminders = ?, age = ?, gender = ?, pronouns = ?, looking_for = ?, relationship_status = ?, incarceration_details = ? WHERE id = ?").run(
      history, location, bio, hide_location ? 1 : 0, hide_history ? 1 : 0, final_avatar, final_status, final_interests, final_looking, final_wellness_reminders, final_age, final_gender, final_pronouns, final_looking_for, final_relationship_status, final_incarceration_details, req.userId
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
            content: "After serving 12 years, I felt completely lost. Through The Yard, I found a coding mentor who guided me through stack certifications. Today, I'm a full-time software engineer at a logistics firm. Re-entry is hard, but we don't have to walk it alone.",
            role: "Alumnus & Software Engineer",
            avatar_url: null,
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: crypto.randomUUID(),
            user_id: null,
            author_name: "David Chen",
            content: "Connecting with an accountability partner and using the tools was made simple here. The Legal Tools tab helped me understand my rights, and the Mentorship program kept me grounded. Now celebrating 3 years of freedom, running a construction contracting business.",
            role: "Construction Business Owner",
            avatar_url: null,
            created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: crypto.randomUUID(),
            user_id: null,
            author_name: "Carlos Mendez",
            content: "Finding felony-friendly housing was my biggest hurdle. Through the shared opportunities here, I moved into stable transitional housing within two weeks of release. Now I'm working as a peer navigator, helping others coming home.",
            role: "Lead Peer Navigator",
            avatar_url: null,
            created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
        for (const seed of seeds) {
          db.prepare("INSERT INTO testimonials (id, user_id, author_name, content, role, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
            seed.id, seed.user_id, seed.author_name, seed.content, seed.role, seed.avatar_url, seed.created_at
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
    const { author_name, content, role } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }
    try {
      const userObj = db.prepare("SELECT username, avatar_url FROM users WHERE id = ?").get(req.userId) as any;
      const name = author_name || (userObj ? userObj.username : "Anonymous");
      const avatar = userObj ? userObj.avatar_url : null;
      const cleanRole = role || "Alumnus";

      const id = crypto.randomUUID();
      db.prepare("INSERT INTO testimonials (id, user_id, author_name, content, role, avatar_url) VALUES (?, ?, ?, ?, ?, ?)").run(
        id, req.userId, name, content, cleanRole, avatar
      );
      res.json({ success: true, id });
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

  app.get("/api/mentorships", requireAuth, (req: any, res) => {
    const mentorships = db.prepare(`
      SELECT m.*, 
             u1.username as mentor_name, 
             CASE WHEN m.is_anonymous = 1 AND m.mentor_id = ? THEN 'Anonymous Mentee' ELSE u2.username END as mentee_name
      FROM mentorships m
      JOIN users u1 ON m.mentor_id = u1.id
      JOIN users u2 ON m.mentee_id = u2.id
      WHERE m.mentor_id = ? OR m.mentee_id = ?
      ORDER BY m.updated_at DESC
    `).all(req.userId, req.userId, req.userId);
    res.json(mentorships);
  });

  app.post("/api/mentorships/request", requireAuth, (req: any, res) => {
    const { mentorId, message, isAnonymous } = req.body;
    const isAnonVal = isAnonymous ? 1 : 0;
    
    // Check if already requested
    const existing = db.prepare("SELECT id FROM mentorships WHERE mentor_id = ? AND mentee_id = ? AND status IN ('pending', 'active')").get(mentorId, req.userId);
    if (existing) {
      return res.status(400).json({ error: "Mentorship already requested or active" });
    }

    const id = crypto.randomUUID();
    db.prepare("INSERT INTO mentorships (id, mentor_id, mentee_id, status, is_anonymous) VALUES (?, ?, ?, 'pending', ?)")
      .run(id, mentorId, req.userId, isAnonVal);
    
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

    res.json({ success: true });
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
    if (!q || typeof q !== 'string') return res.json({ users: [], jobs: [], housing: [], posts: [] });
    
    const likeQ = `%${q}%`;
    const users = db.prepare("SELECT id, username as name, bio, location FROM users WHERE username LIKE ? OR bio LIKE ? OR location LIKE ? LIMIT 10").all(likeQ, likeQ, likeQ);
    const jobs = db.prepare("SELECT id, title, company, location FROM jobs WHERE title LIKE ? OR company LIKE ? OR description LIKE ? LIMIT 10").all(likeQ, likeQ, likeQ);
    const housing = db.prepare("SELECT id, name, type, location FROM housing WHERE name LIKE ? OR description LIKE ? OR location LIKE ? LIMIT 10").all(likeQ, likeQ, likeQ);
    const posts = db.prepare("SELECT id, title, content, category FROM threads WHERE title LIKE ? OR content LIKE ? LIMIT 10").all(likeQ, likeQ);
    
    res.json({ users, jobs, housing, posts });
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
    
    // Delete user's password resets
    db.prepare("DELETE FROM password_resets WHERE user_id = ?").run(userId);
    
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

  app.delete("/api/admin/posts/:id", requireAuth, requireRole(['moderator', 'admin', 'super_admin']), (req: any, res) => {
    db.prepare("DELETE FROM replies WHERE thread_id = ?").run(req.params.id);
    db.prepare("DELETE FROM threads WHERE id = ?").run(req.params.id);
    res.json({ success: true });
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
