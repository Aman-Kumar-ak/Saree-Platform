import mongoose from "mongoose";

const authThrottleSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, index: true, trim: true },
    sendAttempts: { type: [Date], default: [] },
    verifyFailures: { type: [Date], default: [] },
    suspendedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

export const AuthThrottle =
  mongoose.models.AuthThrottle || mongoose.model("AuthThrottle", authThrottleSchema);
