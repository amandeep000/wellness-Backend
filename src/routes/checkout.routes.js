import { Router } from "express";
import verifyJWT from "../middlewares/auth.middlewares.js";
import {
  confirmCheckout,
  createCheckoutSession,
} from "../controllers/checkout.routes.js";

const router = Router();
router.use(verifyJWT);
router.route("/session").post(createCheckoutSession);
router.route("/confirm").get(confirmCheckout);

export { router };
