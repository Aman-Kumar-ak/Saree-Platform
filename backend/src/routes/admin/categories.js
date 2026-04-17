import { Router } from "express";
import mongoose from "mongoose";
import { Category } from "../../models/Category.js";
import { Product } from "../../models/Product.js";
import { slugify } from "../../lib/slugify.js";

export const adminCategoriesRouter = Router();

async function uniqueCategorySlug(base) {
  let s = slugify(base);
  let n = 0;
  while (await Category.exists({ slug: s }).exec()) {
    n += 1;
    s = `${slugify(base)}-${n}`;
  }
  return s;
}

adminCategoriesRouter.get("/", async (_req, res, next) => {
  try {
    const items = await Category.find().sort({ name: 1 }).lean().exec();
    res.json({ categories: items });
  } catch (err) {
    next(err);
  }
});

adminCategoriesRouter.post("/", async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const description = String(req.body?.description ?? "").trim();
    const slugIn = String(req.body?.slug ?? "").trim().toLowerCase();
    const slug = slugIn || (await uniqueCategorySlug(name));
    if (await Category.exists({ slug })) {
      res.status(409).json({ error: "Slug already exists" });
      return;
    }
    const doc = await Category.create({
      name,
      slug,
      description,
      isActive: req.body?.isActive !== false,
    });
    res.status(201).json({ category: doc.toObject() });
  } catch (err) {
    next(err);
  }
});

adminCategoriesRouter.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const doc = await Category.findById(id).exec();
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
        if (await Category.exists({ slug: s, _id: { $ne: doc._id } })) {
          res.status(409).json({ error: "Slug already exists" });
          return;
        }
        doc.slug = s;
      }
    }
    if (req.body.isActive != null) doc.isActive = Boolean(req.body.isActive);
    await doc.save();
    res.json({ category: doc.toObject() });
  } catch (err) {
    next(err);
  }
});

adminCategoriesRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const count = await Product.countDocuments({ category: id }).exec();
    if (count > 0) {
      res.status(400).json({
        error: "Cannot delete category with products",
        productCount: count,
      });
      return;
    }
    const doc = await Category.findByIdAndDelete(id).exec();
    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
