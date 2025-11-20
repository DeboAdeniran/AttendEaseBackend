const express = require("express");
const { body } = require("express-validator");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validation");
const classController = require("../controllers/classController");

const router = express.Router();

// Get all classes
router.get("/", protect, classController.getAllClasses);

// Get class by ID
router.get("/:id", protect, classController.getClass);

//Get class by class code
router.get(
  "/class_code/:class_code",
  protect,
  classController.getClassByClassCode
);

// Create new class (lecturer only)
router.post(
  "/",
  protect,
  authorize("lecturer"),
  [
    body("course_id").notEmpty().withMessage("Course ID is required"),
    body("class_code").notEmpty().withMessage("Class code is required"),
    body("day_of_week").notEmpty().withMessage("Day of week is required"),
    body("start_time").notEmpty().withMessage("Start time is required"),
    body("end_time").notEmpty().withMessage("End time is required"),
    body("location").notEmpty().withMessage("Location is required"),
    body("semester").notEmpty().withMessage("Semester is required"),
    validate,
  ],
  classController.createClass
);

// Update class
router.put("/:id", protect, authorize("lecturer"), classController.updateClass);

// Delete class (soft delete)
router.delete(
  "/:id",
  protect,
  authorize("lecturer"),
  classController.deleteClass
);

// Get students enrolled in a class
router.get("/:id/students", protect, classController.getClassStudents);

// Enroll student in class
router.post(
  "/:id/enroll",
  protect,
  [
    body("student_id").notEmpty().withMessage("Student ID is required"),
    validate,
  ],
  classController.enrollStudent
);

// Unenroll student from class
router.post(
  "/:id/unenroll",
  protect,
  authorize("lecturer"),
  [
    body("student_id").notEmpty().withMessage("Student ID is required"),
    validate,
  ],
  classController.unenrollStudent
);

// Get class attendance overview
router.get(
  "/:id/attendance/overview",
  protect,
  classController.getClassAttendanceOverview
);

module.exports = router;
