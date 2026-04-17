import { Router } from "express";
import { Category } from "../models/Category.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res, next) => {
  try {
    const items = await Category.find({ isActive: true })
      .sort({ name: 1 })
      .lean()
      .exec();
    res.json({ categories: items });
  } catch (err) {
    next(err);
  }
});
