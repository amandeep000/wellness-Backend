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
    console.log(`Creating order for user: ${userId}`);
    console.log(`Stripe session ID: ${stripeSession.id}`);

    // Retrieve line items from Stripe session with expanded product info
    const lineItems = await stripe.checkout.sessions.listLineItems(
      stripeSession.id,
      {
        expand: ["data.price.product"],
      }
    );
    console.log(`Found ${lineItems.data.length} line items in Stripe session`);

    if (!lineItems.data || lineItems.data.length === 0) {
      throw new ApiError(400, "No items found in payment session");
    }

    // Calculate subtotal from line items
    const subtotal = lineItems.data.reduce((sum, item) => {
      return sum + (item.price.unit_amount * item.quantity) / 100;
    }, 0);

    const {
      tax: taxPrice,
      shipping: shippingPrice,
      total: totalPrice,
    } = calcPricing(subtotal);

    // Extract shipping and billing info
    const shipping_details = stripeSession.shipping || {};
    const customer_details = stripeSession.customer_details || {};

    // 1. Create Order WITHOUT orderItems yet
    const order = new Order({
      customer: userId,
      shippingAddress: {
        fullname: shipping_details?.name || customer_details?.name || "",
        email: customer_details?.email || stripeSession.customer_email || "",
        street: shipping_details?.address?.line1 || "",
        city: shipping_details?.address?.city || "",
        state: shipping_details?.address?.state || "",
        postalCode: shipping_details?.address?.postal_code || "",
        country: shipping_details?.address?.country || "",
        phoneNumber: customer_details?.phone || "",
      },
      billingAddress: {
        name: customer_details?.name || "",
        email: customer_details?.email || stripeSession.customer_email || "",
        phone: customer_details?.phone || "",
        address: {
          line1: customer_details?.address?.line1 || "",
          line2: customer_details?.address?.line2 || "",
          city: customer_details?.address?.city || "",
          state: customer_details?.address?.state || "",
          postal_code: customer_details?.address?.postal_code || "",
          country: customer_details?.address?.country || "",
        },
      },
      stripePaymentIntentId:
        stripeSession.payment_intent?.id ||
        stripeSession.payment_intent ||
        stripeSession.id,
      paymentStatus: stripeSession.payment_status,
      paymentMethod: stripeSession.payment_method_types?.[0] || "card",
      paymentMethodDetails: {
        type: "card", // default, expand if needed
      },
      taxPrice,
      shippingPrice,
      totalPrice,
      orderStatus: "pending",
      isPaid: stripeSession.payment_status === "paid",
      paidAt: stripeSession.payment_status === "paid" ? new Date() : null,
      orderItems: [], // start empty
    });

    const savedOrder = await order.save();

    // 2. Create and save OrderItems with order reference
    const orderItemPromises = lineItems.data.map(async (stripeItem) => {
      const productName =
        stripeItem.price.product.name || stripeItem.description;
      const unitAmount = stripeItem.price.unit_amount / 100;
      const quantity = stripeItem.quantity;

      // Try to find product in your DB by name
      let product;
      try {
        product = await Product.findOne({ name: productName });
        if (!product) {
          console.warn(`Product not found in DB: ${productName}`);
          product = {
            _id: new mongoose.Types.ObjectId(),
            name: productName,
            price: unitAmount,
            image: "",
          };
        }
      } catch (err) {
        console.error("Error finding product:", err);
        product = {
          _id: new mongoose.Types.ObjectId(),
          name: productName,
          price: unitAmount,
          image: "",
        };
      }

      // Ensure productImage is set or fallback
      const image =
        product.image && product.image.length > 0
          ? product.image
          : product.images?.[0] || "default-product-image.png";

      const orderItem = new OrderItem({
        order: savedOrder._id,
        product: product._id,
        productName,
        productImage: image,
        productPrice: unitAmount,
        productQuantity: quantity,
      });

      return await orderItem.save();
    });

    const savedOrderItems = await Promise.all(orderItemPromises);

    // 3. Link order items to order and update
    savedOrder.orderItems = savedOrderItems.map((item) => item._id);
    await savedOrder.save();

    // 4. Clear user cart after successful order
    try {
      await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });
      console.log("Cart cleared after successful order creation");
    } catch (cartError) {
      console.log(
        "Cart was already empty or error clearing cart:",
        cartError.message
      );
    }

    // 5. Return populated order with items and customer info
    const populatedOrder = await Order.findById(savedOrder._id)
      .populate({
        path: "orderItems",
        populate: {
          path: "product",
          select: "name price image",
        },
      })
      .populate("customer", "name email");

    console.log(`✅ Order created successfully: ${savedOrder._id}`);

    return populatedOrder;
  } catch (error) {
    console.error("❌ Error creating order:", error);
    throw new ApiError(500, `Failed to create order: ${error.message}`);
  }
};

const confirmCheckout = AsyncHandler(async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) throw new ApiError(400, "session id is required");

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: [
        "payment_intent",
        "payment_intent.charges",
        "customer_details",
        "shipping",
        "total_details",
      ],
    });

    if (session.payment_status !== "paid") {
      throw new ApiError(400, "Payment not completed");
    }

    const order = await createOrderFromCartInternal(
      session.metadata.userId,
      session
    );

    return res
      .status(201)
      .json(new ApiResponse(201, order, "Order created and payment confirmed"));
  } catch (error) {
    console.error("Checkout confirmation error:", error);
    throw new ApiError(500, `Checkout confirmation failed: ${error.message}`);
  }
});
export { createCheckoutSession, createOrderFromCartInternal, confirmCheckout };
