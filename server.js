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
