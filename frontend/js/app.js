import { joinMeeting, leaveMeeting } from "./meeting.js";

import {
    startLocalMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare
} from "./media.js";

import {
    joinMeetingApi,
    getMeetingApi,
    startMeetingApi,
    getMeApi,
    endMeetingApi,
    updateMeetingApi
} from "./api.js";

import { getParticipants } from "./meeting.js";

import socket, { connectSocket} from "./socket.js";

import {
    startScreenShareConnection,
    removeScreenPeer,
    removeAllScreenPeers,
    removePeer
} from "./peer.js";


// ==================================================
// GLOBAL MEETING STATE
// ==================================================

let isScreenSharing = false;
let currentScreenStream = null;

// IMPORTANT:
// This must be available outside startApp()
// because settings can change through Socket.IO.
let isHost = false;


// ==================================================
// DOM ELEMENTS
// ==================================================

const startMeetingButton =
    document.getElementById("startMeetingButton");

const endMeetingButton =
    document.getElementById("endMeetingButton");

const localVideo =
    document.getElementById("localVideo");

const audioButton =
    document.getElementById("audioButton");

const videoButton =
    document.getElementById("videoButton");

const screenShareButton =
    document.getElementById("screenShareButton");

const landingPage =
    document.getElementById("landingPage");

const meetingPage =
    document.getElementById("meetingPage");

const chatButton =
    document.getElementById("chatButton");

const chatPanel =
    document.getElementById("chatPanel");

const participantsButton =
    document.getElementById("participantsButton");

const participantsPanel =
    document.getElementById("participantsPanel");

const waitingSection =
    document.getElementById("waitingSection");

const waitingParticipants =
    document.getElementById("waitingParticipants");

const waitingCount =
    document.getElementById("waitingCount");

const participantCountPanel =
    document.getElementById("participantCountPanel");

const meetingParticipants =
    document.getElementById("meetingParticipants");

const chatInput =
    document.getElementById("chatInput");

const sendMessageButton =
    document.getElementById("sendMessageButton");

const leaveButton =
    document.getElementById("leaveButton");



// ==================================================
// MEETING SETTINGS DOM
// ==================================================

const meetingSettingsButton =
    document.getElementById("meetingSettingsButton");

const meetingSettingsPanel =
    document.getElementById("meetingSettingsPanel");

const waitingRoomToggle =
    document.getElementById("waitingRoomToggle");

const allowScreenShareToggle =
    document.getElementById("allowScreenShareToggle");

const allowChatToggle =
    document.getElementById("allowChatToggle");


// ==================================================
// GET ROOM ID
// ==================================================

const params =
    new URLSearchParams(window.location.search);

const roomId =
    params.get("roomId");


// ==================================================
// MEETING ENDED
// ==================================================

window.addEventListener("meeting-ended", () => {

  showToast(
      "The host has ended the meeting.",
      "info"
  );

    window.location.href =
        "/pages/dashboard.html";

});


// ==================================================
// START MEETING APP
// ==================================================

