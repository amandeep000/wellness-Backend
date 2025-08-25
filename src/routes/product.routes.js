import { Router } from "express";
import {
  getAllProducts,
  getProductBySlug,
  getProductsByCategory,
} from "../controllers/product.controllers.js";
const router = Router();

router.route("/:slug").get(getProductBySlug); // get individual product by slug
router.route("/").get(getAllProducts); // get all products
router.route("/category/:categorySlug").get(getProductsByCategory); // get products by category

export { router };
