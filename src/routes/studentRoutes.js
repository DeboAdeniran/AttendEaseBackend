const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const studentController = require("../controllers/studentController");

const router = express.Router();

// Get all students (lecturer/admin only)
router.get(
  "/",
  protect,
  authorize("lecturer", "admin"),
  studentController.getAllStudents
);

// Get student by ID
router.get("/:id", protect, studentController.getStudent);

// Update student profile
router.put("/:id", protect, studentController.updateStudent);

// Get student attendance summary
router.get(
  "/:id/attendance/summary",
  protect,
  studentController.getStudentAttendanceSummary
);

// Get student's enrolled classes
router.get("/:id/classes", protect, studentController.getStudentClasses);

// Get student dashboard stats
router.get(
  "/:id/dashboard/stats",
  protect,
  studentController.getStudentDashboardStats
);

module.exports = router;