async function startApp() {

    try {

        // ==================================================
        // GET MEETING
        // ==================================================

        const meetingData =
            await getMeetingApi(roomId);

        const meeting =
            meetingData.data;

        console.log(
            "MEETING DATA:",
            meeting
        );


        // ==================================================
        // GET CURRENT USER
        // ==================================================

        const currentUserData =
            await getMeApi();

        const currentUser =
            currentUserData.data;


        // ==================================================
        // DETERMINE HOST
        // ==================================================

        const hostId =
            meeting.host._id ||
            meeting.host.id;

        const currentUserId =
            currentUser.id ||
            currentUser._id;

        isHost =
            String(hostId) ===
            String(currentUserId);


        console.log(
            "MEETING STATUS:",
            meeting.status
        );

        console.log(
            "IS HOST:",
            isHost
        );


        // ==================================================
        // INITIAL MEETING SETTINGS
        // ==================================================

        const allowChat =
            meeting.settings?.allowChat === true;

        const allowScreenShare =
            meeting.settings?.allowScreenShare === true;


        // ==================================================
        // CHAT PERMISSION
        // ==================================================
        //
        // Host always has Chat.
        // Participant depends on allowChat.
        //

        if (chatButton) {

            if (isHost) {

                chatButton.style.display =
                    "block";

            } else {

                chatButton.style.display =
                    allowChat
                        ? "block"
                        : "none";
            }
        }


        // ==================================================
        // SCREEN SHARE PERMISSION
        // ==================================================
        //
        // Host always has Screen Share.
        // Participant depends on allowScreenShare.
        //

        if (screenShareButton) {

            if (isHost) {

                screenShareButton.style.display =
                    "block";

            } else {

                screenShareButton.style.display =
                    allowScreenShare
                        ? "block"
                        : "none";
            }
        }


        // ==================================================
        // HOST SETTINGS BUTTON
        // ==================================================

        if (meetingSettingsButton) {

            meetingSettingsButton.style.display =
                isHost
                    ? "block"
                    : "none";
        }


        // ==================================================
        // SETTINGS PANEL
        // ==================================================

        if (meetingSettingsPanel) {

            meetingSettingsPanel.style.display =
                "none";
        }


        // ==================================================
        // INITIALIZE HOST SETTINGS
        // ==================================================

        if (isHost) {

            if (waitingRoomToggle) {

                waitingRoomToggle.checked =
                    meeting.settings?.waitingRoom === true;
            }

            if (allowScreenShareToggle) {

                allowScreenShareToggle.checked =
                    meeting.settings?.allowScreenShare === true;
            }

            if (allowChatToggle) {

                allowChatToggle.checked =
                    meeting.settings?.allowChat === true;
            }
        }


        // ==================================================
        // SETTINGS PANEL TOGGLE
        // ==================================================

        if (
            isHost &&
            meetingSettingsButton &&
            meetingSettingsPanel
        ) {

            meetingSettingsButton.addEventListener(
                "click",
                () => {

                    const isOpen =
                        meetingSettingsPanel.style.display ===
                        "block";

                    meetingSettingsPanel.style.display =
                        isOpen
                            ? "none"
                            : "block";
                }
            );
        }


        // ==================================================
        // CHAT SETTING
        // ==================================================

        if (
            isHost &&
            allowChatToggle
        ) {

            allowChatToggle.addEventListener(
                "change",
                async () => {

                    const newAllowChat =
                        allowChatToggle.checked;

                    try {

                        allowChatToggle.disabled =
                            true;

                        await updateMeetingApi(
                            roomId,
                            {
                                allowChat:
                                    newAllowChat
                            }
                        );

                        console.log(
                            "CHAT SETTING UPDATED:",
                            newAllowChat
                        );


                        // Host keeps Chat regardless
                        // of participant permission.

                        if (chatButton) {

                            chatButton.style.display =
                                "block";
                        }


                        if (
                            !newAllowChat &&
                            chatPanel
                        ) {

                            chatPanel.style.display =
                                "none";
                        }

                    } catch (error) {

                        console.error(
                            "FAILED TO UPDATE CHAT SETTING:",
                            error
                        );

                        allowChatToggle.checked =
                            !newAllowChat;

                        showToast(
                            error.message ||
                            "Failed to update chat setting",
                            "error"
                        );

                    } finally {

                        allowChatToggle.disabled =
                            false;
                    }
                }
            );
      }

        // ==================================================
        // PARTICIPANTS - TOGGLE PANEL
        // ==================================================
        
        if (
            participantsButton &&
            participantsPanel
        ) {
        
            participantsButton.addEventListener(
                "click",
                () => {
        
                    const isOpen =
                        participantsPanel.style.display ===
                        "flex";
        
                    participantsPanel.style.display =
                        isOpen
                            ? "none"
                            : "flex";
                }
            );
        }

      //////    WAITING ROOM

      if (
          isHost &&
          waitingRoomToggle
      ) {
          waitingRoomToggle.addEventListener(
              "change",
              async () => {
                  const newWaitingRoom =
                      waitingRoomToggle.checked;
      
                  try {
                      waitingRoomToggle.disabled = true;
      
                      await updateMeetingApi(
                          roomId,
                          {
                              waitingRoom: newWaitingRoom
                          }
                      );
      
                      console.log(
                          "WAITING ROOM SETTING UPDATED:",
                          newWaitingRoom
                      );
      
                  } catch (error) {
                      console.error(
                          "FAILED TO UPDATE WAITING ROOM SETTING:",
                          error
                      );
      
                      // Revert UI if backend update fails
                      waitingRoomToggle.checked =
                          !newWaitingRoom;
      
                      showToast(
                          error.message ||
                          "Failed to update waiting room setting",
                          "error"
                      );
      
                  } finally {
                      waitingRoomToggle.disabled = false;
                  }
              }
          );
      }


        // ==================================================
        // SCREEN SHARE SETTING
        // ==================================================

        if (
            isHost &&
            allowScreenShareToggle
        ) {

            allowScreenShareToggle.addEventListener(
                "change",
                async () => {

                    const newAllowScreenShare =
                        allowScreenShareToggle.checked;

                    try {

                        allowScreenShareToggle.disabled =
                            true;

                        await updateMeetingApi(
                            roomId,
                            {
                                allowScreenShare:
                                    newAllowScreenShare
                            }
                        );

                        console.log(
                            "SCREEN SHARE SETTING UPDATED:",
                            newAllowScreenShare
                        );

                    } catch (error) {

                        console.error(
                            "FAILED TO UPDATE SCREEN SHARE SETTING:",
                            error
                        );

                        allowScreenShareToggle.checked =
                            !newAllowScreenShare;

                        showToast(
                            error.message ||
                            "Failed to update screen share setting",
                            "error"
                        );

                    } finally {

                        allowScreenShareToggle.disabled =
                            false;
                    }
                }
            );
        }


        // ==================================================
        // SCHEDULED MEETING
        // ==================================================

        if (
            meeting.status === "scheduled" &&
            !isHost
        ) {

          showToast(
              "Meeting has not started yet.",
              "info"
          );

            return;
        }


        // ==================================================
        // HOST START MEETING
        // ==================================================

        if (
            isHost &&
            meeting.status === "scheduled"
        ) {

            if (startMeetingButton) {

                startMeetingButton.style.display =
                    "block";

                startMeetingButton.addEventListener(
                    "click",
                    async () => {

                        try {

                            startMeetingButton.disabled =
                                true;

                            startMeetingButton.textContent =
                                "Starting...";

                            const data =
                                await startMeetingApi(
                                    roomId
                                );
                            
                            console.log(
                                "MEETING STARTED:",
                                data
                            );
                            
                            // Hide Start Meeting
                            startMeetingButton.style.display =
                                "none";
                            
                            // Show End Meeting
                            if (endMeetingButton) {
                                endMeetingButton.style.display =
                                    "flex";
                            }

                        } catch (error) {

                            console.error(
                                "FAILED TO START MEETING:",
                                error
                            );

                            showToast(
                                error.message ||
                                "Failed to start meeting",
                                "error"
                            );

                            startMeetingButton.disabled =
                                false;

                            startMeetingButton.textContent =
                                "▶ Start Meeting";
                        }
                    }
                );
            }
        }


        // ==================================================
        // HOST END MEETING
        // ==================================================
        // ==================================================
        // END MEETING
        // ==================================================
        
        if (isHost && endMeetingButton) {
        
            // Show End Meeting if the meeting is already live
            if (meeting.status === "live") {
                endMeetingButton.style.display = "flex";
            }
        
            endMeetingButton.addEventListener(
                "click",
                async () => {
        
                  const confirmed =
                      await showConfirmation({
                          title: "End Meeting?",
                          message: "Everyone will be removed from this meeting.",
                          confirmText: "End Meeting"
                      });
                  
                  if (!confirmed) {
                      return;
                  }
        
                    try {
        
                        endMeetingButton.disabled = true;
        
                        endMeetingButton.innerHTML = `
                            <span>Ending...</span>
                        `;
        
                        const data =
                            await endMeetingApi(roomId);
        
                        console.log(
                            "MEETING ENDED:",
                            data
                        );
        
        
                        // Stop local media
        
                        if (localVideo?.srcObject) {
        
                            localVideo
                                .srcObject
                                .getTracks()
                                .forEach(track => {
                                    track.stop();
                                });
        
                            localVideo.srcObject = null;
                        }
        
        
                        // Leave Socket.IO meeting
        
                        leaveMeeting();
        
        
                        // Return to dashboard
        
                        window.location.href =
                            "/pages/dashboard.html";
        
        
                    } catch (error) {
        
                        console.error(
                            "Failed to end meeting:",
                            error
                        );
        
                        showToast(
                            error.message ||
                            "Failed to end meeting",
                            "error"
                        );
        
                        endMeetingButton.disabled =
                            false;
        
                        endMeetingButton.innerHTML = `
                            <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path d="M5 5l14 14" />
                                <path d="M19 5 5 19" />
                            </svg>
                            <span>End Meeting</span>
                        `;
                    }
                }
            );
        }

        if (meeting.status === "ended") {
          showToast(
              "Meeting has ended.",
              "info"
          );

            return;
        }


        // ==================================================
        // START LOCAL MEDIA
        // ==================================================

        const localStream =
            await startLocalMedia();


        // ==================================================
        // ROOM NAME
        // ==================================================

        const roomName =
            document.getElementById("roomName");

        if (roomName) {

            roomName.textContent =
                meeting.title;
        }


        // ==================================================
        // LOCAL VIDEO
        // ==================================================

        if (localVideo) {

            localVideo.srcObject =
                localStream;

            await localVideo.play();
        }


        // ==================================================
        // JOIN MEETING API
        // ==================================================

        const joinResult = await joinMeetingApi(roomId);
        console.log("JOIN RESULT:", joinResult);
        if (joinResult.data?.status === "waiting") {
          console.log("User is waiting for host approval");
        
          await connectSocket();
        
          socket.emit("request-to-join", {
            roomId
          });
        
          console.log("⏳ Waiting for host approval...");
        
          return;
        }


        // ==================================================
        // JOIN SOCKET.IO MEETING
        // ==================================================

        await joinMeeting(
            roomId
        );

        console.log(
            "Meeting joined"
        );


    } catch (error) {

        console.error(
            "FAILED TO START MEETING APP:",
            error
      );
        showToast(
            error.message ||
            "Meeting not found",
            "error"
        );
        
          window.location.href = "/pages/dashboard.html";

    }
}

