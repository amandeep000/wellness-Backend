import mongoose from "mongoose";
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    slug: { type: String, unique: true, lowercase: true },
    tags: [{ type: String }],
    bgColor: {
      type: String,
      required: true,
      default: "#FFFFFF",
    },
    textColor: {
      type: String,
      required: true,
      default: "#FFFFFF",
    },
    images: {
      type: [{ type: String, required: true }],
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "Product must have at least one image url",
      },
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    ingredients: [{ type: String, required: true }],
    ingredientsDescription: [{ type: String, required: true }],
    ingredientsVideo: {
      type: String,
      required: true,
    },
    benefits: [
      {
        type: String,
        required: true,
      },
    ],
    supplementGuide: [{ type: String, required: true }],
    missiontext: {
      type: String,
      required: true,
    },
    missionImage: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
