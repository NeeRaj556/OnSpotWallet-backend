const isDev = process.env.NODE_ENV !== "production";

const blockPostman = (req, res, next) => {
  if (isDev) return next();

  const userAgent = req.headers["user-agent"] || "";
  if (userAgent.includes("Postman")) {
    return res.status(403).json({ error: "Blocked in production" });
  }

  next();
};
module.exports = blockPostman;
