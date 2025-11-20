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
    const { id } = req.params;

    console.log("=== DASHBOARD DEBUG START ===");
    console.log("Student ID:", id);
    console.log("Request params:", req.params);

    // Debug: Check if student exists and get their enrolled classes
    const [studentCheck] = await db.execute(
      `SELECT id, first_name, last_name FROM students WHERE id = ?`,
      [id]
    );
    console.log(
      "Student exists:",
      studentCheck.length > 0 ? studentCheck[0] : "NO"
    );

    // Debug: Get all enrollments for this student
    const [allEnrollments] = await db.execute(
      `SELECT e.*, cl.class_code, co.course_code, cl.day_of_week, cl.is_active 
       FROM enrollments e 
       JOIN classes cl ON e.class_id = cl.id 
       JOIN courses co ON cl.course_id = co.id 
       WHERE e.student_id = ?`,
      [id]
    );
    console.log("All enrollments:", allEnrollments);

    // Debug: Check today's day name in database format
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    console.log("Today (full):", today);

    // Also check short version and database format
    const todayShort = new Date().toLocaleDateString("en-US", {
      weekday: "short",
    });
    console.log("Today (short):", todayShort);

    // Check how days are stored in database
    const [dayFormats] = await db.execute(
      `SELECT DISTINCT day_of_week FROM classes LIMIT 10`
    );
    console.log("Day formats in database:", dayFormats);

    // Basic attendance statistics
    const [basicStats] = await db.execute(
      `SELECT 
        COUNT(DISTINCT e.class_id) as total_classes,
        COUNT(DISTINCT a.id) as total_attendance_records,
        COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.id END) as present_days,
        COUNT(DISTINCT CASE WHEN a.status = 'Absent' THEN a.id END) as absent_days,
        COUNT(DISTINCT CASE WHEN a.status = 'Late' THEN a.id END) as late_days,
        COUNT(DISTINCT CASE WHEN a.status = 'Excused' THEN a.id END) as excused_days,
        CASE 
          WHEN COUNT(DISTINCT a.id) > 0 THEN
            ROUND((COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.id END) * 100.0 / COUNT(DISTINCT a.id)), 2)
          ELSE 0 
        END as overall_attendance_percentage
      FROM students s
      LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
      LEFT JOIN attendance a ON s.id = a.student_id AND e.class_id = a.class_id
      WHERE s.id = ?`,
      [id]
    );

    console.log("Basic Stats Result:", basicStats[0]);

    // Get today's classes - try multiple day formats
    const [todaysClasses] = await db.execute(
      `SELECT 
        cl.id,
        cl.class_code,
        cl.day_of_week,
        cl.start_time,
        cl.end_time,
        cl.location,
        co.course_code,
        co.course_name,
        co.credits,
        CONCAT(l.first_name, ' ', l.last_name) as lecturer_name,
        (SELECT COUNT(*) FROM attendance WHERE class_id = cl.id AND student_id = ? AND status = 'Present') as present_count,
        (SELECT COUNT(*) FROM attendance WHERE class_id = cl.id AND student_id = ?) as total_sessions
      FROM classes cl
      JOIN enrollments e ON cl.id = e.class_id AND e.status = 'active'
      JOIN courses co ON cl.course_id = co.id
      JOIN lecturers l ON cl.lecturer_id = l.id
      WHERE e.student_id = ? 
        AND (cl.day_of_week = ? OR cl.day_of_week = ? OR cl.day_of_week LIKE ?)
        AND cl.is_active = 1
      ORDER BY cl.start_time`,
      [id, id, id, today, todayShort, `${todayShort}%`]
    );

    console.log("Today's Classes Query Result:", todaysClasses);

    // Get class breakdown
    const [classBreakdown] = await db.execute(
      `SELECT 
        cl.id,
        cl.class_code,
        co.course_code,
        co.course_name,
        COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_count,
        COUNT(a.id) as total_sessions,
        CASE 
          WHEN COUNT(a.id) > 0 THEN
            ROUND((COUNT(CASE WHEN a.status = 'Present' THEN 1 END) * 100.0 / COUNT(a.id)), 2)
          ELSE 0 
        END as attendance_percentage
      FROM classes cl
      JOIN enrollments e ON cl.id = e.class_id AND e.status = 'active'
      JOIN courses co ON cl.course_id = co.id
      LEFT JOIN attendance a ON cl.id = a.class_id AND a.student_id = e.student_id
      WHERE e.student_id = ?
      GROUP BY cl.id, cl.class_code, co.course_code, co.course_name
      ORDER BY attendance_percentage ASC`,
      [id]
    );

    console.log("Class Breakdown Result:", classBreakdown);

    console.log("=== DASHBOARD DEBUG END ===");

    // ... rest of your existing code for notifications etc.

    res.json({
      success: true,
      data: {
        total_classes: basicStats[0]?.total_classes || 0,
        present_days: basicStats[0]?.present_days || 0,
        absent_days: basicStats[0]?.absent_days || 0,
        late_days: basicStats[0]?.late_days || 0,
        excused_days: basicStats[0]?.excused_days || 0,
        overall_attendance_percentage:
          basicStats[0]?.overall_attendance_percentage || 0,
        at_risk_classes: 0, // Simplified for now
        todays_classes: todaysClasses,
        class_breakdown: classBreakdown,
        notifications: [],
        _debug: {
          student_id: id,
          today_full: today,
          today_short: todayShort,
          all_enrollments: allEnrollments,
          day_formats_in_db: dayFormats,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    next(error);
  }
};

exports.getStudentAnalytics = async (req, res, next) => {
  try {
    const db = require("../config/database");
    const { id } = req.params;
    const { timeRange = "month" } = req.query; // 'week', 'month', 'semester'

    // Determine date range based on timeRange parameter
    let startDate, interval;
    const endDate = new Date();

    switch (timeRange) {
      case "week":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 28); // Last 4 weeks
        interval = "WEEK";
        break;
      case "semester":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 4); // Last 4 months
        interval = "MONTH";
        break;
      case "month":
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 4); // Last 4 months
        interval = "MONTH";
        break;
    }

    // Get attendance trend data
    let trendQuery, trendParams;

    if (timeRange === "week") {
      trendQuery = `
        SELECT 
          CONCAT('Week ', WEEK(a.attendance_date) - WEEK(DATE_SUB(CURDATE(), INTERVAL 4 WEEK)) + 1) as period,
          WEEK(a.attendance_date) as week_num,
          ROUND(AVG(CASE WHEN a.status = 'Present' THEN 100 ELSE 0 END), 2) as student_attendance,
          (
            SELECT ROUND(AVG(CASE WHEN a2.status = 'Present' THEN 100 ELSE 0 END), 2)
            FROM attendance a2
            WHERE WEEK(a2.attendance_date) = WEEK(a.attendance_date)
              AND a2.attendance_date >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
          ) as class_average
        FROM attendance a
        WHERE a.student_id = ?
          AND a.attendance_date >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
        GROUP BY WEEK(a.attendance_date)
        ORDER BY WEEK(a.attendance_date)`;
      trendParams = [id];
    } else {
      trendQuery = `
        SELECT 
          DATE_FORMAT(a.attendance_date, '%b') as period,
          MONTH(a.attendance_date) as month_num,
          ROUND(AVG(CASE WHEN a.status = 'Present' THEN 100 ELSE 0 END), 2) as student_attendance,
          (
            SELECT ROUND(AVG(CASE WHEN a2.status = 'Present' THEN 100 ELSE 0 END), 2)
            FROM attendance a2
            WHERE MONTH(a2.attendance_date) = MONTH(a.attendance_date)
              AND YEAR(a2.attendance_date) = YEAR(a.attendance_date)
              AND a2.attendance_date >= ?
          ) as class_average
        FROM attendance a
        WHERE a.student_id = ?
          AND a.attendance_date >= ?
        GROUP BY YEAR(a.attendance_date), MONTH(a.attendance_date)
        ORDER BY YEAR(a.attendance_date), MONTH(a.attendance_date)`;
      trendParams = [startDate, id, startDate];
    }

    const [trendData] = await db.execute(trendQuery, trendParams);

    // Get attendance by day of week
    const [dayBreakdown] = await db.execute(
      `SELECT 
        cl.day_of_week as day,
        COUNT(DISTINCT a.id) as total_sessions,
        COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.id END) as present_sessions,
        ROUND(
          (COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.id END) / 
           COUNT(DISTINCT a.id)) * 100, 2
        ) as attendance_percentage
      FROM attendance a
      JOIN classes cl ON a.class_id = cl.id
      WHERE a.student_id = ?
      GROUP BY cl.day_of_week
      ORDER BY FIELD(cl.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')`,
      [id]
    );

    // Get risk analysis by class
    const [riskAnalysis] = await db.execute(
      `SELECT 
        co.course_code,
        co.course_name,
        CONCAT(co.course_code, ' - ', co.course_name) as course,
        COUNT(DISTINCT a.id) as total_sessions,
        COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.id END) as present_sessions,
        ROUND(
          AVG(CASE WHEN a.status = 'Present' THEN 100 ELSE 0 END), 2
        ) as current_attendance,
        CASE 
          WHEN AVG(CASE WHEN a.status = 'Present' THEN 100 ELSE 0 END) >= 85 THEN 'low'
          WHEN AVG(CASE WHEN a.status = 'Present' THEN 100 ELSE 0 END) >= 75 THEN 'medium'
          ELSE 'high'
        END as risk_status,
        (
          SELECT COUNT(DISTINCT a2.id)
          FROM attendance a2
          WHERE a2.class_id = cl.id 
            AND a2.student_id = ?
            AND a2.attendance_date >= DATE_SUB(CURDATE(), INTERVAL 2 WEEK)
            AND a2.status = 'Present'
        ) as recent_present,
        (
          SELECT COUNT(DISTINCT a3.id)
          FROM attendance a3
          WHERE a3.class_id = cl.id 
            AND a3.student_id = ?
            AND a3.attendance_date >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
            AND a3.attendance_date < DATE_SUB(CURDATE(), INTERVAL 2 WEEK)
            AND a3.status = 'Present'
        ) as previous_present
      FROM classes cl
      JOIN enrollments e ON cl.id = e.class_id AND e.status = 'active'
      JOIN courses co ON cl.course_id = co.id
      LEFT JOIN attendance a ON cl.id = a.class_id AND a.student_id = e.student_id
      WHERE e.student_id = ?
      GROUP BY cl.id, co.course_code, co.course_name
      HAVING total_sessions > 0
      ORDER BY current_attendance ASC`,
      [id, id, id]
    );

    // Calculate trend for each class
    const riskAnalysisWithTrend = riskAnalysis.map((cls) => {
      let trend = "stable";
      if (cls.recent_present > cls.previous_present) {
        trend = "improving";
      } else if (cls.recent_present < cls.previous_present) {
        trend = "declining";
      }

      // Calculate sessions needed to reach 85%
      const currentPercentage = cls.current_attendance;
      const totalSessions = cls.total_sessions;
      const presentSessions = cls.present_sessions;

      let sessionsNeeded = 0;
      if (currentPercentage < 85) {
        // Calculate how many more present sessions needed
        sessionsNeeded = Math.ceil(0.85 * totalSessions - presentSessions);
      }

      return {
        ...cls,
        trend,
        sessions_needed: Math.max(0, sessionsNeeded),
      };
    });

    // Get overall statistics
    const [overallStats] = await db.execute(
      `SELECT 
        ROUND(AVG(CASE WHEN a.status = 'Present' THEN 100 ELSE 0 END), 2) as current_attendance,
        (
          SELECT ROUND(AVG(CASE WHEN status = 'Present' THEN 100 ELSE 0 END), 2)
          FROM attendance
          WHERE attendance_date >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
        ) as class_average
      FROM attendance a
      WHERE a.student_id = ?`,
      [id]
    );

    // Calculate semester progress (assuming 16-week semester)
    const semesterStartDate = new Date();
    semesterStartDate.setMonth(semesterStartDate.getMonth() - 4); // 4 months ago
    const totalWeeks = 16;
    const weeksPassed = Math.floor(
      (new Date() - semesterStartDate) / (7 * 24 * 60 * 60 * 1000)
    );
    const semesterProgress = Math.min(
      Math.round((weeksPassed / totalWeeks) * 100),
      100
    );

    res.json({
      success: true,
      data: {
        trend_data: trendData,
        day_breakdown: dayBreakdown,
        risk_analysis: riskAnalysisWithTrend,
        current_attendance: overallStats[0]?.current_attendance || 0,
        class_average: overallStats[0]?.class_average || 0,
        semester_progress: semesterProgress,
      },
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    next(error);
  }
};
