const express = require("express");
const { body } = require("express-validator");
const { protect, authorize } = require("../middleware/auth");
const attendanceController = require("../controllers/attendanceController");
const validate = require("../middleware/validation");

const router = express.Router();

// Mark single attendance (lecturer only)
router.post(
  "/mark",
  protect,
  authorize("lecturer"),
  [
    body("class_id").notEmpty().withMessage("Class ID is required"),
    body("student_id").notEmpty().withMessage("Student ID is required"),
    body("attendance_date").isDate().withMessage("Valid date is required"),
    body("status")
      .isIn(["Present", "Absent", "Late", "Excused"])
      .withMessage("Invalid status"),
    validate,
  ],
  attendanceController.markAttendance
);

// Mark bulk attendance (lecturer only)
router.post(
  "/mark/bulk",
  protect,
  authorize("lecturer"),
  [
    body("attendance_records")
      .isArray()
      .withMessage("Attendance records must be an array"),
    validate,
  ],
  attendanceController.markBulkAttendance
);

// Get attendance for a class on a specific date
router.get(
  "/class/:classId/date/:date",
  protect,
  attendanceController.getClassAttendance
);

// Get attendance for a student
router.get(
  "/student/:studentId",
  protect,
  attendanceController.getStudentAttendance
);

// Get attendance statistics for a class
router.get(
  "/class/:classId/stats",
  protect,
  attendanceController.getAttendanceStats
);

module.exports = router;
