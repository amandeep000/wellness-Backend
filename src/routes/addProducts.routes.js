import { Router } from "express";
import verifyJWT from "../middlewares/auth.middlewares.js";
import { addProducts } from "../controllers/productAdmin.controller.js";

const router = Router();
router.route("/add-product").post(verifyJWT, addProducts);

export { router };
