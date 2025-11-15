const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validation");

const router = express.Router();

router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("role").isIn(["student", "lecturer"]).withMessage("Invalid role"),
    validate,
  ],
  authController.register
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
    validate,
  ],
  authController.login
);

router.get("/profile", protect, authController.getProfile);

module.exports = router;
