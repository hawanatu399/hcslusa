const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

const app = express();
const DEFAULT_PORT = 3000;
const PORT = Number(process.env.PORT) || DEFAULT_PORT;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const DB_PATH = path.join(DATA_DIR, "hcsl.sqlite");
const LEGACY_MEMBERS_PATH = path.join(DATA_DIR, "members.json");
const LEGACY_CONTACTS_PATH = path.join(DATA_DIR, "contact-messages.json");
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";

fs.mkdirSync(DATA_DIR, { recursive: true });

if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
  console.warn(
    "[server] Using default admin credentials. Set ADMIN_USERNAME and ADMIN_PASSWORD in the environment before production use.",
  );
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    interest TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

function migrateLegacyJson(tableName, legacyPath, rowsMapper) {
  if (!fs.existsSync(legacyPath)) return;

  try {
    const raw = fs.readFileSync(legacyPath, "utf8");
    const rows = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(rows) || rows.length === 0) return;

    const stmt = db.prepare(
      tableName === "members"
        ? `INSERT OR IGNORE INTO members (id, first_name, last_name, email, phone, interest, status, created_at) VALUES (@id, @first_name, @last_name, @email, @phone, @interest, @status, @created_at)`
        : `INSERT OR IGNORE INTO contact_messages (id, name, email, message, created_at) VALUES (@id, @name, @email, @message, @created_at)`,
    );

    const insertMany = db.transaction((items) => {
      items.forEach((item) => stmt.run(rowsMapper(item)));
    });

    insertMany(rows);
  } catch (error) {
    console.warn(
      `[server] Unable to migrate legacy data from ${legacyPath}:`,
      error.message,
    );
  }
}

migrateLegacyJson("members", LEGACY_MEMBERS_PATH, (item) => ({
  id:
    item.id ||
    `legacy-member-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  first_name: String(item.firstName || "").trim(),
  last_name: String(item.lastName || "").trim(),
  email: String(item.email || "").trim(),
  phone: String(item.phone || "").trim(),
  interest: String(item.interest || "").trim(),
  status: String(item.status || "Pending").trim(),
  created_at: item.createdAt || new Date().toISOString(),
}));

migrateLegacyJson("contact_messages", LEGACY_CONTACTS_PATH, (item) => ({
  id:
    item.id ||
    `legacy-contact-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: String(item.name || "").trim(),
  email: String(item.email || "").trim(),
  message: String(item.message || "").trim(),
  created_at: item.createdAt || new Date().toISOString(),
}));

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan("tiny"));
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(ROOT_DIR, { index: false }));

function sanitizeText(value, fieldName) {
  const text = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!text) {
    throw new Error(`${fieldName} is required.`);
  }
  return text;
}

function sendPage(res, pageName, extraTitle = "") {
  const filePath = path.join(ROOT_DIR, `${pageName}.html`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
    return;
  }

  const title = extraTitle || "HCSL-USA";
  res.send(`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>${title}</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <header class="site-header">
          <a class="brand" href="/" aria-label="HCSL-USA home">
            <img src="/assets/hcsl-usa-logo.jpg" alt="HCSL-USA logo" />
            <span><strong>HEALTH CARE</strong><b>SIERRA LEONE USA</b><small>Care · Service · Partnership</small></span>
          </a>
          <nav class="main-nav">
            <a href="/">Home</a>
            <a href="/about">About Us</a>
            <a href="/news">News</a>
            <a href="/programs">Programs</a>
            <a href="/contact">Contact</a>
            <a href="/join">Join Us</a>
          </nav>
        </header>
        <main class="wrap" style="padding:48px 0 80px; min-height:50vh;">
          <h1 style="font-size:32px; margin-bottom:18px;">${title}</h1>
          <p style="max-width:700px; line-height:1.8; color:#445b75;">This page is ready and connected to the HCSL-USA backend.</p>
        </main>
      </body>
    </html>
  `);
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, app: "HCSL-USA", timestamp: new Date().toISOString() });
});

