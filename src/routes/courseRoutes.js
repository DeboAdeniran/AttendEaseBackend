// const express = require("express");
// const { body } = require("express-validator");
// const { protect, authorize } = require("../middleware/auth");
// const validate = require("../middleware/validation");
// const courseController = require("../controllers/courseController");

// const router = express.Router();

// // Get all courses
// router.get("/", protect, courseController.getAllCourses);

// // Get course by ID
// router.get("/:id", protect, courseController.getCourse);

// // Create course (lecturer/admin only)
// router.post(
//   "/",
//   protect,
//   authorize("lecturer", "admin"),
//   [
//     body("course_code").notEmpty().withMessage("Course code is required"),
//     body("course_name").notEmpty().withMessage("Course name is required"),
//     body("credits")
//       .isInt({ min: 1, max: 6 })
//       .withMessage("Credits must be between 1 and 6"),
//     body("semester").notEmpty().withMessage("Semester is required"),
//     validate,
//   ],
//   courseController.createCourse
// );

// // Update course
// router.put(
//   "/:id",
//   protect,
//   authorize("lecturer", "admin"),
//   courseController.updateCourse
// );

// // Archive course
// router.delete(
//   "/:id",
//   protect,
//   authorize("lecturer", "admin"),
//   courseController.archiveCourse
// );

// // Unarchive course
// router.post(
//   "/:id/unarchive",
//   protect,
//   authorize("lecturer", "admin"),
//   courseController.unarchiveCourse
// );

// // Get course classes
// router.get("/:id/classes", protect, courseController.getCourseClasses);

// // Get course statistics
// router.get("/:id/statistics", protect, courseController.getCourseStatistics);

// module.exports = router;

const express = require("express");
const { body } = require("express-validator");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validation");
const courseController = require("../controllers/courseController");

const router = express.Router();

// Get all courses
router.get("/", protect, courseController.getAllCourses);

// Get courses by lecturer ID - ADD THIS NEW ROUTE
router.get(
  "/lecturer/:lecturerId",
  protect,
  courseController.getCoursesByLecturer
);

// Get course by ID
router.get("/:id", protect, courseController.getCourse);

// Create course (lecturer/admin only)
router.post(
  "/",
  protect,
  authorize("lecturer", "admin"),
  [
    body("course_code").notEmpty().withMessage("Course code is required"),
    body("course_name").notEmpty().withMessage("Course name is required"),
    body("credits")
      .isInt({ min: 1, max: 6 })
      .withMessage("Credits must be between 1 and 6"),
    body("semester").notEmpty().withMessage("Semester is required"),
    validate,
  ],
  courseController.createCourse
);

// Update course
router.put(
  "/:id",
  protect,
  authorize("lecturer", "admin"),
  courseController.updateCourse
);

// Archive course
router.delete(
  "/:id",
  protect,
  authorize("lecturer", "admin"),
  courseController.archiveCourse
);

// Unarchive course
router.post(
  "/:id/unarchive",
  protect,
  authorize("lecturer", "admin"),
  courseController.unarchiveCourse
);

// Get course classes
router.get("/:id/classes", protect, courseController.getCourseClasses);

// Get course statistics
router.get("/:id/statistics", protect, courseController.getCourseStatistics);

module.exports = router;
