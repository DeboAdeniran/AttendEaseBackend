const Class = require("../models/Class");

exports.getAllClasses = async (req, res, next) => {
  try {
    const filters = { ...req.query };

    // If lecturer, only show their classes
    if (req.user.role === "lecturer") {
      filters.lecturer_id = req.user.lecturerId;
    }

    const classes = await Class.getAll(filters);

    res.json({
      success: true,
      count: classes.length,
      data: classes,
    });
  } catch (error) {
    next(error);
  }
};

exports.getClass = async (req, res, next) => {
  try {
    const classData = await Class.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    res.json({
      success: true,
      data: classData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getClassByClassCode = async (req, res, next) => {
  try {
    const classData = await Class.findByClassCode(req.params.class_code);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    res.json({
      success: true,
      data: classData,
    });
  } catch (error) {
    next(error);
  }
};

exports.createClass = async (req, res, next) => {
  try {
    const {
      course_id,
      class_code,
      section,
      day_of_week,
      start_time,
      end_time,
      location,
      max_students,
      semester,
    } = req.body;

    if (!req.user || !req.user.lecturerId) {
      return res.status(400).json({
        success: false,
        message: "Lecturer ID not found. User may not be a lecturer.",
      });
    }

    // Validate required fields
    if (
      !course_id ||
      !class_code ||
      !day_of_week ||
      !start_time ||
      !end_time ||
      !location ||
      !semester
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Check for schedule conflicts
    const conflicts = await Class.getScheduleConflicts(
      req.user.lecturerId,
      day_of_week,
      start_time,
      end_time
    );

    if (conflicts.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Schedule conflict detected",
        conflicts: conflicts,
      });
    }

    // Create class data object with proper null handling
    const classData = {
      course_id: parseInt(course_id),
      lecturer_id: req.user.lecturerId,
      class_code,
      section: section || null, // Convert undefined/empty to null
      day_of_week,
      start_time,
      end_time,
      location,
      max_students: max_students ? parseInt(max_students) : 50,
      semester,
    };

    const classId = await Class.create(classData);

    res.status(201).json({
      success: true,
      message: "Class created successfully",
      data: { id: classId },
    });
  } catch (error) {
    console.error("Create class error:", error);
    next(error);
  }
};

exports.updateClass = async (req, res, next) => {
  try {
    // Verify lecturer owns this class
    const classData = await Class.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    if (
      req.user.role === "lecturer" &&
      classData.lecturer_id !== req.user.lecturerId
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this class",
      });
    }

    // If updating schedule, check for conflicts
    if (req.body.day_of_week || req.body.start_time || req.body.end_time) {
      const conflicts = await Class.getScheduleConflicts(
        classData.lecturer_id,
        req.body.day_of_week || classData.day_of_week,
        req.body.start_time || classData.start_time,
        req.body.end_time || classData.end_time,
        req.params.id
      );

      if (conflicts.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Schedule conflict detected",
          conflicts: conflicts,
        });
      }
    }

    const affectedRows = await Class.update(req.params.id, req.body);

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    res.json({
      success: true,
      message: "Class updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteClass = async (req, res, next) => {
  try {
    // Verify lecturer owns this class
    const classData = await Class.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    if (
      req.user.role === "lecturer" &&
      classData.lecturer_id !== req.user.lecturerId
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this class",
      });
    }

    const affectedRows = await Class.delete(req.params.id);

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    res.json({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.getClassStudents = async (req, res, next) => {
  try {
    const students = await Class.getEnrolledStudents(req.params.id);

    res.json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    next(error);
  }
};

exports.enrollStudent = async (req, res, next) => {
  try {
    const { student_id } = req.body;

    // Check if class exists
    const classData = await Class.findById(req.params.id);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // Check if class is full
    if (classData.enrolled_count >= classData.max_students) {
      return res.status(400).json({
        success: false,
        message: "Class is full",
      });
    }

    const enrollmentId = await Class.enrollStudent(req.params.id, student_id);

    res.status(201).json({
      success: true,
      message: "Student enrolled successfully",
      data: { id: enrollmentId },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        success: false,
        message: "Student is already enrolled in this class",
      });
    }
    next(error);
  }
};

exports.unenrollStudent = async (req, res, next) => {
  try {
    const { student_id } = req.body;

    const affectedRows = await Class.unenrollStudent(req.params.id, student_id);

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    res.json({
      success: true,
      message: "Student unenrolled successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.getClassAttendanceOverview = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const overview = await Class.getAttendanceOverview(
      req.params.id,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    next(error);
  }
};
