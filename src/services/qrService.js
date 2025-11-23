const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const db = require("../config/database");

class QRService {
  /**
   * Generate a QR code for a class session
   * @param {number} classId - The class ID
   * @param {number} lecturerId - The lecturer ID
   * @param {string} date - The attendance date (YYYY-MM-DD)
   * @param {number} validityMinutes - How long the QR code is valid (default: 15 minutes)
   * @returns {Object} - QR code data URL and session token
   */
  static async generateAttendanceQR(
    classId,
    lecturerId,
    date,
    validityMinutes = 15
  ) {
    try {
      // Generate unique session token
      const sessionToken = uuidv4();
      const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000);

      // Store QR session in database
      const [result] = await db.execute(
        `INSERT INTO qr_attendance_sessions 
         (class_id, session_token, attendance_date, created_by, expires_at, is_active) 
         VALUES (?, ?, ?, ?, ?, 1)`,
        [classId, sessionToken, date, lecturerId, expiresAt]
      );

      const sessionId = result.insertId;

      // Create QR code data (you can customize this payload)
      const qrData = JSON.stringify({
        sessionToken,
        classId,
        date,
        type: "attendance",
      });

      // Generate QR code as data URL
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      return {
        sessionId,
        sessionToken,
        qrCodeDataURL,
        expiresAt,
        validityMinutes,
      };
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Validate QR code session
   * @param {string} sessionToken - The session token from scanned QR
   * @returns {Object} - Session details if valid
   */
  static async validateQRSession(sessionToken) {
    const [sessions] = await db.execute(
      `SELECT qs.*, cl.class_code, co.course_name, co.course_code
       FROM qr_attendance_sessions qs
       JOIN classes cl ON qs.class_id = cl.id
       JOIN courses co ON cl.course_id = co.id
       WHERE qs.session_token = ? 
         AND qs.is_active = 1 
         AND qs.expires_at > NOW()`,
      [sessionToken]
    );

    if (sessions.length === 0) {
      return null;
    }

    return sessions[0];
  }

  /**
   * Mark attendance via QR code scan
   * @param {string} sessionToken - The session token from scanned QR
   * @param {number} studentId - The student ID marking attendance
   * @returns {Object} - Attendance record
   */
  static async markAttendanceViaQR(sessionToken, studentId) {
    // Validate session
    const session = await this.validateQRSession(sessionToken);

    if (!session) {
      throw new Error("Invalid or expired QR code");
    }

    // Check if student is enrolled in this class
    const [enrollments] = await db.execute(
      `SELECT * FROM enrollments 
       WHERE class_id = ? AND student_id = ? AND status = 'active'`,
      [session.class_id, studentId]
    );

    if (enrollments.length === 0) {
      throw new Error("Student is not enrolled in this class");
    }

    // Check if attendance already marked for this date
    const [existing] = await db.execute(
      `SELECT * FROM attendance 
       WHERE class_id = ? AND student_id = ? AND attendance_date = ?`,
      [session.class_id, studentId, session.attendance_date]
    );

    let attendanceId;
    let status = "Present";

    if (existing.length > 0) {
      // Update existing attendance
      await db.execute(
        `UPDATE attendance 
         SET status = ?, marked_by = ?, notes = 'Marked via QR code', updated_at = NOW()
         WHERE id = ?`,
        [status, session.created_by, existing[0].id]
      );
      attendanceId = existing[0].id;
    } else {
      // Create new attendance record
      const [result] = await db.execute(
        `INSERT INTO attendance 
         (class_id, student_id, attendance_date, status, marked_by, notes) 
         VALUES (?, ?, ?, ?, ?, 'Marked via QR code')`,
        [
          session.class_id,
          studentId,
          session.attendance_date,
          status,
          session.created_by,
        ]
      );
      attendanceId = result.insertId;
    }

    // Log the QR scan
    await db.execute(
      `INSERT INTO qr_scan_logs 
       (session_id, student_id, scan_time) 
       VALUES (?, ?, NOW())`,
      [session.id, studentId]
    );

    // Get full attendance details
    const [attendance] = await db.execute(
      `SELECT a.*, 
        cl.class_code, co.course_name, co.course_code,
        s.first_name, s.last_name, s.matric_no
       FROM attendance a
       JOIN classes cl ON a.class_id = cl.id
       JOIN courses co ON cl.course_id = co.id
       JOIN students s ON a.student_id = s.id
       WHERE a.id = ?`,
      [attendanceId]
    );

    return attendance[0];
  }

  /**
   * Deactivate a QR session (for manual expiry)
   * @param {number} sessionId - The session ID
   * @returns {boolean} - Success status
   */
  static async deactivateSession(sessionId) {
    const [result] = await db.execute(
      `UPDATE qr_attendance_sessions 
       SET is_active = 0 
       WHERE id = ?`,
      [sessionId]
    );

    return result.affectedRows > 0;
  }

  /**
   * Get active session for a class and date
   * @param {number} classId - The class ID
   * @param {string} date - The attendance date
   * @returns {Object|null} - Active session or null
   */
  static async getActiveSession(classId, date) {
    const [sessions] = await db.execute(
      `SELECT * FROM qr_attendance_sessions 
       WHERE class_id = ? 
         AND attendance_date = ? 
         AND is_active = 1 
         AND expires_at > NOW()
       ORDER BY created_at DESC 
       LIMIT 1`,
      [classId, date]
    );

    return sessions.length > 0 ? sessions[0] : null;
  }

  /**
   * Get scan logs for a session
   * @param {number} sessionId - The session ID
   * @returns {Array} - List of scans
   */
  static async getSessionScanLogs(sessionId) {
    const [logs] = await db.execute(
      `SELECT sl.*, 
        s.first_name, s.last_name, s.matric_no
       FROM qr_scan_logs sl
       JOIN students s ON sl.student_id = s.id
       WHERE sl.session_id = ?
       ORDER BY sl.scan_time DESC`,
      [sessionId]
    );

    return logs;
  }
}

module.exports = QRService;
