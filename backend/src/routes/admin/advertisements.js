import { Router } from "express";
import { Advertisement } from "../../models/Advertisement.js";
import {
  advertisementToHomepageCard,
  createManualAdvertisement,
  generateAutomaticAdvertisement,
  makeAdvertisementLive,
  makeAllReadyNextLive,
  prepareAllUpcomingAdvertisements,
  reconcileAdvertisements,
  reuseAdvertisement,
  softDeleteAdvertisement,
} from "../../services/advertisements.js";

export const adminAdvertisementsRouter = Router();

function serializeAd(ad) {
  if (!ad) return null;
  return {
    ...ad,
    homepagePreview: advertisementToHomepageCard(ad),
  };
}

function serializeDashboard(dashboard) {
  return {
    liveNow: serializeAd(dashboard.liveNow),
    readyNext: serializeAd(dashboard.readyNext),
    fallbackAd: serializeAd(dashboard.fallbackAd),
    recentAds: dashboard.recentAds.map(serializeAd),
    historyAds: dashboard.historyAds.map(serializeAd),
    slotBoards: Object.fromEntries(
      Object.entries(dashboard.slotBoards ?? {}).map(([slot, board]) => [
        slot,
        {
          liveNow: serializeAd(board?.liveNow),
          readyNext: serializeAd(board?.readyNext),
        },
      ])
    ),
  };
}

adminAdvertisementsRouter.get("/dashboard", async (_req, res, next) => {
  try {
    const dashboard = await reconcileAdvertisements();
    res.json(serializeDashboard(dashboard));
  } catch (err) {
    next(err);
  }
});

adminAdvertisementsRouter.post("/", async (req, res, next) => {
  try {
    const ad = await createManualAdvertisement(req.body ?? {}, req.authUser?._id);
    const dashboard = await reconcileAdvertisements();
    res.status(201).json({
      advertisement: serializeAd(ad.toObject()),
      dashboard: serializeDashboard(dashboard),
    });
  } catch (err) {
    next(err);
  }
});

adminAdvertisementsRouter.patch("/:id", async (req, res, next) => {
  try {
    const ad = await Advertisement.findById(req.params.id).exec();
    if (!ad || ad.isDeleted) {
      res.status(404).json({ error: "Advertisement not found" });
      return;
    }

    const body = req.body ?? {};
    ad.title = body.title?.trim?.() || ad.title;
    ad.subtitle = body.subtitle?.trim?.() ?? ad.subtitle;
    ad.eyebrow = body.eyebrow?.trim?.() ?? ad.eyebrow;
    ad.ctaLabel = body.ctaLabel?.trim?.() || ad.ctaLabel;
    ad.placementSlot = body.placementSlot || ad.placementSlot;
    ad.sectionType = body.sectionType || body.placementSlot || ad.sectionType;
    ad.startAt = body.startAt ? new Date(body.startAt) : ad.startAt;
    ad.endAt = body.endAt ? new Date(body.endAt) : ad.endAt;
    ad.filters = {
      ...ad.filters,
      search: body.filters?.search?.trim?.() ?? ad.filters?.search ?? "",
      categorySlug:
        body.filters?.categorySlug?.trim?.().toLowerCase?.() ??
        ad.filters?.categorySlug ??
        "",
      priceMin:
        body.filters?.priceMin == null || body.filters?.priceMin === ""
          ? ad.filters?.priceMin ?? null
          : Number(body.filters.priceMin),
      priceMax:
        body.filters?.priceMax == null || body.filters?.priceMax === ""
          ? ad.filters?.priceMax ?? null
          : Number(body.filters.priceMax),
      material: body.filters?.material?.trim?.() ?? ad.filters?.material ?? "",
      color: body.filters?.color?.trim?.() ?? ad.filters?.color ?? "",
    };
    await ad.save();
    const dashboard = await reconcileAdvertisements();
    res.json({
      advertisement: serializeAd(ad.toObject()),
      dashboard: serializeDashboard(dashboard),
    });
  } catch (err) {
    next(err);
  }
});

