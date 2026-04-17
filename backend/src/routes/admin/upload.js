import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { getConfig } from "../../config/env.js";

export const adminUploadRouter = Router();

function ensureCloudinary() {
  const cfg = getConfig();
  if (!cfg.cloudinaryCloudName || !cfg.cloudinaryApiKey || !cfg.cloudinaryApiSecret) {
    return null;
  }
  cloudinary.config({
    cloud_name: cfg.cloudinaryCloudName,
    api_key: cfg.cloudinaryApiKey,
    api_secret: cfg.cloudinaryApiSecret,
  });
  return cfg;
}

const mem = multer.memoryStorage();

adminUploadRouter.post(
  "/",
  (req, res, next) => {
    const cfg = ensureCloudinary();
    if (!cfg) {
      res.status(503).json({
        error: "Uploads not configured",
        message: "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET",
      });
      return;
    }
    const maxMb = cfg.uploadMaxMb ?? 5;
    multer({
      storage: mem,
      limits: { fileSize: maxMb * 1024 * 1024 },
    }).single("file")(req, res, next);
  },
  async (req, res, next) => {
    try {
      if (!req.file?.buffer) {
        res.status(400).json({ error: "file is required (multipart field name: file)" });
        return;
      }
      const folder = String(req.body?.folder ?? "saree-shop").trim() || "saree-shop";
      const mime = req.file.mimetype || "image/jpeg";
      const dataUri = `data:${mime};base64,${req.file.buffer.toString("base64")}`;
      const result = await cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: "image",
      });
      res.json({ url: result.secure_url, publicId: result.public_id });
    } catch (err) {
      next(err);
    }
  }
);
