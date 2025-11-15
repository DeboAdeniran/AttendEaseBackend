const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const lecturerController = require("../controllers/lecturerController");

const router = express.Router();

// Get all lecturers (admin only)
router.get(
  "/",
  protect,
  authorize("admin"),
  lecturerController.getAllLecturers
);

// Get lecturer by ID
router.get("/:id", protect, lecturerController.getLecturer);

// Update lecturer profile
router.put("/:id", protect, lecturerController.updateLecturer);

// Get lecturer's classes
router.get("/:id/classes", protect, lecturerController.getLecturerClasses);

// Get lecturer's schedule
router.get("/:id/schedule", protect, lecturerController.getLecturerSchedule);

// Get lecturer statistics
router.get(
  "/:id/statistics",
  protect,
  lecturerController.getLecturerStatistics
);

// Get lecturer dashboard stats
router.get(
  "/:id/dashboard/stats",
  protect,
  authorize("lecturer"),
  lecturerController.getLecturerDashboardStats
);

module.exports = router;
