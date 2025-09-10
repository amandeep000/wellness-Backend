import Order from "../models/order.models.js";
import OrderItem from "../models/orderItem.models.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";

const getAllOrders = AsyncHandler(async (req, res) => {
  const orders = await Order.find({})
    .populate("customer", "name email")
    .populate({
      path: "orderItems",
      select: "productName productImage productPrice productQuantity",
    })
    .sort({ createdAt: -1 });

  if (!orders || orders.length === 0) {
    throw new ApiError(404, "Orders not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        orders,
        `${orders.length} orders retreived successfully`
      )
    );
});

const getMyOrders = AsyncHandler(async (req, res) => {
  const userId = req.user._id;

  const orders = await Order.find({ customer: userId })
    .populate({
      path: "orderItems",
      select: "productName productImage productPrice productQuantity",
    })
    .sort({ createdAt: -1 });
  if (!orders) {
    throw new ApiError(404, "NO orders were found for the user");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        orders,
        `${orders.length} orders retreived successfully`
      )
    );
});

const getOrderById = AsyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Order ID is required");
  }

  const order = await Order.findById(id)
    .populate("customer", "name email")
    .populate({
      path: "orderItems",
      select: "productName productImage productPrice productQuantity",
    });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order retrieved successfully"));
});

const updateOrderStatus = AsyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orderStatus } = req.body;

  if (!id) {
    throw new ApiError(400, "Order ID is required");
  }

  if (!orderStatus) {
    throw new ApiError(400, "Order status is required");
  }

  const validStatuses = [
    "pending",
    "processing",
    "shipping",
    "delivered",
    "cancelled",
  ];
  if (!validStatuses.includes(orderStatus)) {
    throw new ApiError(
      400,
      `Invalid order status. Valid statuses are: ${validStatuses.join(", ")}`
    );
  }

  const order = await Order.findByIdAndUpdate(
    id,
    {
      orderStatus,
      ...(orderStatus === "delivered" && { deliveredAt: new Date() }),
    },
    { new: true }
  )
    .populate("customer", "name email")
    .populate({
      path: "orderItems",
      select: "productName productImage productPrice productQuantity",
    });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order status updated successfully"));
});
const getCustomerOrders = AsyncHandler(async (req, res) => {
  const { customerId } = req.params;

  if (!customerId) {
    throw new ApiError(400, "Customer ID is required");
  }

  const orders = await Order.find({ customer: customerId })
    .populate({
      path: "orderItems",
      select: "productName productImage productPrice productQuantity",
    })
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        orders,
        `${orders.length} orders retrieved successfully`
      )
    );
});
export {
  getAllOrders,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getCustomerOrders,
};