app.get("/api/members", (req, res) => {
  const members = db
    .prepare(
      `SELECT id, first_name AS firstName, last_name AS lastName, email, phone, interest, status, created_at AS createdAt FROM members ORDER BY created_at DESC`,
    )
    .all();
  res.json({ ok: true, members });
});

app.post("/api/members", (req, res) => {
  try {
    const payload = req.body || {};
    const firstName = sanitizeText(payload.firstName, "First name");
    const lastName = sanitizeText(payload.lastName, "Last name");
    const email = sanitizeText(payload.email, "Email");
    const phone = sanitizeText(payload.phone, "Phone");
    const interest = sanitizeText(
      payload.interest || "General support",
      "Interest",
    );

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res
        .status(400)
        .json({ ok: false, message: "Please provide a valid email address." });
    }

    const record = {
      id: `hcsl-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      interest,
      status: "Pending",
      created_at: new Date().toISOString(),
    };

    db.prepare(
      `INSERT INTO members (id, first_name, last_name, email, phone, interest, status, created_at) VALUES (@id, @first_name, @last_name, @email, @phone, @interest, @status, @created_at)`,
    ).run(record);

    return res.status(201).json({
      ok: true,
      message: "Registration saved successfully.",
      member: {
        ...record,
        firstName: firstName,
        lastName: lastName,
        createdAt: record.created_at,
      },
    });
  } catch (error) {
    return res
      .status(400)
      .json({
        ok: false,
        message: error.message || "Invalid member submission.",
      });
  }
});

app.get("/api/contact-messages", (req, res) => {
  const messages = db
    .prepare(
      `SELECT id, name, email, message, created_at AS createdAt FROM contact_messages ORDER BY created_at DESC`,
    )
    .all();
  res.json({ ok: true, messages });
});

app.post("/api/contact", (req, res) => {
  try {
    const payload = req.body || {};
    const name = sanitizeText(payload.name, "Name");
    const email = sanitizeText(payload.email, "Email");
    const message = sanitizeText(payload.message, "Message");

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res
        .status(400)
        .json({ ok: false, message: "Please provide a valid email address." });
    }

    const entry = {
      id: `contact-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      email,
      message,
      created_at: new Date().toISOString(),
    };

    db.prepare(
      `INSERT INTO contact_messages (id, name, email, message, created_at) VALUES (@id, @name, @email, @message, @created_at)`,
    ).run(entry);

    return res.status(201).json({
      ok: true,
      message: "Message sent successfully.",
      entry: { ...entry, createdAt: entry.created_at },
    });
  } catch (error) {
    return res
      .status(400)
      .json({
        ok: false,
        message: error.message || "Invalid contact submission.",
      });
  }
});

app.post("/api/admin/login", (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "").trim();

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({ ok: true, message: "Login successful." });
  }

  return res
    .status(401)
    .json({ ok: false, message: "Invalid username or password." });
});

app.get("/", (req, res) => res.sendFile(path.join(ROOT_DIR, "index.html")));
app.get("/about", (req, res) => sendPage(res, "about", "About HCSL-USA"));
app.get("/news", (req, res) => sendPage(res, "news", "News & Stories"));
app.get("/programs", (req, res) =>
  sendPage(res, "programs", "Programs & Missions"),
);
app.get("/contact", (req, res) => sendPage(res, "contact", "Contact HCSL-USA"));
app.get("/join", (req, res) => sendPage(res, "join", "Join HCSL-USA"));
app.get("/admin", (req, res) => sendPage(res, "admin", "Admin Panel"));

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`HCSL-USA backend running on http://localhost:${port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      const nextPort = port + 1;
      console.warn(`Port ${port} is busy. Retrying on ${nextPort}.`);
      startServer(nextPort);
      return;
    }

    throw error;
  });
}

startServer(PORT);
