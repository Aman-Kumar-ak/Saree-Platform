/**
 * Syncs the demo catalog into an existing database without deleting other data.
 * Run from backend: node src/scripts/seedNewData.js
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { buildSeedCatalog } from "./catalogSeedData.js";

async function seed() {
  const ok = await connectDb();
  if (!ok) {
    throw new Error("Set MONGODB_URI in backend/.env before seeding.");
  }

  const { categories: categorySeed, products: productSeed } = buildSeedCatalog();

  await Category.bulkWrite(
    categorySeed.map((category) => ({
      updateOne: {
        filter: { slug: category.slug },
        update: { $set: category },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  const storedCategories = await Category.find({
    slug: { $in: categorySeed.map((category) => category.slug) },
  })
    .lean()
    .exec();
  const categoryBySlug = new Map(storedCategories.map((category) => [category.slug, category._id]));

  await Product.bulkWrite(
    productSeed.map(({ categorySlug, ...product }) => ({
      updateOne: {
        filter: { slug: product.slug },
        update: {
          $set: {
            ...product,
            category: categoryBySlug.get(categorySlug),
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  const prices = productSeed.map((product) => Number(product.price) || 0).filter((price) => price > 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  console.log(
    `Seeded ${categorySeed.length} categories and ${productSeed.length} products. Price range: Rs. ${minPrice.toLocaleString("en-IN")} - Rs. ${maxPrice.toLocaleString("en-IN")}.`
  );
}

async function main() {
  await seed();
  await mongoose.connection.close();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
