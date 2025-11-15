const db = require("../config/database");

class Course {
  static async create(courseData) {
    const [result] = await db.execute(
      `INSERT INTO courses (course_code, course_name, description, credits, semester) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        courseData.course_code,
        courseData.course_name,
        courseData.description || null,
        courseData.credits,
        courseData.semester,
      ]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT c.*,
        (SELECT COUNT(*) FROM classes WHERE course_id = c.id AND is_active = 1) as class_count,
        (SELECT COUNT(DISTINCT e.student_id) FROM classes cl 
         JOIN enrollments e ON cl.id = e.class_id 
         WHERE cl.course_id = c.id AND e.status = 'active') as total_enrollments
      FROM courses c
      WHERE c.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async findByCourseCode(courseCode) {
    const [rows] = await db.execute(
      "SELECT * FROM courses WHERE course_code = ? AND is_archived = 0",
      [courseCode]
    );
    return rows[0];
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT c.*,
        (SELECT COUNT(*) FROM classes WHERE course_id = c.id AND is_active = 1) as class_count,
        (SELECT COUNT(DISTINCT e.student_id) FROM classes cl 
         JOIN enrollments e ON cl.id = e.class_id 
         WHERE cl.course_id = c.id AND e.status = 'active') as total_enrollments
      FROM courses c
      WHERE c.is_archived = 0
    `;
    const params = [];

    if (filters.semester) {
      query += " AND c.semester = ?";
      params.push(filters.semester);
    }

    if (filters.search) {
      query += ` AND (c.course_code LIKE ? OR c.course_name LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += " ORDER BY c.course_code";

    const [rows] = await db.execute(query, params);
    return rows;
  }

  static async update(id, updateData) {
    const fields = [];
    const values = [];

    const allowedFields = ["course_name", "description", "credits", "semester"];

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
      `UPDATE courses SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return result.affectedRows;
  }

  static async archive(id) {
    const [result] = await db.execute(
      "UPDATE courses SET is_archived = 1 WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  }

  static async unarchive(id) {
    const [result] = await db.execute(
      "UPDATE courses SET is_archived = 0 WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  }

  static async getClasses(courseId) {
    const [rows] = await db.execute(
      `SELECT cl.*, 
        CONCAT(l.first_name, ' ', l.last_name) as lecturer_name,
        (SELECT COUNT(*) FROM enrollments WHERE class_id = cl.id AND status = 'active') as enrolled_count
      FROM classes cl
      JOIN lecturers l ON cl.lecturer_id = l.id
      WHERE cl.course_id = ? AND cl.is_active = 1
      ORDER BY cl.section, cl.day_of_week, cl.start_time`,
      [courseId]
    );
    return rows;
  }

  static async getStatistics(courseId) {
    const [rows] = await db.execute(
      `SELECT 
        COUNT(DISTINCT cl.id) as total_classes,
        COUNT(DISTINCT e.student_id) as total_students,
        COUNT(DISTINCT a.attendance_date) as total_sessions,
        ROUND(AVG(CASE WHEN a.status = 'Present' THEN 100 ELSE 0 END), 2) as avg_attendance_rate
      FROM courses c
      LEFT JOIN classes cl ON c.id = cl.course_id AND cl.is_active = 1
      LEFT JOIN enrollments e ON cl.id = e.class_id AND e.status = 'active'
      LEFT JOIN attendance a ON cl.id = a.class_id
      WHERE c.id = ?
      GROUP BY c.id`,
      [courseId]
    );
    return (
      rows[0] || {
        total_classes: 0,
        total_students: 0,
        total_sessions: 0,
        avg_attendance_rate: 0,
      }
    );
  }
}

module.exports = Course;
