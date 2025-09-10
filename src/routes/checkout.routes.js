import { Router } from "express";
import verifyJWT from "../middlewares/auth.middlewares.js";
import bodyParser from "body-parser";
import {
  confirmCheckout,
  createCheckoutSession,
  stripeWebhook,
} from "../controllers/checkout.routes.js";

const router = Router();
router.route("/session").post(verifyJWT, createCheckoutSession);
router.route("/confirm").get(verifyJWT, confirmCheckout);
router
  .route("/webhook")
  .post(bodyParser.raw({ type: "application/json" }), stripeWebhook);

export { router };
