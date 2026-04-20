import { Router } from "express";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import { getConfig } from "../../config/env.js";
import { Category } from "../../models/Category.js";
import { Product } from "../../models/Product.js";
import { slugify } from "../../lib/slugify.js";

export const adminProductsRouter = Router();
let tagBackfillPromise = null;

async function uniqueProductSlug(base) {
  let s = slugify(base);
  let n = 0;
  while (await Product.exists({ slug: s }).exec()) {
    n += 1;
    s = `${slugify(base)}-${n}`;
  }
  return s;
}

async function uniqueProductTagId(baseName) {
  const cleaned = slugify(baseName).replace(/-/g, "").toUpperCase();
  const prefix = (cleaned.slice(0, 3) || "PRD").padEnd(3, "X");
  let attempt = 0;
  while (attempt < 50) {
    const rand = Math.floor(100 + Math.random() * 900);
    const tagId = `${prefix}-${Date.now().toString().slice(-6)}-${rand}`;
    const exists = await Product.exists({ tagId }).exec();
    if (!exists) return tagId;
    attempt += 1;
  }
  throw new Error("Could not generate unique tag id");
}

async function backfillMissingProductTagIds() {
  const docs = await Product.find({
    $or: [
      { tagId: { $exists: false } },
      { tagId: null },
      { tagId: "" },
    ],
  })
    .select("_id name")
    .lean()
    .exec();

  for (const doc of docs) {
    const tagId = await uniqueProductTagId(doc.name || "product");
    await Product.updateOne(
      {
        _id: doc._id,
        $or: [
          { tagId: { $exists: false } },
          { tagId: null },
          { tagId: "" },
        ],
      },
      { $set: { tagId } }
    ).exec();
  }
}

async function ensureProductTagIdsReady() {
  if (!tagBackfillPromise) {
    tagBackfillPromise = backfillMissingProductTagIds().finally(() => {
      tagBackfillPromise = null;
    });
  }
  await tagBackfillPromise;
}

function ensureCloudinaryConfigured() {
  const cfg = getConfig();
  if (!cfg.cloudinaryCloudName || !cfg.cloudinaryApiKey || !cfg.cloudinaryApiSecret) {
    return null;
  }
  cloudinary.config({
    cloud_name: cfg.cloudinaryCloudName,
    api_key: cfg.cloudinaryApiKey,
    api_secret: cfg.cloudinaryApiSecret,
  });
  return cfg.cloudinaryCloudName;
}

function extractCloudinaryPublicId(url, expectedCloudName) {
  const raw = String(url || "").trim();
  if (!raw) return null;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (!parsed.hostname.includes("res.cloudinary.com")) return null;

  const path = parsed.pathname.replace(/^\/+/, "");
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 4) return null;
  if (parts[0] !== expectedCloudName) return null;
  const uploadIdx = parts.findIndex((part) => part === "upload");
  if (uploadIdx === -1 || uploadIdx + 1 >= parts.length) return null;

  let candidate = parts.slice(uploadIdx + 1);
  if (candidate[0] && /^v\d+$/.test(candidate[0])) {
    candidate = candidate.slice(1);
  }
  if (candidate.length === 0) return null;

  const last = candidate[candidate.length - 1];
  const dot = last.lastIndexOf(".");
  if (dot > 0) {
    candidate[candidate.length - 1] = last.slice(0, dot);
  }
  return candidate.join("/");
}

async function deleteCloudinaryImages(imageUrls) {
  const cloudName = ensureCloudinaryConfigured();
  if (!cloudName) return;
  const publicIds = imageUrls
    .map((url) => extractCloudinaryPublicId(url, cloudName))
    .filter(Boolean);
  for (const publicId of publicIds) {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });
    if (result?.result === "ok" || result?.result === "not found") {
      continue;
    }
    throw new Error(`Cloudinary delete failed for ${publicId}`);
  }
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
    await ensureProductTagIdsReady();
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
    const tagId = await uniqueProductTagId(name);
    const doc = await Product.create({
      name,
      slug,
      tagId,
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
    if (err?.code === 11000) {
      res.status(409).json({ error: "Duplicate value. Please try again." });
      return;
    }
    if (err?.name === "ValidationError") {
      const first = Object.values(err.errors ?? {})[0];
      res.status(400).json({ error: first?.message || "Invalid product data" });
      return;
    }
    next(err);
  }
});

adminProductsRouter.put("/:id", async (req, res, next) => {
  try {
    await ensureProductTagIdsReady();
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
    if (!doc.tagId || !String(doc.tagId).trim()) {
      doc.tagId = await uniqueProductTagId(doc.name || "product");
    }
    await doc.save();
    const populated = await Product.findById(doc._id)
      .populate("category", "name slug")
      .lean()
      .exec();
    res.json({ product: populated });
  } catch (err) {
    if (err?.code === 11000) {
      res.status(409).json({ error: "Duplicate value. Please try again." });
      return;
    }
    if (err?.name === "ValidationError") {
      const first = Object.values(err.errors ?? {})[0];
      res.status(400).json({ error: first?.message || "Invalid product data" });
      return;
    }
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
    const doc = await Product.findById(id).exec();
    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await deleteCloudinaryImages(Array.isArray(doc.images) ? doc.images : []);
    await Product.deleteOne({ _id: doc._id }).exec();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
