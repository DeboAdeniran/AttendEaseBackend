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
