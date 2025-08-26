import { Router } from "express";
import {
  createOrderFromCart,
  getUserOrders,
  getOrderById,
} from "../controllers/order.controllers.js";
import verifyJWT from "../middlewares/auth.middlewares.js";
const router = Router();
router.use(verifyJWT);

router.route("/").post(createOrderFromCart);
router.route("/").get(getUserOrders);
router.route("/:orderId").get(getOrderById);

export { router };
