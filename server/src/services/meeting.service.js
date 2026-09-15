import {Meeting} from "../models/meeting.model.js"
import ApiError from "../utils/api-error.js"
import { Participant } from "../models/participant.model.js";

export const createMeeting=async({userId,description,title,scheduledFor,settings})=>{
  if(!title){
    throw new ApiError(401,"Metting title is required")
  }

  const meeting=await Meeting.create({
    host:userId,
    roomId:crypto.randomUUID(),
    title,
    description,
    settings,
    scheduledFor
  })

  return meeting
}

export const getMeetingByRoomId = async (roomId) => {
  if (!roomId) {
    throw new ApiError(400, "Room ID is required");
  }

  const meeting = await Meeting.findOne({ roomId })
    .populate("host", "fullname username email avatar");

  if (!meeting) {
    throw new ApiError(404, "Meeting not found");
  }

  return meeting;
};

export const updateMeeting = async ({roomId,userId, title,  description,  scheduledFor,  settings}) => {
  const meeting = await Meeting.findOne({ roomId });

  if (!meeting) {
    throw new ApiError(404, "Meeting not found");
  }

  if (meeting.host.toString() !== userId) {
    throw new ApiError(403, "Only the host can update the meeting");
  }

  if (title !== undefined) {
    meeting.title = title;
  }

  if (description !== undefined) {
    meeting.description = description;
  }

  if (scheduledFor !== undefined) {
    meeting.scheduledFor = scheduledFor;
  }

  if (settings !== undefined) {
    meeting.settings = {
      ...meeting.settings.toObject(),
      ...settings
    };
  }

  await meeting.save();

  return meeting;
};

export const startMeeting=async({roomId,userId})=>{
  const meeting=await Meeting.findOne({roomId})

  if(!meeting){
    throw new ApiError(404,"Meeting not found")
  }
  if(meeting.host.toString()!==userId){
    throw new ApiError(403,"Only the host can start the meeting")
  }
  console.log("SCHEDULED FOR:", meeting.scheduledFor);
  console.log("CURRENT TIME:", new Date());
  if (meeting.scheduledFor && meeting.scheduledFor > new Date()) {
    throw new ApiError(
      400,
      "Meeting is scheduled for a future time"
    );
  }
  if(meeting.status!=="scheduled"){
    throw new ApiError(400,`Meeting cannot be started because it is already ${meeting.status}`)
  }

  meeting.status="live"
  meeting.startedAt=new Date()

  await meeting.save()
  return meeting
}

export const endMeeting = async ({ roomId, userId }) => {
  const meeting = await Meeting.findOne({ roomId });
     console.log(meeting.status)

  if (!meeting) {
    throw new ApiError(404, "Meeting not found");
  }

  if (meeting.host.toString() !== userId) {
    throw new ApiError(403, "Only the host can end the meeting");
  }

  if (meeting.status !== "live") {
    throw new ApiError(
      400,
      `Meeting cannot be ended because it is ${meeting.status}`
    );
  }

  meeting.status = "ended";
  meeting.endedAt = new Date();

  await meeting.save();

  return meeting;
};

export const joinMeeting = async ({ roomId, userId }) => {
  if (!roomId || !userId) {
    throw new ApiError(401,"roomId and userId both are required")
  }

  const meeting = await Meeting.findOne({ roomId })

  if (!meeting) {
  throw new ApiError(401,"No such meeting with this roomId")
  }  

  if (meeting.status === "ended") {
    throw new ApiError(401,"Meeting has already ended by the host")
  }

  const isHost =
    meeting.host.toString() === userId.toString();

  console.log("WAITING ROOM:", meeting.settings.waitingRoom);
  console.log("IS HOST:", isHost);
  if (
    meeting.settings.waitingRoom &&
    !isHost
  ) {
    return {
      status: "waiting",
      message: "Waiting for the host to admit you"
    };
  }
  if (
      meeting.status === "scheduled" &&
      meeting.host.toString() !== userId.toString()
  ) {
      throw new ApiError(
          400,
          "Meeting has not started yet"
      );
  }

  let participant = await Participant.findOne({
    user: userId,
    meeting:meeting._id
  })

  if (!participant) {
    participant = await Participant.create({
      meeting: meeting._id,
      user: userId,
      role: meeting.host.toString() === userId ? "host" : "participant",
      isHost: meeting.host.toString() === userId,
      joinedAt: new Date(),
      leftAt:null
    })
  } else {
    participant.joinedAt = new Date(),
      participant.leftAt = null

    await participant.save()
  }

  return participant
  
}

export const leftMeeting = async ({ roomId, userId }) => {
  if (!roomId || !userId) {
    throw new ApiError(401,"roomId and userId both are required")
  }

  const meeting = await Meeting.findOne({roomId})

  if (!meeting) {
  throw new ApiError(401,"No such meeting with this roomId")
  }  

  let participant = await Participant.findOne({
    meeting: meeting._id,
    user:userId
  })

  if (!participant) {
    throw new ApiError(404,"No such user in this meeting exists")
  }

  if (participant.leftAt) {
    throw new ApiError(400,"Participant has already left the meeting")
  }

  participant.leftAt = new Date()
  console.log(`meeting left `)

  await participant.save()

  return participant
}

export const getMeetings = async ({ userId }) => {
  const meetings = await Meeting.find({
    host: userId,
    isDeleted: { $ne: true }
  }).sort({ createdAt: -1 });

  return meetings;
}

export const removeMeeting = async ({ roomId, userId }) => {
  const meeting = await Meeting.findOne({ roomId });

  if (!meeting) {
    throw new ApiError(404, "Meeting not found");
  }

  if (meeting.host.toString() !== userId) {
    throw new ApiError(403, "Only the host can remove this meeting");
  }

  if (meeting.status === "live") {
    throw new ApiError(
      400,
      "Cannot remove a live meeting. End the meeting first."
    );
  }

  meeting.isDeleted = true;

  await meeting.save();

  return meeting;
}