const Course = require("../models/Course");

exports.getAllCourses = async (req, res, next) => {
  try {
    const filters = req.query;
    const courses = await Course.getAll(filters);

    res.json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

exports.createCourse = async (req, res, next) => {
  try {
    const { course_code, course_name, description, credits, semester } =
      req.body;

    const courseId = await Course.create({
      course_code,
      course_name,
      description,
      credits,
      semester,
    });

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: { id: courseId },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        success: false,
        message: "Course code already exists",
      });
    }
    next(error);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const affectedRows = await Course.update(req.params.id, req.body);

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.json({
      success: true,
      message: "Course updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.archiveCourse = async (req, res, next) => {
  try {
    const affectedRows = await Course.archive(req.params.id);

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.json({
      success: true,
      message: "Course archived successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.unarchiveCourse = async (req, res, next) => {
  try {
    const affectedRows = await Course.unarchive(req.params.id);

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.json({
      success: true,
      message: "Course unarchived successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.getCourseClasses = async (req, res, next) => {
  try {
    const classes = await Course.getClasses(req.params.id);

    res.json({
      success: true,
      count: classes.length,
      data: classes,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCourseStatistics = async (req, res, next) => {
  try {
    const stats = await Course.getStatistics(req.params.id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCoursesByLecturer = async (req, res, next) => {
  try {
    const { lecturerId } = req.params;

    // Validate lecturer ID
    if (!lecturerId || isNaN(lecturerId)) {
      return res.status(400).json({
        success: false,
        message: "Valid lecturer ID is required",
      });
    }

    // Check if the requesting user is authorized
    // Lecturers can only view their own courses
    if (
      req.user.role === "lecturer" &&
      req.user.lecturerId !== parseInt(lecturerId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view courses for this lecturer",
      });
    }

    const db = require("../config/database");

    // Query to get courses taught by the lecturer through their classes
    const [courses] = await db.execute(
      `SELECT DISTINCT 
        c.id,
        c.course_code,
        c.course_name,
        c.description,
        c.credits,
        c.semester,
        c.is_archived,
        c.created_at,
        c.updated_at,
        COUNT(DISTINCT cl.id) as class_count,
        COUNT(DISTINCT e.student_id) as total_enrollments,
        ROUND(
          AVG(
            CASE WHEN a.status = 'Present' THEN 100 ELSE 0 END
          ), 2
        ) as avg_attendance_rate
      FROM courses c
      JOIN classes cl ON c.id = cl.course_id
      LEFT JOIN enrollments e ON cl.id = e.class_id AND e.status = 'active'
      LEFT JOIN attendance a ON cl.id = a.class_id
      WHERE cl.lecturer_id = ? 
        AND cl.is_active = 1 
        AND c.is_archived = 0
      GROUP BY c.id, c.course_code, c.course_name, c.description, c.credits, c.semester
      ORDER BY c.course_code`,
      [lecturerId]
    );

    res.json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    console.error("Error fetching courses by lecturer:", error);
    next(error);
  }
};
