import { Router } from "express";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// Get all orders for logged-in user
router.get("/orders", requireAuth, async (req, res, next) => {
  try {
    const userId = req.authUser._id;

    // Get user's order IDs
    const user = await User.findById(userId).select("orderIds").lean().exec();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orderIds = user.orderIds || [];
    const orders = await Order.find({ _id: { $in: orderIds } })
      .sort({ createdAt: -1 })
      .select(
        "orderNumber items subtotal shipping totalAmount address paymentMethod paymentStatus orderStatus trackingId statusHistory createdAt updatedAt"
      )
      .lean()
      .exec();

    res.json({
      orders: orders.map((order) => ({
        _id: order._id,
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
        statusHistory: order.statusHistory || [],
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export const userRouter = router;
