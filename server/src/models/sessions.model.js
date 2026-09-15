import mongoose, { Schema } from "mongoose"

const sessionSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index:true
  },
  refreshTokenHash: {
    type: String,
    required: true,
    select:false
  },
  expiresAt: {
    type: Date,
    required:true
  },
  revokedAt: {
    type: Date,
    default:null
  },
  userAgent: {
    type: String,
    default:""
  },
  ipAddress: {
    type: String,
    default:""
  },
  lastUsedAt: {
    type: Date,
    default:null
  }
  
}, {
  timestamps:true
})

export const Session=mongoose.model("Session",sessionSchema)