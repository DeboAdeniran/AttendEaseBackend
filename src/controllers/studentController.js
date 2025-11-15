const Student = require("../models/Student");
const Attendance = require("../models/Attendance");

exports.getAllStudents = async (req, res, next) => {
  try {
    const filters = req.query;
    const students = await Student.getAll(filters);

    res.json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateStudent = async (req, res, next) => {
  try {
    // Students can only update their own profile
    if (
      req.user.role === "student" &&
      req.user.studentId !== parseInt(req.params.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this profile",
      });
    }

    const allowedFields = [
      "first_name",
      "last_name",
      "phone",
      "date_of_birth",
      "address",
      "profile_image",
    ];
    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const affectedRows = await Student.update(req.params.id, updateData);

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentAttendanceSummary = async (req, res, next) => {
  try {
    const filters = req.query;
    const summary = await Student.getAttendanceSummary(req.params.id, filters);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentClasses = async (req, res, next) => {
  try {
    const db = require("../config/database");

    const [classes] = await db.execute(
      `SELECT cl.*, 
        co.course_code, co.course_name, co.credits,
        CONCAT(l.first_name, ' ', l.last_name) as lecturer_name,
        e.enrollment_date,
        (SELECT COUNT(*) FROM attendance WHERE student_id = ? AND class_id = cl.id AND status = 'Present') as present_count,
        (SELECT COUNT(*) FROM attendance WHERE student_id = ? AND class_id = cl.id) as total_sessions
      FROM classes cl
      JOIN courses co ON cl.course_id = co.id
      JOIN lecturers l ON cl.lecturer_id = l.id
      JOIN enrollments e ON cl.id = e.class_id
      WHERE e.student_id = ? AND e.status = 'active' AND cl.is_active = 1
      ORDER BY cl.day_of_week, cl.start_time`,
      [req.params.id, req.params.id, req.params.id]
    );

    res.json({
      success: true,
      count: classes.length,
      data: classes,
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentDashboardStats = async (req, res, next) => {
  try {
    const db = require("../config/database");

    // Get overall statistics
    const [stats] = await db.execute(
      `SELECT 
        COUNT(DISTINCT cl.id) as total_classes,
        COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.attendance_date END) as present_days,
        COUNT(DISTINCT CASE WHEN a.status = 'Absent' THEN a.attendance_date END) as absent_days,
        COUNT(DISTINCT CASE WHEN a.status = 'Late' THEN a.attendance_date END) as late_days,
        ROUND(AVG(CASE WHEN a.status = 'Present' THEN 100 ELSE 0 END), 2) as overall_attendance_percentage
      FROM enrollments e
      JOIN classes cl ON e.class_id = cl.id
      LEFT JOIN attendance a ON e.student_id = a.student_id AND cl.id = a.class_id
      WHERE e.student_id = ? AND e.status = 'active'`,
      [req.params.id]
    );

    // Get at-risk classes (below 85% attendance)
    const [atRiskClasses] = await db.execute(
      `SELECT COUNT(*) as at_risk_count
      FROM (
        SELECT cl.id,
          ROUND((SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0)) * 100, 2) as percentage
        FROM classes cl
        JOIN enrollments e ON cl.id = e.class_id
        LEFT JOIN attendance a ON cl.id = a.class_id AND e.student_id = a.student_id
        WHERE e.student_id = ? AND e.status = 'active'
        GROUP BY cl.id
        HAVING percentage < 85 OR percentage IS NULL
      ) as risk_classes`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...stats[0],
        at_risk_classes: atRiskClasses[0].at_risk_count,
      },
    });
  } catch (error) {
    next(error);
  }
};
