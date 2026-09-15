import mongoose, { Schema } from "mongoose";

const passwordResetSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    otpHash: {
      type: String,
      required: true,
      select: false
    },

    expiresAt: {
      type: Date,
      required: true
    },

    attempts: {
      type: Number,
      default: 0
    },

    usedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const PasswordReset = mongoose.model(
  "PasswordReset",
  passwordResetSchema
);