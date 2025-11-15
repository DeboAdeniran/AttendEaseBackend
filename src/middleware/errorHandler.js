const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  const error = {
    success: false,
    message: err.message || "Server Error",
  };

  // MySQL error codes
  if (err.code === "ER_DUP_ENTRY") {
    error.message = "Duplicate entry. This record already exists";
    return res.status(400).json(error);
  }

  if (err.code === "ER_NO_REFERENCED_ROW_2") {
    error.message = "Referenced record does not exist";
    return res.status(400).json(error);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error.message = "Invalid token";
    return res.status(401).json(error);
  }

  if (err.name === "TokenExpiredError") {
    error.message = "Token expired";
    return res.status(401).json(error);
  }

  // Default error
  res.status(err.statusCode || 500).json(error);
};

module.exports = errorHandler;
