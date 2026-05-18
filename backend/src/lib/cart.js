import mongoose from "mongoose";

function clampQuantity(value) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(99, Math.max(1, parsed));
}

function toCleanString(value) {
  return value == null ? "" : String(value).trim();
}

function normalizeCartItem(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const productId = toCleanString(raw.productId);
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return null;
  }

  const quantity = clampQuantity(raw.quantity);
  if (!quantity) {
    return null;
  }

  return {
    productId,
    slug: toCleanString(raw.slug),
    name: toCleanString(raw.name),
    price: Number.isFinite(Number(raw.price)) ? Number(raw.price) : 0,
    image: toCleanString(raw.image),
    quantity,
  };
}

export function normalizeCartItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const seen = new Map();
  for (const item of items) {
    const normalized = normalizeCartItem(item);
    if (!normalized) continue;
    seen.set(normalized.productId, normalized);
  }
  return [...seen.values()];
}

export function cartSnapshotFromUser(user) {
  return {
    items: normalizeCartItems(user?.cartItems),
    updatedAt: Number.isFinite(Number(user?.cartUpdatedAt))
      ? Number(user.cartUpdatedAt)
      : user?.cartUpdatedAt
        ? new Date(user.cartUpdatedAt).getTime()
        : 0,
  };
}
