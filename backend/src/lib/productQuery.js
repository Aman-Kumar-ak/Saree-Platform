import { Category } from "../models/Category.js";

const GENERIC_CATEGORY_WORDS = new Set([
  "saree",
  "sarees",
  "wear",
  "collection",
  "collections",
  "shop",
  "style",
  "styles",
]);

const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "of",
  "on",
  "the",
  "with",
  "under",
  "below",
  "less",
  "than",
  "upto",
  "up",
  "to",
  "between",
  "from",
  "rs",
  "rupees",
  "inr",
  "price",
  "prices",
  "range",
  "saree",
  "sarees",
  "clothes",
  "cloth",
]);

const COMMON_COLOR_PATTERNS = [
  { label: "Red", pattern: /\b(?:red|ruby|maroon|crimson)\b/i },
  { label: "Blue", pattern: /\b(?:blue|navy|azure)\b/i },
  { label: "Green", pattern: /\b(?:green|emerald|olive)\b/i },
  { label: "Gold", pattern: /\b(?:gold|golden)\b/i },
  { label: "Silver", pattern: /\b(?:silver)\b/i },
  { label: "White", pattern: /\b(?:white|ivory|off white)\b/i },
  { label: "Cream", pattern: /\b(?:cream|beige)\b/i },
  { label: "Pink", pattern: /\b(?:pink|rose|fuchsia)\b/i },
  { label: "Purple", pattern: /\b(?:purple|violet|lavender)\b/i },
  { label: "Yellow", pattern: /\b(?:yellow|mustard)\b/i },
  { label: "Orange", pattern: /\b(?:orange|peach|coral)\b/i },
  { label: "Black", pattern: /\b(?:black)\b/i },
  { label: "Multi", pattern: /\b(?:multi|multicolor|multi-color)\b/i },
];

const COMMON_MATERIAL_PATTERNS = [
  { label: "Cotton", pattern: /\bcotton\b/i },
  { label: "Silk", pattern: /\bsilk\b/i },
  { label: "Banarasi", pattern: /\bbanarasi\b/i },
  { label: "Handloom", pattern: /\bhandloom\b/i },
  { label: "Georgette", pattern: /\bgeorgette\b/i },
  { label: "Chiffon", pattern: /\bchiffon\b/i },
  { label: "Organza", pattern: /\borganza\b/i },
  { label: "Linen", pattern: /\blinen\b/i },
];

const INTENT_VOCABULARY = [
  "saree",
  "sarees",
  "under",
  "below",
  "less",
  "than",
  "party",
  "wear",
  "bridal",
  "festive",
  "designer",
  "wedding",
  "office",
  "daily",
  "casual",
  "budget",
  "new",
  "latest",
];

export function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a, b) {
  const left = String(a);
  const right = String(b);
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const rows = Array.from({ length: left.length + 1 }, (_, index) => [index]);
  for (let column = 0; column <= right.length; column += 1) {
    rows[0][column] = column;
  }

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + cost
      );
    }
  }

  return rows[left.length][right.length];
}

