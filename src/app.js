import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error.middlewares.js";
import { router as authRouter } from "./routes/auth.routes.js";
import { router as userRouter } from "./routes/user.routes.js";
import { router as addressRouter } from "./routes/address.routes.js";
import { router as productRouter } from "./routes/product.routes.js";
import { router as cartRouter } from "./routes/cart.routes.js";
// import { router as orderRouter } from "./routes/order.routes.js";

const app = express();
app.use(
  cors({
    origin: [process.env.CORS_ORIGIN, "http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
// ✅ Add these debug logs:
console.log("✅ Auth routes registered at /api/v1/auth");
console.log("✅ User routes registered at /api/v1/user");
console.log("✅ Address routes registered at /api/v1/addresses");
console.log("✅ Product routes registered at /api/v1/products");
console.log("✅ Cart routes registered at /api/v1/cart");
// global middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// app.use(express.static())

// api routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/addresses", addressRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/cart", cartRouter);
// app.use("/api/v1/orders", orderRouter);
app.use(errorHandler);
export default app;
