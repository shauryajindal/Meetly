import mongoose, { Schema } from "mongoose"

const authIdentitySchema = new Schema({
  user: {
       type: Schema.Types.ObjectId,
       ref: "User",
       required: true,
       index: true
  },
  provider: {
    type: String,
    enum: ["password", "google"],
    required:true
  },
  providerAccountId: {
    type: String,
    default:null
  },
  passwordHash: {
       type: String,
       default: null,
       select: false
     }
}, { timestamps: true }) 

authIdentitySchema.index({
  user: 1,
  provider:1  
}, {
  unique:true
})

authIdentitySchema.index(
  { provider: 1, providerAccountId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      providerAccountId:{$type:"string"}
    }

  }
)

export const AuthIdentity = mongoose.model(
  "AuthIdentity",
  authIdentitySchema
);