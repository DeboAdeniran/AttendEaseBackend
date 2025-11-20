const Attendance = require("../models/Attendance");

exports.markAttendance = async (req, res, next) => {
  try {
    const { class_id, student_id, attendance_date, status, notes } = req.body;

    const attendanceId = await Attendance.markAttendance({
      class_id,
      student_id,
      attendance_date,
      status,
      marked_by: req.user.lecturerId, // From auth middleware
      notes,
    });

    res.status(201).json({
      success: true,
      message: "Attendance marked successfully",
      data: { id: attendanceId },
    });
  } catch (error) {
    next(error);
  }
};

exports.markBulkAttendance = async (req, res, next) => {
  try {
    const { attendance_records } = req.body;

    // Add marked_by to all records
    const records = attendance_records.map((record) => ({
      ...record,
      marked_by: req.user.lecturerId,
    }));

    await Attendance.markBulkAttendance(records);

    res.json({
      success: true,
      message: "Bulk attendance marked successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.getClassAttendance = async (req, res, next) => {
  try {
    const { classId, date } = req.params;

    const attendance = await Attendance.getByClassAndDate(classId, date);

    res.json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentAttendance = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const filters = req.query;

    const attendance = await Attendance.getStudentAttendance(
      studentId,
      filters
    );

    res.json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAttendanceStats = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;

    const stats = await Attendance.getClassAttendanceStats(
      classId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

exports.getLecturerRecentAttendance = async (req, res, next) => {
  try {
    const { lecturerId } = req.params;
    const { limit = 50, courseId } = req.query; // Added courseId filter
    const db = require("../config/database");

    let query = `
      SELECT 
        a.id,
        a.attendance_date,
        a.status,
        a.notes,
        s.matric_no,
        s.first_name,
        s.last_name,
        s.department,
        cl.class_code,
        co.course_name,
        co.course_code,
        co.id as course_id,
        ROUND(
          (SELECT COUNT(*) FROM attendance 
           WHERE student_id = s.id AND status = 'Present') * 100.0 / 
          NULLIF((SELECT COUNT(*) FROM attendance WHERE student_id = s.id), 0),
          2
        ) as attendance_percentage
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN classes cl ON a.class_id = cl.id
      JOIN courses co ON cl.course_id = co.id
      WHERE cl.lecturer_id = ?`;

    const params = [lecturerId];

    // Add course filter if provided
    if (courseId) {
      query += ` AND co.id = ?`;
      params.push(courseId);
    }

    query += ` ORDER BY a.attendance_date DESC, a.id DESC LIMIT ?`;
    params.push(parseInt(limit));

    const [attendance] = await db.execute(query, params);

    res.json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};
