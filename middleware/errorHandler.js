const { errorResponse } = require("../utils/response");

const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Handle invalid ObjectId
  if (err.name === "CastError") {
    return errorResponse(res, 400, "Invalid resource ID");
  }

  // Handle duplicate keys
  if (err.code === 11000) {
    return errorResponse(res, 409, "Duplicate resource");
  }

  errorResponse(res, err.status || 500, err.message || "Internal Server Error");
};

module.exports = errorHandler;
