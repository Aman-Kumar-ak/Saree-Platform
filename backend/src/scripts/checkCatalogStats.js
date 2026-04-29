/**
 * Prints live catalog counts and price range.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";

async function main() {
  const ok = await connectDb();
  if (!ok) {
    throw new Error("Set MONGODB_URI in backend/.env before checking catalog stats.");
  }

  const [productCount, categoryCount, range] = await Promise.all([
    Product.countDocuments(),
    Category.countDocuments(),
    Product.aggregate([
      { $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" } } },
    ]),
  ]);

  console.log(
    JSON.stringify(
      {
        products: productCount,
        categories: categoryCount,
        minPrice: range[0]?.min ?? null,
        maxPrice: range[0]?.max ?? null,
      },
      null,
      2
    )
  );

  await mongoose.connection.close();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
