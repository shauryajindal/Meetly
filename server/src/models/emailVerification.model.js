import mongoose, { Schema } from "mongoose"

const emailVerificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index:true,
  },
  otpHash: {
    type: String,
    required: true,
    select:false
  },
  expiresAt: {
    type: Date,
    required:true
  },
  attempts: {
    type: Number,
    default:0,
  },
  verifiedAt: {
    type: Date,
    default:null
  },
  invalidatedAt: {
      type: Date,
      default: null
    }
},
  { timestamps: true })

export const EmailVerification=mongoose.model("EmailVerification",emailVerificationSchema)