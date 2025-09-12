import Order from "../models/order.models.js";
import OrderItem from "../models/orderItem.models.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import mongoose from "mongoose";

const getAllOrders = AsyncHandler(async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("customer", "name email")
      .populate({
        path: "orderItems",
        select: "productName productImage productPrice productQuantity",
      })
      .sort({ createdAt: -1 });

    if (!orders || orders.length === 0) {
      return res.status(200).json(new ApiResponse(200, [], "No orders found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          orders,
          `${orders.length} orders retrieved successfully`
        )
      );
  } catch (error) {
    console.error("Error in getAllOrders:", error);
    throw new ApiError(500, "Failed to retrieve orders");
  }
});

const getMyOrders = AsyncHandler(async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      throw new ApiError(401, "User not authenticated");
    }

    if (!new mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid user ID");
    }

    const orders = await Order.find({ customer: userId })
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
          orders || [],
          orders?.length > 0
            ? `${orders.length} orders retrieved successfully`
            : "No orders found for the user"
        )
      );
  } catch (error) {
    console.error("Error in getMyOrders:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to retrieve user orders");
  }
});

const getOrderById = AsyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, "Order ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid order ID format");
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
  } catch (error) {
    console.error("Error in getOrderById:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to retrieve order");
  }
});

const updateOrderStatus = AsyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    if (!id) {
      throw new ApiError(400, "Order ID is required");
    }

    if (!orderStatus) {
      throw new ApiError(400, "Order status is required");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid order ID format");
    }

    const validStatuses = [
      "pending",
      "processing",
      "shipping",
      "delivered",
      "cancelled",
    ];

    if (!validStatuses.includes(orderStatus.toLowerCase())) {
      throw new ApiError(
        400,
        `Invalid order status. Valid statuses are: ${validStatuses.join(", ")}`
      );
    }

    const updateData = {
      orderStatus: orderStatus.toLowerCase(),
      updatedAt: new Date(),
    };

    if (orderStatus.toLowerCase() === "delivered") {
      updateData.deliveredAt = new Date();
    }

    const order = await Order.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
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
  } catch (error) {
    console.error("Error in updateOrderStatus:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to update order status");
  }
});

const getCustomerOrders = AsyncHandler(async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      throw new ApiError(400, "Customer ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      throw new ApiError(400, "Invalid customer ID format");
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
          orders || [],
          `${orders?.length || 0} orders retrieved successfully`
        )
      );
  } catch (error) {
    console.error("Error in getCustomerOrders:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to retrieve customer orders");
  }
});

export {
  getAllOrders,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getCustomerOrders,
};

// const getAllOrders = AsyncHandler(async (req, res) => {
//   const orders = await Order.find({})
//     .populate("customer", "name email")
//     .populate({
//       path: "orderItems",
//       select: "productName productImage productPrice productQuantity",
//     })
//     .sort({ createdAt: -1 });

//   if (!orders || orders.length === 0) {
//     throw new ApiError(404, "Orders not found");
//   }

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         orders,
//         `${orders.length} orders retreived successfully`
//       )
//     );
// });

// const getMyOrders = AsyncHandler(async (req, res) => {
//   const userId = req.user._id;

//   const orders = await Order.find({ customer: userId })
//     .populate({
//       path: "orderItems",
//       select: "productName productImage productPrice productQuantity",
//     })
//     .sort({ createdAt: -1 });
//   if (!orders || orders.length === 0) {
//     return res
//       .status(200)
//       .json(new ApiResponse(200, [], "No orders found for the user!"));
//   }
//   return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         orders,
//         `${orders.length} orders retreived successfully`
//       )
//     );
// });

// const getOrderById = AsyncHandler(async (req, res) => {
//   const { id } = req.params;

//   if (!id) {
//     throw new ApiError(400, "Order ID is required");
//   }

//   const order = await Order.findById(id)
//     .populate("customer", "name email")
//     .populate({
//       path: "orderItems",
//       select: "productName productImage productPrice productQuantity",
//     });

//   if (!order) {
//     throw new ApiError(404, "Order not found");
//   }

//   return res
//     .status(200)
//     .json(new ApiResponse(200, order, "Order retrieved successfully"));
// });

// const updateOrderStatus = AsyncHandler(async (req, res) => {
//   const { id } = req.params;
//   const { orderStatus } = req.body;

//   if (!id) {
//     throw new ApiError(400, "Order ID is required");
//   }

//   if (!orderStatus) {
//     throw new ApiError(400, "Order status is required");
//   }

//   const validStatuses = [
//     "pending",
//     "processing",
//     "shipping",
//     "delivered",
//     "cancelled",
//   ];
//   if (!validStatuses.includes(orderStatus)) {
//     throw new ApiError(
//       400,
//       `Invalid order status. Valid statuses are: ${validStatuses.join(", ")}`
//     );
//   }

//   const order = await Order.findByIdAndUpdate(
//     id,
//     {
//       orderStatus,
//       ...(orderStatus === "delivered" && { deliveredAt: new Date() }),
//     },
//     { new: true }
//   )
//     .populate("customer", "name email")
//     .populate({
//       path: "orderItems",
//       select: "productName productImage productPrice productQuantity",
//     });

//   if (!order) {
//     throw new ApiError(404, "Order not found");
//   }

//   return res
//     .status(200)
//     .json(new ApiResponse(200, order, "Order status updated successfully"));
// });
// const getCustomerOrders = AsyncHandler(async (req, res) => {
//   const { customerId } = req.params;

//   if (!customerId) {
//     throw new ApiError(400, "Customer ID is required");
//   }

//   const orders = await Order.find({ customer: customerId })
//     .populate({
//       path: "orderItems",
//       select: "productName productImage productPrice productQuantity",
//     })
//     .sort({ createdAt: -1 });

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         orders,
//         `${orders.length} orders retrieved successfully`
//       )
//     );
// });
// export {
//   getAllOrders,
//   getMyOrders,
//   getOrderById,
//   updateOrderStatus,
//   getCustomerOrders,
// };
