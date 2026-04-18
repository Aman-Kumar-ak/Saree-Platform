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