socket.on("join-request", (data) => {

    console.log(
        "📨 JOIN REQUEST RECEIVED:",
        data
    );

    if (!isHost) {
        return;
    }

    addWaitingParticipant(data);
});

socket.on("participant-admitted", ({ roomId, participantSocketId }) => {
    console.log("✅ PARTICIPANT ADMITTED:", participantSocketId);

    removeWaitingParticipant(participantSocketId);
});

socket.on("participant-rejected", ({ roomId, participantSocketId }) => {
    console.log("❌ PARTICIPANT REJECTED:", participantSocketId);

    removeWaitingParticipant(participantSocketId);
});

socket.on(
    "waiting-request-cancelled",
    ({ roomId, participantSocketId }) => {
        console.log(
            "🧹 WAITING REQUEST CANCELLED:",
            participantSocketId
        );

        if (!isHost) return;

        removeWaitingParticipant(participantSocketId);
    }
);

// ==================================================
// WAITING ROOM - ADD PARTICIPANT
// ==================================================

function addWaitingParticipant(data) {

    if (!waitingParticipants) {
        return;
    }

    const {
        socketId,
        roomId,
        user
    } = data;

    // Prevent duplicate requests
    if (
        document.getElementById(
            `waiting-${socketId}`
        )
    ) {
        return;
    }


    const participantItem =
        document.createElement("div");

    participantItem.className =
        "participant-item";

    participantItem.id =
        `waiting-${socketId}`;


    // ==============================================
    // NAME
    // ==============================================

    const name =
        document.createElement("span");

    name.className =
        "participant-name";

    name.textContent =
        user?.fullname ||
        user?.username ||
        "Participant";


    // ==============================================
    // ACTIONS
    // ==============================================

    const actions =
        document.createElement("div");

    actions.className =
        "participant-actions";


    // ==============================================
    // ACCEPT
    // ==============================================

    const acceptButton =
        document.createElement("button");

    acceptButton.className =
        "accept-button";

    acceptButton.textContent =
        "Accept";


    acceptButton.addEventListener("click", () => {
        console.log("✅ HOST CHOSE ADMIT:", socketId);
    
        socket.emit("admit-participant", {
            roomId,
            participantSocketId: socketId
        });
    });


    // ==============================================
    // REJECT
    // ==============================================

    const rejectButton =
        document.createElement("button");

    rejectButton.className =
        "reject-button";

    rejectButton.textContent =
        "Reject";


    rejectButton.addEventListener("click", () => {
        console.log("❌ HOST CHOSE REJECT:", socketId);
    
        socket.emit("reject-participant", {
            roomId,
            participantSocketId: socketId
        });
    });


    // ==============================================
    // BUILD ELEMENT
    // ==============================================

    actions.appendChild(
        acceptButton
    );

    actions.appendChild(
        rejectButton
    );


    participantItem.appendChild(
        name
    );

    participantItem.appendChild(
        actions
    );


    waitingParticipants.appendChild(
        participantItem
    );


    updateWaitingCount();
}