function parseCurrencyNumber(raw) {
  const digits = String(raw ?? "").replace(/[^\d]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePriceIntent(searchText) {
  const text = normalizeText(searchText);
  if (!text) {
    return { priceMin: null, priceMax: null, cleanedText: "" };
  }

  let priceMin = null;
  let priceMax = null;
  let cleanedText = text;

  const betweenMatch = text.match(
    /\bbetween\s*(?:rs|rupees|inr)?\s*(\d[\d,]*)\s*(?:and|to|-)\s*(?:rs|rupees|inr)?\s*(\d[\d,]*)\b/
  );
  if (betweenMatch) {
    const first = parseCurrencyNumber(betweenMatch[1]);
    const second = parseCurrencyNumber(betweenMatch[2]);
    if (first != null && second != null) {
      priceMin = Math.min(first, second);
      priceMax = Math.max(first, second);
    }
    cleanedText = cleanedText.replace(betweenMatch[0], " ").trim();
  }

  const underMatch = cleanedText.match(
    /\b(?:under|below|less than|max|maximum|upto|up to)\s*(?:rs|rupees|inr)?\s*(\d[\d,]*)\b/
  );
  if (underMatch) {
    priceMax = parseCurrencyNumber(underMatch[1]);
    cleanedText = cleanedText.replace(underMatch[0], " ").trim();
  }

  const overMatch = cleanedText.match(
    /\b(?:above|over|more than|starting from|from)\s*(?:rs|rupees|inr)?\s*(\d[\d,]*)\b/
  );
  if (overMatch) {
    priceMin = parseCurrencyNumber(overMatch[1]);
    cleanedText = cleanedText.replace(overMatch[0], " ").trim();
  }

  return {
    priceMin,
    priceMax,
    cleanedText: cleanedText.replace(/\s+/g, " ").trim(),
  };
}

function categoryKeywords(category) {
  const source = `${category.name ?? ""} ${category.slug ?? ""}`;
  const words = normalizeText(source).split(/\s|-/).filter(Boolean);
  return [...new Set(words.filter((word) => !GENERIC_CATEGORY_WORDS.has(word) && word.length > 2))];
}

function buildCorrectionVocabulary(categories) {
  const terms = new Set(INTENT_VOCABULARY);

  categories.forEach((category) => {
    categoryKeywords(category).forEach((keyword) => terms.add(keyword));
  });

  COMMON_COLOR_PATTERNS.forEach((entry) => {
    normalizeText(entry.label)
      .split(/\s|-/)
      .filter(Boolean)
      .forEach((token) => terms.add(token));
  });

  COMMON_MATERIAL_PATTERNS.forEach((entry) => {
    normalizeText(entry.label)
      .split(/\s|-/)
      .filter(Boolean)
      .forEach((token) => terms.add(token));
  });

  return [...terms].filter(Boolean);
}

function correctToken(token, vocabulary) {
  if (!token || /^\d+$/.test(token) || token.length < 4) {
    return token;
  }
  if (vocabulary.includes(token)) {
    return token;
  }

  let bestMatch = token;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of vocabulary) {
    if (Math.abs(candidate.length - token.length) > 2) continue;
    const distance = levenshteinDistance(token, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = candidate;
    }
    if (bestDistance === 1) break;
  }

  const threshold = token.length >= 7 ? 2 : 1;
  return bestDistance <= threshold ? bestMatch : token;
}

function correctSearchText(searchText, categories) {
  const normalized = normalizeText(searchText);
  if (!normalized) return { correctedText: "", corrections: [] };

  const vocabulary = buildCorrectionVocabulary(categories);
  const corrections = [];
  const correctedTokens = normalized.split(" ").map((token) => {
    const corrected = correctToken(token, vocabulary);
    if (corrected !== token) {
      corrections.push({ from: token, to: corrected });
    }
    return corrected;
  });

  return {
    correctedText: correctedTokens.join(" ").trim(),
    corrections,
  };
}

function findCategoryFromSearch(text, categories) {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  const ranked = categories
    .map((category) => {
      const keywords = categoryKeywords(category);
      const matchedKeyword = keywords
        .filter((keyword) => normalized.includes(keyword))
        .sort((a, b) => b.length - a.length)[0];
      return {
        category,
        score: matchedKeyword ? matchedKeyword.length : 0,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.category ?? null;
}

function inferSortFromSearch(text) {
  const normalized = normalizeText(text);
  if (!normalized) return null;
  if (/\b(?:cheap|cheapest|lowest|low price|budget)\b/.test(normalized)) {
    return "price-asc";
  }
  if (/\b(?:premium|luxury|expensive|highest)\b/.test(normalized)) {
    return "price-desc";
  }
  if (/\b(?:latest|new|newest|fresh)\b/.test(normalized)) {
    return "newest";
  }
  return null;
}

function uniqueTokens(text) {
  return [...new Set(
    normalizeText(text)
      .split(/\s|-/)
      .filter((token) => token && token.length > 1 && !SEARCH_STOP_WORDS.has(token))
  )];
}

function inferAttributeFromPatterns(text, patterns) {
  const normalized = normalizeText(text);
  if (!normalized) return null;
  return patterns.find((entry) => entry.pattern.test(normalized))?.label ?? null;
}

function parseExplicitNumber(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildRegexTokenFilter(tokens) {
  if (!tokens.length) return null;

  return {
    $and: tokens.map((token) => {
      const regex = new RegExp(escapeRegex(token), "i");
      return {
        $or: [
          { name: regex },
          { description: regex },
          { material: regex },
          { color: regex },
          { sku: regex },
          { tagId: regex },
        ],
      };
    }),
  };
}

export function resolveSort(sort, fallback = "featured") {
  switch (sort) {
    case "price-asc":
      return { price: 1, createdAt: -1 };
    case "price-desc":
      return { price: -1, createdAt: -1 };
    case "newest":
      return { createdAt: -1 };
    case "featured":
    default:
      return { stock: -1, updatedAt: -1, createdAt: -1 };
  }
}

export async function resolveProductQueryOptions(query = {}) {
  const categories = await Category.find({ isActive: true })
    .select("_id name slug description")
    .sort({ name: 1 })
    .lean()
    .exec();

  const explicitCategorySlug =
    typeof query.category === "string" && query.category.trim()
      ? query.category.trim().toLowerCase()
      : "";
  const explicitCategory =
    categories.find((category) => category.slug === explicitCategorySlug) ?? null;

  const parsedPriceMin = parseExplicitNumber(query.priceMin);
  const parsedPriceMax = parseExplicitNumber(query.priceMax);
  const searchText = typeof query.search === "string" ? query.search.trim() : "";
  const correctedSearch = correctSearchText(searchText, categories);
  const parsedIntent = parsePriceIntent(correctedSearch.correctedText || searchText);
  const inferredCategory = explicitCategory
    ? explicitCategory
    : findCategoryFromSearch(parsedIntent.cleanedText, categories);
  const inferredColor = inferAttributeFromPatterns(
    parsedIntent.cleanedText,
    COMMON_COLOR_PATTERNS
  );
  const inferredMaterial = inferAttributeFromPatterns(
    parsedIntent.cleanedText,
    COMMON_MATERIAL_PATTERNS
  );

  const finalPriceMin = parsedPriceMin ?? parsedIntent.priceMin;
  const finalPriceMax = parsedPriceMax ?? parsedIntent.priceMax;
  const sort =
    typeof query.sort === "string" && query.sort.trim()
      ? query.sort.trim()
      : inferSortFromSearch(searchText) ?? "featured";

  const cleanedSearchText = parsedIntent.cleanedText;
  const searchTokens = uniqueTokens(cleanedSearchText).filter((token) => {
    if (inferredCategory && categoryKeywords(inferredCategory).includes(token)) {
      return false;
    }
    if (inferredColor && normalizeText(inferredColor).includes(token)) {
      return false;
    }
    if (inferredMaterial && normalizeText(inferredMaterial).includes(token)) {
      return false;
    }
    return true;
  });

  const searchFilter = buildRegexTokenFilter(searchTokens);
  const materialFilter =
    typeof query.material === "string" && query.material.trim()
      ? { material: new RegExp(escapeRegex(query.material.trim()), "i") }
      : inferredMaterial
        ? { material: new RegExp(escapeRegex(inferredMaterial), "i") }
      : null;
  const colorFilter =
    typeof query.color === "string" && query.color.trim()
      ? { color: new RegExp(escapeRegex(query.color.trim()), "i") }
      : inferredColor
        ? { color: new RegExp(escapeRegex(inferredColor), "i") }
      : null;

  const andClauses = [{ isActive: true }];
  if (query.inStockOnly === "true" || query.inStockOnly === true) {
    andClauses.push({ stock: { $gt: 0 } });
  }
  if (inferredCategory?._id) {
    andClauses.push({ category: inferredCategory._id });
  }
  if (finalPriceMin != null || finalPriceMax != null) {
    const priceClause = {};
    if (finalPriceMin != null) priceClause.$gte = finalPriceMin;
    if (finalPriceMax != null) priceClause.$lte = finalPriceMax;
    andClauses.push({ price: priceClause });
  }
  if (materialFilter) andClauses.push(materialFilter);
  if (colorFilter) andClauses.push(colorFilter);
  if (searchFilter) andClauses.push(searchFilter);

  const limit =
    query.limit == null || query.limit === ""
      ? null
      : Math.max(1, Math.min(24, Number(query.limit) || 0)) || null;

  return {
    categories,
    mongoFilter: andClauses.length === 1 ? andClauses[0] : { $and: andClauses },
    sort,
    sortSpec: resolveSort(sort),
    limit,
    applied: {
      categorySlug: inferredCategory?.slug ?? "",
      categoryName: inferredCategory?.name ?? "",
      priceMin: finalPriceMin,
      priceMax: finalPriceMax,
      search: searchText,
      correctedSearch: correctedSearch.correctedText || searchText,
      corrections: correctedSearch.corrections,
      searchTokens,
      color: typeof query.color === "string" && query.color.trim() ? query.color.trim() : inferredColor ?? "",
      material:
        typeof query.material === "string" && query.material.trim()
          ? query.material.trim()
          : inferredMaterial ?? "",
      sort,
      inStockOnly: query.inStockOnly === "true" || query.inStockOnly === true,
    },
  };
}
