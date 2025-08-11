import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.utils";
import { ApiResponse } from "../utils/ApiResponse.utils";
import { AsyncHandler } from "../utils/AsyncHandler";
import { User } from "../models/user.models";

const verifyJWT = AsyncHandler(async (req, res, next) => {
  const token =
    req.cookies.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "").trim();

  if (!token) {
    throw new ApiError(401, "Unauthorised or invalid token");
  }
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    throw new ApiError(401, "Unauthorized: Invalid or expired token");
  }
  const user = await User.findById(decodedToken._id).select(
    "-password -refreshToken"
  );
  if (!user) {
    throw new ApiError(404, "user not found");
  }
  req.user = user;
  next();
});

export default verifyJWT;
