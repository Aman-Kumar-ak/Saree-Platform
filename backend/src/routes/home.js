import { Router } from "express";
import { Category } from "../models/Category.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import {
  advertisementToHomepageCard,
  reconcileAdvertisements,
} from "../services/advertisements.js";

export const homeRouter = Router();
const ROTATION_WINDOW_DAYS = 4;

function createHref(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") return;
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `/shop?${query}` : "/shop";
}

function uniqueImageCandidates(products) {
  return [...new Set(products.map((product) => product.images?.[0]).filter(Boolean))];
}

function selectImage(products) {
  return uniqueImageCandidates(products)[0] ?? "";
}

function createCollectionCard({
  id,
  title,
  eyebrow,
  description,
  ctaLabel,
  href,
  products,
  accentFrom = "rose",
}) {
  if (!products.length) return null;

  return {
    id,
    title,
    eyebrow,
    description,
    ctaLabel,
    href,
    image: selectImage(products),
    imageCandidates: uniqueImageCandidates(products),
    accentFrom,
    productCount: products.length,
  };
}

function cardFingerprint(card) {
  if (!card) return "";
  return [
    card.title ?? "",
    card.href ?? "",
    card.image ?? "",
  ].join("|");
}

function takeUniqueCards(cards, count, usedFingerprints = new Set()) {
  const picked = [];
  const localUsed = new Set(usedFingerprints);

  for (const card of cards) {
    if (!card) continue;
    const fingerprint = cardFingerprint(card);
    if (!fingerprint || localUsed.has(fingerprint)) continue;
    localUsed.add(fingerprint);
    picked.push(card);
    if (picked.length >= count) break;
  }

  return picked;
}

function assignUniqueSectionImages(cards, rotationSeed = 0) {
  const usedImages = new Set();

  return cards
    .filter(Boolean)
    .map((card, index) => {
      const candidates = rotateList(card.imageCandidates ?? [], rotationSeed + index);
      const image =
        candidates.find((candidate) => !usedImages.has(candidate)) ??
        candidates[0] ??
        card.image;

      if (image) usedImages.add(image);

      return {
        ...card,
        image,
      };
    });
}

function filterProducts(products, predicate) {
  return products.filter((product) => predicate(product));
}

function firstCategory(categories, predicate) {
  return categories.find(predicate) ?? null;
}

function rotateList(items, offset) {
  if (!items.length) return [];
  const normalizedOffset = ((offset % items.length) + items.length) % items.length;
  if (normalizedOffset === 0) return items;
  return [...items.slice(normalizedOffset), ...items.slice(0, normalizedOffset)];
}

function takeRotatedWindow(items, count, offset) {
  if (!items.length) return [];
  return rotateList(items, offset).slice(0, Math.min(count, items.length));
}

function getRotationSeed(date = new Date()) {
  return Math.floor(date.getTime() / (ROTATION_WINDOW_DAYS * 24 * 60 * 60 * 1000));
}

function sortNewestFirst(items) {
  return [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function buildTrendingProducts(products, rotationSeed) {
  const trendingRows = await Order.aggregate([
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
        orderedAt: { $max: "$createdAt" },
      },
    },
    { $sort: { quantitySold: -1, orderedAt: -1 } },
    { $limit: 24 },
  ]);

  const byId = new Map(products.map((product) => [String(product._id), product]));
  const ranked = trendingRows
    .map((row) => byId.get(String(row._id)))
    .filter(Boolean);

  if (ranked.length >= 4) {
    return ranked.slice(0, 8);
  }

  const fallback = rotateList(
    [...products].sort((a, b) => {
      if (b.stock !== a.stock) return b.stock - a.stock;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    }),
    rotationSeed + 1
  );

  const merged = [];
  const seen = new Set();
  for (const product of [...ranked, ...fallback]) {
    const key = String(product._id);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(product);
    if (merged.length >= 8) break;
  }
  return merged;
}

