const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Student = require("../models/Student");
const Lecturer = require("../models/Lecturer");
const config = require("../config/config");
const { profile } = require("winston");

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

exports.register = async (req, res, next) => {
  try {
    const { email, password, role, ...profileData } = req.body;

    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Create user
    const userId = await User.create({ email, password, role });

    // Create role-specific profile
    if (role === "student") {
      await Student.create({ ...profileData, user_id: userId });
    } else if (role === "lecturer") {
      await Lecturer.create({ ...profileData, user_id: userId });
    }

    const token = generateToken(userId, role);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: { id: userId, email, role, profile: profileData },
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password
    const isPasswordValid = await User.comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Get profile data
    let profileData;
    if (user.role === "student") {
      profileData = await Student.findByUserId(user.id);
    } else if (user.role === "lecturer") {
      profileData = await Lecturer.findByUserId(user.id);
    }

    const token = generateToken(user.id, user.role);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: profileData,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let profileData;
    if (user.role === "student") {
      profileData = await Student.findByUserId(user.id);
    } else if (user.role === "lecturer") {
      profileData = await Lecturer.findByUserId(user.id);
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: profileData,
      },
    });
  } catch (error) {
    next(error);
  }
};
