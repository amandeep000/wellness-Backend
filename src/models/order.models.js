import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrderItem",
        required: true,
      },
    ],

    //  SHIPPING ADDRESS FROM STRIPE
    shippingAddress: {
      fullname: { type: String, required: true },
      email: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
      phoneNumber: { type: String },
    },

    //  BILLING ADDRESS FROM STRIPE
    billingAddress: {
      name: String,
      email: String,
      phone: String,
      address: {
        line1: String,
        line2: String,
        city: String,
        state: String,
        postal_code: String,
        country: String,
      },
    },

    //  STRIPE PAYMENT DATA
    stripePaymentIntentId: { type: String, unique: true },
    paymentStatus: { type: String },
    paymentMethod: { type: String },
    paymentMethodDetails: {
      brand: String,
      last4: String,
      exp_month: Number,
      exp_year: Number,
      country: String,
      funding: String,
    },

    taxPrice: { type: Number, default: 0.0, required: true },
    shippingPrice: { type: Number, default: 0.0, required: true },
    totalPrice: { type: Number, required: true },
    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipping", "delivered", "cancelled"],
      default: "pending",
    },
    isPaid: { type: Boolean, default: false },
    paidAt: Date,
    deliveredAt: Date,
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
