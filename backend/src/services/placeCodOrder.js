import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { getConfig } from "../config/env.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";

function buildOrderNumber(prefix) {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}${y}${m}${d}-${rand}`;
}

/**
 * @param {{ productId: string, quantity: number }[]} lines
 * @param {object} address - validated address object
 */
export async function placeCodOrder({ lines, address }) {
  const { orderNumberPrefix, shippingFlatRupees } = getConfig();
  if (!lines?.length) {
    const err = new Error("Cart is empty");
    err.code = "VALIDATION";
    throw err;
  }

  const session = await mongoose.startSession();
  let orderNumber;
  let created;

  try {
    await session.withTransaction(async () => {
      const snapshots = [];
      let subtotal = 0;

      for (const line of lines) {
        const { productId, quantity } = line;
        if (!productId || !quantity || quantity < 1) {
          const err = new Error("Invalid line item");
          err.code = "VALIDATION";
          throw err;
        }

        const updated = await Product.findOneAndUpdate(
          {
            _id: productId,
            stock: { $gte: quantity },
            isActive: true,
          },
          { $inc: { stock: -quantity } },
          { session, new: true }
        ).exec();

        if (!updated) {
          const err = new Error("Insufficient stock");
          err.code = "INSUFFICIENT_STOCK";
          err.productId = String(productId);
          throw err;
        }

        const lineTotal = updated.price * quantity;
        subtotal += lineTotal;
        snapshots.push({
          productId: updated._id,
          name: updated.name,
          price: updated.price,
          quantity,
          image: updated.images?.[0] ?? "",
        });
      }

      orderNumber = buildOrderNumber(orderNumberPrefix);
      const totalAmount = subtotal + shippingFlatRupees;

      const [doc] = await Order.create(
        [
          {
            orderNumber,
            items: snapshots,
            subtotal,
            shipping: shippingFlatRupees,
            totalAmount,
            address,
            paymentMethod: "cod",
            paymentStatus: "pending",
            orderStatus: "placed",
            statusHistory: [{ status: "placed", at: new Date() }],
          },
        ],
        { session }
      );
      created = doc;
    });
  } finally {
    await session.endSession();
  }

  return created;
}