adminAdvertisementsRouter.post("/generate-next", async (req, res, next) => {
  try {
    const existing = await Advertisement.find({
      isDeleted: false,
      status: { $in: ["live", "upcoming", "fallback"] },
    })
      .select("title")
      .lean()
      .exec();
    const titles = existing.map((item) => item.title);
    const placementSlot =
      typeof req.body?.placementSlot === "string" && req.body.placementSlot.trim()
        ? req.body.placementSlot.trim()
        : "hero";
    const ad = await generateAutomaticAdvertisement({
      excludeTitles: titles,
      status: "upcoming",
      placementSlot,
      sectionType: placementSlot,
    });
    const dashboard = await reconcileAdvertisements();
    res.status(201).json({
      advertisement: serializeAd(ad?.toObject?.() ?? ad),
      dashboard: serializeDashboard(dashboard),
    });
  } catch (err) {
    next(err);
  }
});

adminAdvertisementsRouter.post("/generate-all", async (_req, res, next) => {
  try {
    const advertisements = await prepareAllUpcomingAdvertisements();
    const dashboard = await reconcileAdvertisements();
    res.status(201).json({
      advertisements: advertisements.map((ad) => serializeAd(ad?.toObject?.() ?? ad)),
      dashboard: serializeDashboard(dashboard),
    });
  } catch (err) {
    next(err);
  }
});

adminAdvertisementsRouter.post("/make-ready-live", async (_req, res, next) => {
  try {
    const advertisements = await makeAllReadyNextLive();
    const dashboard = await reconcileAdvertisements();
    res.json({
      advertisements: advertisements.map((ad) => serializeAd(ad?.toObject?.() ?? ad)),
      dashboard: serializeDashboard(dashboard),
    });
  } catch (err) {
    next(err);
  }
});

adminAdvertisementsRouter.post("/:id/reuse", async (req, res, next) => {
  try {
    const ad = await reuseAdvertisement(req.params.id, req.body ?? {}, req.authUser?._id);
    if (!ad) {
      res.status(404).json({ error: "Advertisement not found" });
      return;
    }
    const dashboard = await reconcileAdvertisements();
    res.status(201).json({
      advertisement: serializeAd(ad.toObject()),
      dashboard: serializeDashboard(dashboard),
    });
  } catch (err) {
    next(err);
  }
});

adminAdvertisementsRouter.post("/:id/make-live", async (req, res, next) => {
  try {
    const ad = await makeAdvertisementLive(req.params.id);
    if (!ad) {
      res.status(404).json({ error: "Advertisement not found" });
      return;
    }

    const dashboard = await reconcileAdvertisements();
    res.json({
      advertisement: serializeAd(ad.toObject()),
      dashboard: serializeDashboard(dashboard),
    });
  } catch (err) {
    next(err);
  }
});

adminAdvertisementsRouter.post("/:id/pin", async (req, res, next) => {
  try {
    const ad = await Advertisement.findById(req.params.id).exec();
    if (!ad || ad.isDeleted) {
      res.status(404).json({ error: "Advertisement not found" });
      return;
    }
    ad.isPinned = true;
    if (ad.status === "draft") ad.status = "live";
    await ad.save();
    const dashboard = await reconcileAdvertisements();
    res.json({
      advertisement: serializeAd(ad.toObject()),
      dashboard: serializeDashboard(dashboard),
    });
  } catch (err) {
    next(err);
  }
});

adminAdvertisementsRouter.post("/:id/unpin", async (req, res, next) => {
  try {
    const ad = await Advertisement.findById(req.params.id).exec();
    if (!ad || ad.isDeleted) {
      res.status(404).json({ error: "Advertisement not found" });
      return;
    }
    ad.isPinned = false;
    await ad.save();
    const dashboard = await reconcileAdvertisements();
    res.json({
      advertisement: serializeAd(ad.toObject()),
      dashboard: serializeDashboard(dashboard),
    });
  } catch (err) {
    next(err);
  }
});

adminAdvertisementsRouter.delete("/:id", async (req, res, next) => {
  try {
    const ad = await softDeleteAdvertisement(req.params.id);
    if (!ad) {
      res.status(404).json({ error: "Advertisement not found" });
      return;
    }
    const dashboard = await reconcileAdvertisements();
    res.json({
      ok: true,
      dashboard: serializeDashboard(dashboard),
    });
  } catch (err) {
    next(err);
  }
});
