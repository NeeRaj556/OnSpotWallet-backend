// const router = require("express").Router();
// const {
//   getMe,
//   updateMe,
//   getStaff,
//   createStaff,
//   editStaff,
//   deleteStaff,
//   setLocation,
//   getStaffHistory,
//   getStaffAttendanceReports,
//   getStaffAnnualReports,
//   getAttendanceTimes,
//   updateAttendanceTimes,
//   getRequests,
//   getLocation,
//   approveRequest,
//   rejectRequest,
//   getAllStaffTodayAttendance,
//   getStaffAttendanceHistory,
//   updatePassword,
//   getAttendanceGraph,
//   importAttendance,
//   exportAttendance,
//   getActiveBreaksStatus,
//   getStaffList,
// } = require("../controllers/admin.controller");
// const {
//   getCustomer,
//   createCustomer,
//   editCustomer,
//   deleteCustomer,
// } = require("../controllers/customer.controller");
// const {
//   getService,
//   createService,
//   editService,
//   deleteService,
//   getLabels,
//   getActiveService,
// } = require("../controllers/service.controller");
// const { admin } = require("../middleware/auth.middleware");
// const leaveRoutes = require("./admin/leave.routes");

// // Leave management routes
// /**
//  * @route /api/admin/leave
//  * @desc Leave management routes
//  * @access Private/Admin
//  * @tag Admin
//  */
// router.use("/leave", leaveRoutes);

// /**
//  * @route GET /api/admin/me
//  * @desc Get current admin profile
//  * @access Private
//  * @tag Admin
//  */
// router.get("/me", admin, getMe);

// /**
//  * @route PUT /api/admin/updateMe
//  * @desc Update current admin profile (including profilePicture)
//  * @access Private
//  * @body {name, email, address, phone,profilePicture(file)}
//  * @tag Admin
//  */
// router.put("/updateMe", admin, updateMe);

// /**
//  * @route PUT /api/admin/updatePassword
//  * @desc Update current admin profile (including profilePicture)
//  * @access Private
//  * @body {currentPassword, newPassword}
//  * @tag Admin
//  */
// router.put("/updatePassword", admin, updatePassword);

// /**
//  * @route GET /api/admin/staff	undefined	localhost	/	Session	14						Medium
// user
//  * @desc Get all staff users
//  * @access Private
//  * @tag Admin
//  */
// router.get("/staff", admin, getStaff);
// router.get("/staffList", admin, getStaffList);

// /**
//  * @route POST /api/admin/staff/create
//  * @desc Create a new staff user
//  * @access Private
//  * @tag Admin
//  * @body {name, email, password}
//  */
// router.post("/staff/create", admin, createStaff);

// /**
//  * @route PUT /api/admin/staff/{id}
//  * @desc Edit a staff user
//  * @access Private
//  * @tag Admin
//  * @body {name, email, password}
//  */
// router.put("/staff/:id", admin, editStaff);

// /**
//  * @route DELETE /api/admin/staff/{id}
//  * @desc Delete a staff user
//  * @access Private
//  * @tag Admin
//  */
// router.delete("/staff/:id", admin, deleteStaff);

// /**
//  * @route POST /api/admin/location
//  * @desc Set or update the allowed check-in location
//  * @access Private
//  * @tag Admin
//  * @body {name, l// Serve React static files
// app.use(express.static(path.join(__dirname, 'client/build')));

// // API routes
// app.get('/api/hello', (req, res) => {
//   res.json({ message: 'Hello from API!' });
// });

// // All other routes go to React
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
// });atitude, longitude}
//  */
// router.post("/location", admin, setLocation);

// /**
//  * @route GET /api/admin/location
//  * @desc Get the allowed check-in location
//  * @access Private
//  * @tag Admin
//  */
// router.get("/location", admin, getLocation);

// /**
//  * @route GET /api/admin/staff/history
//  * @desc Get all staff with their check-in/checkout history
//  * @access Private
//  * @tag Admin
//  */
// router.get("/staff/history", admin, getStaffHistory);

// /**
//  * @route GET /api/admin/staff/reports
//  * @desc Get comprehensive staff attendance reports with filtering (weekly/monthly/custom) - All staff
//  * @access Private
//  * @tag Admin
//  * @query period (weekly|monthly|custom), year, month, fromDate, toDate
//  */
// router.get("/staff/reports", admin, getStaffAttendanceReports);

// /**
//  * @route GET /api/admin/staff/:staffId/reports
//  * @desc Get comprehensive staff attendance reports with filtering (weekly/monthly/custom) - Specific staff
//  * @access Private
//  * @tag Admin
//  * @param staffId - Staff member ID
//  * @query period (weekly|monthly|custom), year, month, fromDate, toDate
//  */
// router.get("/staff/:staffId/reports", admin, getStaffAttendanceReports);

// /**
//  * @route GET /api/admin/staff/annual-reports
//  * @desc Get annual staff attendance reports (Jan to Dec) - All staff
//  * @access Private
//  * @tag Admin
//  * @query year
//  */
// router.get("/staff/annual-reports", admin, getStaffAnnualReports);

