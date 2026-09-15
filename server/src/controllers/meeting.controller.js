import asyncHandler from "../utils/asyncHandler.js"
import ApiResponse from "../utils/api-response.js"
import {
  createMeeting, getMeetingByRoomId, updateMeeting, startMeeting, endMeeting,
  joinMeeting,leftMeeting,getMeetings,removeMeeting} from "../services/meeting.service.js"
import { getSocketIO } from "../socket.js";

export const create = asyncHandler(async (req, res) => {
  console.log("CREATE MEETING BODY:", req.body); 
  const {title,description,scheduledFor,settings}=req.body;

  const meeting=await createMeeting({
    userId:req.user.userId,
    title,
    description,
    scheduledFor,
    settings
  })
  return res.status(201).json(
     new ApiResponse(
       201,
       meeting,
       "Meeting created successfully"
     )
   );
})

export const getMeeting = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const meeting = await getMeetingByRoomId(roomId);

  return res.status(200).json(
    new ApiResponse(
      200,
      meeting,
      "Meeting fetched successfully"
    )
  );
});

export const update = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const {
    title,
    description,
    scheduledFor,
    settings
  } = req.body;

  const meeting = await updateMeeting({
    roomId,
    userId: req.user.userId,
    title,
    description,
    scheduledFor,
    settings
  });

  const io = getSocketIO();

   io.to(roomId).emit("meeting-settings-changed", {
       settings: meeting.settings
   });

  return res.status(200).json(
    new ApiResponse(
      200,
      meeting,
      "Meeting updated successfully"
    )
  );
});

export const start = asyncHandler(async (req, res) => {
  console.log("START MEETING CONTROLLER HIT");
  const { roomId } = req.params;

  const meeting = await startMeeting({
    roomId,
    userId: req.user.userId
  });
     console.log(meeting.status)
  return res.status(200).json(
    new ApiResponse(
      200,
      meeting,
      "Meeting started successfully"
    )
  );
  
});

export const end = asyncHandler(async (req, res) => {
    const { roomId } = req.params;

    const meeting = await endMeeting({
        roomId,
        userId: req.user.userId
    });

    const io = getSocketIO();

    io.to(roomId).emit("meeting-ended");

    return res.status(200).json(
        new ApiResponse(
            200,
            meeting,
            "Meeting ended successfully"
        )
    );
});  

export const joinMeetingController = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const participant = await joinMeeting({
    roomId,
    userId: req.user.userId
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      participant,
      "Joined meeting successfully"
    )
  );
});

export const leaveMeetingController = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const participant = await leftMeeting({
    roomId,
    userId: req.user.userId
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      participant,
      "Left meeting successfully"
    )
  );
});

export const getMyMeetingsController = asyncHandler(async (req, res) => {
  const meetings = await getMeetings({ userId: req.user.userId });

  res.status(200).json(new ApiResponse(200,meetings,"Meetings fetched successfully"))
})

export const removeMeetingController = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const meeting = await removeMeeting({
    roomId,
    userId: req.user.userId
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      meeting,
      "Meeting removed from dashboard"
    )
  );
});