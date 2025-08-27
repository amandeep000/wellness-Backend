import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import Order from "../models/order.models.js";
import OrderItem from "../models/orderItem.models.js";
import Cart from "../models/cart.models.js";
import Product from "../models/product.models.js";
import Stripe from "stripe";

// Initialize Stripe
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// const createOrderFromCart = AsyncHandler(async (req, res) => {
//   const userId = req.user._id;
//   const { paymentIntentId } = req.body; // ← ONLY payment intent needed!

//   console.log("🚀 Controller: Starting STRIPE-ONLY order creation");
//   console.log("💳 Controller: Payment Intent ID:", paymentIntentId);

//   // STEP 1: Validate payment intent ID
//   if (!paymentIntentId) {
//     throw new ApiError(400, "Payment Intent ID is required");
//   }

//   // STEP 2: Get ALL data from Stripe (address + payment details)
//   console.log("💳 Controller: Fetching ALL details from Stripe...");
//   let paymentIntent;
//   let paymentMethod;
//   let billingAddress;
//   let shippingAddress;

//   try {
//     // Get payment intent
//     paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
//     console.log("📋 Controller: Payment status:", paymentIntent.status);

//     // Verify payment succeeded
//     if (paymentIntent.status !== "succeeded") {
//       throw new ApiError(
//         400,
//         `Payment failed. Status: ${paymentIntent.status}`
//       );
//     }

//     // Get payment method details
//     paymentMethod = await stripe.paymentMethods.retrieve(
//       paymentIntent.payment_method
//     );
//     console.log("💳 Controller: Payment method type:", paymentMethod.type);

//     // Extract billing address from Stripe
//     billingAddress = paymentMethod.billing_details.address;
//     console.log(
//       "🏠 Controller: Billing address from Stripe:",
//       billingAddress?.city
//     );

//     // For shipping, use billing address (Stripe standard approach)
//     shippingAddress = {
//       fullname: paymentMethod.billing_details.name,
//       email: paymentMethod.billing_details.email,
//       street:
//         billingAddress?.line1 +
//         (billingAddress?.line2 ? ` ${billingAddress.line2}` : ""),
//       city: billingAddress?.city,
//       state: billingAddress?.state,
//       postalCode: billingAddress?.postal_code,
//       country: billingAddress?.country,
//       phoneNumber: paymentMethod.billing_details.phone || "Not provided",
//     };

//     console.log("✅ Controller: All Stripe data extracted successfully");
//   } catch (error) {
//     console.log("❌ Controller: Stripe data retrieval failed:", error.message);
//     throw new ApiError(400, `Stripe verification failed: ${error.message}`);
//   }

//   // STEP 3: Validate cart
//   console.log("🛒 Controller: Validating cart...");
//   const userCart = await Cart.findOne({ userId }).populate("items.product");

//   if (!userCart || userCart.items.length === 0) {
//     throw new ApiError(400, "Cart is empty. Add items before creating orders");
//   }

//   // STEP 4: Validate products and calculate totals
//   const validationErrors = [];
//   let totalOrderPrice = 0;

//   for (let i = 0; i < userCart.items.length; i++) {
//     const cartItem = userCart.items[i];

//     if (!cartItem.product) {
//       validationErrors.push(`Item ${i + 1}: Product no longer exists`);
//       continue;
//     }

//     const product = cartItem.product;
//     const requestedQuantity = cartItem.quantity;

//     if (requestedQuantity > product.stock) {
//       validationErrors.push(
//         `${product.name}: Only ${product.stock} available, but ${requestedQuantity} requested`
//       );
//       continue;
//     }

//     totalOrderPrice += product.price * requestedQuantity;
//   }

//   if (validationErrors.length > 0) {
//     console.log("❌ Controller: Cart validation failed:", validationErrors);
//     throw new ApiError(
//       400,
//       `Order validation failed: ${validationErrors.join(", ")}`
//     );
//   }

//   // STEP 5: Calculate pricing
//   const taxRate = 0.08;
//   const freeShippingThreshold = 50;

//   const subtotal = totalOrderPrice;
//   const taxPrice = parseFloat((subtotal * taxRate).toFixed(2));
//   const shippingPrice = subtotal >= freeShippingThreshold ? 0 : 10;
//   const totalPrice = parseFloat(
//     (subtotal + taxPrice + shippingPrice).toFixed(2)
//   );

//   // STEP 6: Verify payment amount matches
//   const paidAmount = paymentIntent.amount / 100; // Stripe uses cents
//   if (Math.abs(paidAmount - totalPrice) > 0.01) {
//     throw new ApiError(
//       400,
//       `Payment amount mismatch. Expected: $${totalPrice}, Received: $${paidAmount}`
//     );
//   }

//   // STEP 7: Create order with ALL Stripe data
//   console.log("📝 Controller: Creating order with Stripe data...");

//   const newOrder = await Order.create({
//     customer: userId,
//     orderItems: [], // Will populate after creating OrderItems

//     // ✅ ADDRESS FROM STRIPE
//     shippingAddress: shippingAddress,

//     // ✅ ALL PAYMENT DATA FROM STRIPE
//     stripePaymentIntentId: paymentIntent.id,
//     paymentStatus: paymentIntent.status, // "succeeded"
//     paymentMethod: paymentMethod.type, // "card"

//     // ✅ DETAILED PAYMENT METHOD INFO FROM STRIPE
//     paymentMethodDetails: {
//       type: paymentMethod.type,
//       ...(paymentMethod.card && {
//         card: {
//           brand: paymentMethod.card.brand, // "visa", "mastercard"
//           last4: paymentMethod.card.last4, // "4242"
//           exp_month: paymentMethod.card.exp_month, // 12
//           exp_year: paymentMethod.card.exp_year, // 2025
//           country: paymentMethod.card.country, // "US"
//           funding: paymentMethod.card.funding, // "credit", "debit"
//         },
//       }),
//     },