// /**
//  * @route GET /api/admin/staff/:staffId/annual-reports
//  * @desc Get annual staff attendance reports (Jan to Dec) - Specific staff
//  * @access Private
//  * @tag Admin
//  * @param staffId - Staff member ID
//  * @query year
//  */
// router.get("/staff/:staffId/annual-reports", admin, getStaffAnnualReports);

// /**
//  * @route GET /api/admin/attendance-times
//  * @desc Get allowed check-in and check-out times
//  * @access Private
//  * @tag Admin
//  */
// router.get("/attendance-times", admin, getAttendanceTimes);

// /**
//  * @route PUT /api/admin/attendance-times
//  * @desc Update allowed check-in and check-out times
//  * @access Private
//  * @tag Admin
//  */
// router.put("/attendance-times", admin, updateAttendanceTimes);

// /**
//  * @route GET /api/admin/requests
//  * @desc Get all requests for late/early check-in/out
//  * @access Private
//  * @tag Admin
//  */
// router.get("/requests", admin, getRequests);

// /**
//  * @route PUT /api/admin/requests/approve/:id
//  * @desc Approve a request
//  * @access Private/Admin
//  */
// router.put("/requests/approve/:id", admin, approveRequest);

// /**
//  * @route PUT /api/admin/requests/reject/:id
//  * @desc Reject a request (send reason in body)
//  * @access Private/Admin
//  * @body {reason}
//  */
// router.put("/requests/reject/:id", admin, rejectRequest);

// /**
//  * @route GET /api/admin/staff/attendance/today
//  * @desc Get today's attendance for all staff
//  * @access Private/Admin
//  */
// router.get("/staff/attendance/today", admin, getAllStaffTodayAttendance);

// /**
//  * @route GET /api/admin/staff/:id/history
//  * @desc Get attendance history for a staff with filters
//  * @access Private/Admin
//  * @query from, to, period (daily|weekly|monthly)
//  */
// router.get("/staff/:id/history", admin, getStaffAttendanceHistory);

// /**
//  * @route GET /api/admin/breaks/status
//  * @desc Get active breaks status and auto-checkout monitoring
//  * @access Private/Admin
//  */
// router.get("/breaks/status", admin, getActiveBreaksStatus);

// /**
//  * @route GET /api/admin/attendance-graph
//  * @desc Get attendance graph data for staff or all staff
//  * @access Private/Admin
//  * @query staffId (optional), from, to (YYYY-MM-DD)
//  */
// router.get("/attendance-graph", admin, getAttendanceGraph);

// /**
//  * @route POST /api/admin/attendance/import
//  * @desc Import staff attendance from Excel (columns: email, checkInAt, checkOutAt, latitude, longitude)
//  * @access Private/Admin
//  * @body file (Excel)
//  */
// router.post("/attendance/import", admin, importAttendance);

// /**
//  * @route GET /api/admin/attendance/export
//  * @desc Export all staff attendance to Excel
//  * @access Private/Admin
//  */
// router.get("/attendance/export", admin, exportAttendance);
// /**
//  * @route GET /api/admin/service
//  * @desc Service List
//  * @access Private/Admin
//  */
// router.get("/service", admin, getService);
// /**
//  * @route POST /api/admin/service
//  * @desc Create a new service
//  * @access Private/Admin
//  * @body {name: string, description: string}
//  */
// router.post("/service", admin, createService);

// /**
//  * @route PUT /api/admin/service/:id
//  * @desc Edit a service
//  * @access Private/Admin
//  * @body {name: string, description: string}
//  */
// router.put("/service/:id", admin, editService);

// /**
//  * @route DELETE /api/admin/service/:id
//  * @desc Delete a service
//  * @access Private/Admin
//  */
// router.delete("/service/:id", admin, deleteService);

// /**
//  * @route GET /api/admin/activeServices
//  * @desc Get all active services
//  * @access Private/Admin
//  */

// router.get("/activeServices", admin, getActiveService);

// /**
//  * @route GET /api/admin/label/{serviceId}
//  * @desc Get labels for a specific service
//  * @access Private/Admin
//  * @param {string} serviceId - Service ID
//  * @tag Admin
//  */
// router.get("/label", admin, getLabels);
// /**
//  * @route GET /api/admin/customer
//  * @desc Customer List
//  * @access Private/Admin
//  */
// /**
//  * @route GET /api/admin/customer
//  * @desc Customer List
//  * @access Private/Admin
//  */
// router.get("/customer", admin, getCustomer);

// /**
//  * @route POST /api/admin/customer
//  * @desc Create a new customer
//  * @access Private/Admin
//  * @body {name: string, email: string, ...}
//  */
// router.post("/customer", admin, createCustomer);

// /**
//  * @route PUT /api/admin/customer/:id
//  * @desc Edit a customer
//  * @access Private/Admin
//  * @body {name: string, email: string, ...}
//  */
// router.put("/customer/:id", admin, editCustomer);

// /**
//  * @route DELETE /api/admin/customer/:id
//  * @desc Delete a customer
//  * @access Private/Admin
//  */
// router.delete("/customer/:id", admin, deleteCustomer);

// module.exports = router;