homeRouter.get("/", async (_req, res, next) => {
  try {
    const [categories, products, adDashboard] = await Promise.all([
      Category.find({ isActive: true }).sort({ name: 1 }).lean().exec(),
      Product.find({ isActive: true, stock: { $gt: 0 } })
        .populate("category", "name slug")
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean()
        .exec(),
      reconcileAdvertisements(),
    ]);
    const rotationSeed = getRotationSeed();
    const trendingProducts = await buildTrendingProducts(products, rotationSeed);
    const fallbackAdCard = advertisementToHomepageCard(adDashboard.fallbackAd);
    const liveHeroAd = advertisementToHomepageCard(adDashboard.slotBoards?.hero?.liveNow);
    const liveFeaturedAd = advertisementToHomepageCard(
      adDashboard.slotBoards?.featured?.liveNow
    );
    const liveBudgetAd = advertisementToHomepageCard(adDashboard.slotBoards?.budget?.liveNow);

    const cottonCategory = firstCategory(categories, (category) =>
      /cotton/i.test(category.name)
    );
    const silkCategory = firstCategory(categories, (category) =>
      /silk/i.test(category.name)
    );
    const designerCategory = firstCategory(categories, (category) =>
      /designer/i.test(category.name)
    );
    const banarasiCategory = firstCategory(categories, (category) =>
      /banarasi/i.test(category.name)
    );

    const under699 = filterProducts(products, (product) => product.price <= 699);
    const under999 = filterProducts(products, (product) => product.price <= 999);
    const under1499 = filterProducts(products, (product) => product.price <= 1499);
    const under1000 = filterProducts(products, (product) => product.price <= 1000);
    const cottonEdit = cottonCategory
      ? filterProducts(products, (product) => String(product.category?._id) === String(cottonCategory._id))
      : [];
    const silkEdit = silkCategory
      ? filterProducts(products, (product) => String(product.category?._id) === String(silkCategory._id))
      : [];
    const designerEdit = designerCategory
      ? filterProducts(products, (product) => String(product.category?._id) === String(designerCategory._id))
      : [];
    const banarasiEdit = banarasiCategory
      ? filterProducts(products, (product) => String(product.category?._id) === String(banarasiCategory._id))
      : [];

    const quickCollections = [
      createCollectionCard({
        id: "under-699",
        title: "Under Rs. 699",
        eyebrow: "Budget Edit",
        description: "Quick wins for everyday looks and gifting.",
        ctaLabel: "Shop budget picks",
        href: createHref({ priceMax: 699, collection: "under-699" }),
        products: takeRotatedWindow(under699, 6, rotationSeed),
        accentFrom: "amber",
      }),
      createCollectionCard({
        id: "under-999",
        title: "Under Rs. 999",
        eyebrow: "Most Loved",
        description: "Affordable sarees with strong visual appeal.",
        ctaLabel: "View under 999",
        href: createHref({ priceMax: 999, collection: "under-999" }),
        products: takeRotatedWindow(under999, 6, rotationSeed + 1),
        accentFrom: "rose",
      }),
      createCollectionCard({
        id: "under-1499",
        title: "Under Rs. 1499",
        eyebrow: "Festive Value",
        description: "Dressier options without stretching the budget.",
        ctaLabel: "Browse festive value",
        href: createHref({ priceMax: 1499, collection: "under-1499" }),
        products: takeRotatedWindow(under1499, 6, rotationSeed + 2),
        accentFrom: "emerald",
      }),
      createCollectionCard({
        id: "cotton-edit",
        title: cottonCategory?.name ?? "Cotton Edit",
        eyebrow: "Comfort First",
        description: "Lightweight sarees that work beautifully day after day.",
        ctaLabel: "Explore cotton",
        href: createHref({ category: cottonCategory?.slug, collection: "cotton-edit" }),
        products: takeRotatedWindow(cottonEdit, 6, rotationSeed),
        accentFrom: "sky",
      }),
    ].filter(Boolean);

    const featuredCollections = [
      createCollectionCard({
        id: "sarees-under-1000",
        title: "Sarees Under Rs. 1000",
        eyebrow: "Feature Drop",
        description: "A campaign-style edit built from live products in your catalog.",
        ctaLabel: "Shop the edit",
        href: createHref({ search: "saree under 1000", priceMax: 1000, collection: "sarees-under-1000" }),
        products: takeRotatedWindow(under1000, 8, rotationSeed + 1),
        accentFrom: "rose",
      }),
      createCollectionCard({
        id: "banarasi-spotlight",
        title: "Banarasi Spotlight",
        eyebrow: "Signature Weaves",
        description: "Rich textures and statement drapes with premium presence.",
        ctaLabel: "See Banarasi styles",
        href: createHref({ category: banarasiCategory?.slug, collection: "banarasi-spotlight" }),
        products: takeRotatedWindow(banarasiEdit, 8, rotationSeed + 2),
        accentFrom: "amber",
      }),
      createCollectionCard({
        id: "designer-edit",
        title: "Designer Occasion Edit",
        eyebrow: "Celebration Ready",
        description: "Elevated sarees selected for standout wedding and party moments.",
        ctaLabel: "Explore designer picks",
        href: createHref({ category: designerCategory?.slug, collection: "designer-edit" }),
        products: takeRotatedWindow(designerEdit, 8, rotationSeed + 3),
        accentFrom: "stone",
      }),
      createCollectionCard({
        id: "silk-story",
        title: "Silk Story",
        eyebrow: "Premium Drape",
        description: "Timeless silk picks for a polished, elegant wardrobe.",
        ctaLabel: "Browse silk styles",
        href: createHref({ category: silkCategory?.slug, collection: "silk-story" }),
        products: takeRotatedWindow(silkEdit, 8, rotationSeed + 4),
        accentFrom: "emerald",
      }),
      createCollectionCard({
        id: "everyday-value",
        title: "Everyday Value",
        eyebrow: "Easy Spend",
        description: "Light, wearable picks that keep the edit practical and polished.",
        ctaLabel: "Explore value picks",
        href: createHref({ priceMax: 1499, collection: "everyday-value" }),
        products: takeRotatedWindow(under1499, 8, rotationSeed + 5),
        accentFrom: "sky",
      }),
      createCollectionCard({
        id: "colour-story",
        title: "Colour Story",
        eyebrow: "Fresh Mood",
        description: "Bright, festive styles chosen to add more variety to the section.",
        ctaLabel: "See colour story",
        href: createHref({ priceMax: 999, collection: "colour-story" }),
        products: takeRotatedWindow(under999, 8, rotationSeed + 6),
        accentFrom: "rose",
      }),
    ].filter(Boolean);

    const heroPool = [liveHeroAd ?? fallbackAdCard, ...featuredCollections, ...quickCollections]
      .filter(Boolean);
    const heroSlides = assignUniqueSectionImages(
      takeUniqueCards(heroPool, 3).map((item, index) => ({
        ...item,
        id: `hero-${index + 1}-${item.id}`,
      })),
      rotationSeed + 9
    );

    const usedFingerprints = new Set(heroSlides.map((card) => cardFingerprint(card)));
    const homepageFeatured = assignUniqueSectionImages(
      takeUniqueCards(
        [liveFeaturedAd ?? fallbackAdCard, ...featuredCollections].filter(Boolean),
        4,
        usedFingerprints
      ),
      rotationSeed + 11
    );
    homepageFeatured.forEach((card) => usedFingerprints.add(cardFingerprint(card)));

    const homepageBudgetCollections = assignUniqueSectionImages(
      takeUniqueCards(
        [liveBudgetAd ?? fallbackAdCard, ...quickCollections].filter(Boolean),
        4,
        usedFingerprints
      ),
      rotationSeed + 13
    );

    const categoryShowcase = assignUniqueSectionImages(
      rotateList(
        categories
          .map((category) => {
            const categoryProducts = products.filter(
              (product) => String(product.category?._id) === String(category._id)
            );
            if (!categoryProducts.length) return null;
            return {
              id: category.slug,
              title: category.name,
              description: category.description || `Explore ${category.name.toLowerCase()}.`,
              image: selectImage(categoryProducts),
              imageCandidates: uniqueImageCandidates(categoryProducts),
              href: createHref({ category: category.slug }),
              productCount: categoryProducts.length,
            };
          })
          .filter(Boolean),
        rotationSeed
      ).slice(0, 6),
      rotationSeed + 15
    );

    const newestProducts = sortNewestFirst(products);
    const weeklyProducts = rotateList(
      [...products].sort((a, b) => {
        if (b.stock !== a.stock) return b.stock - a.stock;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      }),
      rotationSeed + 2
    );
    const newArrivals = takeRotatedWindow(newestProducts, 8, rotationSeed);

    res.json({
      heroSlides,
      quickCollections: homepageBudgetCollections,
      featuredCollections: homepageFeatured,
      categoryShowcase,
      trendingProducts,
      weeklyPicks: weeklyProducts.slice(0, 8),
      newArrivals,
    });
  } catch (err) {
    next(err);
  }
});
