import { Router } from "express";
import {
  createNewAccessAndRefreshToken,
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/user.controllers.js";
import verifyJWT from "../middlewares/auth.middlewares.js";
const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(createNewAccessAndRefreshToken);

export { router };
