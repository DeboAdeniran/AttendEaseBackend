const jwt = require("jsonwebtoken");
const config = require("../config/config");
const Student = require("../models/Student");
const Lecturer = require("../models/Lecturer");

// const protect = async (req, res, next) => {
//   try {
//     let token;

//     if (
//       req.headers.authorization &&
//       req.headers.authorization.startsWith("Bearer")
//     ) {
//       token = req.headers.authorization.split(" ")[1];
//     }

//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: "Not authorized to access this route",
//       });
//     }

//     try {
//       const decoded = jwt.verify(token, config.jwt.secret);
//       req.user = decoded;

//       // Add role-specific ID to request
//       if (decoded.role === "student") {
//         const student = await Student.findByUserId(decoded.id);
//         if (student) {
//           req.user.studentId = student.id;
//         }
//       } else if (decoded.role === "lecturer") {
//         const lecturer = await Lecturer.findByUserId(decoded.id);
//         if (lecturer) {
//           req.user.lecturerId = lecturer.id;
//         }
//       }

//       next();
//     } catch (error) {
//       return res.status(401).json({
//         success: false,
//         message: "Token is invalid or expired",
//       });
//     }
//   } catch (error) {
//     next(error);
//   }
// };

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      console.log("Decoded token:", decoded); // Debug line
      req.user = decoded;

      // Add role-specific ID to request
      if (decoded.role === "student") {
        const student = await Student.findByUserId(decoded.id);
        console.log("Student found:", student); // Debug line
        if (student) {
          req.user.studentId = student.id;
        }
      } else if (decoded.role === "lecturer") {
        const lecturer = await Lecturer.findByUserId(decoded.id);
        console.log("Lecturer found:", lecturer); // Debug line
        if (lecturer) {
          req.user.lecturerId = lecturer.id;
        } else {
          console.log("No lecturer found for user ID:", decoded.id); // Debug line
        }
      }

      console.log("Final req.user:", req.user); // Debug line
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Token is invalid or expired",
      });
    }
  } catch (error) {
    next(error);
  }
};
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "User role is not authorized to access this route",
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
