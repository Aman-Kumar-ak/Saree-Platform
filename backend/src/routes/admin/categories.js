import { Router } from "express";
import mongoose from "mongoose";
import { Category } from "../../models/Category.js";
import { Product } from "../../models/Product.js";
import { slugify } from "../../lib/slugify.js";

export const adminCategoriesRouter = Router();

async function uniqueCategorySlug(base, excludeId = null) {
  let s = slugify(base);
  let n = 0;
  while (
    await Category.exists(
      excludeId ? { slug: s, _id: { $ne: excludeId } } : { slug: s }
    ).exec()
  ) {
    n += 1;
    s = `${slugify(base)}-${n}`;
  }
  return s;
}

adminCategoriesRouter.get("/", async (_req, res, next) => {
  try {
    const [items, counts] = await Promise.all([
      Category.find().sort({ name: 1 }).lean().exec(),
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]).exec(),
    ]);
    const productCounts = new Map(
      counts.map((item) => [String(item._id), item.count])
    );
    res.json({
      categories: items.map((item) => ({
        ...item,
        productCount: productCounts.get(String(item._id)) || 0,
      })),
    });
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
    let nameChanged = false;
    if (req.body.name != null) {
      const nextName = String(req.body.name).trim();
      nameChanged = nextName && nextName !== doc.name;
      doc.name = nextName;
    }
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
    } else if (nameChanged) {
      doc.slug = await uniqueCategorySlug(doc.name, doc._id);
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
