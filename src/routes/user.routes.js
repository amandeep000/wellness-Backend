import { Router } from "express";
import verifyJWT from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";
import {
  getCurrentUser,
  updateAvatar,
  updateProfile,
} from "../controllers/user.controllers.js";

const router = Router();

router.route("/me").get(verifyJWT, getCurrentUser);
router.route("/profile").put(verifyJWT, updateProfile);
router
  .route("/profile/avatar")
  .put(verifyJWT, upload.single("avatar"), updateAvatar);
export { router };