// ==================================================
// WAITING ROOM - REMOVE PARTICIPANT
// ==================================================

function removeWaitingParticipant(
    socketId
) {

    const participantItem =
        document.getElementById(
            `waiting-${socketId}`
        );

    if (participantItem) {

        participantItem.remove();
    }

    updateWaitingCount();
}

// ==================================================
// WAITING ROOM - COUNT
// ==================================================

function updateWaitingCount() {

    if (
        !waitingCount ||
        !waitingParticipants
    ) {
        return;
    }

    const count =
        waitingParticipants.children.length;

    waitingCount.textContent =
        count;


    if (waitingSection) {

        waitingSection.style.display =
            count > 0
                ? "block"
                : "none";
    }
}


socket.on("join-rejected", ({ roomId, message }) => {
  console.log("❌ JOIN REJECTED:", roomId, message);

  showToast(
      message ||
      "The host rejected your request to join the meeting",
      "error"
  );
});


// ==================================================
// REAL-TIME MEETING SETTINGS
// ==================================================

window.addEventListener(
    "meeting-settings-changed",
    ({ detail }) => {

        const settings =
            detail.settings;

        console.log(
            "NEW MEETING SETTINGS:",
            settings
        );


        // ==================================================
        // CHAT
        // ==================================================

        const allowChat =
            settings.allowChat === true;

        if (chatButton) {

            // Host always has Chat.
            if (isHost) {

                chatButton.style.display =
                    "block";

            } else {

                chatButton.style.display =
                    allowChat
                        ? "block"
                        : "none";
            }
        }


        // Close participant chat if
        // host disables it.

        if (
            !isHost &&
            !allowChat &&
            chatPanel
        ) {

            chatPanel.style.display =
                "none";
        }


        // ==================================================
        // SCREEN SHARE
        // ==================================================

        const allowScreenShare =
            settings.allowScreenShare === true;

        if (screenShareButton) {

            // Host always has Screen Share.
            if (isHost) {

                screenShareButton.style.display =
                    "block";

            } else {

                screenShareButton.style.display =
                    allowScreenShare
                        ? "block"
                        : "none";
            }
        }


        // ==================================================
        // IF PARTICIPANT IS CURRENTLY SCREEN SHARING
        // AND HOST DISABLES IT
        // ==================================================

        if (
            !isHost &&
            !allowScreenShare &&
            isScreenSharing
        ) {

            stopScreenShare();

            removeAllScreenPeers();

            isScreenSharing =
                false;

            currentScreenStream =
                null;

            if (screenShareButton) {

                screenShareButton.textContent =
                    "🖥️ Share Screen";
            }

            socket.emit(
                "screen-share-ended",
                {
                    roomId
                }
            );
        }


        // ==================================================
        // UPDATE HOST CHECKBOXES
        // ==================================================

        if (isHost) {

            if (waitingRoomToggle) {

                waitingRoomToggle.checked =
                    settings.waitingRoom === true;
            }

            if (allowScreenShareToggle) {

                allowScreenShareToggle.checked =
                    allowScreenShare;
            }

            if (allowChatToggle) {

                allowChatToggle.checked =
                    allowChat;
            }
        }

    }
);


