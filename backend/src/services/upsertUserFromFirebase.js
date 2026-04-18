import { firebasePhoneTo10 } from "../lib/phone.js";
import { User } from "../models/User.js";

/**
 * @param {import('firebase-admin').auth.DecodedIdToken} decoded
 * @param {{ name?: string, loginOnly?: boolean }} opts
 */
export async function upsertUserFromFirebase(decoded, opts = {}) {
  const phone10 = firebasePhoneTo10(decoded.phone_number);
  if (!phone10) {
    const err = new Error("Phone number missing on token");
    err.code = "NO_PHONE";
    throw err;
  }

  const firebaseUid = decoded.uid;
  const nameIn = String(opts.name ?? "").trim();
  const loginOnly = Boolean(opts.loginOnly);

  let user = await User.findOne({ $or: [{ firebaseUid }, { phone: phone10 }] }).exec();

  if (!user) {
    // If loginOnly is true, user must exist in database
    if (loginOnly) {
      const err = new Error("No user found with this phone number");
      err.code = "USER_NOT_FOUND";
      throw err;
    }
    
    // Otherwise, create a new user.
    const name = nameIn || "Member";
    user = await User.create({
      firebaseUid,
      phone: phone10,
      name,
      role: "customer",
    });
    return user;
  }

  if (!user.firebaseUid) {
    user.firebaseUid = firebaseUid;
  }
  if (nameIn) {
    user.name = nameIn;
  }
  await user.save();
  return user;
}
