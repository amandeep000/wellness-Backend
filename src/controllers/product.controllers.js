import Product from "../models/product.models.js";
import Category from "../models/category.models.js";
import Review from "../models/review.models.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";

// get product from slug
const getProductBySlug = AsyncHandler(async (req, res) => {
  let productSlug = req.params.slug;
  console.log("The product slug (received):", productSlug);

  if (!productSlug || productSlug.trim() === "") {
    throw new ApiError(400, "Product slug is required");
  }
  productSlug = productSlug.toLowerCase();

  const productWithCategory = await Product.findOne({
    slug: productSlug,
  }).populate("category", "name");
  console.log("Product fetched from DB:", productWithCategory);

  if (!productWithCategory) {
    throw new ApiError(404, `Product with slug '${productSlug}' not found`);
  }
  console.log("Product category name:", productWithCategory.category?.name);

  const reviews = await Review.find({
    product: productWithCategory._id,
  }).select("name image comment");

  const productData = {
    ...productWithCategory.toObject(),
    reviews,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, productData, "Product with category and reviews")
    );
});

const getAllProducts = AsyncHandler(async (req, res) => {
  const allProducts = await Product.find()
    .populate("category", "name")
    .select("name slug price images")
    .lean();

  if (allProducts.length === 0) {
    return res.status(200).json(new ApiResponse(200, [], "NO Products found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, allProducts, "All products fetched"));
});
const getProductsByCategory = AsyncHandler(async (req, res) => {
  const categorySlug = req.params.categorySlug;
  const category = await Category.findOne({ slug: categorySlug });
  if (!category) {
    throw new ApiError(400, `Category with slug ${categorySlug} Not Found!`);
  }
  const categoryProducts = await Product.find({
    category: category._id,
  })
    .populate("category", "name slug")
    .select("name slug price images category");

  console.log(`Found ${categoryProducts.length} prdocus in category`);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        categoryProducts,
        `${categoryProducts.length} products found in ${category.name} category`
      )
    );
});

const searchProducts = AsyncHandler(async (req, res) => {
  const { q, category, minPrice, maxPrice } = req.query;

  if (!q || q.trim() === "") {
    throw new ApiError(400, "Search query is required");
  }

  const searchFilters = {
    $or: [{ name: { $regex: q, $options: "i" } }],
  };

  if (category) {
    const categoryDoc = await Category.findOne({ slug: category });
    if (categoryDoc) {
      searchFilters.category = categoryDoc._id;
    }
  }

  if (minPrice || maxPrice) {
    searchFilters.price = {};
    if (minPrice) searchFilters.price.$gte = Number(minPrice);
    if (maxPrice) searchFilters.price.$lte = Number(maxPrice);
  }

  const products = await Product.find(searchFilters)
    .populate("category", "name slug")
    .select("name slug price images stock category")
    .lean();

  if (Product.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], `No products found matching ${q}`));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        products,
        `Found ${products.length} products matching ${q}`
      )
    );
});

const getAllProductsWithPagination = AsyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const skip = (page - 1) * limit;

  try {
    const totalProducts = await Product.countDocuments();

    const allProducts = await Product.find()
      .populate("category", "name")
      .select("name price slug images stock")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    if (allProducts.length === 0) {
      throw new ApiError(404, "No product found");
    }

    const pagination = {
      currentPage: page,
      totalPage: Math.ceil(totalProducts / limit),
      totalProducts,
      hasNextPage: page < Math.ceil(totalProducts / limit),
      hasPrevPage: page > 1,
    };

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { products: allProducts, pagination },
          "products fetched successfully"
        )
      );
  } catch (error) {}
});

export {
  getAllProducts,
  getProductBySlug,
  getProductsByCategory,
  searchProducts,
};
