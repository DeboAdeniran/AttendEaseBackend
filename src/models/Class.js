// =========================
// src/models/Class.js - FIXED VERSION
// =========================
const db = require("../config/database");

class Class {
  static async create(classData) {
    const [result] = await db.execute(
      `INSERT INTO classes 
       (course_id, lecturer_id, class_code, section, day_of_week, 
        start_time, end_time, location, max_students, semester) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        classData.course_id,
        classData.lecturer_id,
        classData.class_code,
        classData.section || null, // Handle undefined
        classData.day_of_week,
        classData.start_time,
        classData.end_time,
        classData.location,
        classData.max_students || 50, // Handle undefined
        classData.semester,
      ]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT cl.*, 
        co.course_code, co.course_name, co.description, co.credits,
        CONCAT(l.first_name, ' ', l.last_name) as lecturer_name,
        u.email as lecturer_email,
        l.title as lecturer_title,
        (SELECT COUNT(*) FROM enrollments WHERE class_id = cl.id AND status = 'active') as enrolled_count
      FROM classes cl
      JOIN courses co ON cl.course_id = co.id
      JOIN lecturers l ON cl.lecturer_id = l.id
      JOIN users u ON l.user_id = u.id
      WHERE cl.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async findByClassCode(classCode) {
    const [rows] = await db.execute(
      `SELECT cl.*, 
        co.course_code, co.course_name,
        CONCAT(l.first_name, ' ', l.last_name) as lecturer_name,
        u.email as lecturer_email
      FROM classes cl
      JOIN courses co ON cl.course_id = co.id
      JOIN lecturers l ON cl.lecturer_id = l.id
      JOIN users u ON l.user_id = u.id
      WHERE cl.class_code = ?`,
      [classCode]
    );
    return rows[0];
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT cl.*, 
        co.course_code, co.course_name,
        CONCAT(l.first_name, ' ', l.last_name) as lecturer_name,
        u.email as lecturer_email,
        (SELECT COUNT(*) FROM enrollments WHERE class_id = cl.id AND status = 'active') as enrolled_count
      FROM classes cl
      JOIN courses co ON cl.course_id = co.id
      JOIN lecturers l ON cl.lecturer_id = l.id
      JOIN users u ON l.user_id = u.id
      WHERE cl.is_active = 1
    `;
    const params = [];

    if (filters.lecturer_id) {
      query += " AND cl.lecturer_id = ?";
      params.push(filters.lecturer_id);
    }

    if (filters.course_id) {
      query += " AND cl.course_id = ?";
      params.push(filters.course_id);
    }

    if (filters.semester) {
      query += " AND cl.semester = ?";
      params.push(filters.semester);
    }

    if (filters.day_of_week) {
      query += " AND cl.day_of_week = ?";
      params.push(filters.day_of_week);
    }

    if (filters.search) {
      query += ` AND (cl.class_code LIKE ? OR co.course_name LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += " ORDER BY cl.day_of_week, cl.start_time";

    const [rows] = await db.execute(query, params);
    return rows;
  }

  static async update(id, updateData) {
    const fields = [];
    const values = [];

    const allowedFields = [
      "section",
      "day_of_week",
      "start_time",
      "end_time",
      "location",
      "max_students",
      "semester",
    ];

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
      `UPDATE classes SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return result.affectedRows;
  }

  static async delete(id) {
    // Soft delete - set is_active to false
    const [result] = await db.execute(
      "UPDATE classes SET is_active = 0 WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  }

  static async getEnrolledStudents(classId) {
    const [rows] = await db.execute(
      `SELECT s.*, 
        e.enrollment_date, e.status as enrollment_status,
        (SELECT COUNT(*) FROM attendance WHERE student_id = s.id AND class_id = ? AND status = 'Present') as present_count,
        (SELECT COUNT(*) FROM attendance WHERE student_id = s.id AND class_id = ?) as total_sessions,
        ROUND((SELECT COUNT(*) FROM attendance WHERE student_id = s.id AND class_id = ? AND status = 'Present') / 
              NULLIF((SELECT COUNT(*) FROM attendance WHERE student_id = s.id AND class_id = ?), 0) * 100, 2) as attendance_percentage
      FROM students s
      JOIN enrollments e ON s.id = e.student_id
      WHERE e.class_id = ? AND e.status = 'active'
      ORDER BY s.first_name, s.last_name`,
      [classId, classId, classId, classId, classId]
    );
    return rows;
  }

  static async enrollStudent(classId, studentId) {
    const [result] = await db.execute(
      "INSERT INTO enrollments (student_id, class_id, enrollment_date) VALUES (?, ?, CURDATE())",
      [studentId, classId]
    );
    return result.insertId;
  }

  static async unenrollStudent(classId, studentId) {
    const [result] = await db.execute(
      "UPDATE enrollments SET status = ? WHERE class_id = ? AND student_id = ?",
      ["dropped", classId, studentId]
    );
    return result.affectedRows;
  }

  static async getAttendanceOverview(classId, startDate, endDate) {
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

  static async getScheduleConflicts(
    lecturerId,
    dayOfWeek,
    startTime,
    endTime,
    excludeClassId = null
  ) {
    let query = `
      SELECT cl.*, co.course_code, co.course_name
      FROM classes cl
      JOIN courses co ON cl.course_id = co.id
      WHERE cl.lecturer_id = ? 
        AND cl.day_of_week = ? 
        AND cl.is_active = 1
        AND (
          (cl.start_time <= ? AND cl.end_time > ?) OR
          (cl.start_time < ? AND cl.end_time >= ?) OR
          (cl.start_time >= ? AND cl.end_time <= ?)
        )
    `;
    const params = [
      lecturerId,
      dayOfWeek,
      startTime,
      startTime,
      endTime,
      endTime,
      startTime,
      endTime,
    ];

    if (excludeClassId) {
      query += " AND cl.id != ?";
      params.push(excludeClassId);
    }

    const [rows] = await db.execute(query, params);
    return rows;
  }
}

module.exports = Class;
