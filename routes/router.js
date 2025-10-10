const express = require("express");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./auth.routes");
const adminRoutes = require("./admin.routes");
const staffRoutes = require("./staff.routes");
const securityRoutes = require("./security.routes");
const attendanceRoutes = require("./attendance.routes");
const adminSecurityRoutes = require("./admin/security.routes");
// const blockPostman = require("../middleware/postman.middleware");
const signatureGuard = require("../middleware/signature.middleware");

module.exports = (app) => {
  app.use(express.json());
  app.use(cors());
  app.use(express.urlencoded({ extended: false }));

  // Serve static files from uploads directory (for profile pictures and other uploads)
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

    app.use("/api/auth", authRoutes);

  //  app.use("/api/admin", adminRoutes);
  //  app.use("/api/staff", staffRoutes);

  // Attendance API routes with signature verification
 
  //  app.use("/api/user", signatureGuard,userRoutes);
};
