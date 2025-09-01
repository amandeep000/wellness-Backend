import { Router } from "express";
import verifyJWT from "../middlewares/auth.middlewares.js";
import {
  createOrderFromCart,
  listMyOrders,
  getMyOrderById,
} from "../controllers/order.controllers.js";
const router = Router();

router.use(verifyJWT);

router.post("/", createOrderFromCart);
router.get("/", listMyOrders);
router.get("/:id", getMyOrderById);

export default router;
