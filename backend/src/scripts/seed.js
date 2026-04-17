/**
 * Inserts demo categories and products if the database is empty.
 * Run from backend: npm run seed
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";

const demoCategories = [
  { name: "Silk", slug: "silk", description: "Traditional silk sarees" },
  { name: "Cotton", slug: "cotton", description: "Light cotton weaves" },
  { name: "Designer", slug: "designer", description: "Occasion wear" },
];

async function seed() {
  const ok = await connectDb();
  if (!ok) {
    throw new Error("Set MONGODB_URI in backend/.env before seeding.");
  }

  const existing = await Category.countDocuments();
  if (existing > 0) {
    console.log("Database already has categories; skip seed (delete data to re-seed).");
    return;
  }

  const insertedCats = await Category.insertMany(demoCategories);
  const bySlug = Object.fromEntries(insertedCats.map((c) => [c.slug, c._id]));

  const placeholder = (label) =>
    `https://placehold.co/480x720/e7e5e4/57534e/png?text=${encodeURIComponent(label)}`;

  const demoProducts = [
    {
      name: "Banarasi Silk Saree",
      slug: "banarasi-silk-saree",
      description: "Handloom-inspired pattern, rich border.",
      price: 8999,
      category: bySlug.silk,
      images: [placeholder("Banarasi")],
      stock: 5,
    },
    {
      name: "Kanjivaram Silk",
      slug: "kanjivaram-silk",
      description: "Classic temple border, festive tones.",
      price: 12499,
      category: bySlug.silk,
      images: [placeholder("Kanjivaram")],
      stock: 3,
    },
    {
      name: "Handloom Cotton",
      slug: "handloom-cotton",
      description: "Daily wear, breathable cotton.",
      price: 2499,
      category: bySlug.cotton,
      images: [placeholder("Cotton")],
      stock: 12,
    },
    {
      name: "Designer Party Wear",
      slug: "designer-party-wear",
      description: "Contemporary drape with embellishments.",
      price: 6999,
      category: bySlug.designer,
      images: [placeholder("Designer")],
      stock: 7,
    },
  ];

  await Product.insertMany(demoProducts);
  console.log(`Seeded ${insertedCats.length} categories and ${demoProducts.length} products.`);
}

async function main() {
  await seed();
  await mongoose.connection.close();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
