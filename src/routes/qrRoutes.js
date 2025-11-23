const express = require("express");
const { body } = require("express-validator");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validation");
const qrController = require("../controllers/qrController");

const router = express.Router();

// Generate QR code for attendance (lecturer only)
router.post(
  "/generate",
  protect,
  authorize("lecturer"),
  [
    body("class_id").notEmpty().withMessage("Class ID is required"),
    body("attendance_date").isDate().withMessage("Valid date is required"),
    body("validity_minutes")
      .optional()
      .isInt({ min: 1, max: 120 })
      .withMessage("Validity must be between 1 and 120 minutes"),
    validate,
  ],
  qrController.generateQRCode
);

// Validate QR code (before scanning)
router.post(
  "/validate",
  protect,
  authorize("student"),
  [
    body("session_token").notEmpty().withMessage("Session token is required"),
    validate,
  ],
  qrController.validateQRCode
);

// Scan QR code to mark attendance (student only)
router.post(
  "/scan",
  protect,
  authorize("student"),
  [
    body("session_token").notEmpty().withMessage("Session token is required"),
    validate,
  ],
  qrController.scanQRCode
);

// Get active session for a class and date
router.get("/session/:classId/:date", protect, qrController.getActiveSession);

// Deactivate a QR session (lecturer only)
router.put(
  "/session/:sessionId/deactivate",
  protect,
  authorize("lecturer"),
  qrController.deactivateSession
);

// Get scan logs for a session (lecturer only)
router.get(
  "/session/:sessionId/logs",
  protect,
  authorize("lecturer"),
  qrController.getSessionScanLogs
);

module.exports = router;
