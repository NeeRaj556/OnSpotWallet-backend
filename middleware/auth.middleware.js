const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const prisma = require("../utils/prisma");

// Factory function for role-based middleware
const checkRole = (requiredRole) =>
  asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.decoded = decoded; // Attach decoded token payload to request
        const user = await prisma.user.findUnique({
          where: { id: req.decoded.id },
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
            address: true,
            phone: true,
            role: true,
            createdAt: true,
          },
        });

        if (!user) {
          res.status(404);
          throw new Error("User not found");
        }

        if (user.role !== requiredRole) {
          res.status(403);
          throw new Error(`Not authorized as ${requiredRole}`);
        }

        req.user = user; // Optionally attach full user to request
        next();
      } catch (error) {
        res.status(401);
        throw new Error("Not authorized, token invalid");
      }
    } else {
      res.status(401);
      throw new Error("Not authorized, token missing");
    }
  });

// General authentication middleware
const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.decoded = decoded; // Attach decoded token payload to request
      const user = await prisma.user.findUnique({
        where: { id: req.decoded.id },
        select: {
          id: true,
          name: true,
          email: true,
          profilePicture: true,
          address: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        res.status(404);
        throw new Error("User not found");
      }

      req.user = user; // Attach user to request
      next();
    } catch (error) {
      res.status(401);
      throw new Error("Not authorized, token invalid");
    }
  } else {
    res.status(401);
    throw new Error("Not authorized, token missing");
  }
});

// Predefined role middlewares for convenience
const auth = checkRole("user");
const admin = checkRole("admin");
const staff = checkRole("staff");

module.exports = { protect, auth, admin, staff, checkRole };
