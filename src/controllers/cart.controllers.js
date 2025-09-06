import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import Cart from "../models/cart.models.js";
import Product from "../models/product.models.js";

const syncCartFromRedux = AsyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    throw new ApiError(
      400,
      "Either cart items are invalid or Cart Items needs to be an Array"
    );
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.productId || !item.quantity || item.quantity < 1) {
      throw new ApiError(
        400,
        `Invalid cart item at ${i + 1}. Required:ProductId and Product quantity >= 1`
      );
    }
  }

  const productIds = items.map((item) => item.productId);
  const existingProducts = await Product.find({ _id: { $in: productIds } });

  if (existingProducts.length !== productIds.length) {
    const foundIds = existingProducts.map((p) => p._id.toString());
    const missingIds = productIds.filter((id) => !foundIds.includes(id));
    throw new ApiError(
      404,
      `Products not found with id ${missingIds.join(", ")}`
    );
  }
  const cartItems = items.map((item) => ({
    product: item.productId,
    quantity: parseInt(item.quantity),
  }));

  let userCart = await Cart.findOneAndUpdate(
    { userId },
    { $set: { items: cartItems } },
    { new: true, upsert: true }
  );

  const populatedCart = await Cart.findById(userCart._id).populate(
    "items.product",
    "name slug price images stock"
  );
  return res
    .status(200)
    .json(new ApiResponse(200, populatedCart, "cart synced successfully"));
});

const getUserCart = AsyncHandler(async (req, res) => {
  const userId = req.user._id;

  const userCart = await Cart.findOne({ userId }).populate(
    "items.product",
    "name slug price images stock"
  );

  if (!userCart) {
    return res.status(200).json(new ApiResponse(200, [], "Cart is empty"));
  }

  const validItems = userCart.items.filter((item) => item.product !== null);

  if (validItems.length !== userCart.items.length) {
    await Cart.updateOne({ userId }, { $set: { items: validItems } });
  }

  const cartSummary = {
    totalItem: validItems.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: validItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    ),
    itemCount: validItems.length,
  };
  const responseData = {
    ...userCart.toObject(),
    items: validItems,
    summary: cartSummary,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, responseData, "cart retreived successfully"));
});

const updateCartItemQuantity = AsyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId, quantity } = req.body;

  if (!productId || !quantity || quantity < 1) {
    throw new ApiError(
      400,
      "ProductId and Product quantity (min 1) is required"
    );
  }
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  if (quantity > product.stock) {
    throw new ApiError(400, `only ${product.stock} is left in the inventory`);
  }

  await Cart.updateOne(
    { userId, "items.product": productId },
    { $set: { "items.$.quantity": parseInt(quantity) } }
  );

  const updatedCart = await Cart.findOne({ userId }).populate(
    "items.product",
    "name slug price images stock"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedCart, "cart item updated successfully"));
});

const removeItemFromCart = AsyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;

  await Cart.updateOne(
    { userId },
    { $pull: { items: { product: productId } } }
  );

  const updatedCart = await Cart.findOne({ userId }).populate(
    "items.product",
    "name slug price images stock"
  );
  return res
    .status(200)
    .json(new ApiResponse(200, updatedCart, "cart updated successfully"));
});

const clearUserCart = AsyncHandler(async (req, res) => {
  const userId = req.user._id;
  await Cart.updateOne({ userId }, { $set: { items: [] } });

  return res
    .status(200)
    .json(new ApiResponse(200, [], "Cart cleared successfully"));
});
export { syncCartFromRedux, getUserCart, clearUserCart };