// ==================================================
// CHAT - SEND MESSAGE
// ==================================================

function sendMessage(message) {

    if (!message) {
        return;
    }

    const text =
        message.trim();

    if (!text) {
        return;
    }

    socket.emit(
        "send-message",
        {
            roomId,
            message: text
        }
    );

    displayChatMessage(
        "You",
        text
    );
}


// ==================================================
// CHAT - SEND BUTTON
// ==================================================

if (
    sendMessageButton &&
    chatInput
) {

    sendMessageButton.addEventListener(
        "click",
        () => {

            sendMessage(
                chatInput.value
            );

            chatInput.value =
                "";
        }
    );
}


// ==================================================
// CHAT - ENTER KEY
// ==================================================

if (chatInput) {

    chatInput.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {

                sendMessage(
                    chatInput.value
                );

                chatInput.value =
                    "";
            }
        }
    );
}


// ==================================================
// CHAT - DISPLAY MESSAGE
// ==================================================

function displayChatMessage(
    name,
    message
) {

    const chatMessages =
        document.getElementById(
            "chatMessages"
        );

    if (!chatMessages) {
        return;
    }

    const messageElement =
        document.createElement(
            "div"
        );

    messageElement.className =
        "chat-message";


    const nameElement =
        document.createElement(
            "div"
        );

    nameElement.className =
        "chat-message-name";

    nameElement.textContent =
        name;


    const textElement =
        document.createElement(
            "div"
        );

    textElement.textContent =
        message;


    messageElement.appendChild(
        nameElement
    );

    messageElement.appendChild(
        textElement
    );

    chatMessages.appendChild(
        messageElement
    );

    chatMessages.scrollTop =
        chatMessages.scrollHeight;
}

// ==================================================
// PARTICIPANTS - RENDER IN-MEETING LIST
// ==================================================

function renderMeetingParticipants(participants) {

    if (!meetingParticipants) {
        return;
    }

    // Clear current list
    meetingParticipants.innerHTML = "";


    // ==============================================
    // CURRENT USER / HOST
    // ==============================================

    const currentUserItem =
        document.createElement("div");

    currentUserItem.className =
        "participant-item";


    const currentUserName =
        document.createElement("span");

    currentUserName.className =
        "participant-name";

    currentUserName.textContent =
        isHost
            ? "You (Host)"
            : "You";


    currentUserItem.appendChild(
        currentUserName
    );

    meetingParticipants.appendChild(
        currentUserItem
    );


    // ==============================================
    // OTHER PARTICIPANTS
    // ==============================================

    participants.forEach(
        (participant) => {

            const participantItem =
                document.createElement("div");

            participantItem.className =
                "participant-item";


            const name =
                document.createElement("span");

            name.className =
                "participant-name";

            name.textContent =
                participant.user?.fullname ||
                participant.user?.username ||
                "Participant";


            participantItem.appendChild(
                name
            );


            meetingParticipants.appendChild(
                participantItem
            );
        }
    );
}

// ==================================================
// PARTICIPANTS - RECEIVE UPDATE
// ==================================================

window.addEventListener(
    "participants-updated",
    ({ detail }) => {

        renderMeetingParticipants(
            detail.participants
        );
    }
);

// ==================================================
// CHAT - RECEIVE MESSAGE
// ==================================================

socket.on(
    "new-message",
    ({ user, message }) => {

        const name =
            user?.fullname ||
            user?.username ||
            "Participant";

        displayChatMessage(
            name,
            message
        );
    }
);


// ==================================================
// CHAT - TOGGLE PANEL
// ==================================================

if (
    chatButton &&
    chatPanel
) {

    chatButton.addEventListener(
        "click",
        () => {

            const isOpen =
                chatPanel.style.display ===
                "flex";

            chatPanel.style.display =
                isOpen
                    ? "none"
                    : "flex";
        }
    );
}


