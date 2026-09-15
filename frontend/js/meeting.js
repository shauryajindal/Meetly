import socket,{connectSocket} from "./socket.js";
import {
  createOffer,
  handleOffer,
  handleScreenOffer,
  handleAnswer,
  handleIceCandidate,
  removePeer,
  removeAllPeers,
  removeAllScreenPeers
} from "./peer.js";
import {
    startLocalMedia,
    stopLocalMedia,
    toggleAudio,
    toggleVideo
} from "./media.js";

let currentRoomId = null;
let participants = new Map();

export async function joinMeeting(roomId) {
    console.log("JOIN MEETING STARTED:", roomId);

    await connectSocket();

    console.log("SOCKET READY:", socket.id);

    currentRoomId = roomId;

    console.log("EMITTING JOIN-MEETING:", {
        socketId: socket.id,
        roomId
    });

    socket.emit("join-meeting", {
        roomId,
    });
}

export function leaveMeeting() {
    if (!currentRoomId) return;

    socket.emit("leave-meeting", {
        roomId: currentRoomId
    });

    // Close all camera/audio peer connections
    removeAllPeers();

    // Close all screen-share peer connections
  removeAllScreenPeers();
   stopLocalMedia();

    currentRoomId = null;
  participants.clear();
  updateParticipantCount();
}

const leaveWaitingRoomButton =
    document.getElementById("leaveWaitingRoomButton");

if (leaveWaitingRoomButton) {
    leaveWaitingRoomButton.addEventListener("click", () => {
        console.log("🚪 LEAVING WAITING ROOM");

        hideWaitingRoom();

        if (socket.connected) {
            socket.disconnect();
        }

        window.location.href = "/pages/dashboard.html";
    });
}

socket.on("existing-participants", ({  participants:existingParticipants}) => {
  existingParticipants.forEach(({ socketId,user }) => {
    
    participants.set(socketId, {
      socketId,
      user
    })
    
  })

  updateParticipantCount();

  console.log("EXISTING PARTICIPANTS:", existingParticipants);
})

socket.on("user-joined", async ({ user, socketId }) => {
  participants.set(socketId, { user, socketId });
   updateParticipantCount();
  await createOffer(socketId);

  window.dispatchEvent(
    new CustomEvent("participant-joined", {
      detail: { socketId }
    })
  );
});

socket.on("webrtc-offer", async ({ offer,fromSocketId,mediaType}) => {

  console.log(
    "RECEIVED OFFER FROM:",
    fromSocketId,
    "TYPE:",
    mediaType
  );

  if (mediaType === "screen") {
    await handleScreenOffer(
      offer,
      fromSocketId
    );

    return;
  }

  participants.set(fromSocketId, {
    ...participants.get(fromSocketId),
    socketId: fromSocketId
  });

  await handleOffer(
    offer,
    fromSocketId
  );
});

socket.on("webrtc-answer", async ({answer,fromSocketId,mediaType}) => {

  console.log(
    "RECEIVED ANSWER FROM:",
    fromSocketId,
    "TYPE:",
    mediaType
  );

  await handleAnswer(
    answer,
    fromSocketId,
    mediaType
  );
});

socket.on("webrtc-ice-candidate", async ({candidate,fromSocketId,mediaType}) => {

  console.log(
    "RECEIVED ICE CANDIDATE FROM:",
    fromSocketId,
    "TYPE:",
    mediaType
  );

  await handleIceCandidate(
    candidate,
    fromSocketId,
    mediaType
  );
});

function showWaitingRoom() {
    const overlay = document.getElementById("waitingRoomOverlay");

    if (!overlay) {
        console.error("❌ waitingRoomOverlay not found in DOM");
        return;
    }

    overlay.style.display = "flex";
    console.log("⏳ WAITING ROOM SHOWN");
}

function hideWaitingRoom() {
    const overlay = document.getElementById("waitingRoomOverlay");

    if (!overlay) return;

    overlay.style.display = "none";
    console.log("✅ WAITING ROOM HIDDEN");
}

socket.on("media-state-changed", ({ socketId, audioEnabled, videoEnabled }) => {
  console.log("Media state changed:", {
    socketId,
    audioEnabled,
    videoEnabled
  })

  window.dispatchEvent( 
    new CustomEvent("remote-media-state-changed", {
      detail: {
        socketId,
        audioEnabled,
        videoEnabled
      }
    })
  )
})

socket.on("screen-share-ended", ({ socketId }) => {
  console.log("SCREEN SHARE ENDED BY:", socketId);

  window.dispatchEvent(
    new CustomEvent("remote-screen-share-ended", {
      detail: { socketId }
    })
  );
});

socket.on("meeting-ended", () => {
    console.log("MEETING ENDED BY HOST");

    removeAllPeers();
    removeAllScreenPeers();

    stopLocalMedia();

    currentRoomId = null;
    participants.clear();

    updateParticipantCount();

    window.dispatchEvent(
        new CustomEvent("meeting-ended")
    );
});

socket.on("user-left", ({ socketId }) => {
    console.log("USER LEFT:", socketId);

  participants.delete(socketId);

    updateParticipantCount();

    window.dispatchEvent(
        new CustomEvent("remote-user-left", {
            detail: {
                remoteSocketId: socketId
            }
        })
    );
});

socket.on("meeting-settings-changed", ({ settings }) => {
  console.log("MEETING SETTINGS CHANGED:", settings);

  window.dispatchEvent(
    new CustomEvent("meeting-settings-changed", {
      detail: {
        settings
      }
    })
  )
})

socket.on("waiting-room", ({ roomId, message }) => {
    console.log("⏳ WAITING ROOM:", {
        roomId,
        message
    });

    showWaitingRoom();
});

socket.on("join-approved", async ({ roomId }) => {
    console.log("✅ JOIN APPROVED:", roomId);

    hideWaitingRoom();

    await joinMeeting(roomId);
});

socket.on("join-rejected", ({ roomId, message }) => {
    console.log("❌ JOIN REJECTED:", {
        roomId,
        message
    });

    hideWaitingRoom();

    alert(
        message ||
        "The host rejected your request to join the meeting."
    );

    window.location.href = "/pages/dashboard.html";
});

socket.on(
    "waiting-request-cancelled",
    ({ roomId, participantSocketId }) => {
        console.log(
            "🧹 WAITING REQUEST CANCELLED:",
            participantSocketId
        );

        window.dispatchEvent(
            new CustomEvent("waiting-request-cancelled", {
                detail: {
                    roomId,
                    participantSocketId
                }
            })
        );
    }
);

function updateParticipantCount() {

    window.dispatchEvent(
        new CustomEvent("participant-count-changed", {
            detail: {
                count: participants.size + 1
            }
        })
    );


    window.dispatchEvent(
        new CustomEvent("participants-updated", {
            detail: {
                participants
            }
        })
    );
}

export function getParticipants() {
    return participants;
}

