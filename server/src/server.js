import "dotenv/config";
import app from "./app.js"
import http from "http"
import { Server } from "socket.io"
import { connectDb } from "./config/db.js"
import { User } from "./models/user.model.js";
import { verifyEmailConnection } from "./services/email.service.js";
import { socketAuthMiddleware } from "./middlewares/socket.middleware.js";
import { setSocketIO } from "./socket.js";
import { Meeting } from "./models/meeting.model.js";
import { Participant } from "./models/participant.model.js";
import { leftMeeting } from "./services/meeting.service.js";


const waitingRoomRequests = new Map();

const PORT = process.env.PORT || 5000 

await connectDb()

const httpServer = http.createServer(app)

 const io = new Server(httpServer, {
   cors: {
       origin: process.env.FRONTEND_URL,
       credentials: true
   }
 });

 setSocketIO(io);

io.use(socketAuthMiddleware);

io.on("connection", (socket) => {
  console.log("SOCKET USER:", socket.userId);

  socket.user = {
      userId: socket.userId
  };

  User.findById(socket.userId)
      .select("fullname username avatar")
      .then((user) => {

          if (!user) {
              console.log("Socket user not found");
              socket.disconnect();
              return;
          }

          socket.user = {
              userId: user._id.toString(),
              fullname: user.fullname,
              username: user.username,
              avatar: user.avatar
          };

      })
      .catch((error) => {
          console.error("Failed to load socket user:", error);
          socket.disconnect();
      });

  socket.on("join-meeting", async ({ roomId }) => {
    try {
      if (!roomId) {
        console.log("Join rejected: roomId is required");
        return;
      }
  
      const meeting = await Meeting.findOne({ roomId });
  
      if (!meeting) {
        console.log("Join rejected: meeting not found");
        socket.emit("meeting-join-rejected", {
          reason: "Meeting not found"
        });
        return;
      }
  
      if (meeting.status === "ended") {
        console.log("Join rejected: meeting has ended");
        socket.emit("meeting-join-rejected", {
          reason: "Meeting has ended"
        });
        return;
      }
  
      const isHost =
        meeting.host.toString() === socket.userId.toString();
  
      // A scheduled meeting can only be entered by the host.
      if (
        meeting.status === "scheduled" &&
        !isHost
      ) {
        console.log("Join rejected: meeting has not started");
  
        socket.emit("meeting-join-rejected", {
          reason: "Meeting has not started yet"
        });
  
        return;
      }
  
      /*
       * HOST
       * Host always enters the actual Socket.IO room.
       */
      if (isHost) {
        socket.join(roomId);
  
        console.log(
          `Host ${socket.userId} joined meeting ${roomId}`
        );
  
        return;
      }
  
      /*
       * WAITING ROOM
       */

       const waitingRequest =
           waitingRoomRequests.get(socket.id);
       
       if (meeting.settings.waitingRoom) {
       
           // User was approved by the host.
           if (waitingRequest?.approved) {
       
               // Approval has now been consumed.
               waitingRoomRequests.delete(socket.id);
       
           } else {
       
               console.log(
                   `User ${socket.userId} is still waiting for approval`
               );
       
               socket.emit("waiting-room", {
                   roomId,
                   message: "Waiting for the host to admit you"
               });
       
               return;
           }
       }
  
      /*
       * NORMAL JOIN
       * Waiting room is disabled.
       */
      const existingParticipants = [];
  
      const roomSockets =
        io.sockets.adapter.rooms.get(roomId) || new Set();
  
      for (const socketId of roomSockets) {
        if (socketId === socket.id) continue;
  
        const participantSocket =
          io.sockets.sockets.get(socketId);
  
        if (participantSocket) {
          existingParticipants.push({
            socketId,
            user: participantSocket.user
          });
        }
      }
  
      socket.join(roomId);
  
      socket.emit("existing-participants", {
        participants: existingParticipants
      });
  
      socket.to(roomId).emit("user-joined", {
        socketId: socket.id,
        user: socket.user
      });
  
      console.log(
        `User ${socket.userId} joined meeting ${roomId}`
      );
  
    } catch (error) {
      console.error("Join meeting failed:", error);
    }
  });

  socket.on("request-to-join", async ({ roomId }) => {
    try {
      console.log("REQUEST TO JOIN:", {
        socketId: socket.id,
        userId: socket.userId,
        roomId
      });
  
      const meeting = await Meeting.findOne({ roomId });
  
      if (!meeting) {
        console.log("MEETING NOT FOUND");
        return;
      }
  
      if (!meeting.settings.waitingRoom) {
        console.log("WAITING ROOM IS NOT ENABLED");
        return;
      }
  
      // Prevent duplicate waiting requests from the same user
      // in the same meeting.
      for (const [socketId, request] of waitingRoomRequests) {
        if (
          request.roomId === roomId &&
          request.userId.toString() === socket.userId.toString()
        ) {
          // If this is an old socket belonging to the same user,
          // remove its stale request.
          waitingRoomRequests.delete(socketId);
  
          for (const [, connectedSocket] of io.sockets.sockets) {
            if (
              connectedSocket.userId?.toString() ===
              request.hostUserId
            ) {
              connectedSocket.emit("waiting-request-cancelled", {
                roomId,
                participantSocketId: socketId
              });
              break;
            }
          }
        }
      }
  
      waitingRoomRequests.set(socket.id, {
        roomId,
        userId: socket.userId.toString(),
        hostUserId: meeting.host.toString()
      });
      // Tell the participant that they are actually waiting.
      socket.emit("waiting-room", {
        roomId,
        message: "Waiting for the host to admit you"
      });
  
      // Find the host's socket(s) in the meeting room.
      const roomSockets = io.sockets.adapter.rooms.get(roomId);
  
      if (!roomSockets) {
        console.log("NO SOCKETS FOUND IN ROOM");
        return;
      }
  
      for (const socketId of roomSockets) {
        const hostSocket = io.sockets.sockets.get(socketId);
  
        if (
          hostSocket &&
          hostSocket.userId.toString() === meeting.host.toString()
        ) {
          hostSocket.emit("join-request", {
            roomId,
            socketId: socket.id,
            user: {
              userId: socket.userId
            }
          });
  
          break;
        }
      }
  
      console.log("WAITING REQUEST STORED:", {
        participantSocketId: socket.id,
        roomId,
        userId: socket.userId
      });
  
    } catch (error) {
      console.error("REQUEST TO JOIN ERROR:", error);
    }
  });

  socket.on(
    "admit-participant",
    async ({ roomId, participantSocketId }) => {
      try {
        console.log("ADMIT REQUEST:", {
          hostSocketId: socket.id,
          roomId,
          participantSocketId
        });
  
        const meeting = await Meeting.findOne({ roomId });
  
        if (!meeting) {
          console.log("MEETING NOT FOUND");
          return;
        }
  
        // Only the host can admit participants.
        if (
          meeting.host.toString() !==
          socket.userId.toString()
        ) {
          console.log("UNAUTHORIZED ADMISSION ATTEMPT");
          return;
        }
  
        const request =
          waitingRoomRequests.get(participantSocketId);
  
        if (!request) {
          console.log("NO WAITING REQUEST FOUND");
          return;
        }
  
        if (request.roomId !== roomId) {
          console.log("ROOM ID MISMATCH");
          return;
        }
  
        const participantSocket =
          io.sockets.sockets.get(participantSocketId);
  
        if (!participantSocket) {
          console.log("PARTICIPANT SOCKET NOT FOUND");
  
          waitingRoomRequests.delete(participantSocketId);
  
          socket.emit("waiting-request-cancelled", {
            roomId,
            participantSocketId
          });
  
          return;
        }
  
        // Create/update participant record.
        await Participant.findOneAndUpdate(
          {
            meeting: meeting._id,
            user: request.userId
          },
          {
            meeting: meeting._id,
            user: request.userId,
            role: "participant",
            isHost: false,
            joinedAt: new Date(),
            leftAt: null
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
          }
        );
  
        participantSocket.emit("join-approved", {
            roomId
        });
        
        // Tell host UI to remove the waiting request.
        socket.emit("participant-admitted", {
            roomId,
            participantSocketId
        });
        
        // Mark as approved (do NOT delete yet) so the
        // participant's follow-up "join-meeting" event passes
        // the waiting-room gate. It gets consumed/deleted there.
        request.approved = true;
  
  
      } catch (error) {
        console.error("ADMIT PARTICIPANT ERROR:", error);
      }
    }
  );

  socket.on(
    "reject-participant",
    async ({ roomId, participantSocketId }) => {
      try {
        console.log("REJECT REQUEST:", {
          hostSocketId: socket.id,
          roomId,
          participantSocketId
        });
  
        const meeting = await Meeting.findOne({ roomId });
  
        if (!meeting) {
          console.log("MEETING NOT FOUND");
          return;
        }
  
        if (
          meeting.host.toString() !==
          socket.userId.toString()
        ) {
          console.log("UNAUTHORIZED REJECTION ATTEMPT");
          return;
        }
  
        const request =
          waitingRoomRequests.get(participantSocketId);
  
        if (!request) {
          console.log("NO WAITING REQUEST FOUND");
          return;
        }
  
        if (request.roomId !== roomId) {
          console.log("ROOM ID MISMATCH");
          return;
        }
  
        const participantSocket =
          io.sockets.sockets.get(participantSocketId);
  
        if (participantSocket) {
          participantSocket.emit("join-rejected", {
            roomId,
            message:
              "The host rejected your request to join the meeting"
          });
        }
  
        waitingRoomRequests.delete(participantSocketId);
  
        // Tell host UI to remove the request.
        socket.emit("participant-rejected", {
          roomId,
          participantSocketId
        });
  
        console.log(
          "❌ PARTICIPANT REJECTED:",
          participantSocketId
        );
  
      } catch (error) {
        console.error("REJECT PARTICIPANT ERROR:", error);
      }
    }
  );
  
  socket.on("leave-meeting", async ({ roomId }) => {
    try {
      await leftMeeting({
        roomId,
        userId: socket.userId
      });
  
      socket.leave(roomId);
  
      console.log(
        `User ${socket.userId} left meeting ${roomId}`
      );
  
      socket.to(roomId).emit("user-left", {
        userId: socket.userId,
        socketId: socket.id
      });
  
    } catch (error) {
      console.error("Leave meeting failed:", error);
    }
  });

  socket.on("webrtc-offer", async ({ offer, targetSocketId, mediaType }) => {
      try {
          if (mediaType === "screen") {
              const roomId = [...socket.rooms].find(
                  (room) => room !== socket.id
              );
  
              if (!roomId) {
                  console.log("Screen share rejected: user is not in a meeting");
                  return;
              }
  
              const meeting = await Meeting.findOne({ roomId });
  
              if (!meeting) {
                  console.log("Screen share rejected: meeting not found");
                  return;
              }
  
              const isHost =
                  meeting.host.toString() === socket.userId.toString();
  
              if (!isHost && !meeting.settings.allowScreenShare) {
                  console.log("Screen share rejected: not allowed");
                  return;
              }
          }
  
          console.log(
              "RELAYING OFFER TO:",
              targetSocketId,
              "TYPE:",
              mediaType
          );
  
          io.to(targetSocketId).emit("webrtc-offer", {
              offer,
              fromSocketId: socket.id,
              mediaType
          });
  
      } catch (error) {
          console.error("Screen share permission check failed:", error);
      }
  });
  
  socket.on("webrtc-answer", ({ answer, targetSocketId, mediaType }) => {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
  
      if (!targetSocket) {
          console.log("Answer rejected: target socket not found");
          return;
      }
  
      const senderRooms = [...socket.rooms].filter(
          (roomId) => roomId !== socket.id
      );
  
      const targetRooms = [...targetSocket.rooms].filter(
          (roomId) => roomId !== targetSocket.id
      );
  
      const sameRoom = senderRooms.some((roomId) =>
          targetRooms.includes(roomId)
      );
  
      if (!sameRoom) {
          console.log("Answer rejected: sockets are not in the same room");
          return;
      }
  
      io.to(targetSocketId).emit("webrtc-answer", {
          answer,
          fromSocketId: socket.id,
          mediaType
      });
  });
  
  socket.on("webrtc-ice-candidate",({ candidate, targetSocketId, mediaType }) => {
          const targetSocket = io.sockets.sockets.get(targetSocketId);
  
          if (!targetSocket) {
              console.log("ICE rejected: target socket not found");
              return;
          }
  
          const senderRooms = [...socket.rooms].filter(
              (roomId) => roomId !== socket.id
          );
  
          const targetRooms = [...targetSocket.rooms].filter(
              (roomId) => roomId !== targetSocket.id
          );
  
          const sameRoom = senderRooms.some((roomId) =>
              targetRooms.includes(roomId)
          );
  
          if (!sameRoom) {
              console.log("ICE rejected: sockets are not in the same room");
              return;
          }
  
          io.to(targetSocketId).emit("webrtc-ice-candidate", {
              candidate,
              fromSocketId: socket.id,
              mediaType
          });
      }
  );

  socket.on("media-state-changed", ({ roomId, audioEnabled,videoEnabled }) => {
    console.log("MEDIA STATE RECEIVED:", {
      socketId: socket.id,
      roomId,
      audioEnabled,
      videoEnabled
    });
    socket.to(roomId).emit("media-state-changed", {
      socketId: socket.id,
      audioEnabled,
      videoEnabled
    })
  })

  socket.on("screen-share-ended", ({ roomId }) => {
      console.log(
          `Screen share ended by ${socket.id} in room ${roomId}`
      );
  
      socket.to(roomId).emit("screen-share-ended", {
          socketId: socket.id
      });
  });

  socket.on("send-message", async ({ roomId, message }) => {
      try {
          const meeting = await Meeting.findOne({ roomId });
  
          if (!meeting) {
              console.log("Chat rejected: meeting not found");
              return;
          }
  
          const isHost =
              meeting.host.toString() === socket.userId.toString();
  
          if (!isHost && !meeting.settings.allowChat) {
              console.log("Chat rejected: not allowed");
              return;
          }
  
          console.log("CHAT MESSAGE RECEIVED:", {
              socketId: socket.id,
              roomId,
              message
          });
  
          socket.to(roomId).emit("new-message", {
              socketId: socket.id,
              user: socket.user,
              message
          });
  
      } catch (error) {
          console.error("Chat permission check failed:", error);
      }
  });
  
  socket.on("disconnect", async () => {
    console.log(`socket disconnected!! :${socket.id}`);
  
    // ==================================================
    // WAITING ROOM CLEANUP
    // ==================================================
  
    const waitingRequest = waitingRoomRequests.get(socket.id);
  
    if (waitingRequest) {
      console.log(
        "🧹 REMOVING WAITING REQUEST:",
        {
          socketId: socket.id,
          userId: waitingRequest.userId,
          roomId: waitingRequest.roomId
        }
      );
  
      // Remove the stale request from the server
      waitingRoomRequests.delete(socket.id);
  
      try {
        const meeting = await Meeting.findOne({
          roomId: waitingRequest.roomId
        });
  
        if (meeting) {
  
          // Find the host's currently connected socket
          for (const [, connectedSocket] of io.sockets.sockets) {
  
            if (
              connectedSocket.userId?.toString() ===
              meeting.host.toString()
            ) {
  
              connectedSocket.emit(
                "waiting-request-cancelled",
                {
                  roomId: waitingRequest.roomId,
                  participantSocketId: socket.id
                }
              );
  
              console.log(
                "📤 WAITING REQUEST REMOVED FROM HOST UI:",
                socket.id
              );
  
              break;
            }
          }
        }
  
      } catch (error) {
        console.error(
          "Failed to clean waiting request:",
          error
        );
      }
    }
  
  
    // ==================================================
    // NORMAL MEETING DISCONNECT
    // ==================================================
  
    const rooms = [...socket.rooms].filter(
      (roomId) => roomId !== socket.id
    );
  
    rooms.forEach((roomId) => {
  
      socket.to(roomId).emit("user-left", {
        userId: socket.userId,
        socketId: socket.id
      });
  
    });
  
  });
})

await verifyEmailConnection();

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Zoom is listening on PORT:${PORT}`)
})
