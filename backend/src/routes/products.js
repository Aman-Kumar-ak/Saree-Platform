import { Router } from "express";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { resolveProductQueryOptions } from "../lib/productQuery.js";

export const productsRouter = Router();

async function findProductBySlugOrId(slugOrId) {
  if (mongoose.isValidObjectId(slugOrId)) {
    return Product.findById(slugOrId)
      .populate("category", "name slug")
      .lean()
      .exec();
  }

  return Product.findOne({
    slug: String(slugOrId).toLowerCase(),
    isActive: true,
  })
    .populate("category", "name slug")
    .lean()
    .exec();
}

function normalizeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function recommendationScore(baseProduct, candidate, popularityMap) {
  let score = 0;

  if (
    baseProduct.category?._id &&
    candidate.category?._id &&
    String(baseProduct.category._id) === String(candidate.category._id)
  ) {
    score += 6;
  }

  if (
    normalizeValue(baseProduct.material) &&
    normalizeValue(baseProduct.material) === normalizeValue(candidate.material)
  ) {
    score += 4;
  }

  if (
    normalizeValue(baseProduct.color) &&
    normalizeValue(baseProduct.color) === normalizeValue(candidate.color)
  ) {
    score += 3;
  }

  const basePrice = Number(baseProduct.price) || 0;
  const candidatePrice = Number(candidate.price) || 0;
  const priceGap = Math.abs(candidatePrice - basePrice);
  if (basePrice > 0) {
    const ratio = priceGap / basePrice;
    if (ratio <= 0.15) score += 3;
    else if (ratio <= 0.35) score += 2;
    else if (ratio <= 0.55) score += 1;
  }

  if ((candidate.stock ?? 0) > 0) {
    score += 1;
  }

  score += Math.min(4, popularityMap.get(String(candidate._id)) ?? 0);

  return score;
}

productsRouter.get("/", async (req, res, next) => {
  try {
    const resolved = await resolveProductQueryOptions(req.query);

    let query = Product.find(resolved.mongoFilter)
      .populate("category", "name slug")
      .sort(resolved.sortSpec)
      .lean();

    if (resolved.limit) {
      query = query.limit(resolved.limit);
    }

    const products = await query.exec();
    res.json({
      products,
      applied: resolved.applied,
    });
  } catch (err) {
    next(err);
  }
});

productsRouter.get("/:slugOrId/recommendations", async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    const limit = Math.max(1, Math.min(12, Number(req.query.limit) || 8));
    const product = await findProductBySlugOrId(slugOrId);

    if (!product) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [candidates, popularityRows] = await Promise.all([
      Product.find({
        isActive: true,
        _id: { $ne: product._id },
        stock: { $gt: 0 },
      })
        .populate("category", "name slug")
        .lean()
        .exec(),
      Order.aggregate([
        {
          $match: {
            orderStatus: { $ne: "cancelled" },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            quantitySold: { $sum: "$items.quantity" },
          },
        },
      ]),
    ]);

    const popularityMap = new Map(
      popularityRows.map((row) => [String(row._id), Number(row.quantitySold) || 0])
    );

    const recommendations = candidates
      .map((candidate) => ({
        ...candidate,
        _score: recommendationScore(product, candidate, popularityMap),
      }))
      .sort((left, right) => {
        if (right._score !== left._score) return right._score - left._score;
        return new Date(right.updatedAt) - new Date(left.updatedAt);
      })
      .slice(0, limit)
      .map(({ _score, ...candidate }) => candidate);

    res.json({ recommendations });
  } catch (err) {
    next(err);
  }
});

productsRouter.get("/:slugOrId", async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    const doc = await findProductBySlugOrId(slugOrId);
    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ product: doc });
  } catch (err) {
    next(err);
  }
});
