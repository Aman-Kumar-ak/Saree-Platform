import { Router } from "express";
import mongoose from "mongoose";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";

export const productsRouter = Router();

productsRouter.get("/", async (req, res, next) => {
  try {
    const { category: categorySlug } = req.query;
    const filter = { isActive: true };
    if (categorySlug && typeof categorySlug === "string" && categorySlug.trim()) {
      const cat = await Category.findOne({
        slug: categorySlug.trim().toLowerCase(),
        isActive: true,
      })
        .select("_id")
        .lean()
        .exec();
      if (!cat) {
        res.json({ products: [] });
        return;
      }
      filter.category = cat._id;
    }
    const products = await Product.find(filter)
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

productsRouter.get("/:slugOrId", async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    let doc;
    if (mongoose.isValidObjectId(slugOrId)) {
      doc = await Product.findById(slugOrId)
        .populate("category", "name slug")
        .lean()
        .exec();
    } else {
      doc = await Product.findOne({
        slug: slugOrId.toLowerCase(),
        isActive: true,
      })
        .populate("category", "name slug")
        .lean()
        .exec();
    }
    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ product: doc });
  } catch (err) {
    next(err);
  }
});
