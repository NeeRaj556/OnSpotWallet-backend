const router = require("express").Router();
const {
  getMe,
  checkIn,
  checkOut,
  getHistory,
  getAttendanceStatus,
  getTodayAttendance,
  getRequestHistory,
  getDashboardStats,
  updateMe,
  updatePassword,
  getTodayAttendanceStatus,
  attendanceAction,
} = require("../controllers/staff.controller");
const { staff } = require("../middleware/auth.middleware");
const leaveRoutes = require("./staff/leave.routes");

// Leave management routes
/**
 * @route /api/staff/leave
 * @desc Leave management routes
 * @access Private
 * @tag Staff
 */
router.use("/leave", leaveRoutes);

/**
 * @route GET /api/staff/me,
 * @desc Get current staff profile
 * @access Private
 * @tag Staff
 */
router.get("/me", staff, getMe);
/**
 * @route PUT /api/staff/updateMe
 * @desc Update current admin profile (including profilePicture)
 * @access Private
 * @body {name, email, address, phone,profilePicture(file)}
 * @tag Admin
 */
router.put("/updateMe", staff, updateMe);

/**
 * @route POST /api/staff/checkin
 * @desc Staff check-in (must be within allowed radius)
 * @access Private
 * @tag Staff
 * @body {latitude, longitude}
 */
router.post("/checkin", staff, checkIn);

/**
 * @route POST /api/staff/checkout
 * @desc Staff check-out (must be within allowed radius)
 * @access Private
 * @tag Staff
 * @body {latitude, longitude}
 */
router.post("/checkout", staff, checkOut);

/**
 * @route GET /api/staff/attendance/today
 * @desc Get today's attendance for the logged-in staff
 * @access Private
 */
router.get("/attendance/today", staff, getTodayAttendance);

/**
 * @route GET /api/staff/history
 * @desc Get all attendance history for the logged-in staff
 * @access Private
 * @tag Staff
 */
router.get("/history", staff, getHistory);

/**
 * @route GET /api/staff/attendance-status
 * @desc Get check-in/check-out availability and if reason is required
 * @access Private
 */
router.get("/attendance-status", staff, getAttendanceStatus);

/**
 * @route GET /api/staff/requests
 * @desc Get all request history for the logged-in staff
 * @access Private
 */
router.get("/requests", staff, getRequestHistory);

/**
 * @route GET /api/staff/dashboard-stats
 * @desc Get dashboard stats for the current month
 * @access Private
 */
router.get("/dashboard-stats", staff, getDashboardStats);

/**
 * @route GET /api/staff/attendance/today-status
 * @desc Get today's attendance status (on time, late, early, not checked in/out, etc.)
 * @access Private
 */
router.get("/attendance/today-status", staff, getTodayAttendanceStatus);
router.post("/attendance-action", staff, attendanceAction);

module.exports = router;
