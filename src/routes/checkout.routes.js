import { Router } from "express";
import verifyJWT from "../middlewares/auth.middlewares.js";
import { createCheckoutSession } from "../controllers/checkout.routes.js";

const router = Router();
router.use(verifyJWT);
router.route("/session").post(createCheckoutSession);

export { router };
