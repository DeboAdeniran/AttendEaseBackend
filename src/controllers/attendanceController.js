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
