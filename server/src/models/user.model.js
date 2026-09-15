import mongoose,{Schema} from "mongoose"

const userSchema = new Schema({
  fullname: {
    type: String,
    min: 2,
    max: 60,
    trim: true,
    lowercase: true,
    required:true
  },
  username: {
    type: String,
    min: 2,
    max: 30,
    trim: true,
    lowercase: true,
    unique: true,
    required:true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
  },
  emailVerified: {
    type: Boolean,
    default:false
  },
  avatar: {
    type: String,
    default:""
  },
  bio: {
    type: String,
    default:""
  },
  isActive: {
    type: Boolean,
    default:false
  }
}, { timestamps: true })

export const User=mongoose.model("User",userSchema)