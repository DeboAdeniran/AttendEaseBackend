const db = require("../config/database");

class Student {
  static async create(studentData) {
    const [result] = await db.execute(
      `INSERT INTO students (user_id, matric_no, first_name, last_name, 
       department, level, phone, date_of_birth, address) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentData.user_id,
        studentData.matric_no,
        studentData.first_name,
        studentData.last_name,
        studentData.department,
        studentData.level,
        studentData.phone || null,
        studentData.date_of_birth || null,
        studentData.address || null,
      ]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT s.*, u.email, u.role 
       FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async findByUserId(userId) {
    const [rows] = await db.execute(
      `SELECT s.*, u.email 
       FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.user_id = ?`,
      [userId]
    );
    return rows[0];
  }

  static async findByMatricNo(matricNo) {
    const [rows] = await db.execute(
      "SELECT * FROM students WHERE matric_no = ?",
      [matricNo]
    );
    return rows[0];
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT s.*, u.email 
      FROM students s 
      JOIN users u ON s.user_id = u.id 
      WHERE 1=1
    `;
    const params = [];

    if (filters.department) {
      query += " AND s.department = ?";
      params.push(filters.department);
    }

    if (filters.level) {
      query += " AND s.level = ?";
      params.push(filters.level);
    }

    if (filters.search) {
      query += ` AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.matric_no LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY s.first_name, s.last_name";

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
      `UPDATE students SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return result.affectedRows;
  }

  static async getAttendanceSummary(studentId, filters = {}) {
    let query = `
      SELECT * FROM student_attendance_summary 
      WHERE student_id = ?
    `;
    const params = [studentId];

    if (filters.semester) {
      query += " AND semester = ?";
      params.push(filters.semester);
    }

    const [rows] = await db.execute(query, params);
    return rows;
  }
}

module.exports = Student;
