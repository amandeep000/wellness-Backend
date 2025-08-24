import { Router } from "express";
import verifyJWT from "../middlewares/auth.middlewares.js";
import {
  addAddress,
  deleteAddress,
  getAllAddresses,
  updateAddress,
  getAddressById,
} from "../controllers/address.controllers.js";
const router = Router();

router.use(verifyJWT);

router.route("/").get(getAllAddresses).post(addAddress);

s;
router
  .route("/:addressId")
  .get(getAddressById)
  .put(updateAddress)
  .delete(deleteAddress);

export { router };
