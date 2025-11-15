const Lecturer = require("../models/Lecturer");

exports.getAllLecturers = async (req, res, next) => {
  try {
    const filters = req.query;
    const lecturers = await Lecturer.getAll(filters);

    res.json({
      success: true,
      count: lecturers.length,
      data: lecturers,
    });
  } catch (error) {
    next(error);
  }
};

exports.getLecturer = async (req, res, next) => {
  try {
    const lecturer = await Lecturer.findById(req.params.id);

    if (!lecturer) {
      return res.status(404).json({
        success: false,
        message: "Lecturer not found",
      });
    }

    res.json({
      success: true,
      data: lecturer,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateLecturer = async (req, res, next) => {
  try {
    // Lecturers can only update their own profile
    if (
      req.user.role === "lecturer" &&
      req.user.lecturerId !== parseInt(req.params.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this profile",
      });
    }

    const allowedFields = [
      "first_name",
      "last_name",
      "title",
      "phone",
      "office_location",
      "profile_image",
    ];
    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const affectedRows = await Lecturer.update(req.params.id, updateData);

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Lecturer not found",
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

exports.getLecturerClasses = async (req, res, next) => {
  try {
    const filters = req.query;
    const classes = await Lecturer.getClasses(req.params.id, filters);

    res.json({
      success: true,
      count: classes.length,
      data: classes,
    });
  } catch (error) {
    next(error);
  }
};

exports.getLecturerSchedule = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const schedule = await Lecturer.getSchedule(
      req.params.id,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
};

exports.getLecturerStatistics = async (req, res, next) => {
  try {
    const stats = await Lecturer.getStatistics(req.params.id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

exports.getLecturerDashboardStats = async (req, res, next) => {
  try {
    const db = require("../config/database");

    // Get today's date
    const today = new Date().toISOString().split("T")[0];

    // Get overall statistics
    const [stats] = await db.execute(
      `SELECT 
        COUNT(DISTINCT cl.id) as total_classes,
        COUNT(DISTINCT e.student_id) as total_students,
        COUNT(DISTINCT CASE WHEN a.attendance_date = ? THEN e.student_id END) as students_present_today,
        COUNT(DISTINCT CASE WHEN a.attendance_date = ? AND a.status = 'Absent' THEN e.student_id END) as students_absent_today,
        COUNT(DISTINCT CASE WHEN a.attendance_date = ? AND a.status = 'Late' THEN e.student_id END) as students_late_today,
        COUNT(DISTINCT CASE WHEN a.attendance_date = ? THEN cl.id END) as classes_today,
        ROUND(AVG(CASE WHEN a.status = 'Present' THEN 100 ELSE 0 END), 2) as average_attendance
      FROM classes cl
      LEFT JOIN enrollments e ON cl.id = e.class_id AND e.status = 'active'
      LEFT JOIN attendance a ON cl.id = a.class_id AND e.student_id = a.student_id
      WHERE cl.lecturer_id = ? AND cl.is_active = 1`,
      [today, today, today, today, req.params.id]
    );

    res.json({
      success: true,
      data: stats[0],
    });
  } catch (error) {
    next(error);
  }
};
