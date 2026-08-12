// 🕷️ LEGEND-AMMAR — Baileys pairing logic
const makeWASocket = require("@whiskeysockets/baileys").default;
const { DisconnectReason, makeCacheableSignalKeyStore, useMultiFileAuthState } =
  require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");

const noopLogger = {
  level: "error",
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: (...args) => console.warn("[Baileys]", ...args),
  error: (...args) => console.error("[Baileys]", ...args),
  fatal: (...args) => console.error("[Baileys][FATAL]", ...args),
  child: () => noopLogger,
  levelVal: 50,
};

/**
 * Validate a WhatsApp phone number. Returns the number without leading '+'.
 */
function parseAndValidateNumber(raw) {
  const input = String(raw).trim().replace(/[\s\u00a0()-]/g, "");
  if (!input) return { valid: false, reason: "Phone number khali nahi ho sakta." };
  const digits = input.replace(/^\+/, "");
  if (!/^\d+$/.test(digits))
    return { valid: false, reason: "Number me sirf digits hone chahiye (+93770909827)." };
  if (digits.length < 10 || digits.length > 15)
    return { valid: false, reason: "Number ki length galat hai (country code ke sath 10-15 digits)." };
  return { valid: true, number: digits };
}

const AUTH_DIR = path.join(
  process.env.AUTH_DIR || "/tmp",
  "legend-ammar-pair-auth"
);

async function getAuthState() {
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
  return useMultiFileAuthState(AUTH_DIR);
}

// Browser fingerprints known to get past WhatsApp's 405 on hosted servers
const BROWSER_VARIANTS = [
  ["Ubuntu", "Chrome", "20.0.04"],
  ["Chrome", "Windows", "110.0.5481.177"],
];

// default variant; mutated per-attempt in requestPairCode
let BROWSER_VARIANT = BROWSER_VARIANTS[0];

function attemptPairing(phoneNumber) {
  return new Promise(async (resolve) => {
    let resolved = false;
    const finish = (r) => {
      if (resolved) return;
      resolved = true;
      resolve(r);
    };

    let sock;
    try {
      const { state, saveCreds } = await getAuthState();
      sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, noopLogger),
        },
        printQRInTerminal: false,
        logger: noopLogger,
        // Aug 2026: pinned version [2,3000,1033893291] proven in Baileys #2370
        // to fix 405 on servers; Ubuntu browser fingerprint fixes #1761 on Docker.
        browser: BROWSER_VARIANT,
        version: [2, 3000, 1033893291],
        connectTimeoutMs: 25_000,
      });
      const credsByNumber = (global.__credsByNumber =
        global.__credsByNumber || new Map());
      const credsEntry = credsByNumber.get(phoneNumber) || { creds: {} };
      credsByNumber.set(phoneNumber, credsEntry);
      sock.ev.on("creds.update", (updatedCreds) => {
        saveCreds(updatedCreds);
        // capture the FULL creds so the bot can reuse this session
        Object.assign(credsEntry.creds, updatedCreds);
        try {
          if (typeof onCredsAvailable === "function") {
            onCredsAvailable(phoneNumber, JSON.parse(JSON.stringify(credsEntry.creds)));
          }
        } catch {
          /* ignore */
        }
      });

      const timeout = setTimeout(() => {
        try {
          sock?.end(undefined);
        } catch {
          /* ignore */
        }
        finish({
          valid: false,
          error: new Error(
            "WhatsApp server se connect nahi ho saka, dobara try karein."
          ),
        });
      }, 30000);

      let codeRequested = false;
      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if ((connection === "connecting" || qr) && !codeRequested) {
          codeRequested = true;
          try {
            // try pairing via the default channel first; if that fails with
            // a WhatsApp-side error, fall back to the "call" channel (#2370 workaround)
            let code;
            try {
              code = await sock.requestPairingCode(phoneNumber);
            } catch (inner) {
              code = await sock.requestPairingCode(phoneNumber, {
                method: "call",
              });
            }
            clearTimeout(timeout);
            const codeStr = String(code).padStart(8, "0");
            finish({ valid: true, code: codeStr });
          } catch (err) {
            clearTimeout(timeout);
            try {
              sock?.end(undefined);
            } catch {
              /* ignore */
            }
            finish({
              valid: false,
              error: new Error(
                "Pairing code nahi mil saka — WhatsApp server ne mana kar diya, dobara try karein."
              ),
            });
          }
        } else if (connection === "close") {
          const code = lastDisconnect?.error?.output?.statusCode;
          if (code === DisconnectReason.loggedOut || code === 401) {
            try {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            } catch {
              /* ignore */
            }
          }
          clearTimeout(timeout);
          finish({
            valid: false,
            error: new Error(
              "WhatsApp server se connect nahi ho saka, dobara try karein."
            ),
          });
        }
      });
    } catch (err) {
      finish({
        valid: false,
        error: new Error("Pairing server me masla aa gaya, dobara try karein."),
      });
    }
  });
}

/**
 * Up to 3 attempts, then throw.
 */
async function requestPairCode(phoneNumber) {
  const MAX_ATTEMPTS = 3;
  for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
    // Rotate browser fingerprints across attempts (one per variant)
    BROWSER_VARIANT = BROWSER_VARIANTS[i % BROWSER_VARIANTS.length];
    const result = await attemptPairing(phoneNumber);
    if (result.valid) return result.code;
    if (i < MAX_ATTEMPTS - 1) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error(
    "WhatsApp server se connect nahi ho saka, kuch der baad dobara try karein."
  );
}

module.exports = { parseAndValidateNumber, requestPairCode };

// Optional hook called by server.js when a pairing socket's creds arrive,
// so the bot can fetch the SAME session and link to the code.
let onCredsAvailable = null;
module.exports.setCredsCallback = (fn) => {
  onCredsAvailable = fn;
};
module.exports.getCreds = (phoneNumber) => {
  const credsByNumber = global.__credsByNumber || new Map();
  const entry = credsByNumber.get(String(phoneNumber));
  return entry ? entry.creds : null;
};
