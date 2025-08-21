import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const ROLES = {
  ADMIN: "admin",
  CUSTOMER: "customer",
};

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "password is required"],
      minlength: [8, "password must be at least 8 characters long"],
      select: false,
    },
    fullname: {
      type: String,
      required: [true, "fullname is required"],
      lowercase: true,
      minlength: [2, "fullname must be at least 2 characters"],
      maxlength: [100, "fullname must not exceed 100 characters"],
      trim: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    addresses: [
      {
        type: {
          type: String,
          enum: ["billing", "shipping", "both"],
          default: "shipping",
        },
        fullname: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String },
        postalCode: { type: String, required: true },
        country: { type: String, required: true },
        phoneNumber: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
      },
    ],
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CUSTOMER,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    resetPasswordToken: String,
    resetPasswordExpiry: Date,
  },
  { timestamps: true }
);

// hashing password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// password comparison
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Access Token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

// Refresh token
userSchema.methods.generateRefreshToken = async function () {
  return jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
};

export const User = mongoose.model("User", userSchema);
