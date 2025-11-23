const QRService = require("../services/qrService");

exports.generateQRCode = async (req, res, next) => {
  try {
    const { class_id, attendance_date, validity_minutes } = req.body;

    // Validate lecturer owns this class
    const db = require("../config/database");
    const [classes] = await db.execute(
      "SELECT * FROM classes WHERE id = ? AND lecturer_id = ?",
      [class_id, req.user.lecturerId]
    );

    if (classes.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to generate QR for this class",
      });
    }

    // Check if there's already an active session
    const existingSession = await QRService.getActiveSession(
      class_id,
      attendance_date
    );

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: "An active QR session already exists for this class and date",
        data: {
          sessionId: existingSession.id,
          expiresAt: existingSession.expires_at,
        },
      });
    }

    const qrData = await QRService.generateAttendanceQR(
      class_id,
      req.user.lecturerId,
      attendance_date,
      validity_minutes || 15
    );

    res.status(201).json({
      success: true,
      message: "QR code generated successfully",
      data: qrData,
    });
  } catch (error) {
    next(error);
  }
};

exports.scanQRCode = async (req, res, next) => {
  try {
    const { session_token } = req.body;

    if (!session_token) {
      return res.status(400).json({
        success: false,
        message: "Session token is required",
      });
    }

    // Validate session first
    const session = await QRService.validateQRSession(session_token);

    if (!session) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired QR code",
      });
    }

    // Mark attendance
    const attendance = await QRService.markAttendanceViaQR(
      session_token,
      req.user.studentId
    );

    res.json({
      success: true,
      message: "Attendance marked successfully",
      data: attendance,
    });
  } catch (error) {
    if (error.message.includes("not enrolled")) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes("Invalid or expired")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

exports.getActiveSession = async (req, res, next) => {
  try {
    const { classId, date } = req.params;

    const session = await QRService.getActiveSession(classId, date);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "No active QR session found",
      });
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

exports.deactivateSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // Validate ownership
    const db = require("../config/database");
    const [sessions] = await db.execute(
      `SELECT qs.* FROM qr_attendance_sessions qs
       JOIN classes cl ON qs.class_id = cl.id
       WHERE qs.id = ? AND cl.lecturer_id = ?`,
      [sessionId, req.user.lecturerId]
    );

    if (sessions.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to deactivate this session",
      });
    }

    const success = await QRService.deactivateSession(sessionId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    res.json({
      success: true,
      message: "QR session deactivated successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.getSessionScanLogs = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // Validate ownership
    const db = require("../config/database");
    const [sessions] = await db.execute(
      `SELECT qs.* FROM qr_attendance_sessions qs
       JOIN classes cl ON qs.class_id = cl.id
       WHERE qs.id = ? AND cl.lecturer_id = ?`,
      [sessionId, req.user.lecturerId]
    );

    if (sessions.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this session",
      });
    }

    const logs = await QRService.getSessionScanLogs(sessionId);

    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

exports.validateQRCode = async (req, res, next) => {
  try {
    const { session_token } = req.body;

    if (!session_token) {
      return res.status(400).json({
        success: false,
        message: "Session token is required",
      });
    }

    const session = await QRService.validateQRSession(session_token);

    if (!session) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired QR code",
      });
    }

    res.json({
      success: true,
      message: "QR code is valid",
      data: {
        classId: session.class_id,
        classCode: session.class_code,
        courseName: session.course_name,
        courseCode: session.course_code,
        date: session.attendance_date,
        expiresAt: session.expires_at,
      },
    });
  } catch (error) {
    next(error);
  }
};
