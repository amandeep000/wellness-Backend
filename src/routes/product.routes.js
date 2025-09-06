import { Router } from "express";
import {
  getAllProducts,
  getProductBySlug,
  getProductsByCategory,
  searchProducts,
} from "../controllers/product.controllers.js";
const router = Router();

router.route("/search").get(searchProducts);
router.route("/category/:categorySlug").get(getProductsByCategory);
router.route("/").get(getAllProducts);
router.route("/:slug").get(getProductBySlug);

export { router };
