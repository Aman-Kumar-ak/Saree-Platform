import mongoose from "mongoose";

const advertisementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true, default: "" },
    eyebrow: { type: String, trim: true, default: "" },
    ctaLabel: { type: String, trim: true, default: "Shop now" },
    placementSlot: {
      type: String,
      enum: ["hero", "featured", "budget", "fallback"],
      default: "hero",
      index: true,
    },
    sectionType: {
      type: String,
      enum: ["hero", "featured", "budget", "fallback"],
      default: "hero",
    },
    status: {
      type: String,
      enum: ["draft", "live", "upcoming", "expired", "fallback"],
      default: "draft",
      index: true,
    },
    sourceType: {
      type: String,
      enum: ["manual", "auto", "reused"],
      default: "manual",
    },
    startAt: { type: Date, default: null, index: true },
    endAt: { type: Date, default: null, index: true },
    isPinned: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    backgroundImage: { type: String, trim: true, default: "" },
    filters: {
      search: { type: String, trim: true, default: "" },
      categorySlug: { type: String, trim: true, lowercase: true, default: "" },
      priceMin: { type: Number, min: 0, default: null },
      priceMax: { type: Number, min: 0, default: null },
      material: { type: String, trim: true, default: "" },
      color: { type: String, trim: true, default: "" },
    },
    previewProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    generationReason: { type: String, trim: true, default: "" },
    reuseSourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Advertisement",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

advertisementSchema.index({ status: 1, startAt: 1, endAt: 1, isDeleted: 1 });

export const Advertisement =
  mongoose.models.Advertisement ||
  mongoose.model("Advertisement", advertisementSchema);
