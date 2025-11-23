const express = require("express");
const cors = require("cors");
const config = require("./config/config");
const errorHandler = require("./middleware/errorHandler");

// Import routes
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const lecturerRoutes = require("./routes/lecturerRoutes");
const courseRoutes = require("./routes/courseRoutes");
const classRoutes = require("./routes/classRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const qrRoutes = require("./routes/qrRoutes");

const app = express();

// Middleware
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/lecturers", lecturerRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/qr", qrRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
