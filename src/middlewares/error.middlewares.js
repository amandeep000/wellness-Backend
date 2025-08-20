import mongoose from "mongoose";
import { ApiError } from "utils/ApiError.utils.js";

const errorHandler = async (err, req, res, next) => {
  let error = err;
  console.log(error);
  if (!(error instanceof ApiError)) {
    const statusCode =
      err.statusCode || (error instanceof mongoose.Error ? 400 : 500);
    const message = error.message || "something went wrong";
    error = new ApiError(statusCode, message, [], error.stack);
  }
  const response = {
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors,
  };
  if (process.env.NODE_ENV === "development") {
    response.stack = error.stack;
  }
  return res.status(error.statusCode).json(response);
};

export { errorHandler };
