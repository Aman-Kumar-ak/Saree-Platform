import { Advertisement } from "../models/Advertisement.js";
import { Category } from "../models/Category.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";

const AUTO_WINDOW_DAYS = 4;
export const HOMEPAGE_SLOTS = ["hero", "featured", "budget"];

function createHref(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") return;
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `/shop?${query}` : "/shop";
}

function selectImage(products, offset = 0) {
  const candidates = products.filter((product) => product.images?.[0]);
  if (!candidates.length) return "";
  return rotateList(candidates, offset)[0]?.images?.[0] ?? "";
}

function firstCategory(categories, predicate) {
  return categories.find(predicate) ?? null;
}

function toDayStart(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getRotationSeed(date = new Date()) {
  return Math.floor(date.getTime() / (AUTO_WINDOW_DAYS * 24 * 60 * 60 * 1000));
}

function rotateList(items, offset) {
  if (!items.length) return [];
  const normalizedOffset = ((offset % items.length) + items.length) % items.length;
  if (normalizedOffset === 0) return items;
  return [...items.slice(normalizedOffset), ...items.slice(0, normalizedOffset)];
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function roundPriceCeiling(value) {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return 0;
  if (numericValue < 1000) return Math.ceil(numericValue / 50) * 50;
  if (numericValue < 3000) return Math.ceil(numericValue / 100) * 100;
  return Math.ceil(numericValue / 250) * 250;
}

function quantile(sortedValues, ratio) {
  if (!sortedValues.length) return 0;
  const index = Math.max(
    0,
    Math.min(sortedValues.length - 1, Math.floor((sortedValues.length - 1) * ratio))
  );
  return sortedValues[index];
}

function sumPopularity(products, popularityMap) {
  return products.reduce(
    (sum, product) => sum + (popularityMap.get(String(product._id)) ?? 0),
    0
  );
}

function normalizeLabel(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function filtersFingerprint(filters = {}) {
  return [
    filters.search ?? "",
    filters.categorySlug ?? "",
    filters.priceMin ?? "",
    filters.priceMax ?? "",
    filters.material ?? "",
    filters.color ?? "",
  ].join("|");
}

function buildRecentnessScore(product) {
  const updatedAt = new Date(product.updatedAt || product.createdAt || 0).getTime();
  if (!updatedAt) return 0;
  return updatedAt;
}

function sortProductsForCampaign(products, popularityMap, offset = 0) {
  const ranked = [...products].sort((left, right) => {
    const popularityDiff =
      (popularityMap.get(String(right._id)) ?? 0) -
      (popularityMap.get(String(left._id)) ?? 0);
    if (popularityDiff !== 0) return popularityDiff;

    const recencyDiff = buildRecentnessScore(right) - buildRecentnessScore(left);
    if (recencyDiff !== 0) return recencyDiff;

    if ((right.stock ?? 0) !== (left.stock ?? 0)) {
      return (right.stock ?? 0) - (left.stock ?? 0);
    }

    return (right.price ?? 0) - (left.price ?? 0);
  });

  return rotateList(ranked, offset);
}

function buildDisplayProducts(products, popularityMap, offset, count = 8) {
  return sortProductsForCampaign(products, popularityMap, offset).slice(
    0,
    Math.min(count, products.length)
  );
}

function normalizeStatus(ad, now) {
  if (!ad || ad.isDeleted) return "deleted";
  if (ad.status === "fallback") return "fallback";
  if (ad.endAt && new Date(ad.endAt) < now) return "expired";
  if (ad.startAt && new Date(ad.startAt) > now) return "upcoming";
  return ad.status === "live" ? "live" : ad.status;
}

async function fetchCatalogContext() {
  const [categories, products, popularityRows] = await Promise.all([
    Category.find({ isActive: true }).sort({ name: 1 }).lean().exec(),
    Product.find({ isActive: true, stock: { $gt: 0 } })
      .populate("category", "name slug")
      .sort({ updatedAt: -1, createdAt: -1 })
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
      { $sort: { quantitySold: -1 } },
      { $limit: 24 },
    ]),
  ]);

  const popularityMap = new Map(
    popularityRows.map((row) => [String(row._id), Number(row.quantitySold) || 0])
  );

  return { categories, products, popularityMap };
}

function createCandidate({
  id,
  title,
  subtitle,
  eyebrow,
  ctaLabel,
  placementSlot = "hero",
  sectionType = "hero",
  filters = {},
  products = [],
  generationReason,
  imageOffset = 0,
}) {
  if (!products.length) return null;
  return {
    id,
    title,
    subtitle,
    eyebrow,
    ctaLabel,
    placementSlot,
    sectionType,
    filters,
    products,
    backgroundImage: selectImage(products, imageOffset),
    generationReason,
  };
}

function buildAutoCandidates({
  categories,
  products,
  popularityMap,
  now = new Date(),
  variantSeed,
}) {
  const rotationSeed = variantSeed ?? getRotationSeed(now);
  const categoryGroups = categories
    .map((category) => {
      const categoryProducts = products.filter(
        (product) => String(product.category?._id) === String(category._id)
      );
      if (categoryProducts.length < 4) return null;
      return {
        category,
        products: categoryProducts,
        popularity: sumPopularity(categoryProducts, popularityMap),
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.popularity !== left.popularity) return right.popularity - left.popularity;
      return right.products.length - left.products.length;
    });
  const rotatedCategoryGroups = rotateList(categoryGroups, rotationSeed);

  const materialGroups = Object.values(
    products.reduce((acc, product) => {
      const key = normalizeLabel(product.material).toLowerCase();
      if (!key) return acc;
      if (!acc[key]) {
        acc[key] = {
          label: normalizeLabel(product.material),
          products: [],
        };
      }
      acc[key].products.push(product);
      return acc;
    }, {})
  )
    .filter((group) => group.products.length >= 4)
    .map((group) => ({
      ...group,
      popularity: sumPopularity(group.products, popularityMap),
    }))
    .sort((left, right) => {
      if (right.popularity !== left.popularity) return right.popularity - left.popularity;
      return right.products.length - left.products.length;
    });
  const rotatedMaterialGroups = rotateList(materialGroups, rotationSeed + 1);

  const sortedPrices = [...products]
    .map((product) => Number(product.price || 0))
    .filter((price) => price > 0)
    .sort((left, right) => left - right);
  const minimumProductsPerCampaign = Math.max(
    4,
    Math.min(10, Math.floor(products.length * 0.14))
  );
  const priceBreakpoints = [...new Set(
    [0.2, 0.33, 0.48, 0.65].map((ratio) => roundPriceCeiling(quantile(sortedPrices, ratio)))
  )]
    .filter((value) => value > 0)
    .sort((left, right) => left - right);

  const budgetTitleTemplates = [
    (price) => `Easy Picks Under Rs. ${formatPrice(price)}`,
    (price) => `Fresh Finds Under Rs. ${formatPrice(price)}`,
    (price) => `Everyday Edit Under Rs. ${formatPrice(price)}`,
    (price) => `Style First Under Rs. ${formatPrice(price)}`,
    (price) => `Smart Spend Under Rs. ${formatPrice(price)}`,
  ];
  const budgetSubtitleTemplates = [
    (count) => `${count}+ in-stock styles chosen from the most reachable price band in your catalog.`,
    (count) => `Built from live catalog pricing so the offer stays fresh as new styles arrive.`,
    (count) => `A moving value range selected from your current product mix and stock.`,
  ];
  const heroTitleTemplates = [
    (label) => `${label} Spotlight`,
    (label) => `${label} Story`,
    (label) => `${label} Signature Edit`,
    (label) => `${label} Showcase`,
  ];
  const heroSubtitleTemplates = [
    (label) => `A rotating ${label.toLowerCase()} campaign shaped by what is strong in your catalog right now.`,
    (label) => `Fresh imagery and copy pulled from your current ${label.toLowerCase()} selection.`,
    (label) => `${label} styles selected for presence, stock depth, and visual impact.`,
  ];
  const featuredTitleTemplates = [
    (label) => `${label} Edit`,
    (label) => `${label} Highlights`,
    (label) => `${label} Favourites`,
    (label) => `${label} Occasion Picks`,
  ];
  const featuredSubtitleTemplates = [
    (label) => `Dynamic picks shaped by active products, popularity, and freshness in ${label.toLowerCase()}.`,
    (label) => `A changing showcase pulled from the strongest products in this theme.`,
    (label) => `${label} styles prepared from live stock so the block keeps evolving.`,
  ];

  const rankedProducts = sortProductsForCampaign(products, popularityMap, rotationSeed);
  const newestProducts = [...products].sort(
    (left, right) => buildRecentnessScore(right) - buildRecentnessScore(left)
  );

  const budgetCandidates = priceBreakpoints
    .map((priceMax, index) => {
      const matchingProducts = products.filter((product) => product.price <= priceMax);
      if (matchingProducts.length < minimumProductsPerCampaign) return null;
      const titleBuilder =
        budgetTitleTemplates[(rotationSeed + index) % budgetTitleTemplates.length];
      const subtitleBuilder =
        budgetSubtitleTemplates[(rotationSeed + index) % budgetSubtitleTemplates.length];
      const displayProducts = buildDisplayProducts(
        matchingProducts,
        popularityMap,
        rotationSeed + index
      );

      return createCandidate({
        id: `auto-budget-${priceMax}`,
        title: titleBuilder(priceMax),
        subtitle: subtitleBuilder(matchingProducts.length),
        eyebrow: "Auto Price Band",
        ctaLabel: "Shop this range",
        placementSlot: "budget",
        sectionType: "budget",
        filters: { priceMax },
        products: displayProducts,
        imageOffset: rotationSeed + index,
        generationReason: `Auto-created from ${matchingProducts.length} in-stock products up to Rs. ${formatPrice(priceMax)}.`,
      });
    })
    .filter(Boolean);

  const categoryBudgetCandidates = rotatedCategoryGroups
    .slice(0, 2)
    .map((group, index) => {
      const priceMax = priceBreakpoints[index] ?? roundPriceCeiling(quantile(sortedPrices, 0.42 + index * 0.1));
      const matchingProducts = group.products.filter((product) => product.price <= priceMax);
      if (matchingProducts.length < minimumProductsPerCampaign - 1) return null;
      return createCandidate({
        id: `auto-budget-${group.category.slug}-${priceMax}`,
        title: `${group.category.name} Under Rs. ${formatPrice(priceMax)}`,
        subtitle: `A moving budget window selected from your current ${group.category.name.toLowerCase()} stock.`,
        eyebrow: "Auto Collection",
        ctaLabel: `Explore ${group.category.name.toLowerCase()}`,
        placementSlot: "budget",
        sectionType: "budget",
        filters: { categorySlug: group.category.slug, priceMax },
        products: buildDisplayProducts(
          matchingProducts,
          popularityMap,
          rotationSeed + index + 2
        ),
        imageOffset: rotationSeed + index + 2,
        generationReason: `Auto-created from ${matchingProducts.length} ${group.category.name.toLowerCase()} options inside a live budget band.`,
      });
    })
    .filter(Boolean);

  const heroCandidates = [
    ...rotatedCategoryGroups.slice(0, 3).map((group, index) => {
      const titleBuilder =
        heroTitleTemplates[(rotationSeed + index) % heroTitleTemplates.length];
      const subtitleBuilder =
        heroSubtitleTemplates[(rotationSeed + index) % heroSubtitleTemplates.length];
      return createCandidate({
        id: `auto-hero-category-${group.category.slug}`,
        title: titleBuilder(group.category.name),
        subtitle: subtitleBuilder(group.category.name),
        eyebrow: index === 0 ? "Smart Spotlight" : "Auto Spotlight",
        ctaLabel: `Explore ${group.category.name.toLowerCase()}`,
        placementSlot: "hero",
        sectionType: "hero",
        filters: { categorySlug: group.category.slug },
        products: buildDisplayProducts(group.products, popularityMap, rotationSeed + index),
        imageOffset: rotationSeed + index,
        generationReason: `Auto-created from ${group.products.length} ${group.category.name.toLowerCase()} styles with strong stock and demand.`,
      });
    }),
    ...rotatedMaterialGroups.slice(0, 2).map((group, index) => {
      const titleBuilder =
        heroTitleTemplates[(rotationSeed + index + 1) % heroTitleTemplates.length];
      const subtitleBuilder =
        heroSubtitleTemplates[(rotationSeed + index + 1) % heroSubtitleTemplates.length];
      return createCandidate({
        id: `auto-hero-material-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        title: titleBuilder(group.label),
        subtitle: subtitleBuilder(group.label),
        eyebrow: "Material Focus",
        ctaLabel: `Browse ${group.label.toLowerCase()}`,
        placementSlot: "hero",
        sectionType: "hero",
        filters: { material: group.label },
        products: buildDisplayProducts(group.products, popularityMap, rotationSeed + index + 4),
        imageOffset: rotationSeed + index + 4,
        generationReason: `Auto-created from ${group.products.length} in-stock ${group.label.toLowerCase()} products.`,
      });
    }),
    createCandidate({
      id: "auto-hero-trending",
      title: "Most-Loved Right Now",
      subtitle: "An automatically refreshed hero based on demand, stock depth, and fresh arrivals.",
      eyebrow: "Live Catalog Signal",
      ctaLabel: "See what is trending",
      placementSlot: "hero",
      sectionType: "hero",
      filters: {},
      products: rankedProducts.slice(0, 8),
      imageOffset: rotationSeed + 6,
      generationReason: "Auto-created from high-performing products and current stock.",
    }),
    createCandidate({
      id: "auto-hero-new-arrivals",
      title: "Fresh Styles This Week",
      subtitle: "Newer additions step into the hero automatically as your catalog grows.",
      eyebrow: "Just Arrived",
      ctaLabel: "Browse fresh arrivals",
      placementSlot: "hero",
      sectionType: "hero",
      filters: { search: "new arrivals" },
      products: rotateList(newestProducts, rotationSeed + 2).slice(0, 8),
      imageOffset: rotationSeed + 7,
      generationReason: "Auto-created from the newest active products in stock.",
    }),
  ].filter(Boolean);

  const featuredCandidates = [
    createCandidate({
      id: "auto-featured-trending",
      title: "Trending Sarees",
      subtitle: "Shoppers are gravitating toward these standout picks right now.",
      eyebrow: "Smart Highlight",
      ctaLabel: "See trending styles",
      placementSlot: "featured",
      sectionType: "featured",
      filters: {},
      products: rankedProducts.slice(0, 8),
      imageOffset: rotationSeed + 1,
      generationReason: "Auto-created from recent demand and in-stock favourites.",
    }),
    createCandidate({
      id: "auto-featured-new",
      title: "Fresh Additions Edit",
      subtitle: "A changing spotlight for newer styles that keep the homepage looking fresh.",
      eyebrow: "Newly Added",
      ctaLabel: "See new arrivals",
      placementSlot: "featured",
      sectionType: "featured",
      filters: { search: "new arrivals" },
      products: rotateList(newestProducts, rotationSeed + 3).slice(0, 8),
      imageOffset: rotationSeed + 3,
      generationReason: "Auto-created from the latest in-stock additions.",
    }),
    ...rotatedCategoryGroups.slice(0, 3).map((group, index) => {
      const titleBuilder =
        featuredTitleTemplates[(rotationSeed + index) % featuredTitleTemplates.length];
      const subtitleBuilder =
        featuredSubtitleTemplates[(rotationSeed + index) % featuredSubtitleTemplates.length];
      return createCandidate({
        id: `auto-featured-category-${group.category.slug}`,
        title: titleBuilder(group.category.name),
        subtitle: subtitleBuilder(group.category.name),
        eyebrow: "Auto Feature",
        ctaLabel: `Explore ${group.category.name.toLowerCase()}`,
        placementSlot: "featured",
        sectionType: "featured",
        filters: { categorySlug: group.category.slug },
        products: buildDisplayProducts(group.products, popularityMap, rotationSeed + index + 5),
        imageOffset: rotationSeed + index + 5,
        generationReason: `Auto-created from ${group.products.length} active ${group.category.name.toLowerCase()} products.`,
      });
    }),
    ...rotatedMaterialGroups.slice(0, 2).map((group, index) =>
      createCandidate({
        id: `auto-featured-material-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        title: `${group.label} Focus`,
        subtitle: `This block rotates through your ${group.label.toLowerCase()} stock to keep the edit feeling new.`,
        eyebrow: "Material Edit",
        ctaLabel: `Explore ${group.label.toLowerCase()}`,
        placementSlot: "featured",
        sectionType: "featured",
        filters: { material: group.label },
        products: buildDisplayProducts(group.products, popularityMap, rotationSeed + index + 8),
        imageOffset: rotationSeed + index + 8,
        generationReason: `Auto-created from ${group.products.length} ${group.label.toLowerCase()} products with live stock.`,
      })
    ),
    ...budgetCandidates.slice(0, 2).map((candidate, index) =>
      candidate
        ? {
            ...candidate,
            id: `${candidate.id}-featured`,
            placementSlot: "featured",
            sectionType: "featured",
            eyebrow: "Price-Led Feature",
            ctaLabel: "Browse this price band",
            imageOffset: rotationSeed + index + 10,
          }
        : null
    ),
  ].filter(Boolean);

  return [
    ...heroCandidates,
    ...featuredCandidates,
    ...budgetCandidates,
    ...categoryBudgetCandidates,
  ].filter(Boolean);
}

function candidateToPayload(candidate, overrides = {}) {
  return {
    title: candidate.title,
    subtitle: candidate.subtitle ?? "",
    eyebrow: candidate.eyebrow ?? "",
    ctaLabel: candidate.ctaLabel ?? "Shop now",
    placementSlot: candidate.placementSlot ?? "hero",
    sectionType: candidate.sectionType ?? "hero",
    backgroundImage: candidate.backgroundImage ?? "",
    filters: {
      search: candidate.filters?.search ?? "",
      categorySlug: candidate.filters?.categorySlug ?? "",
      priceMin: candidate.filters?.priceMin ?? null,
      priceMax: candidate.filters?.priceMax ?? null,
      material: candidate.filters?.material ?? "",
      color: candidate.filters?.color ?? "",
    },
    previewProducts: (candidate.products ?? []).slice(0, 8).map((product) => product._id),
    generationReason: candidate.generationReason ?? "",
    ...overrides,
  };
}

async function refreshAdvertisementAssets(ad, catalog) {
  const filters = ad.filters ?? {};
  const filteredProducts = catalog.products.filter((product) => {
    if (filters.categorySlug && product.category?.slug !== filters.categorySlug) return false;
    if (filters.priceMin != null && product.price < filters.priceMin) return false;
    if (filters.priceMax != null && product.price > filters.priceMax) return false;
    if (
      filters.material &&
      !String(product.material ?? "").toLowerCase().includes(String(filters.material).toLowerCase())
    ) {
      return false;
    }
    if (
      filters.color &&
      !String(product.color ?? "").toLowerCase().includes(String(filters.color).toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  if (!filteredProducts.length) return ad;

  const backgroundImage = selectImage(filteredProducts);
  ad.backgroundImage = backgroundImage || ad.backgroundImage;
  ad.previewProducts = filteredProducts.slice(0, 8).map((product) => product._id);
  await ad.save();
  return ad;
}

export async function createManualAdvertisement(payload, userId) {
  const ad = await Advertisement.create({
    title: payload.title?.trim() || "New advertisement",
    subtitle: payload.subtitle?.trim() || "",
    eyebrow: payload.eyebrow?.trim() || "",
    ctaLabel: payload.ctaLabel?.trim() || "Shop now",
    placementSlot: payload.placementSlot || payload.sectionType || "hero",
    sectionType: payload.sectionType || payload.placementSlot || "hero",
    status: payload.status || "draft",
    sourceType: payload.sourceType || "manual",
    startAt: payload.startAt ? new Date(payload.startAt) : null,
    endAt: payload.endAt ? new Date(payload.endAt) : null,
    isPinned: Boolean(payload.isPinned),
    backgroundImage: payload.backgroundImage?.trim() || "",
    filters: {
      search: payload.filters?.search?.trim() || "",
      categorySlug: payload.filters?.categorySlug?.trim().toLowerCase() || "",
      priceMin:
        payload.filters?.priceMin == null || payload.filters?.priceMin === ""
          ? null
          : Number(payload.filters.priceMin),
      priceMax:
        payload.filters?.priceMax == null || payload.filters?.priceMax === ""
          ? null
          : Number(payload.filters.priceMax),
      material: payload.filters?.material?.trim() || "",
      color: payload.filters?.color?.trim() || "",
    },
    generationReason: payload.generationReason?.trim() || "",
    reuseSourceId: payload.reuseSourceId || null,
    notes: payload.notes?.trim() || "",
    createdBy: userId ?? null,
  });

  const catalog = await fetchCatalogContext();
  return refreshAdvertisementAssets(ad, catalog);
}

export async function generateAutomaticAdvertisement({
  excludeTitles = [],
  excludeFingerprints = [],
  excludeImages = [],
  status = "upcoming",
  startAt,
  endAt,
  sectionType = "hero",
  placementSlot = sectionType,
} = {}) {
  const catalog = await fetchCatalogContext();
  const autoCount = await Advertisement.countDocuments({
    placementSlot,
    sourceType: "auto",
  }).exec();
  const variantSeed = getRotationSeed() + autoCount;
  const baseCandidates = buildAutoCandidates({ ...catalog, variantSeed });
  const candidates =
    placementSlot === "fallback"
      ? baseCandidates.filter((candidate) => candidate.placementSlot === "hero")
      : baseCandidates.filter((candidate) => candidate.placementSlot === placementSlot);
  const recentAutoAds = await Advertisement.find({
    isDeleted: false,
    sourceType: "auto",
    placementSlot,
  })
    .sort({ createdAt: -1 })
    .limit(18)
    .select("title filters backgroundImage")
    .lean()
    .exec();
  const activeSlotAds = await Advertisement.find({
    isDeleted: false,
    placementSlot,
    status: { $in: ["live", "upcoming"] },
  })
    .select("title filters backgroundImage")
    .lean()
    .exec();

  const blockedTitles = new Set(
    [...excludeTitles, ...activeSlotAds.map((item) => item.title)]
      .map((title) => String(title).toLowerCase())
  );
  const recentAutoTitles = new Set(
    recentAutoAds.map((item) => String(item.title).toLowerCase())
  );
  const activeFingerprints = new Set(
    [...excludeFingerprints, ...activeSlotAds.map((item) => filtersFingerprint(item.filters))]
  );
  const activeBackgrounds = new Set(
    [...excludeImages, ...activeSlotAds.map((item) => item.backgroundImage).filter(Boolean)]
  );

  const candidate = [...candidates]
    .map((item, index) => {
      let score = 100 - index;
      const normalizedTitle = String(item.title).toLowerCase();
      const fingerprint = filtersFingerprint(item.filters);

      if (!blockedTitles.has(normalizedTitle)) score += 40;
      else score -= 25;

      if (!recentAutoTitles.has(normalizedTitle)) score += 20;
      else score -= 10;

      if (!activeFingerprints.has(fingerprint)) score += 16;
      else score -= 6;

      if (item.backgroundImage && !activeBackgrounds.has(item.backgroundImage)) score += 8;

      return { item, score };
    })
    .sort((left, right) => right.score - left.score)[0]?.item;

  if (!candidate) return null;

  const ad = await Advertisement.create(
    candidateToPayload(candidate, {
      placementSlot,
      sectionType,
      status,
      sourceType: "auto",
      startAt: startAt ?? toDayStart(),
      endAt: endAt ?? addDays(toDayStart(), AUTO_WINDOW_DAYS),
    })
  );

  return ad;
}

export async function prepareUpcomingAdvertisementForSlot(slot) {
  const now = new Date();

  await Advertisement.updateMany(
    {
      isDeleted: false,
      placementSlot: slot,
      status: "upcoming",
      isPinned: false,
    },
    { $set: { status: "expired" } }
  ).exec();

  const liveAd = await Advertisement.findOne({
    isDeleted: false,
    placementSlot: slot,
    status: "live",
  })
    .sort({ isPinned: -1, startAt: -1, updatedAt: -1 })
    .exec();

  const visible = await Advertisement.find({
    isDeleted: false,
    status: { $in: ["live", "fallback"] },
  })
    .select("title")
    .lean()
    .exec();

  const start = liveAd?.endAt
    ? new Date(liveAd.endAt)
    : addDays(toDayStart(now), AUTO_WINDOW_DAYS);
  const end = addDays(start, AUTO_WINDOW_DAYS);

  const crossSlotVisible = await Advertisement.find({
    isDeleted: false,
    status: { $in: ["live", "fallback"] },
  })
    .select("filters backgroundImage")
    .lean()
    .exec();

  return generateAutomaticAdvertisement({
    excludeTitles: visible.map((item) => item.title),
    excludeFingerprints: crossSlotVisible.map((item) => filtersFingerprint(item.filters)),
    excludeImages: crossSlotVisible.map((item) => item.backgroundImage).filter(Boolean),
    placementSlot: slot,
    sectionType: slot,
    status: "upcoming",
    startAt: start,
    endAt: end,
  });
}

export async function prepareAllUpcomingAdvertisements() {
  const ads = [];
  const preparedTitles = [];
  const preparedFingerprints = [];
  const preparedImages = [];

  const visibleAds = await Advertisement.find({
    isDeleted: false,
    status: { $in: ["live", "fallback"] },
  })
    .select("title filters backgroundImage")
    .lean()
    .exec();

  for (const slot of HOMEPAGE_SLOTS) {
    await Advertisement.updateMany(
      {
        isDeleted: false,
        placementSlot: slot,
        status: "upcoming",
        isPinned: false,
      },
      { $set: { status: "expired" } }
    ).exec();

    const liveAd = await Advertisement.findOne({
      isDeleted: false,
      placementSlot: slot,
      status: "live",
    })
      .sort({ isPinned: -1, startAt: -1, updatedAt: -1 })
      .exec();

    const start = liveAd?.endAt
      ? new Date(liveAd.endAt)
      : addDays(toDayStart(new Date()), AUTO_WINDOW_DAYS);
    const end = addDays(start, AUTO_WINDOW_DAYS);

    const ad = await generateAutomaticAdvertisement({
      excludeTitles: [
        ...visibleAds.map((item) => item.title),
        ...preparedTitles,
      ],
      excludeFingerprints: [
        ...visibleAds.map((item) => filtersFingerprint(item.filters)),
        ...preparedFingerprints,
      ],
      excludeImages: [
        ...visibleAds.map((item) => item.backgroundImage).filter(Boolean),
        ...preparedImages,
      ],
      placementSlot: slot,
      sectionType: slot,
      status: "upcoming",
      startAt: start,
      endAt: end,
    });
    if (ad) ads.push(ad);
    if (ad) {
      preparedTitles.push(ad.title);
      preparedFingerprints.push(filtersFingerprint(ad.filters));
      if (ad.backgroundImage) preparedImages.push(ad.backgroundImage);
    }
  }
  return ads;
}

export async function makeAdvertisementLive(id) {
  const ad = await Advertisement.findById(id).exec();
  if (!ad || ad.isDeleted) return null;

  await Advertisement.updateMany(
    {
      isDeleted: false,
      status: "live",
      placementSlot: ad.placementSlot,
      _id: { $ne: ad._id },
      isPinned: false,
    },
    { $set: { status: "expired" } }
  ).exec();

  ad.status = "live";
  ad.startAt = new Date();
  if (!ad.endAt) {
    const end = new Date();
      end.setDate(end.getDate() + AUTO_WINDOW_DAYS);
    ad.endAt = end;
  }
  await ad.save();
  return ad;
}

export async function makeAllReadyNextLive() {
  const dashboard = await reconcileAdvertisements();
  const ads = [];

  for (const slot of HOMEPAGE_SLOTS) {
    const readyNextId = dashboard.slotBoards?.[slot]?.readyNext?._id;
    if (!readyNextId) continue;
    const ad = await makeAdvertisementLive(readyNextId);
    if (ad) ads.push(ad);
  }

  return ads;
}

async function promoteUpcomingIfDue(slot, now) {
  const dueAd = await Advertisement.findOne({
    isDeleted: false,
    status: "upcoming",
    placementSlot: slot,
    startAt: { $lte: now },
  })
    .sort({ startAt: 1, createdAt: 1 })
    .exec();

  if (!dueAd) return null;

  await Advertisement.updateMany(
    {
      isDeleted: false,
      status: "live",
      placementSlot: slot,
      _id: { $ne: dueAd._id },
      isPinned: false,
    },
    { $set: { status: "expired" } }
  ).exec();

  dueAd.status = "live";
  await dueAd.save();
  return dueAd;
}

export async function reconcileAdvertisements() {
  const now = new Date();

  await Advertisement.updateMany(
    {
      isDeleted: false,
      status: { $in: ["live", "upcoming", "draft"] },
      endAt: { $ne: null, $lt: now },
      isPinned: false,
    },
    { $set: { status: "expired" } }
  ).exec();

  let fallbackAd = await Advertisement.findOne({
    isDeleted: false,
    status: "fallback",
  })
    .sort({ updatedAt: -1 })
    .exec();

  if (!fallbackAd) {
    fallbackAd = await generateAutomaticAdvertisement({
      placementSlot: "fallback",
      status: "fallback",
      sectionType: "fallback",
      startAt: null,
      endAt: null,
    });
  } else {
    const catalog = await fetchCatalogContext();
    await refreshAdvertisementAssets(fallbackAd, catalog);
  }

  const allVisibleAds = await Advertisement.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const liveLikeTitles = (slot) =>
    allVisibleAds
      .filter(
        (item) =>
          item.placementSlot === slot &&
          ["live", "upcoming", "fallback"].includes(item.status)
      )
      .map((item) => item.title);

  const slotBoards = {};
  for (const slot of HOMEPAGE_SLOTS) {
    let liveAd = await Advertisement.findOne({
      isDeleted: false,
      placementSlot: slot,
      status: "live",
    })
      .sort({ isPinned: -1, startAt: -1, updatedAt: -1 })
      .exec();

    if (!liveAd || normalizeStatus(liveAd, now) !== "live") {
      liveAd = await promoteUpcomingIfDue(slot, now);
    }

    let upcomingAd = await Advertisement.findOne({
      isDeleted: false,
      placementSlot: slot,
      status: "upcoming",
      startAt: { $gt: now },
    })
      .sort({ startAt: 1, createdAt: 1 })
      .exec();

    if (!upcomingAd) {
      const start = liveAd?.endAt
        ? new Date(liveAd.endAt)
        : addDays(toDayStart(now), AUTO_WINDOW_DAYS);
      const end = addDays(start, AUTO_WINDOW_DAYS);
      upcomingAd = await generateAutomaticAdvertisement({
        excludeTitles: liveLikeTitles(slot),
        placementSlot: slot,
        sectionType: slot,
        status: "upcoming",
        startAt: start,
        endAt: end,
      });
    }

    slotBoards[slot] = {
      liveNow: liveAd ? await Advertisement.findById(liveAd._id).lean().exec() : null,
      readyNext: upcomingAd
        ? await Advertisement.findById(upcomingAd._id).lean().exec()
        : null,
    };
  }

  const recentAds = await Advertisement.find({
    isDeleted: false,
    _id: {
      $nin: [
        ...HOMEPAGE_SLOTS.flatMap((slot) => [
          slotBoards[slot]?.liveNow?._id,
          slotBoards[slot]?.readyNext?._id,
        ]),
        fallbackAd?._id,
      ].filter(Boolean),
    },
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(4)
    .lean()
    .exec();

  const historyAds = await Advertisement.find({ isDeleted: false })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(24)
    .lean()
    .exec();

  return {
    slotBoards,
    liveNow: slotBoards.hero?.liveNow ?? null,
    readyNext: slotBoards.hero?.readyNext ?? null,
    fallbackAd: fallbackAd ? await Advertisement.findById(fallbackAd._id).lean().exec() : null,
    recentAds,
    historyAds,
  };
}

export function advertisementToHomepageCard(ad) {
  if (!ad) return null;
  return {
    id: `ad-${ad._id}`,
    title: ad.title,
    eyebrow: ad.eyebrow || (ad.sourceType === "auto" ? "Fresh Edit" : "Featured"),
    description: ad.subtitle || ad.generationReason || "",
    ctaLabel: ad.ctaLabel || "Shop now",
    href: createHref({
      search: ad.filters?.search ?? "",
      category: ad.filters?.categorySlug ?? "",
      priceMin: ad.filters?.priceMin ?? "",
      priceMax: ad.filters?.priceMax ?? "",
      material: ad.filters?.material ?? "",
      color: ad.filters?.color ?? "",
      collection: `ad-${ad._id}`,
    }),
    image: ad.backgroundImage || "",
    accentFrom:
      ad.placementSlot === "budget"
        ? "amber"
        : ad.sectionType === "fallback"
          ? "stone"
          : ad.placementSlot === "featured"
            ? "emerald"
            : "rose",
    productCount: Array.isArray(ad.previewProducts) ? ad.previewProducts.length : 0,
    adminMeta: {
      status: ad.status,
      sourceType: ad.sourceType,
      generationReason: ad.generationReason || "",
      placementSlot: ad.placementSlot || "hero",
    },
  };
}

export async function softDeleteAdvertisement(id) {
  const ad = await Advertisement.findById(id).exec();
  if (!ad) return null;
  ad.isDeleted = true;
  if (ad.status === "live") {
    ad.status = "expired";
  }
  await ad.save();
  await reconcileAdvertisements();
  return ad;
}

export async function reuseAdvertisement(id, { startAt, endAt, refreshFromCatalog = true } = {}, userId) {
  const source = await Advertisement.findById(id).lean().exec();
  if (!source) return null;

  const next = await createManualAdvertisement(
    {
      title: source.title,
      subtitle: source.subtitle,
      eyebrow: source.eyebrow,
      ctaLabel: source.ctaLabel,
      placementSlot:
        source.placementSlot === "fallback" ? "hero" : source.placementSlot ?? "hero",
      sectionType: source.sectionType === "fallback" ? "hero" : source.sectionType,
      status: startAt && new Date(startAt) > new Date() ? "upcoming" : "draft",
      sourceType: "reused",
      startAt,
      endAt,
      backgroundImage: refreshFromCatalog ? "" : source.backgroundImage,
      filters: source.filters,
      generationReason: source.generationReason,
      reuseSourceId: source._id,
      notes: refreshFromCatalog ? "Reused with fresh catalog assets." : "Reused from history.",
    },
    userId
  );

  if (!refreshFromCatalog) {
    next.previewProducts = source.previewProducts ?? [];
    await next.save();
  }

  return next;
}
