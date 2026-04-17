import { Router } from "express";
import { requireAuth, requireAdmin } from "../../middleware/requireAuth.js";
import { adminCategoriesRouter } from "./categories.js";
import { adminOrdersRouter } from "./orders.js";
import { adminProductsRouter } from "./products.js";
import { adminUploadRouter } from "./upload.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.use("/categories", adminCategoriesRouter);
adminRouter.use("/products", adminProductsRouter);
adminRouter.use("/orders", adminOrdersRouter);
adminRouter.use("/upload", adminUploadRouter);
