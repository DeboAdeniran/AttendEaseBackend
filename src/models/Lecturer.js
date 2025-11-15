const db = require("../config/database");

class Lecturer {
  static async create(lecturerData) {
    const [result] = await db.execute(
      `INSERT INTO lecturers (user_id, staff_id, first_name, last_name, 
       department, title, phone, office_location) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lecturerData.user_id,
        lecturerData.staff_id,
        lecturerData.first_name,
        lecturerData.last_name,
        lecturerData.department,
        lecturerData.title || null,
        lecturerData.phone || null,
        lecturerData.office_location || null,
      ]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT l.*, u.email, u.role 
       FROM lecturers l 
       JOIN users u ON l.user_id = u.id 
       WHERE l.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async findByUserId(userId) {
    const [rows] = await db.execute(
      `SELECT l.*, u.email 
       FROM lecturers l 
       JOIN users u ON l.user_id = u.id 
       WHERE l.user_id = ?`,
      [userId]
    );
    return rows[0];
  }

  static async findByStaffId(staffId) {
    const [rows] = await db.execute(
      "SELECT * FROM lecturers WHERE staff_id = ?",
      [staffId]
    );
    return rows[0];
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT l.*, u.email 
      FROM lecturers l 
      JOIN users u ON l.user_id = u.id 
      WHERE 1=1
    `;
    const params = [];

    if (filters.department) {
      query += " AND l.department = ?";
      params.push(filters.department);
    }

    if (filters.search) {
      query += ` AND (l.first_name LIKE ? OR l.last_name LIKE ? OR l.staff_id LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY l.first_name, l.last_name";

    const [rows] = await db.execute(query, params);
    return rows;
  }

  static async update(id, updateData) {
    const fields = [];
    const values = [];

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    values.push(id);

    const [result] = await db.execute(
      `UPDATE lecturers SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return result.affectedRows;
  }

  static async getClasses(lecturerId, filters = {}) {
    let query = `
      SELECT cl.*, 
        co.course_code, co.course_name, co.credits,
        (SELECT COUNT(*) FROM enrollments WHERE class_id = cl.id AND status = 'active') as enrolled_count
      FROM classes cl
      JOIN courses co ON cl.course_id = co.id
      WHERE cl.lecturer_id = ? AND cl.is_active = 1
    `;
    const params = [lecturerId];

    if (filters.semester) {
      query += " AND cl.semester = ?";
      params.push(filters.semester);
    }

    if (filters.day_of_week) {
      query += " AND cl.day_of_week = ?";
      params.push(filters.day_of_week);
    }

    query += " ORDER BY cl.day_of_week, cl.start_time";

    const [rows] = await db.execute(query, params);
    return rows;
  }

  static async getSchedule(lecturerId, startDate, endDate) {
    const [rows] = await db.execute(
      `SELECT cl.*, 
        co.course_code, co.course_name,
        (SELECT COUNT(*) FROM enrollments WHERE class_id = cl.id AND status = 'active') as enrolled_count
      FROM classes cl
      JOIN courses co ON cl.course_id = co.id
      WHERE cl.lecturer_id = ? AND cl.is_active = 1
      ORDER BY cl.day_of_week, cl.start_time`,
      [lecturerId]
    );
    return rows;
  }

  static async getStatistics(lecturerId) {
    const [rows] = await db.execute(
      `SELECT 
        COUNT(DISTINCT cl.id) as total_classes,
        COUNT(DISTINCT e.student_id) as total_students,
        COUNT(DISTINCT a.attendance_date) as total_sessions,
        ROUND(AVG(CASE WHEN a.status = 'Present' THEN 100 ELSE 0 END), 2) as avg_attendance_rate
      FROM lecturers l
      LEFT JOIN classes cl ON l.id = cl.lecturer_id AND cl.is_active = 1
      LEFT JOIN enrollments e ON cl.id = e.class_id AND e.status = 'active'
      LEFT JOIN attendance a ON cl.id = a.class_id
      WHERE l.id = ?
      GROUP BY l.id`,
      [lecturerId]
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

module.exports = Lecturer;
