import { getConfig } from "../config/env.js";
import { firebasePhoneTo10 } from "../lib/phone.js";
import { User } from "../models/User.js";

/**
 * @param {import('firebase-admin').auth.DecodedIdToken} decoded
 * @param {{ name?: string }} opts
 */
export async function upsertUserFromFirebase(decoded, opts = {}) {
  const phone10 = firebasePhoneTo10(decoded.phone_number);
  if (!phone10) {
    const err = new Error("Phone number missing on token");
    err.code = "NO_PHONE";
    throw err;
  }

  const { adminPhones } = getConfig();
  const role = adminPhones.has(phone10) ? "admin" : "customer";
  const firebaseUid = decoded.uid;
  const nameIn = String(opts.name ?? "").trim();

  let user = await User.findOne({ $or: [{ firebaseUid }, { phone: phone10 }] }).exec();

  if (!user) {
    const name = nameIn || "Member";
    user = await User.create({
      firebaseUid,
      phone: phone10,
      name,
      role,
    });
    return user;
  }

  if (!user.firebaseUid) {
    user.firebaseUid = firebaseUid;
  }
  if (nameIn) {
    user.name = nameIn;
  }
  user.role = role;
  await user.save();
  return user;
}
