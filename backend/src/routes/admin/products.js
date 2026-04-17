import { Router } from "express";
import mongoose from "mongoose";
import { Category } from "../../models/Category.js";
import { Product } from "../../models/Product.js";
import { slugify } from "../../lib/slugify.js";

export const adminProductsRouter = Router();

async function uniqueProductSlug(base) {
  let s = slugify(base);
  let n = 0;
  while (await Product.exists({ slug: s }).exec()) {
    n += 1;
    s = `${slugify(base)}-${n}`;
  }
  return s;
}

adminProductsRouter.get("/", async (_req, res, next) => {
  try {
    const items = await Product.find()
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    res.json({ products: items });
  } catch (err) {
    next(err);
  }
});

adminProductsRouter.post("/", async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const categoryId = req.body?.category;
    if (!categoryId || !mongoose.isValidObjectId(String(categoryId))) {
      res.status(400).json({ error: "Valid category id is required" });
      return;
    }
    const cat = await Category.findById(categoryId).exec();
    if (!cat) {
      res.status(400).json({ error: "Category not found" });
      return;
    }
    const price = Number(req.body?.price);
    if (!Number.isFinite(price) || price < 0) {
      res.status(400).json({ error: "Valid price is required" });
      return;
    }
    const stock = Number(req.body?.stock ?? 0);
    if (!Number.isFinite(stock) || stock < 0) {
      res.status(400).json({ error: "Valid stock is required" });
      return;
    }
    const description = String(req.body?.description ?? "").trim();
    const images = Array.isArray(req.body?.images)
      ? req.body.images.map((u) => String(u).trim()).filter(Boolean)
      : [];
    const slugIn = String(req.body?.slug ?? "").trim().toLowerCase();
    const slug = slugIn || (await uniqueProductSlug(name));
    if (await Product.exists({ slug })) {
      res.status(409).json({ error: "Slug already exists" });
      return;
    }
    const doc = await Product.create({
      name,
      slug,
      description,
      price,
      category: cat._id,
      images,
      stock: Math.floor(stock),
      isActive: req.body?.isActive !== false,
    });
    const populated = await Product.findById(doc._id)
      .populate("category", "name slug")
      .lean()
      .exec();
    res.status(201).json({ product: populated });
  } catch (err) {
    next(err);
  }
});

adminProductsRouter.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const doc = await Product.findById(id).exec();
    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (req.body.name != null) doc.name = String(req.body.name).trim();
    if (req.body.description != null) {
      doc.description = String(req.body.description).trim();
    }
    if (req.body.slug != null) {
      const s = String(req.body.slug).trim().toLowerCase();
      if (s && s !== doc.slug) {
        if (await Product.exists({ slug: s, _id: { $ne: doc._id } })) {
          res.status(409).json({ error: "Slug already exists" });
          return;
        }
        doc.slug = s;
      }
    }
    if (req.body.price != null) {
      const price = Number(req.body.price);
      if (!Number.isFinite(price) || price < 0) {
        res.status(400).json({ error: "Invalid price" });
        return;
      }
      doc.price = price;
    }
    if (req.body.stock != null) {
      const stock = Number(req.body.stock);
      if (!Number.isFinite(stock) || stock < 0) {
        res.status(400).json({ error: "Invalid stock" });
        return;
      }
      doc.stock = Math.floor(stock);
    }
    if (req.body.category != null) {
      const cid = String(req.body.category);
      if (!mongoose.isValidObjectId(cid)) {
        res.status(400).json({ error: "Invalid category" });
        return;
      }
      const cat = await Category.findById(cid).exec();
      if (!cat) {
        res.status(400).json({ error: "Category not found" });
        return;
      }
      doc.category = cat._id;
    }
    if (Array.isArray(req.body.images)) {
      doc.images = req.body.images.map((u) => String(u).trim()).filter(Boolean);
    }
    if (req.body.isActive != null) doc.isActive = Boolean(req.body.isActive);
    await doc.save();
    const populated = await Product.findById(doc._id)
      .populate("category", "name slug")
      .lean()
      .exec();
    res.json({ product: populated });
  } catch (err) {
    next(err);
  }
});

adminProductsRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const doc = await Product.findByIdAndDelete(id).exec();
    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
