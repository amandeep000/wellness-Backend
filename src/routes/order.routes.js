import { Router } from "express";
import verifyJWT from "../middlewares/auth.middlewares.js";
import { getMyOrders } from "../controllers/order.controllers.js";
const router = Router();

router.use(verifyJWT);

// router.route("/").get(getAllOrders);
router.route("/my").get(getMyOrders);
// router.route("/customer/:customerId").get(getCustomerOrders);
// router.route("/:id").get(getOrderById);
// router.route("/:id/status").put(updateOrderStatus);

export { router };
