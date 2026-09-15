import { getMeApi } from "./api.js";
import { createMeetingApi } from "./api.js";
import { clearAccessToken } from "./auth.js";
import { getMyMeetingsApi } from "./api.js";
import { removeMeetingApi } from "./api.js";
import { refreshAccessToken, setAccessToken } from "./auth.js";

const meetingTitleInput =
  document.getElementById("meetingTitleInput");

const meetingScheduleInput =
  document.getElementById("meetingScheduleInput");

const meetingDescriptionInput =
  document.getElementById("meetingDescriptionInput");

const createMeetingError =
  document.getElementById("createMeetingError");

const urlParams = new URLSearchParams(window.location.search);
const tokenFromUrl = urlParams.get("accessToken");

if (tokenFromUrl) {
  setAccessToken(tokenFromUrl);
  const newUrl = window.location.pathname;
  window.history.replaceState({}, document.title, newUrl);
}

async function loadUser() {
  try {
    let data;

    try {
      // First try using the existing access token
      data = await getMeApi();

    } catch (error) {
      // Access token may be missing or expired.
      // Try getting a new one using the HTTP-only refresh cookie.
      console.log("Access token unavailable. Trying refresh...");

      await refreshAccessToken();

      data = await getMeApi();
    }

    console.log("DASHBOARD USER:", data);

    const user = data.data;

    document.getElementById("userName").textContent =
      user.name || "User";

    document.getElementById("userEmail").textContent =
      user.email || "";

    document.getElementById("welcomeMessage").textContent =
      `Welcome, ${user.name || "User"}`;

    if (user.avatar) {
      document.getElementById("userAvatar").src = user.avatar;
    }

  } catch (error) {
    console.error("Dashboard authentication failed:", error);

    // No valid access token and no valid refresh session.
  console.log("AUTH FAILED - NOT REDIRECTING");
  }
}

loadUser();

const createMeetingButton = document.getElementById("createMeetingButton");

createMeetingButton.addEventListener("click", async () => {
  try {
    createMeetingButton.disabled = true;
    createMeetingButton.textContent = "Creating...";

    const title = meetingTitleInput.value.trim();
    const description = meetingDescriptionInput.value.trim();
    
    const scheduledFor = meetingScheduleInput.value
      ? new Date(meetingScheduleInput.value).toISOString()
      : null;
    
    if (!title) {
      createMeetingError.textContent =
        "Meeting title is required";
    
      createMeetingButton.disabled = false;
      createMeetingButton.textContent = "Create Meeting";
    
      return;
    }
    
    createMeetingError.textContent = "";
    
    const data = await createMeetingApi({
        title,
        description,
        scheduledFor
    });
    console.log("MEETING CREATED:", data);

    const roomId = data.data.roomId;
    window.location.href=`/?roomId=${roomId}`
  } catch (error) {
    console.error("Failed to create meeting:", error);

    createMeetingButton.disabled = false;
    createMeetingButton.textContent = "Create Meeting";
  }
})

const joinMeetingButton = document.getElementById("joinMeetingButton");
const roomIdInput=document.getElementById("roomIdInput")

joinMeetingButton.addEventListener("click", () => {
  const roomId = roomIdInput.value.trim();

  if (!roomId) {
    alert("Please enter a meeting ID")
  }

  console.log("JOINING MEETING:", roomId);

  window.location.href=`/?roomId=${encodeURIComponent(roomId)}`
})

const logoutButton = document.getElementById("logoutButton");

logoutButton.addEventListener("click", async () => {
  try {
    const response = await fetch(
        `${CONFIG.API_BASE_URL}/auth/logout`,
      {
        method: "POST",
        credentials: "include"
      }
    );

    const data = await response.json();

    console.log("LOGOUT USER:", data);

    clearAccessToken();

    window.location.href = "/pages/login.html";
  } catch (error) {
    console.error("LOGOUT FAILED:",error)
  }
})

async function loadMeetings() {
  try {
    const data = await getMyMeetingsApi();

    console.log("MEETINGS DATA:", data);
    console.log("MEETINGS ARRAY:", data.data);

    console.log("MY MEETINGS:", data);

    const meetings = data.data;

    const meetingsList = document.getElementById("meetingsList");

    if (!meetings || meetings.length === 0) {
      meetingsList.innerHTML = "<p>No recent Meetings.<p>";
      return;
    }

    meetingsList.innerHTML = "";

    meetings.forEach((meeting) => {
      const meetingCard = document.createElement("div");

      meetingCard.className = "meeting-card";

      meetingCard.innerHTML = `
        <h3>${meeting.title}</h3>
               <p>${meeting.description || "No description"}</p>
               <p>Status: ${meeting.status}</p>
               <p>Room ID: ${meeting.roomId}</p>
               <div class="meeting-card-actions">
                 <button class="join-recent-meeting">
                   Join Meeting
                 </button>
                 <button class="remove-recent-meeting">
                   Remove
                 </button>
               </div>
        `

      const joinButton = meetingCard.querySelector(".join-recent-meeting");

      joinButton.addEventListener("click", () => {
        window.location.href =
          `/?roomId=${encodeURIComponent(meeting.roomId)}`;
      });

      const removeButton = meetingCard.querySelector(".remove-recent-meeting");

      removeButton.addEventListener("click", async () => {
        const confirmed = window.confirm(
          "Remove this meeting from your dashboard?"
        );

        if (!confirmed) return;

        try {
          removeButton.disabled = true;
          removeButton.textContent = "Removing...";

          await removeMeetingApi(meeting.roomId);

          meetingCard.remove();

          if (!meetingsList.querySelector(".meeting-card")) {
            meetingsList.innerHTML = "<p>No recent Meetings.<p>";
          }
        } catch (error) {
          console.error("FAILED TO REMOVE MEETING:", error);

          alert(
            error.message || "Failed to remove meeting"
          );

          removeButton.disabled = false;
          removeButton.textContent = "Remove";
        }
      });

      meetingsList.appendChild(meetingCard)
    });
    
  } catch (error) {
    console.error("FAILED TO LOAD MEETINGS:",error)
  }
}

loadMeetings()