// ==================================================
// PAGE STATE
// ==================================================

if (roomId) {

    // Inside meeting

    if (landingPage) {

        landingPage.style.display =
            "none";
    }

    if (meetingPage) {

        meetingPage.style.display =
            "block";
    }

    startApp();

} else {

    // Landing page

    if (landingPage) {

        landingPage.style.display =
            "block";
    }

    if (meetingPage) {

        meetingPage.style.display =
            "none";
    }
}


// ==================================================
// UI NOTIFICATIONS
// ==================================================

const toastContainer =
    document.getElementById("toastContainer");

const confirmationModal =
    document.getElementById("confirmationModal");

const confirmationTitle =
    document.getElementById("confirmationTitle");

const confirmationMessage =
    document.getElementById("confirmationMessage");

const confirmationCancel =
    document.getElementById("confirmationCancel");

const confirmationConfirm =
    document.getElementById("confirmationConfirm");


// ==================================================
// TOAST
// ==================================================

function showToast(
    message,
    type = "info"
) {

    if (!toastContainer) {
        return;
    }

    const toast =
        document.createElement("div");

    toast.className =
        `toast ${type}`;

    toast.textContent =
        message;

    toastContainer.appendChild(
        toast
    );

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    setTimeout(() => {

        toast.classList.remove(
            "show"
        );

        setTimeout(() => {
            toast.remove();
        }, 200);

    }, 3000);
}


// ==================================================
// CONFIRMATION MODAL
// ==================================================

function showConfirmation({
    title = "Confirm Action",
    message = "Are you sure?",
    confirmText = "Confirm"
} = {}) {

    return new Promise((resolve) => {

        if (!confirmationModal) {
            resolve(false);
            return;
        }

        confirmationTitle.textContent =
            title;

        confirmationMessage.textContent =
            message;

        confirmationConfirm.textContent =
            confirmText;

        confirmationModal.style.display =
            "flex";


        const closeModal = (
            result
        ) => {

            confirmationModal.style.display =
                "none";

            confirmationConfirm.onclick =
                null;

            confirmationCancel.onclick =
                null;

            resolve(result);
        };


        confirmationCancel.onclick =
            () => {
                closeModal(false);
            };


        confirmationConfirm.onclick =
            () => {
                closeModal(true);
            };

    });
}
// ==================================================
// LEAVE MEETING
// ==================================================

if (leaveButton) {

    leaveButton.addEventListener(
        "click",
        () => {

            console.log(
                "LEAVE BUTTON CLICKED"
            );

            leaveMeeting();

            console.log(
                "LEAVE MEETING EMITTED"
            );
        }
    );
}


// ==================================================
// VIDEO
// ==================================================

if (videoButton) {

    videoButton.addEventListener(
        "click",
        () => {

            const videoEnabled =
                toggleVideo();

            videoButton.textContent =
                videoEnabled
                    ? "Stop Video"
                    : "Start Video";

            socket.emit(
                "media-state-changed",
                {
                    roomId,
                    videoEnabled
                }
            );
        }
    );
}


// ==================================================
// AUDIO
// ==================================================

if (audioButton) {

    audioButton.addEventListener(
        "click",
        () => {

            const audioEnabled =
                toggleAudio();

            audioButton.textContent =
                audioEnabled
                    ? "Mute"
                    : "Unmute";

            socket.emit(
                "media-state-changed",
                {
                    roomId,
                    audioEnabled
                }
            );
        }
    );
}


// ==================================================
// REMOTE USER LEFT
// ==================================================

window.addEventListener(
    "remote-user-left",
    (event) => {

        const {
            remoteSocketId
        } = event.detail;


        console.log(
            "CLEANING UP PARTICIPANT:",
            remoteSocketId
        );


        // Close WebRTC peer

        removePeer(
            remoteSocketId
        );


        // Remove camera tile

        const tile =
            document.getElementById(
                `tile-${remoteSocketId}`
            );

        if (tile) {

            const remoteVideo =
                tile.querySelector(
                    "video"
                );

            if (remoteVideo) {

                remoteVideo.srcObject =
                    null;
            }

            tile.remove();
        }


        // Remove screen-share peer

        removeScreenPeer(
            remoteSocketId
        );


        // Remove screen-share tile

        const screenTile =
            document.getElementById(
                `screen-tile-${remoteSocketId}`
            );

        if (screenTile) {

            const screenVideo =
                screenTile.querySelector(
                    "video"
                );

            if (screenVideo) {

                screenVideo.srcObject =
                    null;
            }

            screenTile.remove();
        }

        updateVideoGrid();
    }
);


// ==================================================
// VIDEO GRID
// ==================================================

