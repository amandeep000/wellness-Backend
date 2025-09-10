import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import Stripe from "stripe";
import Cart from "../models/cart.models.js";
import Order from "../models/order.models.js";
import OrderItem from "../models/orderItem.models.js";
import Product from "../models/product.models.js";
import mongoose from "mongoose";
import bodyParser from "body-parser";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});
const createCheckoutSession = AsyncHandler(async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate(
      "items.product"
    );
    if (!cart || cart.items.length === 0)
      throw new ApiError(400, "Cart is empty");

    const line_items = cart.items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.product.name,
          images: item.product.images?.length ? [item.product.images[0]] : [],
        },
        unit_amount: Math.round(item.product.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      customer_email: req.user.email,
      metadata: {
        userId: req.user._id.toString(),
      },
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "IN"],
      },
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cart`,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { sessionId: session.id, url: session.url },
          "success!"
        )
      );
  } catch (error) {
    console.error("stripe session error", error);
    throw new ApiError(500, "Error creating checkout session");
  }
});

const createAndSaveOrderFromSession = async (session) => {
  const existing = await Order.findOne({ orderId: session.id });
  if (existing) {
    console.log("Order already exists for session:", session.id);
    return existing;
  }

  const userId = session.metadata?.userId;
  if (!userId) {
    throw new Error("No userId in session metadata. Can't create order.");
  }

  const cart = await Cart.findOne({ userId }).populate("items.product");

  const lineItemsFromCart =
    cart && cart.items && cart.items.length > 0 && cart.items;

  let subtotal = 0;
  if (lineItemsFromCart) {
    subtotal = cart.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  } else if (typeof session.amount_subtotal === "number") {
    subtotal = (session.amount_subtotal || 0) / 100;
  }

  const stripeTotal = session.amount_total
    ? session.amount_total / 100
    : subtotal;

  const stripeShipping = session.total_details?.amount_shipping
    ? session.total_details.amount_shipping / 100
    : 5;

  const stripeTax = session.total_details?.amount_tax
    ? session.total_details.amount_tax / 100
    : 0;

  // Create Order document skeleton (orderItems empty for now)
  const newOrder = await Order.create({
    customer: new mongoose.Types.ObjectId(userId),
    orderItems: [],
    shippingAddress: {
      fullname: session.shipping?.name || session.shipping_details?.name || "",
      email: session.customer_details?.email || session.customer_email || "",
      street:
        session.shipping?.address?.line1 ||
        session.shipping_details?.address?.line1 ||
        "",
      city:
        session.shipping?.address?.city ||
        session.shipping_details?.address?.city ||
        "",
      state:
        session.shipping?.address?.state ||
        session.shipping_details?.address?.state ||
        "",
      postalCode:
        session.shipping?.address?.postal_code ||
        session.shipping_details?.address?.postal_code ||
        "",
      country:
        session.shipping?.address?.country ||
        session.shipping_details?.address?.country ||
        "",
      phoneNumber: session.customer_details?.phone || "",
    },
    billingAddress: {
      name: session.customer_details?.name || "",
      email: session.customer_details?.email || session.customer_email || "",
      phone: session.customer_details?.phone || "",
      address: session.customer_details?.address || {},
    },
    stripePaymentIntentId: session.payment_intent || session.id,
    paymentStatus: session.payment_status || "unknown",
    paymentMethod: session.payment_method_types?.[0] || "card",
    paymentMethodDetails: {},
    taxPrice: stripeTax,
    shippingPrice: stripeShipping,
    totalPrice: stripeTotal,
    orderStatus: "pending",
    isPaid: session.payment_status === "paid",
    paidAt: session.payment_status === "paid" ? new Date() : null,
    orderId: session.id,
  });

  let createdOrderItems = [];
  if (lineItemsFromCart) {
    createdOrderItems = await Promise.all(
      cart.items.map(async (ci) => {
        const prod = ci.product;
        const oi = await OrderItem.create({
          order: newOrder._id,
          product: prod._id,
          productName: prod.name,
          productImage:
            prod.images && prod.images.length > 0 ? prod.images[0] : "",
          productPrice: prod.price,
          productQuantity: ci.quantity,
        });
        return oi;
      })
    );
  } else {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ["data.price.product"],
    });
    createdOrderItems = await Promise.all(
      lineItems.data.map(async (li) => {
        const name = li.price.product?.name || li.description || "Item";
        const image = li.price.product?.images?.[0] || "";
        const price = (li.price.unit_amount || 0) / 100;
        const qty = li.quantity || 1;
        const oi = await OrderItem.create({
          order: newOrder._id,
          product: null,
          productName: name,
          productImage: image,
          productPrice: price,
          productQuantity: qty,
        });
        return oi;
      })
    );
  }

  newOrder.orderItems = createdOrderItems.map((o) => o._id);
  await newOrder.save();

  try {
    await Cart.updateOne(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: { items: [] } }
    );
  } catch (err) {
    console.warn("Failed to clear cart after order creation:", err.message);
  }

  console.log("Order created from Stripe session:", newOrder._id.toString());
  return newOrder;
};

const stripeWebhook = AsyncHandler(async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // raw body from the bodyparser in the route
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("webhook signature verifcation failed.", error);
    return res.status(400).send(`webhook Error: ${error.message}`);
  }

  // event types handling
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      console.log(
        "checkout session completed:",
        session.metadata.userId,
        session
      );

      try {
        await createAndSaveOrderFromSession(session);
      } catch (err) {
        console.error("Failed to create order from session in webhook:", err);
      }
      break;

    default:
      console.log("Unhandled event type", event.type);
  }

  res.status(200).json(200, { received: true });
});

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

    let order = await Order.findOne({ orderId: session.id }).populate({
      path: "orderItems",
      model: "OrderItem",
    });

    if (!order) {
      console.log(
        "Order not found by session id creating synchronously as fallback"
      );
      order = await createAndSaveOrderFromSession(session);
    }

    return res
      .status(200)
      .json(new ApiResponse(200, order, "Payment confirmed"));
  } catch (error) {
    console.error("Checkout confirmation error:", error);
    throw new ApiError(500, `Checkout confirmation failed: ${error.message}`);
  }
});

export {
  createCheckoutSession,
  stripeWebhook,
  createAndSaveOrderFromSession,
  confirmCheckout,
};
