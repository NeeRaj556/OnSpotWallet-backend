const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const KEY_FILE = path.resolve("./client.key");

/**
 * Load existing API key or create a new one
 * @returns {string} The API client key
 */
function loadOrCreateKey() {
  if (fs.existsSync(KEY_FILE)) {
    return fs.readFileSync(KEY_FILE, "utf8"); // reuse existing
  }
  const key = crypto.randomBytes(32).toString("hex"); // 256-bit hex
  fs.writeFileSync(KEY_FILE, key, "utf8");
  console.log("🔐 NEW CLIENT KEY CREATED:", key);
  return key;
}

// Initialize the client key
const CLIENT_KEY = loadOrCreateKey();

// Time window for request validity (in milliseconds)
const TIME_WINDOW = 30000; // 30 seconds

/**
 * Verify request signature
 * @param {Object} req - Express request object
 * @param {string} clientKey - The client key to use for verification
 * @returns {boolean} Whether signature is valid
 */
function verifySignature(req, clientKey) {
  const sig = req.get("x-signature");
  const tsStr = req.get("x-timestamp");

  if (!sig || !tsStr) {
    return false;
  }

  const ts = Number(tsStr);
  if (Math.abs(Date.now() - ts) > TIME_WINDOW) {
    return { valid: false, reason: "stale" };
  }

  const raw = `${req.method}${req.originalUrl}${JSON.stringify(
    req.query
  )}${JSON.stringify(req.body)}${ts}`;
  const expected = crypto
    .createHmac("sha256", clientKey)
    .update(raw)
    .digest("hex");

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(sig),
      Buffer.from(expected)
    );
    return { valid: isValid, reason: isValid ? null : "invalid_signature" };
  } catch (error) {
    console.error("Signature verification error:", error);
    return { valid: false, reason: "verification_error" };
  }
}

/**
 * Check if a bootstrap token has been used before
 * @param {string} token - The bootstrap token to check
 * @returns {Promise<boolean>} Whether token has been used
 */
async function isTokenUsed(token) {
  if (process.env.NODE_ENV === "development") {
    return false; // In development, always allow token usage
  }

  const usedToken = await prisma.usedToken.findUnique({
    where: { token },
  });

  return !!usedToken;
}

/**
 * Mark a token as used
 * @param {string} token - The bootstrap token to mark as used
 * @param {string} clientIdentifier - Identifier of the client that used the token
 * @returns {Promise<void>}
 */
async function markTokenAsUsed(token, clientIdentifier) {
  if (process.env.NODE_ENV === "development") {
    return; // In development, don't track token usage
  }

  await prisma.usedToken.create({
    data: {
      token,
      clientIdentifier,
      usedAt: new Date(),
    },
  });
}

module.exports = {
  CLIENT_KEY,
  verifySignature,
  isTokenUsed,
  markTokenAsUsed,
  TIME_WINDOW,
};
