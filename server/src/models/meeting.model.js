import mongoose, { Schema } from "mongoose";

const meetingSchema = new Schema(
  {
    host: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    roomId: {
      type: String,
      required: true,
      unique: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: ["scheduled", "live", "ended"],
      default: "scheduled"
    },

    scheduledFor: {
      type: Date,
      default: null
    },

    startedAt: {
      type: Date,
      default: null
    },

    endedAt: {
      type: Date,
      default: null
    },

    settings: {
      waitingRoom: {
        type: Boolean,
        default: false
      },

      allowScreenShare: {
        type: Boolean,
        default: false
      },

      allowChat: {
        type: Boolean,
        default: false
      }
    },

    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

meetingSchema.index({ host: 1, createdAt: -1 });

export const Meeting = mongoose.model("Meeting", meetingSchema);