// ============================================================
// 🕷️ LEGEND-AMMAR — Pairing Code Server
// Deploy on Railway / Koyeb / any VPS (Node.js 18+)
// ============================================================
const express = require("express");
const cors = require("cors");
const path = require("path");
const { parseAndValidateNumber, requestPairCode } = require("./pairing");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Wire creds capture hook: when a pairing socket gets its identity, store it
const pairing = require("./pairing");
pairing.setCredsCallback((_phoneNumber, creds) => {
  console.log("CREDS_CAPTURED", _phoneNumber);
  // creds stored inside pairing.js global map; getCreds() reads it
});

// ---------- Session store (pairing creds shared with the bot) ----------
// The pairing socket's auth creds are stored here keyed by the phone number,
// so the bot can fetch them and run as the SAME WhatsApp session that was paired.
const sessionStore = new Map();

// ---------- Request logger (spy mode) ----------
// Logs EVERY incoming request (path, headers, query) so we can learn the bot's
// exact session API contract. Logs go to console + ./requests.log.
const fsx = require("fs");
function logRequest(req) {
  const entry = {
    at: new Date().toISOString(),
    method: req.method,
    path: req.path || req.url,
    query: req.query,
    headers: Object.fromEntries(
      Object.entries(req.headers).filter(
        ([k]) =>
          !["user-agent", "accept", "accept-language", "sec-"].includes(k)
      )
    ),
    ip:
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.socket?.remoteAddress ||
      "unknown",
  };
  const line = JSON.stringify(entry);
  console.log("REQ", line);
  try {
    fsx.appendFileSync(path.join(__dirname, "requests.log"), line + "\n");
  } catch {
    /* ignore */
  }
  return entry;
}

// Log all requests BEFORE routing
app.use((req, _res, next) => {
  logRequest(req);
  next();
});

// ---------- JAWAD-style session endpoints (common bot contract) ----------
// GET /session?id=<phone>  → { status: true, data: { sessionId: <creds> } }
// GET /session.json?id=<phone> (alias)
// Also: GET /session/:phone
const credsPath = (id) => id ? (id.endsWith('.json') ? id.slice(0, -5) : id) : '';
const credsFor = (id) => {
  const phone = credsPath(String(id || "")).trim();
  if (!phone) return null;
  return pairing.getCreds(phone);
};
app.get(["/session", "/session.json", "/api/session"], (req, res) => {
  const id = String(req.query?.id || req.query?.phone || "");
  const sess = credsFor(id);
  res.json({
    status: !!sess,
    data: sess ? { sessionId: JSON.stringify(sess) } : null,
    error: sess ? null : "No session. Pehle pairing code se pair karein.",
  });
});

// ---------- Per-IP rate limiting: max 3 requests / 10 min ----------
const ipRequests = new Map();
const RATE_LIMIT = { max: 3, windowMs: 10 * 60 * 1000 };

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = ipRequests.get(ip);
  if (!entry || entry.resetAt <= now) {
    ipRequests.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT.max;
}

// ---------- Pairing API ----------
app.post("/api/pair", async (req, res) => {
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      error: "Aap ne bohat zyada requests bheji hain. 10 minute baad dobara try karein.",
    });
  }

  const parsed = parseAndValidateNumber(String(req.body?.phoneNumber || ""));
  if (!parsed.valid) {
    return res.status(400).json({ error: parsed.reason });
  }

  try {
    const code = await requestPairCode(parsed.number);
    res.json({ code, expiresInSeconds: 300 });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Pairing code nahi mil saka.",
    });
  }
});

// ---------- Health ----------
app.get("/api/health", (_req, res) => {
  res.json({ bot: "🕷️ LEGEND-AMMAR", status: "alive" });
});

// ---------- Fallback: anything else serves the UI ----------
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🕷️ LEGEND-AMMAR Pairing Server running on port ${PORT}`);
});
