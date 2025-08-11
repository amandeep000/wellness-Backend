import { Router } from "express";
import { logoutUser, registerUser } from "../controllers/user.controllers";
import verifyJWT from "../middlewares/auth.middlewares";
const router = Router();

router.route("/register").post(registerUser);
router.route("/logout").get(verifyJWT, logoutUser);

export { router };
