import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import Order from "../models/order.models.js";
import OrderItem from "../models/orderItem.models.js";
import Cart from "../models/cart.models.js";
import Product from "../models/product.models.js";

const createOrderFromCart = AsyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { shippingAddress, paymentMethod } = req.body;
  if (!shippingAddress || !paymentMethod) {
    throw new ApiError(400, "Shipping address and payment method are required");
  }
  const userCart = await Cart.findOne({ userId }).populate("items.product");
  if (!userCart || userCart.items.length === 0) {
    throw new ApiError(404, "Cart is empty. Add items before creating orders");
  }
  const validationErrors = [];
  let totalOrderPrice = 0;

  for (let i = 0; i < userCart.items.length; i++) {
    const cartItem = userCart.items[i];
    if (!cartItem.product) {
      validationErrors.push(`Item ${i + 1}: Product no longer exists`);
      continue;
    }
    const product = cartItem.product;
    const requestedQuantity = cartItem.quantity;
    if (requestedQuantity > product.stock) {
      validationErrors.push(
        `${product.name}: only ${product.stock} availabe, but ${requestedQuantity} requested`
      );
      continue;
    }

    totalOrderPrice += product.price * requestedQuantity;
  }
  // check validation errors
  if (validationErrors.length > 0) {
    throw new ApiError(
      400,
      `Order validation failed: ${validationErrors.join(", ")}`
    );
  }

  const taxRate = 0.08;
  const freeShippingThreshold = 50;

  const subtotal = totalOrderPrice;
  const taxPrice = parseFloat((subtotal * taxRate).toFixed(2));
  const shippingPrice = subtotal >= freeShippingThreshold ? 0 : 10;
  const totalPrice = parseFloat(subtotal + taxPrice + shippingPrice).toFixed(2);

  // create order
  const newOrder = await Order.create({
    customer: userId,
    orderItems: [],
    shippingAddress: shippingAddress,
    paymentStatus: "pending",
    paymentMethod: paymentMethod,
    taxPrice: taxPrice,
    shippingPrice: shippingPrice,
    totalPrice: totalPrice,
    orderStatus: "pending",
    isPaid: false,
  });
  // create orderItem with product smapshot
  const orderItemsToCreate = [];
  const stockUpdates = [];

  for (const cartItem of userCart.items) {
    const product = cartItem.product;
    const quantity = cartItem.quantity;
    orderItemsToCreate.push({
      order: newOrder._id,
      product: product._id,
      productName: product.name,
      productImage: product.images[0],
      productPrice: product.price,
      productQuantity: quantity,
    });

    stockUpdates.push({
      updateOne: {
        filter: { _id: product._id },
        update: { $inc: { stock: -quantity } },
      },
    });
  }
  const createOrderItems = await OrderItem.insertMany(orderItemsToCreate);
  const orderItemIds = createOrderItems.map((item) => item._id);
  newOrder.orderItems = orderItemIds;
  await newOrder.save();

  await Product.bulkWrite(stockUpdates);

  userCart.items = [];
  await userCart.save();

  const CompleteOrder = await Order.findById(newOrder._id)
    .populate("customer", "fullname email")
    .populate({
      path: "orderItems",
      populate: {
        path: "product",
        select: "name slug",
      },
    });
  return res
    .status(201)
    .json(new ApiResponse(201, CompleteOrder, "Order created successfully"));
});
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
