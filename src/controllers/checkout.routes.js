import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import Stripe from "stripe";
import Cart from "../models/cart.models.js";
import { calcPricing } from "./order.helper.js";
import Order from "../models/order.models.js";
import OrderItem from "../models/orderItem.models.js";

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
    // 1. Retrieve and validate user's cart
    const cart = await Cart.findOne({ userId }).populate("items.product");
    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty or not found");
    }

    // 2. Create OrderItems first (since Order references them)
    const orderItemPromises = cart.items.map(async (item) => {
      const orderItem = new OrderItem({
        order: null, // Will be updated after Order is created
        product: item.product._id,
        productName: item.product.name,
        productImage: item.product.image || item.product.images?.[0] || "",
        productPrice: item.product.price,
        productQuantity: item.quantity,
      });
      return await orderItem.save();
    });

    const savedOrderItems = await Promise.all(orderItemPromises);
    const orderItemIds = savedOrderItems.map((item) => item._id);

    // 3. Extract shipping and billing data from Stripe session
    const shipping = stripeSession.shipping || {};
    const customerDetails = stripeSession.customer_details || {};

    // 4. Calculate pricing details
    const {
      tax: taxPrice,
      shipping: shippingPrice,
      total: totalPrice,
    } = calcPricing(subtotal);

    // 5. Get payment method details (expand the session if needed)
    const paymentIntent = stripeSession.payment_intent;
    let paymentMethodDetails = {};

    if (typeof paymentIntent === "object" && paymentIntent.charges?.data?.[0]) {
      const charge = paymentIntent.charges.data[0];
      paymentMethodDetails = {
        type: charge.payment_method_details?.type || "card",
        card: charge.payment_method_details?.card || {},
      };
    }

    // 6. Create the Order document
    const order = new Order({
      customer: userId,
      orderItems: orderItemIds,

      // Shipping Address (from Stripe shipping info)
      shippingAddress: {
        fullname: shipping?.name || customerDetails?.name || "",
        email: customerDetails?.email || stripeSession.customer_email || "",
        street: shipping?.address?.line1 || "",
        city: shipping?.address?.city || "",
        state: shipping?.address?.state || "",
        postalCode: shipping?.address?.postal_code || "",
        country: shipping?.address?.country || "",
        phoneNumber: customerDetails?.phone || "",
      },

      // Billing Address (from Stripe customer details)
      billingAddress: {
        name: customerDetails?.name || "",
        email: customerDetails?.email || stripeSession.customer_email || "",
        phone: customerDetails?.phone || "",
        address: {
          line1: customerDetails?.address?.line1 || "",
          line2: customerDetails?.address?.line2 || "",
          city: customerDetails?.address?.city || "",
          state: customerDetails?.address?.state || "",
          postal_code: customerDetails?.address?.postal_code || "",
          country: customerDetails?.address?.country || "",
        },
      },

      // Stripe Payment Information
      stripePaymentIntentId:
        typeof paymentIntent === "string"
          ? paymentIntent
          : paymentIntent?.id || stripeSession.id,
      paymentStatus: stripeSession.payment_status,
      paymentMethod: stripeSession.payment_method_types?.[0] || "card",
      paymentMethodDetails: paymentMethodDetails,

      // Pricing
      taxPrice,
      shippingPrice,
      totalPrice,

      // Order Status
      orderStatus: "pending",
      isPaid: stripeSession.payment_status === "paid",
      paidAt: stripeSession.payment_status === "paid" ? new Date() : null,
    });

    // 7. Save the order
    const savedOrder = await order.save();

    // 8. Update OrderItems with the correct order reference
    await OrderItem.updateMany(
      { _id: { $in: orderItemIds } },
      { order: savedOrder._id }
    );

    // 9. Clear the user's cart after successful order creation
    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

    // 10. Populate the order for return
    const populatedOrder = await Order.findById(savedOrder._id)
      .populate({
        path: "orderItems",
        populate: {
          path: "product",
          model: "Product",
        },
      })
      .populate("customer", "name email");

    console.log(`Order created successfully: ${savedOrder._id}`);
    return populatedOrder;
  } catch (error) {
    console.error("Error creating order from cart:", error);
    throw new Error(`Failed to create order: ${error.message}`);
  }
};

const confirmCheckout = AsyncHandler(async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) throw new ApiError(400, "session id is required");

  try {
    // Retrieve the Stripe session with expanded data
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

    // Create order from cart using the helper function
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
