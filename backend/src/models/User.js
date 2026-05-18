import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true, default: "" },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    slug: { type: String, default: "" },
    name: { type: String, default: "" },
    price: { type: Number, default: 0, min: 0 },
    image: { type: String, default: "" },
    quantity: { type: Number, default: 1, min: 1, max: 99 },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, unique: true, sparse: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    avatar: { type: String, default: "" },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    // Embedded user data for fast access
    addresses: [addressSchema],
    cartItems: { type: [cartItemSchema], default: [] },
    cartUpdatedAt: { type: Date, default: null },
    orderIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    wishlistItems: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    orderCount: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    lastOrderDate: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ phone: 1, firebaseUid: 1 });
userSchema.index({ createdAt: -1 });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