function updateVideoGrid() {

    const remoteVideos =
        document.getElementById(
            "remoteVideos"
        );

    if (!remoteVideos) {
        return;
    }

    const count =
        remoteVideos.children.length;

    remoteVideos.dataset.count =
        count;
}


// ==================================================
// REMOTE STREAM
// ==================================================

window.addEventListener(
    "remote-stream",
    async (event) => {

        const {
            remoteSocketId,
            stream
        } = event.detail;


        const participants =
            getParticipants();


        console.log(
            "PARTICIPANTS BEFORE REMOTE STREAM:",
            [...participants.entries()]
        );


        console.log(
            "LOOKING FOR SOCKET:",
            remoteSocketId
        );


        const participant =
            participants.get(
                remoteSocketId
            );


        console.log(
            "FOUND PARTICIPANT:",
            participant
        );


        const participantName =
            participant?.user?.fullname ||
            participant?.user?.username ||
            "Participant";


        console.log(
            "REMOTE STREAM:",
            remoteSocketId
        );


        const remoteVideos =
            document.getElementById(
                "remoteVideos"
            );

        if (!remoteVideos) {
            return;
        }


        let remoteVideo =
            document.getElementById(
                `remote-${remoteSocketId}`
            );


        // ==================================================
        // CREATE TILE
        // ==================================================

        if (!remoteVideo) {

            const tile =
                document.createElement(
                    "div"
                );

            tile.className =
                "video-tile";

            tile.id =
                `tile-${remoteSocketId}`;


            const audioStatus =
                document.createElement(
                    "div"
                );

            audioStatus.className =
                "audio-status";

            audioStatus.textContent =
                "🎤";

            audioStatus.style.display =
                "none";


            const videoStatus =
                document.createElement(
                    "div"
                );

            videoStatus.className =
                "video-status";

            videoStatus.textContent =
                "📷";

            videoStatus.style.display =
                "none";


            remoteVideo =
                document.createElement(
                    "video"
                );

            remoteVideo.id =
                `remote-${remoteSocketId}`;

            remoteVideo.autoplay =
                true;

            remoteVideo.playsInline =
                true;


            const label =
                document.createElement(
                    "div"
                );

            label.className =
                "video-label";

            label.textContent =
                participantName;


            tile.appendChild(
                remoteVideo
            );

            tile.appendChild(
                label
            );

            tile.appendChild(
                audioStatus
            );

            tile.appendChild(
                videoStatus
            );

            remoteVideos.appendChild(
                tile
            );
        }


        // ==================================================
        // ATTACH STREAM
        // ==================================================

        remoteVideo.srcObject =
            stream;

        updateVideoGrid();


        // ==================================================
        // PLAY
        // ==================================================

        try {

            await remoteVideo.play();

            console.log(
                "REMOTE VIDEO PLAYING:",
                remoteSocketId
            );

        } catch (error) {

            console.error(
                "REMOTE VIDEO PLAY FAILED:",
                remoteSocketId,
                error
            );
        }
    }
);


// ==================================================
// REMOTE MEDIA STATE
// ==================================================

window.addEventListener(
    "remote-media-state-changed",
    (event) => {

        const {
            socketId,
            audioEnabled,
            videoEnabled
        } = event.detail;


        const tile =
            document.getElementById(
                `tile-${socketId}`
            );

        if (!tile) {
            return;
        }


        const audioStatus =
            tile.querySelector(
                ".audio-status"
            );

        const videoStatus =
            tile.querySelector(
                ".video-status"
            );

        if (!audioStatus) {
            return;
        }

        if (!videoStatus) {
            return;
        }


        if (
            audioEnabled !== undefined
        ) {

            audioStatus.style.display =
                audioEnabled
                    ? "none"
                    : "block";
        }


        if (
            videoEnabled !== undefined
        ) {

            videoStatus.style.display =
                videoEnabled
                    ? "none"
                    : "block";
        }
    }
);


// ==================================================
// SCREEN SHARE
// ==================================================

if (screenShareButton) {

    screenShareButton.addEventListener(
        "click",
        async () => {

            // ==================================================
            // STOP SCREEN SHARE
            // ==================================================

            if (isScreenSharing) {

                console.log(
                    "STOPPING SCREEN SHARE"
                );

                stopScreenShare();

                removeAllScreenPeers();

                isScreenSharing =
                    false;

                currentScreenStream =
                    null;

                screenShareButton.textContent =
                    "🖥️ Share Screen";

                socket.emit(
                    "screen-share-ended",
                    {
                        roomId
                    }
                );

                return;
            }


            // ==================================================
            // PARTICIPANT PERMISSION CHECK
            // ==================================================

            if (!isHost) {

                // We don't currently keep a local
                // settings object, so the button's
                // visibility is the first UI guard.

                if (
                    screenShareButton.style.display ===
                    "none"
                ) {

                    return;
                }
            }


            // ==================================================
            // START SCREEN SHARE
            // ==================================================

            try {

                const screenStream =
                    await startScreenShare();

                isScreenSharing =
                    true;

                currentScreenStream =
                    screenStream;


                console.log(
                    "SCREEN SHARE STARTED:",
                    screenStream
                );


                const participants =
                    getParticipants();


                for (
                    const [
                        remoteSocketId
                    ] of participants
                ) {

                    await startScreenShareConnection(
                        remoteSocketId,
                        screenStream
                    );
                }


                screenShareButton.textContent =
                    "🖥️ Stop Sharing";

            } catch (error) {

                console.error(
                    "SCREEN SHARING FAILED:",
                    error
                );
            }
        }
    );
}


