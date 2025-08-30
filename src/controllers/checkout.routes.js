import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import Stripe from "stripe";
import Cart from "../models/cart.models.js";
import { calcPricing } from "./order.helper.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});
const createCheckoutSession = AsyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id }).populate(
    "items.product"
  );
  if (!cart || cart.items.length === 0)
    throw new ApiError(400, "Cart is empty");

  const subtotal = cart.items.reduce(
    (s, i) => s + i.product.price * i.quantity,
    0
  );
  const { tax, shipping, total } = calcPricing(subtotal);

  /* 3. Build Stripe Session */
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: req.user.email,
    payment_method_types: ["card"],
    billing_address_collection: "required",
    shipping_address_collection: { allowed_countries: ["US", "CA", "IN"] },
    line_items: cart.items.map((i) => ({
      quantity: i.quantity,
      price_data: {
        currency: "usd",
        product_data: { name: i.product.name },
        unit_amount: Math.round(i.product.price * 100),
      },
    })),
    metadata: { userId: req.user._id.toString() },
    success_url: `${process.env.CLIENT_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/`,
  });

  res.json(new ApiResponse(200, { sessionId: session.id }));
});

export { createCheckoutSession };
