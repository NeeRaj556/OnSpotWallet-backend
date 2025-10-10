const { verifySignature, CLIENT_KEY } = require("../utils/apiKeyManager");

/**
 * API signature guard middleware
 * Verifies that requests are properly signed with the client key
 */
const signatureGuard = (req, res, next) => {
  // Skip verification in development mode if configured to do so
  if (
    process.env.NODE_ENV === "development" &&
    process.env.SKIP_API_SIGNATURE === "true"
  ) {
    return next();
  }

  const result = verifySignature(req, CLIENT_KEY);

  if (!result.valid) {
    if (result.reason === "stale") {
      return res.status(410).json({
        error: "Request timestamp is stale",
        message: "Please ensure your device clock is synchronized",
      });
    }

    return res.status(401).json({
      error: "Invalid API signature",
      message: "Request signature verification failed",
    });
  }

  next();
};

module.exports = signatureGuard;
