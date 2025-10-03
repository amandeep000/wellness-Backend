import { ApiError } from "../utils/ApiError.utils.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import Product from "../models/product.models.js";
import Category from "../models/category.models.js";
import generateSlug from "../utils/generateSlug.utils.js";

const addProducts = AsyncHandler(async (req, res) => {
  const {
    name,
    description,
    price,
    stock,
    slug,
    tags,
    bgColor,
    textColor,
    images,
    category,
    ingredients,
    ingredientsDescription,
    ingredientsVideo,
    benefits,
    supplementGuide,
    missiontext,
    missionImage,
  } = req.body;
  if (!name || name.trim() === "")
    throw new ApiError(400, "Product name is required");
  if (!description || description.trim() === "")
    throw new ApiError(400, "Product name is required");
  if (!price || parseInt(price) === 0)
    throw new ApiError("Price must be a valid value (non zero)");
  if (!slug || slug.trim() === "") throw new ApiError(400, "Slug is required");
  if (!bgColor) throw new ApiError(400, "Background color is required");
  if (!images) throw new ApiError(400, "Images are required");
  if (!category) {
    throw new ApiError(400, "Category is required");
  }
  if (!ingredients) throw new ApiError(400, "Ingredients are required");
  if (!ingredientsDescription)
    throw new ApiError(400, "Ingredients Description is madatory");
  if (!ingredientsVideo)
    throw new ApiError(400, "Ingredient Video is necessary");
  if (!benefits) throw new ApiError(400, "Product Benefits are required");
  if (!supplementGuide) throw new ApiError(400, "SupplementGuide is required");
  if (!missiontext || missiontext.trim() === "")
    throw new ApiError(400, "Missiontext is required");
  if (!missionImage || missionImage.trim() === "")
    throw new ApiError(400, "Mission Image string is required");

  let categoryDoc = await Category.findOne({ name: category });
  if (!categoryDoc) {
    const generatedSlug = generateSlug(category);
    categoryDoc = await Category.create({
      name: category,
      slug: generatedSlug,
    });
  }

  const createProduct = await Product.create({
    name: name,
    description: description,
    price: price,
    stock: stock,
    slug: slug,
    tags: tags,
    bgColor: bgColor,
    textColor: textColor,
    images: images,
    category: categoryDoc._id,
    ingredients: ingredients,
    ingredientsDescription: ingredientsDescription,
    ingredientsVideo: ingredientsVideo,
    benefits: benefits,
    supplementGuide: supplementGuide,
    missiontext: missiontext,
    missionImage: missionImage,
  });

  if (!createProduct) {
    throw new ApiError(500, "Failed to create product!");
  }

  res.status(201).json(new ApiResponse(201, "Successfully created product"));
});

export { addProducts };
