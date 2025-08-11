import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken";

const createAccessAndRefreshToken = AsyncHandler(async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User does not exist!");
  }

  try {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Token generation error:", error);
    }
    throw new ApiError(500, "Failed to generate access/refresh token");
  }
});

const registerUser = AsyncHandler(async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    throw new ApiError(400, "Request body cannot be empty");
  }

  const { username, fullname, email, password } = req.body;

  if ([username, fullname, email, password].some((field) => !field?.trim())) {
    throw new ApiError(
      400,
      "All the fields (username, email, fullname, password) are required"
    );
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists. Please login instead");
  }

  try {
    const createUser = await User.create({
      username: username.toLowerCase(),
      fullname,
      email,
      password,
    });

    if (!createUser) {
      throw new ApiError(
        500,
        "Failed to register user. Please try again later"
      );
    }

    return res
      .status(201)
      .json(new ApiResponse(201, createUser, "User registered successfully!"));
  } catch (error) {
    console.error("Something went wrong while registering the user:", error);
    throw new ApiError(
      500,
      "An unexpected error occurred while registering the user"
    );
  }
});

const loginUser = AsyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (!email?.trim() || !password?.trim()) {
    throw new ApiError(
      400,
      "Email and password are required and cannot be empty"
    );
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new ApiError(404, "User not found. Try signing up instead");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(
      401,
      "Wrong password. Try again with the correct password"
    );
  }

  const { accessToken, refreshToken } = await createAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!loggedInUser) {
    throw new ApiError(404, "Logged-in user not found");
  }

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser },
        "User logged in successfully"
      )
    );
});

const logoutUser = AsyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: null,
      },
    },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };
  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "user logged out successfully"));
});

const createNewAccessAndRefreshToken = AsyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(400, "Refresh token is required");
  }
  let decodedToken;
  try {
    decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decodedToken._id);
  if (!user) {
    throw new ApiError(404, "User not found!");
  }
  if (incomingRefreshToken !== user.refreshToken) {
    throw new ApiError(401, "Either Expired or Invalid Refresh Token");
  }
  const { accessToken, refreshToken: newRefreshToken } =
    await createAccessAndRefreshToken(user._id);

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };
  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        "Access token & Refresh token recreated successfully"
      )
    );
});
const updateProfile = AsyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { fullname, email, oldPassword, newPassword } = req.body;
  if (!fullname && !email && !oldPassword && !newPassword) {
    throw new ApiError(
      "At least one field (fullname,email,password) must be provided to update"
    );
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (fullname) user.fullname = fullname;
  if (email) user.email = email;

  if (newPassword) {
    if (!oldPassword) {
      throw new ApiError(400, "Old password is required to set new one");
    }
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordValid) {
      throw new ApiError(401, "Incorrect old password");
    }
    user.password = newPassword;
  }
  await user.save();
  const updatedUser = await User.findOne(user._id).select(
    "-password -refreshToken"
  );
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { updatedUser: updatedUser },
        "profile updated successfully"
      )
    );
});
export {
  registerUser,
  loginUser,
  logoutUser,
  createNewAccessAndRefreshToken,
  updateProfile,
};