// ==================================================
// REMOTE SCREEN STREAM
// ==================================================

window.addEventListener(
    "remote-screen-stream",
    async (event) => {

        const {
            remoteSocketId,
            stream
        } = event.detail;


        console.log(
            "REMOTE SCREEN STREAM:",
            remoteSocketId,
            stream
        );


        const participants =
            getParticipants();


        const participant =
            participants.get(
                remoteSocketId
            );


        const participantName =
            participant?.user?.fullname ||
            participant?.user?.username ||
            "Participant";


        const remoteVideos =
            document.getElementById(
                "remoteVideos"
            );

        if (!remoteVideos) {
            return;
        }


        // Prevent duplicate screen tiles

        const existingTile =
            document.getElementById(
                `screen-tile-${remoteSocketId}`
            );

        if (existingTile) {

            const existingVideo =
                existingTile.querySelector(
                    "video"
                );

            if (existingVideo) {

                existingVideo.srcObject =
                    stream;
            }

            return;
        }


        const tile =
            document.createElement(
                "div"
            );

        tile.className =
            "video-tile";

        tile.id =
            `screen-tile-${remoteSocketId}`;


        const remoteVideo =
            document.createElement(
                "video"
            );

        remoteVideo.id =
            `screen-${remoteSocketId}`;

        remoteVideo.autoplay =
            true;

        remoteVideo.playsInline =
            true;


        const label =
            document.createElement(
                "div"
            );

        label.className =
            "video-label";

        label.textContent =
            `${participantName} - Screen`;


        tile.appendChild(
            remoteVideo
        );

        tile.appendChild(
            label
        );

        remoteVideos.appendChild(
            tile
        );


        remoteVideo.srcObject =
            stream;

        updateVideoGrid();


        try {

            await remoteVideo.play();

            console.log(
                "REMOTE SCREEN PLAYING:",
                remoteSocketId
            );

        } catch (error) {

            console.error(
                "REMOTE SCREEN PLAY FAILED:",
                remoteSocketId,
                error
            );
        }
    }
);


// ==================================================
// LOCAL SCREEN SHARE ENDED
// ==================================================

window.addEventListener(
    "screen-share-ended",
    () => {

        console.log(
            "SCREEN SHARE ENDED"
        );

        removeAllScreenPeers();

        isScreenSharing =
            false;

        currentScreenStream =
            null;

        if (screenShareButton) {

            screenShareButton.textContent =
                "🖥️ Share Screen";
        }

        socket.emit(
            "screen-share-ended",
            {
                roomId
            }
        );
    }
);


// ==================================================
// REMOTE SCREEN SHARE ENDED
// ==================================================

window.addEventListener(
    "remote-screen-share-ended",
    ({ detail }) => {

        const {
            socketId
        } = detail;


        console.log(
            "REMOVING SCREEN TILE:",
            socketId
        );


        const screenTile =
            document.getElementById(
                `screen-tile-${socketId}`
            );

        if (screenTile) {

            const screenVideo =
                screenTile.querySelector(
                    "video"
                );

            if (screenVideo) {

                screenVideo.srcObject =
                    null;
            }

            screenTile.remove();
        }


        removeScreenPeer(
            socketId
        );

        updateVideoGrid();
    }
);


// ==================================================
// PARTICIPANT JOINED
// ==================================================

window.addEventListener(
    "participant-joined",
    async (event) => {

        const {
            socketId
        } = event.detail;


        console.log(
            "NEW PARTICIPANT JOINED:",
            socketId
        );


        if (
            !isScreenSharing ||
            !currentScreenStream
        ) {

            return;
        }


        console.log(
            "SENDING ACTIVE SCREEN SHARE TO:",
            socketId
        );


        try {

            await startScreenShareConnection(
                socketId,
                currentScreenStream
            );

        } catch (error) {

            console.error(
                "FAILED TO SEND SCREEN TO LATE JOINER:",
                socketId,
                error
            );
        }
    }
);


// ==================================================
// PARTICIPANT COUNT
// ==================================================

window.addEventListener(
    "participant-count-changed",
    ({ detail }) => {

        const participantCount =
            document.getElementById(
                "participantCount"
            );

        if (!participantCount) {
            return;
        }

        participantCount.textContent =
            `${detail.count} ${
                detail.count === 1
                    ? "Participant"
                    : "Participants"
            }`;
    }
);