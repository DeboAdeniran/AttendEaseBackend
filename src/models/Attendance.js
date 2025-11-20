// src/models/Attendance.js
const db = require("../config/database");

class Attendance {
  static async markAttendance(attendanceData) {
    const [result] = await db.execute(
      `INSERT INTO attendance 
       (class_id, student_id, attendance_date, status, marked_by, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        attendanceData.class_id,
        attendanceData.student_id,
        attendanceData.attendance_date,
        attendanceData.status,
        attendanceData.marked_by,
        attendanceData.notes || null,
      ]
    );
    return result.insertId;
  }

  static async markBulkAttendance(records) {
    if (!records || records.length === 0) {
      throw new Error("No attendance records provided");
    }

    const values = records
      .map(
        (record) =>
          `(${record.class_id}, ${record.student_id}, '${
            record.attendance_date
          }', '${record.status}', ${record.marked_by}, ${
            record.notes ? `'${record.notes}'` : "NULL"
          })`
      )
      .join(",");

    const query = `
      INSERT INTO attendance 
      (class_id, student_id, attendance_date, status, marked_by, notes) 
      VALUES ${values}
      ON DUPLICATE KEY UPDATE 
        status = VALUES(status),
        marked_by = VALUES(marked_by),
        notes = VALUES(notes)
    `;

    const [result] = await db.execute(query);
    return result.affectedRows;
  }

  static async getByClassAndDate(classId, date) {
    const [rows] = await db.execute(
      `SELECT a.*, 
        s.matric_no, s.first_name, s.last_name, s.department,
        CONCAT(l.first_name, ' ', l.last_name) as marked_by_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN lecturers l ON a.marked_by = l.id
      WHERE a.class_id = ? AND a.attendance_date = ?
      ORDER BY s.first_name, s.last_name`,
      [classId, date]
    );
    return rows;
  }

  static async getStudentAttendance(studentId, filters = {}) {
    let query = `
      SELECT a.*, 
        cl.class_code, cl.day_of_week, cl.start_time, cl.end_time, cl.location,
        co.course_code, co.course_name,
        CONCAT(l.first_name, ' ', l.last_name) as marked_by_name
      FROM attendance a
      JOIN classes cl ON a.class_id = cl.id
      JOIN courses co ON cl.course_id = co.id
      LEFT JOIN lecturers l ON a.marked_by = l.id
      WHERE a.student_id = ?
    `;
    const params = [studentId];

    if (filters.class_id) {
      query += " AND a.class_id = ?";
      params.push(filters.class_id);
    }

    if (filters.start_date && filters.end_date) {
      query += " AND a.attendance_date BETWEEN ? AND ?";
      params.push(filters.start_date, filters.end_date);
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
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as total_present,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as total_absent,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as total_late,
        SUM(CASE WHEN status = 'Excused' THEN 1 ELSE 0 END) as total_excused,
        ROUND(AVG(CASE WHEN status = 'Present' THEN 100 ELSE 0 END), 2) as avg_attendance_rate
      FROM attendance
      WHERE class_id = ? AND attendance_date BETWEEN ? AND ?`,
      [classId, startDate, endDate]
    );
    return rows[0];
  }

  static async updateAttendance(id, updateData) {
    const fields = [];
    const values = [];

    const allowedFields = ["status", "notes"];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    });

    if (fields.length === 0) {
      return 0;
    }

    values.push(id);

    const [result] = await db.execute(
      `UPDATE attendance SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return result.affectedRows;
  }

  static async deleteAttendance(id) {
    const [result] = await db.execute("DELETE FROM attendance WHERE id = ?", [
      id,
    ]);
    return result.affectedRows;
  }
}

module.exports = Attendance;