//     // ✅ BILLING INFO FROM STRIPE
//     billingAddress: {
//       name: paymentMethod.billing_details.name,
//       email: paymentMethod.billing_details.email,
//       phone: paymentMethod.billing_details.phone,
//       address: billingAddress,
//     },

//     taxPrice: taxPrice,
//     shippingPrice: shippingPrice,
//     totalPrice: totalPrice,
//     orderStatus: "processing", // Since payment succeeded
//     isPaid: true, // Since payment succeeded
//     paidAt: new Date(paymentIntent.created * 1000), // Stripe timestamp
//   });

//   console.log("✅ Controller: Order created with ID:", newOrder._id);

//   // STEP 8: Create OrderItems
//   const orderItemsToCreate = [];
//   const stockUpdates = [];

//   for (const cartItem of userCart.items) {
//     const product = cartItem.product;
//     const quantity = cartItem.quantity;

//     orderItemsToCreate.push({
//       order: newOrder._id,
//       product: product._id,
//       productName: product.name,
//       productImage: product.images[0],
//       productPrice: product.price,
//       productQuantity: quantity,
//     });

//     stockUpdates.push({
//       updateOne: {
//         filter: { _id: product._id },
//         update: { $inc: { stock: -quantity } },
//       },
//     });
//   }

//   // Create OrderItems and update order
//   const createdOrderItems = await OrderItem.insertMany(orderItemsToCreate);
//   const orderItemIds = createdOrderItems.map((item) => item._id);
//   newOrder.orderItems = orderItemIds;
//   await newOrder.save();

//   // Update stock
//   await Product.bulkWrite(stockUpdates);

//   // ✅ CLEAR CART ONLY AFTER SUCCESSFUL ORDER CREATION
//   console.log("🧹 Controller: Clearing cart after successful order...");
//   userCart.items = [];
//   await userCart.save();

//   // Return complete order
//   const completeOrder = await Order.findById(newOrder._id)
//     .populate("customer", "fullname email")
//     .populate({
//       path: "orderItems",
//       populate: {
//         path: "product",
//         select: "name slug images",
//       },
//     });

//   console.log("🎉 Controller: STRIPE-ONLY order created successfully!");

//   return res
//     .status(201)
//     .json(
//       new ApiResponse(
//         201,
//         completeOrder,
//         "Order created successfully with Stripe data"
//       )
//     );
// });

// const createPaymentIntent = AsyncHandler(async (req, res) => {
//   const userId = req.user._id;

//   console.log("💳 Controller: Creating payment intent for user:", userId);

//   // Get cart and calculate total
//   const userCart = await Cart.findOne({ userId }).populate("items.product");
//   if (!userCart || userCart.items.length === 0) {
//     throw new ApiError(400, "Cart is empty");
//   }

//   let totalOrderPrice = 0;
//   for (const cartItem of userCart.items) {
//     if (cartItem.product) {
//       totalOrderPrice += cartItem.product.price * cartItem.quantity;
//     }
//   }

//   const taxRate = 0.08;
//   const freeShippingThreshold = 50;
//   const subtotal = totalOrderPrice;
//   const taxPrice = parseFloat((subtotal * taxRate).toFixed(2));
//   const shippingPrice = subtotal >= freeShippingThreshold ? 0 : 10;
//   const totalPrice = parseFloat(
//     (subtotal + taxPrice + shippingPrice).toFixed(2)
//   );

//   // Create Stripe Payment Intent
//   const paymentIntent = await stripe.paymentIntents.create({
//     amount: Math.round(totalPrice * 100), // Convert to cents
//     currency: "usd",
//     metadata: {
//       userId: userId.toString(),
//     },
//   });

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         clientSecret: paymentIntent.client_secret,
//         paymentIntentId: paymentIntent.id,
//         amount: totalPrice,
//       },
//       "Payment Intent created"
//     )
//   );
// });

const getUserOrders = AsyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userOrders = await Order.find({ customer: userId })
    .populate("orderItems")
    .sort({ createdAt: -1 })
    .select("-__v");
  return res
    .status(200)
    .json(
      new ApiResponse(200, userOrders, `${userOrders.length} orders retrieved`)
    );
});
const getOrderById = AsyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { orderId } = req.params;

  const order = await Order.findOne({ _id: orderId, customer: userId })
    .populate("customer", "fullname email")
    .populate({
      path: "orderItems",
      populate: {
        path: "product",
        select: "name slug images",
      },
    });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order Retrieved successfully"));
});
const updateOrderStatus = AsyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { orderStatus, paymentStatus, isPaid } = req.body;

  console.log("🔄 Controller: Updating order status for:", orderId);

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Update fields if provided
  if (orderStatus) {
    order.orderStatus = orderStatus;
    console.log("📝 Controller: Order status updated to:", orderStatus);
  }

  if (paymentStatus) {
    order.paymentStatus = paymentStatus;
    console.log("💳 Controller: Payment status updated to:", paymentStatus);
  }

  if (isPaid !== undefined) {
    order.isPaid = isPaid;
    if (isPaid) {
      order.paidAt = new Date();
      console.log("💰 Controller: Order marked as paid");
    }
  }

  if (orderStatus === "delivered") {
    order.deliveredAt = new Date();
    console.log("🚚 Controller: Order marked as delivered");
  }

  await order.save();

  console.log("✅ Controller: Order status updated successfully");

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order status updated successfully"));
});

export { createOrderFromCart, getUserOrders, getOrderById, updateOrderStatus };
