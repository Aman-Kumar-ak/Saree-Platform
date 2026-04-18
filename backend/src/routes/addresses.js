import { Router } from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// Get all addresses for the logged-in user
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.authUser._id).select("addresses").lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const addresses = (user.addresses || []).sort((a, b) => {
      if (b.isDefault !== a.isDefault) return b.isDefault ? 1 : -1;
      return new Date(b._id.getTimestamp()) - new Date(a._id.getTimestamp());
    });

    res.json({ addresses });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    res.status(500).json({ error: "Failed to fetch addresses" });
  }
});

// Create a new address
router.post("/", requireAuth, async (req, res) => {
  try {
    if (!req.authUser || !req.authUser._id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { fullName, phone, line1, line2, city, state, pincode, isDefault } =
      req.body;

    // Validate required fields
    if (!fullName || !phone || !line1 || !city || !state || !pincode) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newAddress = {
      _id: new mongoose.Types.ObjectId(),
      fullName: fullName.trim(),
      phone: phone.trim(),
      line1: line1.trim(),
      line2: (line2 || "").trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      isDefault: Boolean(isDefault),
    };

    // If this is set as default, unset other defaults
    if (isDefault) {
      // First unset other defaults
      await User.findByIdAndUpdate(
        req.authUser._id,
        {
          $set: { "addresses.$[].isDefault": false },
        },
        { arrayFilters: [{}] }
      );
    }

    const user = await User.findByIdAndUpdate(
      req.authUser._id,
      { $push: { addresses: newAddress } },
      { new: true }
    ).select("addresses");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(201).json({ address: newAddress });
  } catch (error) {
    console.error("Error creating address:", error);
    res.status(500).json({ error: "Failed to create address", details: error.message });
  }
});

// Update an address
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { fullName, phone, line1, line2, city, state, pincode, isDefault } =
      req.body;
    const addressId = req.params.id;

    // Validate required fields
    if (!fullName || !phone || !line1 || !city || !state || !pincode) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({ error: "Invalid address ID" });
    }

    const user = await User.findById(req.authUser._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const addressIndex = user.addresses.findIndex(
      (addr) => String(addr._id) === addressId
    );

    if (addressIndex === -1) {
      return res.status(404).json({ error: "Address not found" });
    }

    // If setting as default, unset others
    if (isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    user.addresses[addressIndex] = {
      ...user.addresses[addressIndex],
      fullName: fullName.trim(),
      phone: phone.trim(),
      line1: line1.trim(),
      line2: (line2 || "").trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      isDefault: Boolean(isDefault),
    };

    await user.save();

    res.json({
      address: user.addresses[addressIndex],
    });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ error: "Failed to update address" });
  }
});

// Delete an address
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const addressId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({ error: "Invalid address ID" });
    }

    const user = await User.findByIdAndUpdate(
      req.authUser._id,
      { $pull: { addresses: { _id: new mongoose.Types.ObjectId(addressId) } } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ error: "Failed to delete address" });
  }
});

export default router;
