import { Router } from "express";
import { Order } from "../../models/Order.js";

const STATUSES = ["placed", "packed", "shipped", "delivered", "cancelled"];

export const adminOrdersRouter = Router();

adminOrdersRouter.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const items = await Order.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    res.json({ orders: items });
  } catch (err) {
    next(err);
  }
});

adminOrdersRouter.patch("/:orderNumber", async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const doc = await Order.findOne({ orderNumber: String(orderNumber).trim() }).exec();
    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const nextStatus = req.body?.orderStatus;
    if (nextStatus != null) {
      if (!STATUSES.includes(String(nextStatus))) {
        res.status(400).json({ error: "Invalid orderStatus" });
        return;
      }
      if (doc.orderStatus !== nextStatus) {
        doc.orderStatus = nextStatus;
        doc.statusHistory = doc.statusHistory || [];
        doc.statusHistory.push({ status: nextStatus, at: new Date() });
      }
    }
    if (req.body?.trackingId != null) {
      doc.trackingId = String(req.body.trackingId).trim().slice(0, 200);
    }
    await doc.save();
    res.json({ order: doc.toObject() });
  } catch (err) {
    next(err);
  }
});
