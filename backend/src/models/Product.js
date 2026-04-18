import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    tagId: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true, default: "" },
    price: { type: Number, required: true, min: 0 },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    images: [{ type: String, trim: true }],
    stock: { type: Number, required: true, min: 0, default: 0 },
    color: { type: String, trim: true, default: "" },
    material: { type: String, trim: true, default: "" },
    size: { type: String, trim: true, default: "" },
    sku: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ category: 1, isActive: 1 });

export const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);
