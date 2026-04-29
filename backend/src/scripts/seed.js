/**
 * Clears the database and seeds a wider demo catalog.
 * Run from backend: npm run seed
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { Order } from "../models/Order.js";
import { Address } from "../models/Address.js";
import { buildSeedCatalog } from "./catalogSeedData.js";

async function seed() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    const ok = await connectDb();
    if (!ok) {
      throw new Error("Set MONGODB_URI in backend/.env before seeding.");
    }
    console.log("✓ Connected to MongoDB");

    console.log("🗑️  Clearing existing data...");
    await Promise.all([
      Category.deleteMany({}),
      Product.deleteMany({}),
      User.deleteMany({}),
      Order.deleteMany({}),
      Address.deleteMany({}),
    ]);
    console.log("✓ Data cleared");

    const { categories: categorySeed, products: productSeed } = buildSeedCatalog();

    console.log("📂 Creating categories...");
    const categories = await Category.create(categorySeed);
    console.log(`✓ Created ${categories.length} categories`);

    const categoriesBySlug = new Map(
      categories.map((category) => [category.slug, category])
    );

    console.log("👗 Creating products...");
    const products = await Product.create(
      productSeed.map(({ categorySlug, ...product }) => ({
        ...product,
        category: categoriesBySlug.get(categorySlug)?._id,
      }))
    );
    console.log(`✓ Created ${products.length} products`);

    const prices = products.map((product) => Number(product.price) || 0).filter((price) => price > 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    console.log("\n✅ Database seeding completed successfully!");
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Products: ${products.length}`);
    console.log(
      `   - Price range: Rs. ${minPrice.toLocaleString("en-IN")} - Rs. ${maxPrice.toLocaleString("en-IN")}`
    );
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

seed();
