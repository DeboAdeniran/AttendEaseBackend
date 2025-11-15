const db = require("../config/database");

class Attendance {
  static async markAttendance(attendanceData) {
    const [result] = await db.execute(
      `INSERT INTO attendance 
       (class_id, student_id, attendance_date, status, marked_by, notes) 
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       status = VALUES(status), 
       marked_by = VALUES(marked_by), 
       notes = VALUES(notes)`,
      [
        attendanceData.class_id,
        attendanceData.student_id,
        attendanceData.attendance_date,
        attendanceData.status,
        attendanceData.marked_by,
        attendanceData.notes || null,
      ]
    );
    return result.insertId || result.affectedRows;
  }

  static async markBulkAttendance(attendanceRecords) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      for (const record of attendanceRecords) {
        await connection.execute(
          `INSERT INTO attendance 
           (class_id, student_id, attendance_date, status, marked_by, notes) 
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
           status = VALUES(status), 
           marked_by = VALUES(marked_by), 
           notes = VALUES(notes)`,
          [
            record.class_id,
            record.student_id,
            record.attendance_date,
            record.status,
            record.marked_by,
            record.notes || null,
          ]
        );
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getByClassAndDate(classId, date) {
    const [rows] = await db.execute(
      `SELECT a.*, 
        s.matric_no, s.first_name, s.last_name, s.department,
        CONCAT(l.first_name, ' ', l.last_name) as marked_by_name
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       JOIN lecturers l ON a.marked_by = l.id
       WHERE a.class_id = ? AND a.attendance_date = ?`,
      [classId, date]
    );
    return rows;
  }

  static async getStudentAttendance(studentId, filters = {}) {
    let query = `
      SELECT a.*, 
        cl.class_code,
        c.course_code, c.course_name,
        CONCAT(l.first_name, ' ', l.last_name) as marked_by_name
      FROM attendance a
      JOIN classes cl ON a.class_id = cl.id
      JOIN courses c ON cl.course_id = c.id
      JOIN lecturers l ON a.marked_by = l.id
      WHERE a.student_id = ?
    `;
    const params = [studentId];

    if (filters.startDate && filters.endDate) {
      query += " AND a.attendance_date BETWEEN ? AND ?";
      params.push(filters.startDate, filters.endDate);
    }

    if (filters.classId) {
      query += " AND a.class_id = ?";
      params.push(filters.classId);
    }

    if (filters.status) {
      query += " AND a.status = ?";
      params.push(filters.status);
    }

    query += " ORDER BY a.attendance_date DESC";

    const [rows] = await db.execute(query, params);
    return rows;
  }

  static async getClassAttendanceStats(classId, startDate, endDate) {
    const [rows] = await db.execute(
      `SELECT 
        COUNT(DISTINCT student_id) as total_students,
        COUNT(DISTINCT attendance_date) as total_sessions,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN status = 'Excused' THEN 1 ELSE 0 END) as excused_count,
        ROUND(AVG(CASE WHEN status = 'Present' THEN 100 ELSE 0 END), 2) as avg_attendance_rate
      FROM attendance
      WHERE class_id = ? AND attendance_date BETWEEN ? AND ?`,
      [classId, startDate, endDate]
    );
    return rows[0];
  }
}

module.exports = Attendance;
