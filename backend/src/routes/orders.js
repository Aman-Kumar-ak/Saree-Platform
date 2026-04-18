import { Router } from "express";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { placeCodOrder } from "../services/placeCodOrder.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validateIndianAddress } from "../lib/addressValidation.js";

export const ordersRouter = Router();

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

    const addr = validateIndianAddress(req.body?.address);
    if (!addr.ok) {
      res.status(400).json({ error: addr.error });
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
