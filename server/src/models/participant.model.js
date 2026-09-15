import mongoose, { Schema } from "mongoose"

const participantSchema = new Schema({
  meeting: {
       type: mongoose.Schema.Types.ObjectId,
       ref: "Meeting",
    required: true,
       index:true,
  },
 
  user: {
       type: mongoose.Schema.Types.ObjectId,
       ref: "User",
    required: true,
       index:true,
  },

  role: {
    type: String,
    enum: ["participant", "host", "co-host"],
    default:"participant"
  },

  joinedAt: {
    type: Date,
    default:null
  },

  leftAt: {
    type: Date,
    default:null
  },
  
  isHost: {
      type: Boolean,
      default: false
  },
  audioEnabled: {
    type: Boolean,
    default:true
  },
  videoEnabled: {
    type: Boolean,
    default:true
  }
}, {
  timestamps:true
})

participantSchema.index({
  meeting:1,user:1
},{unique:true})

export const Participant = mongoose.model("Participant",participantSchema)