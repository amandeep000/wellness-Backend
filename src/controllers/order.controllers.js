import Order from "../models/order.models.js";
import OrderItem from "../models/orderItem.models.js";
import Cart from "../models/cart.models.js";
import Product from "../models/product.models.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";

// helpers
const PRICE_RULES = {
  taxRate: 0.8,
  freeShippingOver: 66,
  flatShipping: 10,
};

const calculatePricing = (subtotal) => {
  const tax = +(subtotal * PRICE_RULES.taxRate).toFixed(2);
  const shipping =
    subtotal >= PRICE_RULES.freeShippingOver ? 0 : PRICE_RULES.flatShipping;
  const total = +(subtotal + tax + shipping).toFixed(2);
  return (tax, shipping, total);
};

const createOrderFromCart = AsyncHandler(async (req, res) => {
  const userId = req.user._id;

  const cart = await Cart.findOne({ userId }).populate("items.product");
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, "Your cart is empty");
  }

  // check for product stock and availability
  let subtotal = 0;
  const shortages = [];
  for (const cItem of cart.items) {
    if (!cItem) {
      shortages.push("A product in you cart doesn't exists anymore.");
      continue;
    }

    if (cItem.quantity > cItem.product.stock) {
      shortages.push(
        `${cItem.product.name}: only ${cItem.product.stock} left (you want ${cItem.quantity})`
      );
    }
    subtotal += cItem.product.price * cItem.quantity;
  }

  if (shortages.length > 0) {
    throw new ApiError(400, shortages.join(" "));
  }

  const { tax, shipping, total } = calculatePricing(subtotal);
});

const listMyOrders = AsyncHandler(async (req, res) => {});
const getMyOrderById = AsyncHandler(async (req, res) => {});
export { createOrderFromCart, listMyOrders, getMyOrderById };
