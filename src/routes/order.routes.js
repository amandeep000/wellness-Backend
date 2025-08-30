import { Router } from "express";
import verifyJWT from "../middlewares/auth.middlewares.js";
import {
  createOrderFromCart,
  listMyOrders,
  getMyOrderById,
} from "../controllers/order.controllers.js";
const router = Router();

router.use(verifyJWT);

// POST /api/v1/orders      → create from current cart
router.post("/", createOrderFromCart);

// GET  /api/v1/orders      → list logged-in user’s orders
router.get("/", listMyOrders);

// GET  /api/v1/orders/:id  → single order (if it belongs to user)
router.get("/:id", getMyOrderById);

export default router;
