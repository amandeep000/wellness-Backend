import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import Stripe from "stripe";
import Cart from "../models/cart.models.js";
import { calcPricing } from "./order.helper.js";
import Order from "../models/order.models.js";
import OrderItem from "../models/orderItem.models.js";
import Product from "../models/product.models.js";
import mongoose from "mongoose";

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

  // build the strip sessions
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
    success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/`,
  });

  res.json(new ApiResponse(200, { sessionId: session.id }));
});

const createOrderFromCartInternal = async (userId, stripeSession) => {
  try {
    // Retrieve line items directly from Stripe
    const lineItems = await stripe.checkout.sessions.listLineItems(
      stripeSession.id,
      {
        expand: ["data.price.product"],
      }
    );

    if (!lineItems.data || lineItems.data.length === 0) {
      throw new ApiError(400, "No items found in payment session");
    }

    // Map Stripe info into a simple object for frontend
    const items = lineItems.data.map((item) => ({
      productName: item.price.product.name || item.description,
      productPrice: item.price.unit_amount / 100,
      quantity: item.quantity,
      productImage: item.price.product.images?.[0] || "",
    }));

    // Extract shipping & billing from stripeSession
    const shipping = stripeSession.shipping || {};
    const customer = stripeSession.customer_details || {};

    // Calculate totals using your business logic
    const subtotal = items.reduce(
      (sum, i) => sum + i.productPrice * i.quantity,
      0
    );
    const { tax, shipping: shippingCost, total } = calcPricing(subtotal);

    // Return a simplified order-like object to the frontend
    return {
      userId,
      items,
      shippingAddress: {
        fullname: shipping.name || customer.name || "",
        email: customer.email || stripeSession.customer_email || "",
        street: shipping.address?.line1 || "",
        city: shipping.address?.city || "",
        state: shipping.address?.state || "",
        postalCode: shipping.address?.postal_code || "",
        country: shipping.address?.country || "",
        phoneNumber: customer.phone || "",
      },
      billingAddress: {
        name: customer.name || "",
        email: customer.email || stripeSession.customer_email || "",
        phone: customer.phone || "",
        address: {
          line1: customer.address?.line1 || "",
          line2: customer.address?.line2 || "",
          city: customer.address?.city || "",
          state: customer.address?.state || "",
          postal_code: customer.address?.postal_code || "",
          country: customer.address?.country || "",
        },
      },
      paymentStatus: stripeSession.payment_status,
      paymentMethod: stripeSession.payment_method_types?.[0] || "card",
      taxPrice: tax,
      shippingPrice: shippingCost,
      totalPrice: total,
      paymentIntentId: stripeSession.payment_intent?.id || stripeSession.id,
      paidAt: stripeSession.payment_status === "paid" ? new Date() : null,
      orderId: stripeSession.id, // Use Stripe session ID as temporary order ID
    };
  } catch (error) {
    console.error("Error wrapping Stripe order data:", error);
    throw new ApiError(
      500,
      `Failed to process payment confirmation: ${error.message}`
    );
  }
};

const confirmCheckout = AsyncHandler(async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) throw new ApiError(400, "session id is required");

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["payment_intent", "customer_details", "shipping"],
    });

    if (session.payment_status !== "paid") {
      throw new ApiError(400, "Payment not completed");
    }

    const orderData = await createOrderFromCartInternal(
      session.metadata.userId,
      session
    );

    return res
      .status(200)
      .json(new ApiResponse(200, orderData, "Payment confirmed"));
  } catch (error) {
    console.error("Checkout confirmation error:", error);
    throw new ApiError(500, `Checkout confirmation failed: ${error.message}`);
  }
});

export { createCheckoutSession, createOrderFromCartInternal, confirmCheckout };
