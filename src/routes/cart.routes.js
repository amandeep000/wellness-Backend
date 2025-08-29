import { Router } from "express";
import verifyJWT from "../middlewares/auth.middlewares.js";
import {
  syncCartFromRedux,
  getUserCart,
  clearUserCart,
} from "../controllers/cart.controllers.js";
const router = Router();
// router.use(verifyJWT);

router.route("/sync").post(syncCartFromRedux);
router.route("/").get(getUserCart);
// router.route("/item").put(updateCartItemQuantity);
// router.route("/item/:productId").delete(removeItemFromCart);
router.route("/").delete(clearUserCart);

export { router };
