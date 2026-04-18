import { Router } from "express";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { placeCodOrder } from "../services/placeCodOrder.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const ordersRouter = Router();

const IN_PIN = /^\d{6}$/;
const IN_PHONE = /^[6-9]\d{9}$/;

function validateAddress(body) {
  const a = body?.address;
  if (!a || typeof a !== "object") return { ok: false, message: "address is required" };
  const fullName = String(a.fullName ?? "").trim();
  const phone = String(a.phone ?? "").replace(/\s/g, "");
  const line1 = String(a.line1 ?? "").trim();
  const line2 = String(a.line2 ?? "").trim();
  const city = String(a.city ?? "").trim();
  const state = String(a.state ?? "").trim();
  const pincode = String(a.pincode ?? "").trim();

  if (!fullName || fullName.length > 120) {
    return { ok: false, message: "Invalid full name" };
  }
  if (!IN_PHONE.test(phone)) {
    return { ok: false, message: "Phone must be 10 digits (India)" };
  }
  if (!line1 || line1.length > 200) {
    return { ok: false, message: "Address line 1 is required" };
  }
  if (line2.length > 200) {
    return { ok: false, message: "Address line 2 is too long" };
  }
  if (!city || city.length > 80) {
    return { ok: false, message: "City is required" };
  }
  if (!state || state.length > 80) {
    return { ok: false, message: "State is required" };
  }
  if (!IN_PIN.test(pincode)) {
    return { ok: false, message: "PIN code must be 6 digits" };
  }

  return {
    ok: true,
    address: {
      fullName,
      phone,
      line1,
      line2,
      city,
      state,
      pincode,
    },
  };
}

ordersRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const { items, paymentMethod } = req.body ?? {};
    const userId = req.authUser?._id;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (paymentMethod && paymentMethod !== "cod") {
      res.status(400).json({ error: "Only COD is supported for now" });
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items must be a non-empty array" });
      return;
    }

    const lines = [];
    for (const it of items) {
      const productId = it?.productId;
      const quantity = Number(it?.quantity);
      if (!productId || !mongoose.isValidObjectId(String(productId))) {
        res.status(400).json({ error: "Each item needs a valid productId" });
        return;
      }
      if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
        res.status(400).json({ error: "Each item needs quantity between 1 and 99" });
        return;
      }
      lines.push({ productId: String(productId), quantity: Math.floor(quantity) });
    }

    const addr = validateAddress(req.body);
    if (!addr.ok) {
      res.status(400).json({ error: addr.message });
      return;
    }

    const order = await placeCodOrder({ lines, address: addr.address, userId });
    res.status(201).json({
      order: {
        orderNumber: order.orderNumber,
        items: order.items,
        subtotal: order.subtotal,
        shipping: order.shipping,
        totalAmount: order.totalAmount,
        address: order.address,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
      },
    });
  } catch (err) {
    if (err.code === "VALIDATION") {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err.code === "NOT_FOUND") {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err.code === "INSUFFICIENT_STOCK") {
      res.status(409).json({
        error: err.message,
        productId: err.productId,
      });
      return;
    }
    next(err);
  }
});

ordersRouter.get("/number/:orderNumber", async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    if (!orderNumber || String(orderNumber).length > 64) {
      res.status(400).json({ error: "Invalid order number" });
      return;
    }
    const order = await Order.findOne({ orderNumber: String(orderNumber).trim() })
      .lean()
      .exec();
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json({
      order: {
        orderNumber: order.orderNumber,
        items: order.items,
        subtotal: order.subtotal,
        shipping: order.shipping,
        totalAmount: order.totalAmount,
        address: order.address,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        trackingId: order.trackingId,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});
