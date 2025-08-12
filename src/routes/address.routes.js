import { Router } from "express";
import verifyJWT from "../middlewares/auth.middlewares.js";
import {
  addAddress,
  deleteAddress,
  getAllAddresses,
  updateAddress,
} from "../controllers/address.controllers.js";
const router = Router();

router.use(verifyJWT);
router.route("/").get(getAllAddresses).post(addAddress);
router.route("/:addressId").put(updateAddress);
router.route("/:addressId").delete(deleteAddress);

export { router };
